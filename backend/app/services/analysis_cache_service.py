import os
import json
import sqlite3
import hashlib
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any

# Analysis pipeline version: updating this invalidates older cache entries
ANALYSIS_PIPELINE_VERSION = "v1-LM-PC-current-amendments-evidence-v3"

# Persistent database path for the analysis cache (inside uploads directory)
CACHE_DIR = os.path.join(os.getcwd(), "uploads")
CACHE_DB_PATH = os.path.join(CACHE_DIR, "analysis_cache.sqlite3")

# In-flight request synchronization to prevent duplicate concurrent analyses
_IN_FLIGHT_LOCK = asyncio.Lock()
_IN_FLIGHT_EVENTS: Dict[str, asyncio.Event] = {}


class AnalysisCacheService:
    """
    Persistent, high-performance result caching service for product label analyses.
    Uses cryptographic SHA-256 image content fingerprinting.
    Shares cached analyses across both Inspector and Consumer portals.
    """

    @staticmethod
    def _init_db() -> None:
        """
        Initializes the persistent SQLite database and tables.
        """
        try:
            os.makedirs(CACHE_DIR, exist_ok=True)
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS product_analysis_cache (
                        image_hash TEXT PRIMARY KEY,
                        pipeline_version TEXT NOT NULL,
                        product_name TEXT,
                        analysis_data TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_cache_hash_ver 
                    ON product_analysis_cache(image_hash, pipeline_version)
                """)
                conn.commit()
        except Exception as e:
            print(f"[CACHE INIT WARNING] Could not initialize cache DB: {e}")

    @staticmethod
    def compute_image_hash(image_bytes: bytes) -> str:
        """
        Generates a deterministic SHA-256 cryptographic hash of the raw image bytes.
        SAME IMAGE -> SAME HASH
        DIFFERENT IMAGE -> DIFFERENT HASH
        """
        return hashlib.sha256(image_bytes).hexdigest()

    @classmethod
    def get_cached_analysis_sync(cls, image_hash: str) -> Optional[Dict[str, Any]]:
        """
        Synchronously retrieves a cached analysis for the given image hash.
        Ensures the pipeline_version matches the current engine version.
        """
        if not image_hash:
            return None

        cls._init_db()

        # 1. Check local persistent SQLite store
        try:
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT analysis_data, pipeline_version 
                    FROM product_analysis_cache 
                    WHERE image_hash = ? AND pipeline_version = ?
                    LIMIT 1
                    """,
                    (image_hash, ANALYSIS_PIPELINE_VERSION),
                )
                row = cursor.fetchone()
                if row and row["analysis_data"]:
                    data = json.loads(row["analysis_data"])
                    print(f"[CACHE HIT - SQLITE] Reusing analysis for image hash: {image_hash[:12]}...")
                    return data
        except Exception as e:
            print(f"[CACHE READ NOTICE - SQLITE] {e}")

        # 2. Check Supabase table if available
        try:
            from app.services.supabase_service import supabase
            res = (
                supabase.table("analysis_cache")
                .select("analysis_data, pipeline_version")
                .eq("image_hash", image_hash)
                .eq("pipeline_version", ANALYSIS_PIPELINE_VERSION)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                item = res.data[0]
                analysis_data = item.get("analysis_data")
                if isinstance(analysis_data, str):
                    analysis_data = json.loads(analysis_data)
                if isinstance(analysis_data, dict):
                    print(f"[CACHE HIT - SUPABASE] Reusing analysis for image hash: {image_hash[:12]}...")
                    # Sync to local SQLite for fast subsequent access
                    cls.set_cached_analysis_sync(
                        image_hash=image_hash,
                        product_name=analysis_data.get("product_data", {}).get("product_name"),
                        analysis_data=analysis_data,
                    )
                    return analysis_data
        except Exception:
            # Supabase analysis_cache table might not be present or network unavailable
            pass

        return None

    @classmethod
    def set_cached_analysis_sync(
        cls,
        image_hash: str,
        product_name: Optional[str],
        analysis_data: Dict[str, Any],
    ) -> bool:
        """
        Persists a successful analysis result in the cache.
        Does NOT cache incomplete, partial, or failed analysis records.
        """
        if not image_hash or not analysis_data or not isinstance(analysis_data, dict):
            return False

        # Verify that this is a valid completed compliance analysis
        compliance = analysis_data.get("compliance")
        if not compliance or not isinstance(compliance, dict):
            print("[CACHE SKIP] Not caching incomplete/invalid analysis (no compliance).")
            return False

        if not compliance.get("overall_status") or not compliance.get("results"):
            print("[CACHE SKIP] Not caching incomplete analysis (missing status or results).")
            return False

        cls._init_db()

        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            data_json = json.dumps(analysis_data)
        except Exception as json_err:
            print(f"[CACHE SERIALIZE ERROR] {json_err}")
            return False

        # 1. Write to local persistent SQLite
        saved_locally = False
        try:
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                conn.execute(
                    """
                    INSERT INTO product_analysis_cache (
                        image_hash, pipeline_version, product_name, analysis_data, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(image_hash) DO UPDATE SET
                        pipeline_version = excluded.pipeline_version,
                        product_name = excluded.product_name,
                        analysis_data = excluded.analysis_data,
                        updated_at = excluded.updated_at
                    """,
                    (
                        image_hash,
                        ANALYSIS_PIPELINE_VERSION,
                        product_name or "",
                        data_json,
                        now_iso,
                        now_iso,
                    ),
                )
                conn.commit()
                saved_locally = True
                print(f"[CACHE SAVED - SQLITE] Analysis cached for image hash: {image_hash[:12]}...")
        except Exception as e:
            print(f"[CACHE WRITE NOTICE - SQLITE] {e}")

        # 2. Try writing to Supabase table if available
        try:
            from app.services.supabase_service import supabase
            supabase.table("analysis_cache").upsert({
                "image_hash": image_hash,
                "pipeline_version": ANALYSIS_PIPELINE_VERSION,
                "product_name": product_name or "",
                "analysis_data": analysis_data,
                "updated_at": now_iso,
            }).execute()
            print(f"[CACHE SAVED - SUPABASE] Synced to cloud for hash: {image_hash[:12]}...")
        except Exception:
            # Silently ignore if table is not configured in Supabase
            pass

        return saved_locally

    # ============================================================
    # ASYNC WRAPPERS & CONCURRENCY PROTECTION
    # ============================================================

    @classmethod
    async def get_cached_analysis(cls, image_hash: str) -> Optional[Dict[str, Any]]:
        return cls.get_cached_analysis_sync(image_hash)

    @classmethod
    async def set_cached_analysis(
        cls,
        image_hash: str,
        product_name: Optional[str],
        analysis_data: Dict[str, Any],
    ) -> bool:
        return cls.set_cached_analysis_sync(image_hash, product_name, analysis_data)

    @classmethod
    async def acquire_in_flight_lock(cls, image_hash: str) -> Optional[asyncio.Event]:
        """
        Checks if another request is currently processing this exact same image.
        If another request is in flight, returns the event to wait on.
        Otherwise, registers this request as in-flight and returns None.
        """
        async with _IN_FLIGHT_LOCK:
            if image_hash in _IN_FLIGHT_EVENTS:
                return _IN_FLIGHT_EVENTS[image_hash]
            _IN_FLIGHT_EVENTS[image_hash] = asyncio.Event()
            return None

    @classmethod
    async def release_in_flight_lock(cls, image_hash: str) -> None:
        """
        Signals completion to any waiting duplicate concurrent requests and releases the lock.
        """
        async with _IN_FLIGHT_LOCK:
            event = _IN_FLIGHT_EVENTS.pop(image_hash, None)
            if event:
                event.set()


analysis_cache_service = AnalysisCacheService()
