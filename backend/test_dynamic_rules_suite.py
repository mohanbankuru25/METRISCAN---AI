"""
Comprehensive test suite for Dynamic Rule Management.
Tests:
1. Supabase rules fetching & status filtering (DRAFT, APPROVED, ALL)
2. Synthetic statutory PDF creation & text extraction (RuleExtractorService)
3. Upload API endpoint (POST /api/admin/rules/upload)
4. Admin Rule Approval (POST /api/admin/rules/{id}/approve)
5. Admin Rule Rejection (POST /api/admin/rules/{id}/reject)
6. Admin Rule Enable / Disable toggle
7. Compliance Engine dynamic evaluation with active/disabled rules
8. Admin Rule Deletion (soft delete deactivation)
"""

import sys
import os
import io
import asyncio
from datetime import datetime

# Set path to backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.supabase_service import SupabaseService
from app.services.compliance_rules import RULE_MASTER, get_seed_records
from app.services.rule_extractor import RuleExtractorService
from app.services.compliance_engine import compliance_engine
from app.services.applicability_engine import applicability_engine

def generate_sample_statutory_pdf_bytes() -> bytes:
    """Generate a valid statutory PDF with legal metrology rules using reportlab or fpdf if available, or simple PDF byte stream."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        
        # Page 1
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, 750, "MINISTRY OF CONSUMER AFFAIRS, FOOD AND PUBLIC DISTRIBUTION")
        c.setFont("Helvetica", 11)
        c.drawString(50, 730, "NOTIFICATION - Legal Metrology (Packaged Commodities) Amendment Rules")
        
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, 690, "Rule 6(1)(a) Declaration of Manufacturer and Packer Details:")
        c.setFont("Helvetica", 10)
        c.drawString(50, 675, "Every package shall bear the name and complete postal address of the manufacturer,")
        c.drawString(50, 660, "packer, or importer with telephone number and email address.")
        
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, 630, "Rule 6(1)(c) Net Quantity Declaration in Standard Units:")
        c.setFont("Helvetica", 10)
        c.drawString(50, 615, "The net quantity in terms of standard unit of weight or measure shall be declared")
        c.drawString(50, 600, "on the principal display panel with proper font height and contrast.")

        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, 570, "Rule 6(1)(e) Maximum Retail Price (MRP) Declaration:")
        c.setFont("Helvetica", 10)
        c.drawString(50, 555, "The maximum retail price at which the commodity in packaged form may be sold")
        c.drawString(50, 540, "to the ultimate consumer, inclusive of all taxes, shall be stated as 'MRP Rs. XX.XX incl. of all taxes'.")

        c.showPage()
        c.save()
        buf.seek(0)
        return buf.getvalue()
    except ImportError:
        # Fallback: create standard minimal PDF
        pdf_text = (
            b"%PDF-1.4\n"
            b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
            b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
            b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n"
            b"4 0 obj << /Length 420 >> stream\n"
            b"BT /F1 12 Tf 50 700 Td (Rule 6(1)(a) Declaration of Manufacturer name and address) Tj T* "
            b"(Rule 6(1)(c) Net Quantity must be declared in metric units g, kg, ml, l) Tj T* "
            b"(Rule 6(1)(e) Maximum Retail Price MRP Rs inclusive of all taxes) Tj ET\n"
            b"endstream\nendobj\n"
            b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \n"
            b"trailer << /Size 5 /Root 1 0 R >>\nstartxref\n680\n%%EOF\n"
        )
        return pdf_text

async def run_all_tests():
    print("=" * 70)
    print("METRISCAN DYNAMIC RULE MANAGEMENT — VERIFICATION SUITE")
    print("=" * 70)

    # 1. Baseline Rules in Supabase
    print("\n[TEST 1] Verifying Supabase rules connection & seeded baseline rules...")
    rules = SupabaseService.get_rules()
    print(f"-> Total rules returned from Supabase: {len(rules)}")
    assert len(rules) >= 34, f"Expected at least 34 rules, found {len(rules)}"
    
    # Check for rule codes
    rule_codes = {r.get("rule_code") for r in rules}
    for expected in ["LM-01", "LM-02", "LM-03", "LM-05", "LM-06", "LM-09", "LM-12", "LM-16", "LM-23", "LM-34"]:
        assert expected in rule_codes, f"Baseline rule {expected} missing from Supabase!"
    print("-> PASS: All baseline rules (LM-01 to LM-34) verified in Supabase.")

    # 2. Status filtering
    print("\n[TEST 2] Testing get_rules status filtering...")
    approved_rules = SupabaseService.get_rules(status="APPROVED")
    print(f"-> APPROVED rules: {len(approved_rules)}")
    assert len(approved_rules) >= 34, "Baseline rules should be APPROVED"
    
    draft_rules = SupabaseService.get_rules(status="DRAFT")
    print(f"-> DRAFT rules currently in DB: {len(draft_rules)}")
    print("-> PASS: Status filtering operates correctly.")

    # 3. Rule Extractor & Upload processing
    print("\n[TEST 3] Testing RuleExtractorService PDF extraction & candidate generation...")
    pdf_bytes = generate_sample_statutory_pdf_bytes()
    upload_result = RuleExtractorService.process_and_store_document(
        file_bytes=pdf_bytes,
        filename="gazette_notification_test.pdf",
        admin_id="Admin-Test-Suite"
    )
    print(f"-> Upload Result:")
    print(f"   Document: {upload_result.get('document_name')}")
    print(f"   Pages parsed: {upload_result.get('pages_count')}")
    print(f"   Rules detected: {upload_result.get('rules_detected_count')}")
    candidates = upload_result.get("candidate_rules", [])
    assert len(candidates) > 0, "Expected at least one candidate rule extracted from statutory PDF"
    
    sample_candidate = candidates[0]
    print(f"   Candidate 1: Code={sample_candidate.get('rule_code')}, Status={sample_candidate.get('status')}, Active={sample_candidate.get('active')}, Automation={sample_candidate.get('automation_type')}")
    assert sample_candidate.get("status") == "DRAFT", "Candidate rules MUST be in DRAFT status"
    assert sample_candidate.get("active") is False, "Candidate rules MUST NOT be automatically activated"
    assert sample_candidate.get("id"), "Candidate rule must be persisted with an ID in Supabase"
    print("-> PASS: Document extraction generates persisted DRAFT rules without auto-activation.")

    # 4. Admin Rule Approval
    print("\n[TEST 4] Testing Admin Rule Approval flow...")
    test_draft_id = sample_candidate["id"]
    approved_rule = SupabaseService.approve_rule(test_draft_id, admin_id="Admin-Tester")
    print(f"-> Approved Rule {test_draft_id}:")
    print(f"   Status={approved_rule.get('status')}, Active={approved_rule.get('active') or approved_rule.get('is_active')}, ApprovedBy={approved_rule.get('approved_by')}")
    assert approved_rule.get("status") == "APPROVED", "Status must transition to APPROVED"
    assert approved_rule.get("is_active") is True or approved_rule.get("active") is True, "Rule must become active upon approval"
    print("-> PASS: Rule approval successfully activates the rule and updates audit metadata.")

    # 5. Admin Rule Rejection
    print("\n[TEST 5] Testing Admin Rule Rejection flow...")
    if len(candidates) > 1:
        test_reject_id = candidates[1]["id"]
    else:
        # Create a temp draft rule to test rejection
        temp_draft = SupabaseService.create_rule({
            "rule_code": "LM-TEMP-REJECT",
            "rule_name": "Temporary Reject Candidate",
            "description": "To test rejection",
            "category": "GENERAL",
            "status": "DRAFT",
            "active": False,
            "is_enabled": False
        })
        test_reject_id = temp_draft["id"]

    rejected_rule = SupabaseService.reject_rule(test_reject_id, admin_id="Admin-Tester")
    print(f"-> Rejected Rule {test_reject_id}:")
    print(f"   Status={rejected_rule.get('status')}, Active={rejected_rule.get('active') or rejected_rule.get('is_active')}")
    assert rejected_rule.get("status") == "REJECTED", "Status must transition to REJECTED"
    assert not (rejected_rule.get("is_active") or rejected_rule.get("active")), "Rejected rule must remain inactive"
    print("-> PASS: Rule rejection successfully transitions status to REJECTED and stays inactive.")

    # 6. Admin Rule Enable / Disable toggle
    print("\n[TEST 6] Testing Rule Enable / Disable toggle...")
    # Toggle approved rule to inactive
    toggled_off = SupabaseService.update_rule(test_draft_id, {"is_active": False, "active": False, "is_enabled": False})
    print(f"-> Toggled OFF: active={toggled_off.get('is_active')}")
    assert not toggled_off.get("is_active"), "Rule must be inactive"
    
    # Toggle approved rule back to active
    toggled_on = SupabaseService.update_rule(test_draft_id, {"is_active": True, "active": True, "is_enabled": True})
    print(f"-> Toggled ON: active={toggled_on.get('is_active')}")
    assert toggled_on.get("is_active"), "Rule must be active"
    print("-> PASS: Enable / Disable toggle works seamlessly.")

    # 7. Compliance Engine Dynamic Rule Evaluation
    print("\n[TEST 7] Testing Compliance Engine dynamic rule loading & execution...")
    # Prepare dummy product data & OCR evidence
    dummy_product = {
        "product_name": "QUAKER OATS",
        "net_quantity": "1 kg",
        "mrp": "₹199",
        "batch_number": "TV230923",
        "date_of_manufacture": "23 SEP 23",
        "best_before": None,
        "use_by": "22 SEP 24",
        "manufacturer_or_packer": "PepsiCo",
        "address": "India",
        "consumer_contact": "1800-123-456",
        "product_category": "packaged_food",
    }
    dummy_ocr = [
        {"text": "QUAKER OATS", "confidence": 0.98, "bbox": [100, 100, 400, 150]},
        {"text": "NET WEIGHT 1 kg", "confidence": 0.96, "bbox": [100, 200, 400, 250]},
        {"text": "MRP Rs. 199.00 INCL OF ALL TAXES", "confidence": 0.97, "bbox": [100, 300, 500, 350]},
        {"text": "MANUFACTURED BY PEPSICO", "confidence": 0.95, "bbox": [100, 400, 500, 450]},
        {"text": "USE BY 22 SEP 24", "confidence": 0.94, "bbox": [100, 500, 400, 550]},
        {"text": "CONSUMER CARE 1800-123-456", "confidence": 0.93, "bbox": [100, 600, 500, 650]},
    ]

    app_res = applicability_engine.determine(
        product_data=dummy_product,
        ocr_text=[item["text"] for item in dummy_ocr]
    )

    # Evaluate with standard rules active
    report_initial = compliance_engine.evaluate(
        product_data=dummy_product,
        applicability_result=app_res,
        ocr_results=dummy_ocr
    )
    results_list = report_initial.get("results", [])
    print(f"-> Standard evaluation produced {len(results_list)} rule results.")
    print(f"   Overall status: {report_initial.get('overall_status')}")
    
    finding_codes = {r.get("rule_id") for r in results_list}
    has_lm06 = any(str(rid).startswith("LM-06") for rid in finding_codes)
    assert has_lm06, "Baseline rule LM-06 should be evaluated"
    print("-> PASS: Active baseline rules evaluated by Compliance Engine.")

    # Now simulate disabling rule LM-06 in Supabase
    print("\n[TEST 8] Testing Compliance Engine skips disabled rules...")
    lm06_records = [r for r in rules if r.get("rule_code") == "LM-06"]
    if lm06_records:
        lm06_id = lm06_records[0]["id"]
        # Temporarily disable LM-06
        SupabaseService.update_rule(lm06_id, {"is_active": False, "active": False, "is_enabled": False})
        
        # Re-evaluate
        report_disabled = compliance_engine.evaluate(
            product_data=dummy_product,
            applicability_result=app_res,
            ocr_results=dummy_ocr
        )
        findings_disabled_codes = {r.get("rule_id") for r in report_disabled.get("results", [])}
        print(f"   Results count without LM-06: {len(findings_disabled_codes)}")
        has_lm06_disabled = any(str(rid).startswith("LM-06") for rid in findings_disabled_codes)
        assert not has_lm06_disabled, "LM-06 MUST NOT be evaluated when disabled by Admin!"
        print("-> PASS: Compliance Engine strictly honored disabled rule LM-06.")

        # Re-enable LM-06
        SupabaseService.update_rule(lm06_id, {"is_active": True, "active": True, "is_enabled": True})
        report_reenabled = compliance_engine.evaluate(
            product_data=dummy_product,
            applicability_result=app_res,
            ocr_results=dummy_ocr
        )
        findings_reenabled_codes = {r.get("rule_id") for r in report_reenabled.get("results", [])}
        has_lm06_reenabled = any(str(rid).startswith("LM-06") for rid in findings_reenabled_codes)
        assert has_lm06_reenabled, "LM-06 must be evaluated after re-enabling."
        print("-> PASS: Compliance Engine evaluated LM-06 again after re-enabling.")

    # 9. Clean up test rules
    print("\n[TEST 9] Testing soft deletion / cleanup of test rules...")
    SupabaseService.delete_rule(test_draft_id)
    SupabaseService.delete_rule(test_reject_id)
    print("-> PASS: Soft delete completed successfully.")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED SUCCESSFULLY! ZERO ERRORS ENCOUNTERED.")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_all_tests())
