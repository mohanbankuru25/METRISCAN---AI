import re
import os
from typing import Any, Dict, List, Optional, Tuple


class ProductGroupingService:
    """
    Orchestration service for:
    1. Object/package detection in uploaded images.
    2. Side recognition (Front vs Back vs Full).
    3. Deterministic Identity Resolution (Barcode > License > Batch > Name/Brand).
    4. Grouping & Deduplication (e.g. Front + Back of same product -> 1 Product).
    """

    @staticmethod
    def extract_identity_candidates(
        ocr_results: List[Dict[str, Any]],
        image_filename: str = "",
    ) -> Dict[str, Any]:
        """
        Extract identity signals from OCR text blocks with strict priority rankings.
        """
        all_text_lines = []
        if isinstance(ocr_results, str):
            all_text_lines = [l.strip() for l in ocr_results.splitlines() if l.strip()]
        elif isinstance(ocr_results, (list, tuple)):
            for item in ocr_results:
                if isinstance(item, str):
                    all_text_lines.append(item.strip())
                elif isinstance(item, dict) and item.get("text"):
                    all_text_lines.append(str(item["text"]).strip())

        full_text = " ".join(all_text_lines)
        full_text_lower = full_text.lower()

        # 1. Barcode extraction (8, 12, 13, or 14 digits)
        barcode = None
        # Common Indian/Global EAN-13 starts with 890 (India) or general 8-14 digits
        barcode_matches = re.findall(r"\b(890\d{10}|\d{13}|\d{12}|\d{8})\b", full_text)
        if barcode_matches:
            barcode = barcode_matches[0]

        # 2. License number (e.g. FSSAI 14 digits or Lic No)
        license_number = None
        fssai_matches = re.findall(r"(?:fssai|lic(?:ense)?(?:\s*no\.?)?)\s*[:\-]?\s*([0-9]{14}|[A-Za-z0-9\/\-]{8,20})", full_text, re.IGNORECASE)
        if fssai_matches:
            license_number = fssai_matches[0]
        else:
            lic_gen = re.findall(r"\b(1[0-9]{13})\b", full_text)
            if lic_gen:
                license_number = lic_gen[0]

        # 3. Batch / Lot Number
        batch_number = None
        batch_matches = re.findall(
            r"(?:batch(?:\s*no\.?)?|lot(?:\s*no\.?)?|b\.?\s*no\.?)\s*[:\-]?\s*([A-Za-z0-9\/\-]+)",
            full_text,
            re.IGNORECASE,
        )
        if batch_matches:
            clean_batch = batch_matches[0].strip()
            if len(clean_batch) >= 2 and not clean_batch.lower().startswith("date"):
                batch_number = clean_batch

        # 4. Product Name & Brand inference
        brand = None
        known_brands = ["QUAKER", "AMUL", "BRITANNIA", "NESTLE", "PARLE", "HALDIRAM", "DABUR", "TATA", "FORTUNE", "SAFFOLA", "AASHIRVAAD", "EVEREST", "MDH", "CADBURY", "KRAFT", "KELLOGG"]
        for kb in known_brands:
            if kb in full_text.upper():
                brand = kb
                break

        product_name = None
        # Use top 3 high-confidence text lines as likely product title candidates
        candidate_titles = []
        for line in all_text_lines[:5]:
            clean_line = line.strip()
            # Ignore lines that look like numbers, dates, or prices
            if (
                len(clean_line) >= 3
                and not re.search(r"^(rs|mrp|₹|\d+|date|batch|exp|mfg)", clean_line, re.IGNORECASE)
                and not clean_line.isdigit()
            ):
                candidate_titles.append(clean_line)

        if candidate_titles:
            product_name = candidate_titles[0]
            if brand and brand.lower() not in product_name.lower():
                product_name = f"{brand} {product_name}"
        elif brand:
            product_name = f"{brand} Packaged Commodity"
        else:
            product_name = "Packaged Product"

        # 5. Side Classification (Front vs Back)
        back_indicators = [
            "ingredient", "nutrition", "manufactured by", "packer", "marketed by",
            "fssai", "license no", "consumer care", "serving size", "allergens",
            "best before", "expiry date", "customer care"
        ]
        back_score = sum(1 for ind in back_indicators if ind in full_text_lower)

        front_indicators = [
            "net wt", "net weight", "net qty", "net quantity", "mrp", "₹", "free",
            "pack", "crunchy", "instant", "healthy", "rich in"
        ]
        front_score = sum(1 for ind in front_indicators if ind in full_text_lower)

        if back_score >= 2 and back_score > front_score:
            side = "back"
        elif front_score > back_score:
            side = "front"
        else:
            side = "front" if "front" in image_filename.lower() else "back" if "back" in image_filename.lower() else "full"

        return {
            "barcode": barcode,
            "license_number": license_number,
            "batch_number": batch_number,
            "brand": brand,
            "product_name": product_name,
            "side": side,
            "back_score": back_score,
            "front_score": front_score,
        }

    @classmethod
    def group_and_deduplicate(
        cls,
        analyzed_images: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Group 1-5 analyzed images into unique MultiScanProductGroups.
        Deduplicates identical products and pairs front + back images of the same product.
        """
        groups: List[Dict[str, Any]] = []

        for img_info in analyzed_images:
            cand = img_info.get("identity_candidates", img_info)
            img_id = img_info.get("image_id") or cand.get("image_id") or "img"
            filename = img_info.get("filename") or cand.get("filename") or f"{img_id}.jpg"
            file_path = img_info.get("file_path") or cand.get("file_path") or ""
            ocr_results = img_info.get("ocr_results") or cand.get("ocr_results") or []
            matched_group = None

            # Check for match against existing groups
            for grp in groups:
                grp_ident = grp["identity"]

                # 1. Barcode match (Strongest)
                if cand.get("barcode") and grp_ident.get("barcode"):
                    if cand["barcode"] == grp_ident["barcode"]:
                        matched_group = grp
                        grp["match_reason"] = "barcode"
                        break

                # 2. License number + Batch number match
                if (
                    cand.get("license_number")
                    and grp_ident.get("license_number")
                    and cand.get("batch_number")
                    and grp_ident.get("batch_number")
                ):
                    if (
                        cand["license_number"] == grp_ident["license_number"]
                        and cand["batch_number"] == grp_ident["batch_number"]
                    ):
                        matched_group = grp
                        grp["match_reason"] = "license_and_batch"
                        break

                # 3. Batch number match (when both share valid batch and don't have conflicting barcodes)
                if cand.get("batch_number") and grp_ident.get("batch_number"):
                    if (
                        cand["batch_number"] == grp_ident["batch_number"]
                        and len(cand["batch_number"]) >= 3
                    ):
                        # Ensure no conflicting barcodes
                        if not (cand.get("barcode") and grp_ident.get("barcode") and cand["barcode"] != grp_ident["barcode"]):
                            matched_group = grp
                            grp["match_reason"] = "batch_number"
                            break

                # 4. Same brand/name with complementary Front + Back sides
                if cand.get("brand") and grp_ident.get("brand") and cand["brand"] == grp_ident["brand"]:
                    existing_sides = [im.get("side") for im in grp["images"]]
                    current_side = cand.get("side", "full")
                    # If one is front and one is back, pair them
                    if (current_side == "back" and "front" in existing_sides) or (
                        current_side == "front" and "back" in existing_sides
                    ):
                        matched_group = grp
                        grp["match_reason"] = "front_back_pairing"
                        break

            if matched_group:
                # Merge into existing group
                matched_group["images"].append({
                    "image_id": img_id,
                    "filename": filename,
                    "file_path": file_path,
                    "side": cand.get("side", "full"),
                    "ocr_results": ocr_results,
                })
                # Update identity with any newly discovered stronger candidates
                for k in ["barcode", "license_number", "batch_number", "brand"]:
                    if not matched_group["identity"].get(k) and cand.get(k):
                        matched_group["identity"][k] = cand[k]

                matched_group["is_merged_sides"] = True
                matched_group["identity_confidence"] = min(
                    1.0, matched_group.get("identity_confidence", 0.9) + 0.05
                )
            else:
                # Create a new product group
                new_idx = len(groups) + 1
                group_id = f"PROD-{new_idx:02d}"

                primary_ident = (
                    f"Barcode: {cand.get('barcode')}"
                    if cand.get("barcode")
                    else f"Batch: {cand.get('batch_number')}"
                    if cand.get("batch_number")
                    else f"License: {cand.get('license_number')}"
                    if cand.get("license_number")
                    else f"{cand.get('product_name', 'Product')} (ID: {group_id})"
                )

                groups.append({
                    "group_id": group_id,
                    "primary_identity": primary_ident,
                    "identity": {
                        "barcode": cand.get("barcode"),
                        "license_number": cand.get("license_number"),
                        "batch_number": cand.get("batch_number"),
                        "product_name": cand.get("product_name"),
                        "brand": cand.get("brand"),
                    },
                    "images": [
                        {
                            "image_id": img_id,
                            "filename": filename,
                            "file_path": file_path,
                            "side": cand.get("side", "full"),
                            "ocr_results": ocr_results,
                        }
                    ],
                    "identity_confidence": 0.95 if cand.get("barcode") else 0.85,
                    "is_merged_sides": False,
                    "match_reason": "initial",
                })

        return groups
