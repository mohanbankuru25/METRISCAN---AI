import io
import os
import re
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import pypdfium2
import docx
from PIL import Image

from app.services.supabase_service import SupabaseService, supabase


class RuleExtractorService:
    """
    Extracts structured statutory compliance rules from Legal Metrology documents (PDF, DOCX, DOC).
    Features:
      - Per-page text extraction with exact source page tracking.
      - OCR Fallback via Gemini Vision for scanned/image-only PDF pages.
      - High-precision statutory clause and requirement parsing.
      - Structured classification into DRAFT rules (is_enabled=False).
      - Human-in-the-loop: Never activates rules automatically.
    """

    BUCKET_NAME = "compliance-rule-documents"

    @classmethod
    def _ocr_page_with_gemini(cls, pil_image: Image.Image) -> str:
        """
        Fallback OCR using Gemini Vision when PDF page text is empty or scanned.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return ""

        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

            prompt = (
                "Extract all statutory, legal, rule, section, and regulatory text verbatim from this document page. "
                "Preserve rule numbers, section headings, clauses, sub-clauses, and requirement details exactly as written. "
                "Do NOT summarize, invent, or add preamble. Output only the extracted legal text."
            )

            res = client.models.generate_content(
                model=model,
                contents=[pil_image, prompt]
            )
            return (res.text or "").strip()
        except Exception as e:
            print(f"Warning: Gemini OCR fallback failed for page: {e}")
            return ""

    @classmethod
    def extract_pages_from_pdf(cls, file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extracts text from PDF page-by-page. If a page has insufficient text (< 50 chars),
        renders the page to an image and runs OCR fallback.
        """
        pages: List[Dict[str, Any]] = []
        try:
            pdf = pypdfium2.PdfDocument(file_bytes)
            for page_idx, page in enumerate(pdf):
                page_num = page_idx + 1
                text_page = page.get_textpage()
                extracted = text_page.get_text_range() or ""
                extracted = extracted.strip()

                ocr_used = False
                # If page text is missing or extremely sparse, it's likely a scanned page
                if len(extracted) < 50:
                    try:
                        rendered_image = page.render(scale=2.0).to_pil()
                        ocr_text = cls._ocr_page_with_gemini(rendered_image)
                        if ocr_text:
                            extracted = ocr_text
                            ocr_used = True
                    except Exception as ocr_err:
                        print(f"Notice: Page {page_num} OCR render fallback notice: {ocr_err}")

                pages.append({
                    "page_number": page_num,
                    "text": extracted,
                    "ocr_used": ocr_used,
                })
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")

        return pages

    @classmethod
    def extract_pages_from_docx(cls, file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extracts text from DOCX paragraphs and tables.
        """
        text_parts = []
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            for p in doc.paragraphs:
                if p.text.strip():
                    text_parts.append(p.text.strip())
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        text_parts.append(row_text)
        except Exception as e:
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")

        # Split into simulated pages (~3000 chars per page)
        combined = "\n".join(text_parts)
        pages = []
        chunks = [combined[i:i + 3000] for i in range(0, max(len(combined), 1), 3000)]
        for idx, chunk in enumerate(chunks):
            pages.append({
                "page_number": idx + 1,
                "text": chunk,
                "ocr_used": False,
            })
        return pages

    @classmethod
    def extract_pages(cls, file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        ext = os.path.splitext(filename.lower())[1]
        if ext == ".pdf":
            return cls.extract_pages_from_pdf(file_bytes)
        elif ext in (".docx", ".doc"):
            try:
                return cls.extract_pages_from_docx(file_bytes)
            except Exception:
                try:
                    text = file_bytes.decode("utf-8", errors="ignore")
                    return [{"page_number": 1, "text": text, "ocr_used": False}]
                except Exception as ex:
                    raise ValueError(f"Unable to parse document: {str(ex)}")
        elif ext in (".txt", ".md"):
            text = file_bytes.decode("utf-8", errors="ignore")
            return [{"page_number": 1, "text": text, "ocr_used": False}]
        else:
            raise ValueError(f"Unsupported file format '{ext}'. Please upload PDF, DOCX, or DOC.")

    @classmethod
    def parse_candidate_rules(
        cls,
        pages: List[Dict[str, Any]],
        filename: str = "statutory_rules.pdf"
    ) -> List[Dict[str, Any]]:
        """
        Analyzes statutory text across pages, extracts rule numbers, titles, clauses, requirements,
        and constructs structured candidate compliance rules for Admin review.
        ALL candidate rules are marked DRAFT with active=False.
        """
        candidate_rules: List[Dict[str, Any]] = []
        seen_codes = set()

        # Regex for statutory rule / section / clause patterns
        rule_pattern = re.compile(
            r"(?:(?:Rule|Section|Clause|Schedule)\s+)?(\d+(?:\s*\([0-9a-zA-Z]+\))*)\s*[-:–—.]\s*([^\n\r]+)",
            re.IGNORECASE
        )

        field_mappings = [
            (r"consumer\s+care|customer\s+care|helpline|complaint|care\s+cell|grievance|contact\s+details", "consumer_care", "CONSUMER_CARE", "field_presence", "exists", "AUTOMATED"),
            (r"country\s+of\s+origin|made\s+in|imported\s+from", "country_of_origin", "ORIGIN", "field_presence", "exists", "AUTOMATED"),
            (r"maximum\s+retail\s+price|mrp|retail\s+sale\s+price|inclusive\s+of\s+all\s+taxes", "mrp", "MRP", "field_presence", "exists", "AUTOMATED"),
            (r"unit\s+sale\s+price|usp|per\s+gram|per\s+ml|per\s+piece|per\s+metre", "unit_sale_price", "PRICING", "field_presence", "exists", "AUTOMATED"),
            (r"net\s+quantity|net\s+weight|net\s+volume|net\s+content|quantity", "net_quantity", "NET_QUANTITY", "field_presence", "exists", "AUTOMATED"),
            (r"best\s+before|expiry|use\s+by", "expiry_date", "DATE", "field_presence", "exists", "AUTOMATED"),
            (r"date\s+of\s+manufacture|manufacturing\s+date|packed\s+on|month\s+and\s+year|date\s+of\s+packing", "manufacturing_date", "DATE", "field_presence", "exists", "AUTOMATED"),
            (r"manufacturer|packer|imported\s+by|address|name\s+and\s+address", "manufacturer_address", "MANUFACTURER", "field_presence", "exists", "AUTOMATED"),
            (r"generic\s+name|common\s+name|identity\s+of\s+commodity|name\s+of\s+commodity", "product_name", "DECLARATION", "field_presence", "exists", "AUTOMATED"),
            (r"height|font\s+size|numeral\s+size|area\s+of\s+principal\s+display\s+panel|letter\s+height", "text_height", "DIMENSION", "dimension", "gte", "PARTIAL"),
            (r"placement|prominent|conspicuous|background|contrast|principal\s+display\s+panel", "placement_prominence", "CONTRAST", "contrast", "gte", "PARTIAL"),
            (r"wholesale|distributor|dealer|broker", "wholesale_declaration", "GENERAL", "field_presence", "exists", "CONDITIONAL"),
            (r"export|exempt|industrial|institutional", "exemption", "APPLICABILITY", "field_presence", "exists", "OUT_OF_SCOPE"),
        ]

        for page_data in pages:
            page_num = page_data["page_number"]
            raw_page_text = page_data["text"]
            ocr_used = page_data.get("ocr_used", False)
            lines = [l.strip() for l in raw_page_text.splitlines() if l.strip()]

            current_rule: Optional[Dict[str, Any]] = None

            for line in lines:
                match = rule_pattern.search(line)
                if match and len(line) < 200:
                    # Save previous candidate if present
                    if current_rule and current_rule.get("rule_code") not in seen_codes:
                        seen_codes.add(current_rule["rule_code"])
                        candidate_rules.append(current_rule)

                    rule_num_raw = match.group(1).replace(" ", "").upper()
                    rule_title_raw = match.group(2).strip()

                    clean_num = re.sub(r"[^0-9A-Z]", "_", rule_num_raw).strip("_")
                    rule_code = f"RULE_{clean_num}" if not clean_num.startswith("RULE_") else clean_num
                    if rule_code in seen_codes:
                        rule_code = f"{rule_code}_P{page_num}"

                    category = "GENERAL"
                    field_name = "declaration"
                    cond_type = "field_presence"
                    operator = "exists"
                    expected_val = ""
                    auto_type = "CONDITIONAL"

                    combined_text = f"{rule_title_raw} {line}".lower()
                    for kw_regex, f_name, cat, c_type, op, a_type in field_mappings:
                        if re.search(kw_regex, combined_text):
                            category = cat
                            field_name = f_name
                            cond_type = c_type
                            operator = op
                            auto_type = a_type
                            if c_type == "dimension":
                                expected_val = "1.5"
                            break

                    is_critical = any(w in combined_text for w in ("shall", "mandatory", "must", "prohibited", "penalty"))
                    severity = "CRITICAL" if is_critical else "HIGH"

                    current_rule = {
                        "rule_code": rule_code,
                        "rule_number": rule_num_raw,
                        "rule_name": rule_title_raw[:120],
                        "title": rule_title_raw[:120],
                        "description": line,
                        "requirement": line,
                        "applicability": "Pre-packaged commodities within Chapter II scope.",
                        "category": category,
                        "field_name": field_name,
                        "condition_type": cond_type,
                        "operator": operator,
                        "expected_value": expected_val,
                        "expected_condition": expected_val or f"Statutory declaration for {field_name}",
                        "evidence_required": [field_name, "package_image"],
                        "automation_type": auto_type,
                        "severity": severity,
                        "mandatory": True,
                        "legal_act": "Legal Metrology (Packaged Commodities) Rules, 2011",
                        "statutory_reference": f"Rule {rule_num_raw} — {rule_title_raw[:80]}",
                        "source_document_name": filename,
                        "source_page": page_num,
                        "extraction_confidence": "MEDIUM" if ocr_used else "HIGH",
                        "status": "DRAFT",
                        "active": False,
                        "is_enabled": False,
                        "effective_from": date.today().isoformat(),
                        "effective_to": None,
                    }
                elif current_rule:
                    if len(current_rule["requirement"]) < 600:
                        current_rule["requirement"] += " " + line
                        current_rule["description"] = current_rule["requirement"]

            if current_rule and current_rule.get("rule_code") not in seen_codes:
                seen_codes.add(current_rule["rule_code"])
                candidate_rules.append(current_rule)

        # Fallback if no specific statutory header numbers were parsed
        if not candidate_rules:
            rule_idx = 1
            for page_data in pages:
                page_num = page_data["page_number"]
                for para in page_data["text"].split("\n\n"):
                    para_clean = para.strip()
                    if len(para_clean) < 40:
                        continue
                    para_lower = para_clean.lower()
                    for kw_regex, f_name, cat, c_type, op, a_type in field_mappings:
                        if re.search(kw_regex, para_lower):
                            code = f"RULE_EXT_{rule_idx}_{cat[:4]}"
                            if code not in seen_codes:
                                seen_codes.add(code)
                                candidate_rules.append({
                                    "rule_code": code,
                                    "rule_number": str(rule_idx),
                                    "rule_name": f"Requirement for {cat.replace('_', ' ').title()}",
                                    "title": f"Requirement for {cat.replace('_', ' ').title()}",
                                    "description": para_clean[:350],
                                    "requirement": para_clean[:350],
                                    "applicability": "Pre-packaged commodities.",
                                    "category": cat,
                                    "field_name": f_name,
                                    "condition_type": c_type,
                                    "operator": op,
                                    "expected_value": "1.5" if c_type == "dimension" else "",
                                    "expected_condition": "Statutory display verification",
                                    "evidence_required": [f_name],
                                    "automation_type": a_type,
                                    "severity": "HIGH",
                                    "mandatory": True,
                                    "legal_act": "Legal Metrology (Packaged Commodities) Rules, 2011",
                                    "statutory_reference": f"Section / Clause on {cat.replace('_', ' ').title()}",
                                    "source_document_name": filename,
                                    "source_page": page_num,
                                    "extraction_confidence": "MEDIUM",
                                    "status": "DRAFT",
                                    "active": False,
                                    "is_enabled": False,
                                    "effective_from": date.today().isoformat(),
                                    "effective_to": None,
                                })
                                rule_idx += 1
                            break
                    if len(candidate_rules) >= 20:
                        break

        return candidate_rules

    @classmethod
    def process_and_store_document(
        cls,
        file_bytes: bytes,
        filename: str,
        admin_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Stores document in Supabase Storage, extracts per-page text (with OCR fallback),
        parses candidate rules into DRAFT status, persists them in Supabase,
        records the document record, and returns the drafts for Admin review.
        """
        upload_id = str(uuid.uuid4())
        safe_filename = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_"))
        storage_path = f"{upload_id}/{safe_filename}"

        ext = os.path.splitext(safe_filename.lower())[1]
        mime_type = "application/pdf"
        if ext in (".docx", ".doc"):
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif ext in (".txt", ".md"):
            mime_type = "text/plain"

        # 1. Upload to Supabase Storage
        try:
            SupabaseService.upload_file(
                bucket_name=cls.BUCKET_NAME,
                file_path=storage_path,
                content=file_bytes,
                content_type=mime_type,
            )
        except Exception as storage_err:
            print("Notice: Document storage upload warning:", storage_err)

        # 2. Extract per-page text with OCR fallback
        pages = cls.extract_pages(file_bytes, safe_filename)
        raw_combined_text = "\n\n".join(f"--- PAGE {p['page_number']} ---\n{p['text']}" for p in pages)

        # 3. Parse candidate rules (all created with status='DRAFT', active=False)
        candidate_rules = cls.parse_candidate_rules(pages, safe_filename)

        valid_admin_uuid = None
        if admin_id:
            try:
                uuid.UUID(str(admin_id))
                valid_admin_uuid = str(admin_id)
            except (ValueError, AttributeError, TypeError):
                valid_admin_uuid = None

        # 4. Save document record in Supabase
        doc_record = SupabaseService.save_rule_document({
            "id": upload_id,
            "file_name": safe_filename,
            "storage_path": f"{cls.BUCKET_NAME}/{storage_path}",
            "document_version": "1.0",
            "extraction_status": "PROCESSED",
            "uploaded_by": valid_admin_uuid,
            "raw_text": raw_combined_text[:50000],
            "rules_count": len(candidate_rules),
            "metadata": {
                "pages_count": len(pages),
                "file_size": len(file_bytes),
                "ocr_pages": [p["page_number"] for p in pages if p.get("ocr_used")],
            }
        })

        # 5. Persist candidate DRAFT rules into Supabase so Admin can approve/edit/reject them with persistent IDs
        persisted_drafts = []
        for r in candidate_rules:
            r["source_document_id"] = upload_id
            if valid_admin_uuid:
                r["created_by"] = valid_admin_uuid
            try:
                saved = SupabaseService.create_rule(r)
                persisted_drafts.append(saved)
            except Exception as save_err:
                print(f"Notice: saving draft rule {r.get('rule_code')}: {save_err}")
                persisted_drafts.append(r)

        # 6. Audit log
        try:
            SupabaseService.create_audit_log(
                user_id=valid_admin_uuid,
                action="UPLOAD_RULE_DOCUMENT",
                entity_type="rule_document",
                entity_id=upload_id,
                description=f"Statutory document '{safe_filename}' uploaded. {len(persisted_drafts)} candidate DRAFT rules extracted across {len(pages)} pages for Admin review.",
                metadata={
                    "filename": safe_filename,
                    "storage_path": f"{cls.BUCKET_NAME}/{storage_path}",
                    "rules_detected": len(persisted_drafts),
                    "pages_count": len(pages),
                },
            )
        except Exception:
            pass

        return {
            "upload_id": upload_id,
            "document_name": safe_filename,
            "storage_path": f"{cls.BUCKET_NAME}/{storage_path}",
            "upload_date": datetime.now().strftime("%d-%b-%Y %H:%M:%S"),
            "pages_count": len(pages),
            "rules_detected_count": len(persisted_drafts),
            "candidate_rules": persisted_drafts,
        }
