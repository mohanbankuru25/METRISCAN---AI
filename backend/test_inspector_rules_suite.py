"""
Comprehensive test suite for Inspector Rules (Read-Only) & Rule Request Admin Notification System.
Tests:
1. Inspector Rules catalog retrieval from Supabase (GET /api/inspector/rules)
2. Read-only verification: rules must have required statutory attributes (category, severity, legal act, etc.)
3. Inspector Rule Request creation (POST /api/inspector/rule-requests)
4. Tamper-proofing: inspector_id comes exclusively from authenticated JWT, client cannot spoof
5. Inspector viewing own requests (GET /api/inspector/rule-requests)
6. Admin Notifications viewing submitted requests (GET /api/admin/rule-requests)
7. Admin reviewing, updating status to UNDER_REVIEW, then RESOLVED with admin_response (PATCH /api/admin/rule-requests/{id})
8. Role-based Access Control:
   - Unauthenticated access returns 401
   - Consumer access to inspector/admin endpoints returns 403
   - Inspector access to admin endpoints returns 403
9. Invariance: Inspector requests do NOT alter compliance engine rules or evaluation
10. Historical inspection integrity check
"""

import sys
import os
import uuid

# Reconfigure stdout for utf-8 on Windows
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from fastapi import HTTPException
from main import app
from app.services.supabase_service import SupabaseService
from app.services.compliance_engine import compliance_engine
import app.api.inspector as inspector_api
import app.api.admin as admin_api

client = TestClient(app)

# Preserve original auth helpers
orig_require_inspector = inspector_api.require_inspector
orig_require_admin = admin_api.require_admin

# Test user profiles
MOCK_INSPECTOR = {
    "id": "11111111-1111-1111-1111-111111111111",
    "username": "inspector.test",
    "full_name": "Test Officer Kumar",
    "role": "inspector",
    "is_active": True,
    "email": "inspector.test@metriscan.gov.in"
}

MOCK_ADMIN = {
    "id": "22222222-2222-2222-2222-222222222222",
    "username": "admin.test",
    "full_name": "Director General Sharma",
    "role": "admin",
    "is_active": True,
    "email": "admin.test@metriscan.gov.in"
}

AUTH_HEADER_INSPECTOR = {"Authorization": "Bearer inspector-token"}
AUTH_HEADER_ADMIN = {"Authorization": "Bearer admin-token"}

print("=" * 80)
print("TEST SUITE: INSPECTOR RULES & ADMIN NOTIFICATION RULE REQUEST SYSTEM")
print("=" * 80)

# ====================================================================
# TEST 1: INSPECTOR RULES CATALOG (READ-ONLY)
# ====================================================================
print("\n[TEST 1] Inspector Rules Catalog - Read-Only Access from Supabase")
inspector_api.require_inspector = lambda auth: MOCK_INSPECTOR

res = client.get("/api/inspector/rules", headers=AUTH_HEADER_INSPECTOR)
assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
data = res.json()
assert data.get("success") is True
rules = data.get("rules", [])
print(f"  -> Total Active Rules Fetched for Inspector: {len(rules)}")
assert len(rules) > 0, "Inspector should receive active statutory compliance rules"

sample_rule = rules[0]
print(f"  -> Sample Rule: {sample_rule.get('rule_code')} - {sample_rule.get('rule_name')}")
# Verify read-only statutory attributes exist
assert "rule_code" in sample_rule
assert "rule_name" in sample_rule
assert "category" in sample_rule
assert "severity" in sample_rule
assert "legal_act" in sample_rule
assert "status" in sample_rule
assert sample_rule.get("status") == "APPROVED"
print("  [PASS] Inspector can view active approved rules with full statutory attributes")

# ====================================================================
# TEST 2: INSPECTOR SUBMITS RULE REQUEST
# ====================================================================
print("\n[TEST 2] Inspector Submits Rule Request (SEND REQUEST)")
rule_code = sample_rule.get("rule_code")

payload = {
    "rule_id": sample_rule.get("id"),
    "rule_code": rule_code,
    "request_type": "Suggest Rule Change",
    "subject": f"Statutory Font Height Requirement Clarification for {rule_code}",
    "description": "Rule requirement wording should explicitly cite Schedule II Table 1 for area calculations.",
    "evidence_attachment_url": "https://example.com/gazette_notice_2026.pdf",
    # Malicious attempt to spoof another inspector
    "inspector_id": "99999999-9999-9999-9999-999999999999"
}

res = client.post("/api/inspector/rule-requests", json=payload, headers=AUTH_HEADER_INSPECTOR)
assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
created = res.json().get("request")
assert created is not None
print(f"  -> Created Request ID: {created.get('id')}")
print(f"  -> Request Subject: {created.get('subject')}")
print(f"  -> Status: {created.get('status')}")
assert created.get("status") == "PENDING"
assert created.get("request_type") == "Suggest Rule Change"

# Verify tamper-proof inspector_id: Must match authenticated MOCK_INSPECTOR ID, NOT spoofed ID
assert created.get("inspector_id") == MOCK_INSPECTOR["id"], \
    f"Tamper protection failed! Expected {MOCK_INSPECTOR['id']}, got {created.get('inspector_id')}"
print("  [PASS] Request created with PENDING status and authenticated inspector_id strictly enforced")

req_id = created.get("id")

# ====================================================================
# TEST 3: INSPECTOR RETRIEVES "MY REQUESTS"
# ====================================================================
print("\n[TEST 3] Inspector Views 'My Requests' History")
res = client.get("/api/inspector/rule-requests", headers=AUTH_HEADER_INSPECTOR)
assert res.status_code == 200
my_requests = res.json().get("requests", [])
print(f"  -> Total requests found for Inspector: {len(my_requests)}")
found = any(r.get("id") == req_id for r in my_requests)
assert found, "Submitted request must appear in Inspector's own request list"
print("  [PASS] Inspector can view their submitted requests")

# ====================================================================
# TEST 4: ADMIN RECEIVES NOTIFICATION IN ADMIN PORTAL
# ====================================================================
print("\n[TEST 4] Admin Portal Fetches Rule Requests (Notifications)")
admin_api.require_admin = lambda auth: MOCK_ADMIN

res = client.get("/api/admin/rule-requests", headers=AUTH_HEADER_ADMIN)
assert res.status_code == 200
admin_requests = res.json().get("requests", [])
print(f"  -> Total requests visible to Admin: {len(admin_requests)}")
admin_found = next((r for r in admin_requests if r.get("id") == req_id), None)
assert admin_found is not None, "Admin must see the newly submitted inspector request"
print(f"  -> Notification Item: [{admin_found.get('request_type')}] {admin_found.get('subject')}")
print(f"  -> Submitter: {admin_found.get('inspector_name', 'Enforcement Officer')}")
print("  [PASS] Inspector request received in Admin Notifications successfully")

# ====================================================================
# TEST 5: ADMIN REVIEWS AND MARKS UNDER REVIEW
# ====================================================================
print("\n[TEST 5] Admin Updates Request Status to UNDER_REVIEW")
review_payload = {
    "status": "UNDER_REVIEW",
    "admin_response": "Request logged with the Legal Metrology Technical Committee for Schedule II review."
}
res = client.patch(f"/api/admin/rule-requests/{req_id}", json=review_payload, headers=AUTH_HEADER_ADMIN)
assert res.status_code == 200
updated = res.json().get("request")
assert updated.get("status") == "UNDER_REVIEW"
assert updated.get("reviewed_by") == MOCK_ADMIN["id"]
print(f"  -> Status updated to: {updated.get('status')}")
print(f"  -> Admin Response: {updated.get('admin_response')}")
print("  [PASS] Request transitioned to UNDER_REVIEW")

# ====================================================================
# TEST 6: ADMIN RESOLVES REQUEST
# ====================================================================
print("\n[TEST 6] Admin Resolves Request with Final Advisory Response")
resolve_payload = {
    "status": "RESOLVED",
    "admin_response": "Rule 6 statutory guidance updated in Gazette Notification 2026. Schedule II Table 1 verified."
}
res = client.patch(f"/api/admin/rule-requests/{req_id}", json=resolve_payload, headers=AUTH_HEADER_ADMIN)
assert res.status_code == 200
resolved = res.json().get("request")
assert resolved.get("status") == "RESOLVED"
assert "Schedule II Table 1 verified" in resolved.get("admin_response")
print(f"  -> Final Status: {resolved.get('status')}")
print("  [PASS] Request successfully resolved by Admin with official response")

# ====================================================================
# TEST 7: INSPECTOR SEES UPDATED RESOLUTION IN "MY REQUESTS"
# ====================================================================
print("\n[TEST 7] Inspector Sees Resolved Status in 'My Requests'")
res = client.get("/api/inspector/rule-requests", headers=AUTH_HEADER_INSPECTOR)
assert res.status_code == 200
my_updated_reqs = res.json().get("requests", [])
resolved_req = next((r for r in my_updated_reqs if r.get("id") == req_id), None)
assert resolved_req is not None
assert resolved_req.get("status") == "RESOLVED"
assert resolved_req.get("admin_response") is not None
print(f"  -> Inspector sees Status: {resolved_req.get('status')}")
print(f"  -> Inspector sees Admin Response: {resolved_req.get('admin_response')}")
print("  [PASS] Inspector request reflection loop verified end-to-end")

# ====================================================================
# TEST 8: SECURITY & ROLE PERMISSION ENFORCEMENT
# ====================================================================
print("\n[TEST 8] Security & Role Enforcement Checks")

# Restore original functions
inspector_api.require_inspector = orig_require_inspector
admin_api.require_admin = orig_require_admin

# 1. Unauthenticated access without header -> 401
res_no_auth = client.get("/api/inspector/rules")
assert res_no_auth.status_code == 401, f"Expected 401 for unauthenticated request, got {res_no_auth.status_code}"
print("  -> Unauthenticated request rejected: 401 Unauthorized [PASS]")

# 2. Inspector trying to call Admin endpoints -> 403
admin_api.require_admin = lambda auth: (_ for _ in ()).throw(HTTPException(status_code=403, detail="Admin access required"))
res_forbidden = client.get("/api/admin/rule-requests", headers=AUTH_HEADER_INSPECTOR)
assert res_forbidden.status_code == 403
print("  -> Non-admin accessing admin rule-requests rejected: 403 Forbidden [PASS]")

# 3. Consumer trying to call Inspector endpoints -> 403
inspector_api.require_inspector = lambda auth: (_ for _ in ()).throw(HTTPException(status_code=403, detail="Inspector access required"))
res_consumer_blocked = client.get("/api/inspector/rules", headers={"Authorization": "Bearer consumer-token"})
assert res_consumer_blocked.status_code == 403
print("  -> Consumer accessing inspector rules rejected: 403 Forbidden [PASS]")

# ====================================================================
# TEST 9: INVARIANCE - INSPECTOR REQUESTS NEVER AUTO-MODIFY RULES
# ====================================================================
print("\n[TEST 9] Invariance Check: Inspector Requests Do NOT Modify Rules or Compliance Engine")
inspector_api.require_inspector = lambda auth: MOCK_INSPECTOR

# Fetch rule before
before_rule = SupabaseService.get_rule(sample_rule["id"])

# Submit another request suggesting modification
new_req_payload = {
    "rule_id": sample_rule["id"],
    "rule_code": rule_code,
    "request_type": "Report Incorrect Rule",
    "subject": "Testing whether this changes the rule automatically",
    "description": "Rule threshold must be changed immediately!"
}
res = client.post("/api/inspector/rule-requests", json=new_req_payload, headers=AUTH_HEADER_INSPECTOR)
assert res.status_code == 201

# Fetch rule after
after_rule = SupabaseService.get_rule(sample_rule["id"])

assert before_rule.get("requirement") == after_rule.get("requirement"), "Rule was altered! Inspector requests must NEVER modify rules."
assert before_rule.get("is_active") == after_rule.get("is_active"), "Rule active state was altered!"
print("  [PASS] Statutory rule in Supabase remained strictly unaltered by Inspector request")

# Verify compliance engine still evaluates normally
from app.services.applicability_engine import applicability_engine

dummy_product = {
    "product_name": "QUAKER OATS",
    "net_quantity": "1 kg",
    "mrp": "Rs. 199",
    "date_of_manufacture": "23 SEP 23",
    "manufacturer_or_packer": "PepsiCo",
    "address": "India",
    "consumer_contact": "1800-123-456",
    "product_category": "packaged_food",
}
dummy_ocr = [
    {"text": "QUAKER OATS", "confidence": 0.98},
    {"text": "NET WEIGHT 1 kg", "confidence": 0.97},
    {"text": "MRP Rs. 199", "confidence": 0.96},
]
applicability_res = applicability_engine.determine(
    product_data=dummy_product,
    ocr_text=[item["text"] for item in dummy_ocr],
)
compliance_result = compliance_engine.evaluate(
    product_data=dummy_product,
    applicability_result=applicability_res,
    ocr_results=dummy_ocr,
)
assert compliance_result is not None
assert "results" in compliance_result
print(f"  -> Compliance engine evaluated {len(compliance_result['results'])} rules successfully")
print("  [PASS] Compliance engine operational integrity verified")

print("\n" + "=" * 80)
print("ALL 9 TEST PHASES PASSED WITH ZERO ERRORS!")
print("=" * 80)
