import os
import sys
import io
from datetime import datetime

# Set root directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.supabase_service import SupabaseService, supabase
from app.services.auth_service import create_inspector, login_user
from app.services.rule_extractor import RuleExtractorService
from app.services.report_generator import generate_compliance_pdf, generate_compliance_docx
from app.api.report import _get_or_generate_report_bytes


def run_e2e_tests():
    print("=" * 60)
    print("STARTING E2E INTEGRATION VERIFICATION")
    print("=" * 60)

    # -------------------------------------------------------------
    # TEST 1: AUTH & ROLES
    # -------------------------------------------------------------
    print("\n--- TEST 1: AUTHENTICATION & RBAC ---")
    admin_auth = login_user("mohan.admin", "AdminPassword@123")
    assert admin_auth is not None, "Admin authentication failed!"
    assert admin_auth["profile"]["role"] == "admin", "Admin role mismatch!"
    print("  [PASS] Admin authentication verified (role=admin)")

    # -------------------------------------------------------------
    # TEST 2: STATUTORY RULE UPLOAD & PARSING
    # -------------------------------------------------------------
    print("\n--- TEST 2: STATUTORY RULE DOCUMENT PARSER ---")
    statutory_text = """
    LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011
    Rule 6(1)(a) - Name and complete address of the manufacturer or packer shall be declared.
    Rule 6(1)(b) - Common or generic names of the commodity contained in the package.
    Rule 6(1)(c) - Net quantity in terms of standard unit of weight or measure.
    Rule 6(1)(d) - The month and year in which commodity is manufactured or pre-packed.
    Rule 6(1)(da) - Country of origin where commodity is manufactured or produced.
    Rule 6(1)(e) - Retail sale price of the package inclusive of all taxes (MRP).
    Rule 6(1)(f) - Name, address, telephone number and e-mail address of the person or office for consumer care.
    Rule 7 - Principal display panel dimensions and minimum numeral height of 1.5mm.
    Rule 8 - Declaration to be displayed on the principal display panel prominently.
    """
    candidate_rules = RuleExtractorService.parse_candidate_rules(statutory_text)
    print(f"  [OK] Parsed {len(candidate_rules)} candidate rules from document text.")
    assert len(candidate_rules) >= 7, f"Expected at least 7 rules, got {len(candidate_rules)}"

    # Test storage and audit log creation
    res = RuleExtractorService.process_and_store_document(
        file_bytes=statutory_text.encode("utf-8"),
        filename="LM_Rules_2011.txt",
        admin_id=admin_auth["profile"]["id"],
    )
    assert res["upload_id"] is not None
    assert res["rules_detected_count"] == len(candidate_rules)
    print(f"  [PASS] Rule document uploaded to '{res['storage_path']}', audit record created.")

    # -------------------------------------------------------------
    # TEST 3: DYNAMIC RULE PERSISTENCE & EVALUATION
    # -------------------------------------------------------------
    print("\n--- TEST 3: DYNAMIC RULE PERSISTENCE IN SUPABASE ---")
    test_rule_data = {
        "rule_code": "TEST_RULE_PACK_DATE",
        "rule_name": "Packaging Date Mandatory Declaration Test",
        "description": "Packaging date or manufacturing date must be declared on package.",
        "category": "DATE",
        "field_name": "manufacturing_date",
        "condition_type": "field_presence",
        "operator": "exists",
        "severity": "HIGH",
        "mandatory": True,
        "active": True,
        "effective_from": "2026-01-01",
        "created_by": admin_auth["profile"]["id"],
    }
    saved_rule = SupabaseService.create_rule(test_rule_data)
    assert saved_rule is not None, "Failed to save rule in Supabase!"
    print(f"  [PASS] Dynamic rule saved to Supabase (id={saved_rule['id']}, code={saved_rule['rule_code']})")

    # Verify rule is in get_active_compliance_rules()
    active_rules = SupabaseService.get_active_compliance_rules()
    matching = [r for r in active_rules if r.get("rule_code") == "TEST_RULE_PACK_DATE"]
    assert len(matching) > 0, "Dynamic rule TEST_RULE_PACK_DATE not found in active compliance rules!"
    print(f"  [PASS] Dynamic rule is active and available to compliance engine. (Total active: {len(active_rules)})")

    # -------------------------------------------------------------
    # TEST 4: REPORT GENERATION (PDF & DOCX)
    # -------------------------------------------------------------
    print("\n--- TEST 4: REPORT GENERATION (PDF & DOCX) ---")
    sample_report_payload = {
        "id": "e2e-test-insp-001",
        "inspection_id": "INS-E2E-TEST01",
        "inspection_number": "INS-E2E-TEST01",
        "product_name": "Apple Slice Fruit Drink",
        "category": "Beverages",
        "product_data": {
            "product_name": "Apple Slice Fruit Drink",
            "net_quantity": "250 ml",
            "mrp": "Rs. 20.00",
            "unit_sale_price": "Rs. 0.08 / ml",
            "manufacturing_date": "08/2026",
            "country_of_origin": "India",
            "manufacturer_address": "Pepsico India Holdings Pvt Ltd, Village Channo, Sangrur, Punjab",
            "consumer_care": "consumer.feedback@pepsico.com, 1800 22 4020",
        },
        "ocr_data": {
            "text": "Apple Slice Fruit Drink 250ml MRP Rs 20.00 Mfg 08/2026 Made in India",
            "ocr_details": [
                {"text": "APPLE SLICE", "confidence": 0.99, "box": [100, 100, 400, 180]},
                {"text": "250 ml", "confidence": 0.98, "box": [100, 200, 250, 240]},
                {"text": "MRP Rs. 20.00", "confidence": 0.95, "box": [100, 260, 300, 300]},
            ]
        },
        "compliance_result": {
            "overall_status": "PASS",
            "compliance_score": 92.5,
            "results": [
                {"rule_name": "Rule 6(1)(a) - Manufacturer Address", "status": "PASS", "requirement": "Name and address of manufacturer", "evidence": "Pepsico India Holdings Pvt Ltd", "recommendation": "Compliant"},
                {"rule_name": "Rule 6(1)(b) - Generic Name", "status": "PASS", "requirement": "Common or generic name", "evidence": "Apple Slice Fruit Drink", "recommendation": "Compliant"},
                {"rule_name": "Rule 6(1)(c) - Net Quantity", "status": "PASS", "requirement": "Standard unit of weight/measure", "evidence": "250 ml", "recommendation": "Compliant"},
                {"rule_name": "Rule 6(1)(d) - Month & Year", "status": "PASS", "requirement": "Manufacturing month and year", "evidence": "08/2026", "recommendation": "Compliant"},
                {"rule_name": "Rule 6(1)(da) - Country of Origin", "status": "PASS", "requirement": "Country of origin declaration", "evidence": "India", "recommendation": "Compliant"},
                {"rule_name": "Rule 6(1)(e) - Retail Sale Price (MRP)", "status": "PASS", "requirement": "MRP inclusive of all taxes", "evidence": "Rs. 20.00", "recommendation": "Compliant"},
                {"rule_name": "Rule 6(1)(f) - Consumer Care Contact", "status": "PASS", "requirement": "Helpline and email", "evidence": "1800 22 4020", "recommendation": "Compliant"},
                {"rule_name": "Rule 7 - Principal Display Panel", "status": "PASS", "requirement": "Numeral height >= 1.5mm", "evidence": "2.4mm", "recommendation": "Compliant"},
                {"rule_name": "Rule 8 - Declaration Placement", "status": "REVIEW", "requirement": "Prominent display", "evidence": "Border contrast adequate", "recommendation": "Verify physical contrast under natural light"},
            ]
        },
        "visual_analysis": {
            "mean_confidence": 0.97,
            "median_text_height": 2.4,
            "contrast_score": 0.88,
            "text_blocks_count": 14,
        },
        "overall_status": "PASS",
        "compliance_score": 92.5,
        "inspection_date": "2026-09-11 15:30:00",
    }

    pdf_bytes = generate_compliance_pdf(sample_report_payload)
    docx_bytes = generate_compliance_docx(sample_report_payload)

    assert len(pdf_bytes) > 2000, f"PDF too small: {len(pdf_bytes)} bytes"
    assert len(docx_bytes) > 5000, f"DOCX too small: {len(docx_bytes)} bytes"
    print(f"  [PASS] PDF generated cleanly ({len(pdf_bytes)} bytes)")
    print(f"  [PASS] DOCX generated cleanly ({len(docx_bytes)} bytes)")

    # -------------------------------------------------------------
    # TEST 5: STORAGE RETRIEVAL & STREAMING
    # -------------------------------------------------------------
    print("\n--- TEST 5: REPORT RETRIEVAL & SUPABASE STORAGE ---")
    reports = SupabaseService.get_reports(limit=1)
    if reports:
        first_rep = SupabaseService.get_report(reports[0]["id"])
        assert first_rep is not None, "Report retrieval returned None"
        pdf_content, fn_pdf, mt_pdf = _get_or_generate_report_bytes(first_rep, "pdf")
        doc_content, fn_doc, mt_doc = _get_or_generate_report_bytes(first_rep, "docx")
        assert len(pdf_content) > 1000, "PDF content empty"
        assert len(doc_content) > 1000, "DOCX content empty"
        assert mt_pdf == "application/pdf"
        assert mt_doc == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        print(f"  [PASS] Stored report '{reports[0]['report_number']}' retrievable as PDF ({len(pdf_content)} bytes) and DOCX ({len(doc_content)} bytes)")

    # -------------------------------------------------------------
    # TEST 6: ADMIN ANALYTICS & REFRESH
    # -------------------------------------------------------------
    print("\n--- TEST 6: SUPABASE BACKED ANALYTICS ---")
    analytics = SupabaseService.get_admin_analytics()
    assert "total_inspections" in analytics
    assert "pass_count" in analytics
    assert "fail_count" in analytics
    assert "review_count" in analytics
    assert "total_inspectors" in analytics
    print(f"  [PASS] Live Supabase analytics: Total Inspections={analytics['total_inspections']}, Pass={analytics['pass_count']}, Review={analytics['review_count']}, Active Inspectors={analytics['active_inspectors']}")

    print("\n" + "=" * 60)
    print("ALL E2E INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_e2e_tests()
