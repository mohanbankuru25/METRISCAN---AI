import io
import os
import re
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import pypdfium2
import docx

from app.services.supabase_service import SupabaseService, supabase


class RuleExtractorService:
    """
    Extracts structured statutory compliance rules from Legal Metrology documents (PDF, DOCX, DOC).
    Stores documents in Supabase Storage and returns candidate rules for Admin review.
    """

    BUCKET_NAME = "compliance-rule-documents"

    @classmethod
    def extract_text_from_pdf(cls, file_bytes: bytes) -> str:
        text_parts = []
        try:
            pdf = pypdfium2.PdfDocument(file_bytes)
            for page in pdf:
                text_page = page.get_textpage()
                extracted = text_page.get_text_range()
                if extracted:
                    text_parts.append(extracted)
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
        return "\n".join(text_parts)

    @classmethod
    def extract_text_from_docx(cls, file_bytes: bytes) -> str:
        text_parts = []
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            for p in doc.paragraphs:
                if p.text.strip():
                    text_parts.append(p.text)
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        text_parts.append(row_text)
        except Exception as e:
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")
        return "\n".join(text_parts)

    @classmethod
    def extract_text(cls, file_bytes: bytes, filename: str) -> str:
        ext = os.path.splitext(filename.lower())[1]
        if ext == ".pdf":
            return cls.extract_text_from_pdf(file_bytes)
        elif ext in (".docx", ".doc"):
            try:
                return cls.extract_text_from_docx(file_bytes)
            except Exception:
                # Fallback for plain text or older doc files if readable
                try:
                    return file_bytes.decode("utf-8", errors="ignore")
                except Exception as ex:
                    raise ValueError(f"Unable to parse document: {str(ex)}")
        elif ext in (".txt", ".md"):
            return file_bytes.decode("utf-8", errors="ignore")
        else:
            raise ValueError(f"Unsupported file format '{ext}'. Please upload PDF, DOCX, or DOC.")

    @classmethod
    def parse_candidate_rules(cls, raw_text: str) -> List[Dict[str, Any]]:
        """
        Analyzes raw statutory text, extracts rule numbers, titles, clauses, requirements,
        and constructs structured candidate compliance rules for Admin review.
        """
        candidate_rules: List[Dict[str, Any]] = []
        seen_codes = set()

        # Regular expressions for statutory patterns in Legal Metrology Acts / Rules
        # e.g., "Rule 6(1)(a)", "Rule 6", "6(1)(a)", "Section 18", "Rule 7 - Principal Display Panel"
        rule_pattern = re.compile(
            r"(?:(?:Rule|Section|Clause)\s+)?(\d+(?:\s*\([0-9a-zA-Z]+\))*)\s*[-:–—.]\s*([^\n\r]+)",
            re.IGNORECASE
        )

        # Standard known field mappings for Legal Metrology Packaged Commodities Rules 2011
        field_mappings = [
            (r"consumer\s+care|customer\s+care|helpline|complaint|care\s+cell|grievance", "consumer_care", "CONSUMER_CARE", "field_presence", "exists"),
            (r"country\s+of\s+origin|made\s+in|imported\s+from", "country_of_origin", "ORIGIN", "field_presence", "exists"),
            (r"maximum\s+retail\s+price|mrp|retail\s+sale\s+price|inclusive\s+of\s+all\s+taxes", "mrp", "MRP", "field_presence", "exists"),
            (r"unit\s+sale\s+price|usp|per\s+gram|per\s+ml|per\s+piece", "unit_sale_price", "PRICING", "field_presence", "exists"),
            (r"net\s+quantity|quantity|net\s+content|weight|volume", "net_quantity", "NET_QUANTITY", "field_presence", "exists"),
            (r"expiry|use\s+by|best\s+before", "expiry_date", "DATE", "field_presence", "exists"),
            (r"date\s+of\s+manufacture|manufacturing\s+date|packed\s+on|month\s+and\s+year", "manufacturing_date", "DATE", "field_presence", "exists"),
            (r"manufacturer|packer|imported\s+by|address", "manufacturer_address", "MANUFACTURER", "field_presence", "exists"),
            (r"generic\s+name|common\s+name|identity\s+of\s+commodity|name\s+of\s+commodity", "product_name", "DECLARATION", "field_presence", "exists"),
            (r"height|font\s+size|numeral\s+size|area\s+of\s+principal\s+display\s+panel|letter\s+height", "text_height", "DIMENSION", "dimension", "gte"),
            (r"placement|prominent|conspicuous|background|contrast", "placement_prominence", "CONTRAST", "contrast", "gte"),
        ]

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        current_rule: Optional[Dict[str, Any]] = None

        for line in lines:
            # Check for statutory header match
            match = rule_pattern.search(line)
            if match and len(line) < 180:
                # Save previous candidate rule if valid
                if current_rule and current_rule.get("rule_code") not in seen_codes:
                    seen_codes.add(current_rule["rule_code"])
                    candidate_rules.append(current_rule)

                rule_num_raw = match.group(1).replace(" ", "").upper()
                rule_title_raw = match.group(2).strip()

                # Clean code e.g. "RULE_6_1_A"
                clean_num = re.sub(r"[^0-9A-Z]", "_", rule_num_raw).strip("_")
                rule_code = f"RULE_{clean_num}" if not clean_num.startswith("RULE_") else clean_num

                # Infer category & field
                category = "GENERAL"
                field_name = "declaration"
                cond_type = "field_presence"
                operator = "exists"
                expected_val = ""

                combined_line = f"{rule_title_raw} {line}".lower()
                for kw_regex, f_name, cat, c_type, op in field_mappings:
                    if re.search(kw_regex, combined_line):
                        category = cat
                        field_name = f_name
                        cond_type = c_type
                        operator = op
                        if c_type == "dimension":
                            expected_val = "1.5"
                        break

                current_rule = {
                    "rule_code": rule_code,
                    "rule_name": rule_title_raw[:120],
                    "description": line,
                    "category": category,
                    "field_name": field_name,
                    "condition_type": cond_type,
                    "operator": operator,
                    "expected_value": expected_val,
                    "severity": "MANDATORY" if ("shall" in combined_line or "mandatory" in combined_line or "required" in combined_line) else "MEDIUM",
                    "mandatory": True,
                    "active": True,
                    "effective_from": date.today().isoformat(),
                    "effective_to": None,
                }
            elif current_rule:
                # Append subsequent line as requirement description
                if len(current_rule["description"]) < 500:
                    current_rule["description"] += " " + line

        # Add last pending rule
        if current_rule and current_rule.get("rule_code") not in seen_codes:
            candidate_rules.append(current_rule)

        # Fallback if specific statutory numbers were not parsed but text contains rules
        if not candidate_rules:
            # Look for keyword paragraphs
            rule_idx = 1
            for para in raw_text.split("\n\n"):
                para_clean = para.strip()
                if len(para_clean) < 30:
                    continue
                para_lower = para_clean.lower()
                for kw_regex, f_name, cat, c_type, op in field_mappings:
                    if re.search(kw_regex, para_lower):
                        code = f"RULE_EXT_{rule_idx}_{cat[:4]}"
                        if code not in seen_codes:
                            seen_codes.add(code)
                            candidate_rules.append({
                                "rule_code": code,
                                "rule_name": f"Requirement for {cat.replace('_', ' ').title()}",
                                "description": para_clean[:300],
                                "category": cat,
                                "field_name": f_name,
                                "condition_type": c_type,
                                "operator": op,
                                "expected_value": "1.5" if c_type == "dimension" else "",
                                "severity": "HIGH",
                                "mandatory": True,
                                "active": True,
                                "effective_from": date.today().isoformat(),
                                "effective_to": None,
                            })
                            rule_idx += 1
                        break
                if len(candidate_rules) >= 15:
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
        Stores document in Supabase Storage, extracts text, analyzes candidate rules,
        creates an audit record, and returns candidate rules for Admin review.
        """
        upload_id = str(uuid.uuid4())
        safe_filename = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_"))
        storage_path = f"{upload_id}/{safe_filename}"

        # 1. Determine mime type
        ext = os.path.splitext(safe_filename.lower())[1]
        mime_type = "application/pdf"
        if ext in (".docx", ".doc"):
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif ext in (".txt", ".md"):
            mime_type = "text/plain"

        # 2. Upload to Supabase Storage bucket 'compliance-rule-documents'
        try:
            SupabaseService.upload_file(
                bucket_name=cls.BUCKET_NAME,
                file_path=storage_path,
                content=file_bytes,
                content_type=mime_type,
            )
        except Exception as storage_err:
            print("Notice: Document storage upload warning:", storage_err)

        # 3. Extract text
        raw_text = cls.extract_text(file_bytes, safe_filename)

        # 4. Parse candidate rules
        candidate_rules = cls.parse_candidate_rules(raw_text)

        # 5. Create audit record
        try:
            SupabaseService.create_audit_log(
                user_id=admin_id,
                action="UPLOAD_RULE_DOCUMENT",
                entity_type="compliance_rule_document",
                entity_id=upload_id,
                description=f"Statutory document '{safe_filename}' uploaded and analyzed. {len(candidate_rules)} candidate rules extracted.",
                metadata={
                    "filename": safe_filename,
                    "storage_path": f"{cls.BUCKET_NAME}/{storage_path}",
                    "rules_detected": len(candidate_rules),
                    "file_size": len(file_bytes),
                },
            )
        except Exception as audit_err:
            print("Audit log notice:", audit_err)

        return {
            "upload_id": upload_id,
            "document_name": safe_filename,
            "storage_path": f"{cls.BUCKET_NAME}/{storage_path}",
            "upload_date": datetime.now().strftime("%d-%b-%Y %H:%M:%S"),
            "rules_detected_count": len(candidate_rules),
            "candidate_rules": candidate_rules,
        }
