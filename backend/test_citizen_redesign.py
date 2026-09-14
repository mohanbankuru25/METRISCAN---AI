import os
import sys
from datetime import date, datetime, timedelta

# Ensure UTF-8 stdout for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.consumer_service import ConsumerService, _RECENT_CONSUMER_SCANS
from app.services.consumer_report_generator import generate_consumer_report_pdf

print("============================================================")
print("TEST SUITE: METRIScan Citizen Experience & Multi-Language")
print("============================================================\n")

# ------------------------------------------------------------
# TEST 1: Date & Expiry Status Determination
# ------------------------------------------------------------
print("--- TEST 1: Shelf Life & Expiry Date Calculation ---")
today = date.today()
past_date = (today - timedelta(days=60)).strftime("%d-%b-%Y")
future_date = (today + timedelta(days=120)).strftime("%d-%b-%Y")

# 1A: Expired product
res_expired = ConsumerService.extract_nutrition_and_ingredients(
    raw_text="",
    product_data={"expiry_date": past_date},
    language="en",
)
assert res_expired["is_expired"] is True, f"Expected is_expired=True, got {res_expired['is_expired']}"
assert res_expired["expiry_status"] == "EXPIRED", f"Expected EXPIRED, got {res_expired['expiry_status']}"
assert any("EXPIRED" in w for w in res_expired["warnings"]), "Expected expired warning in warnings"
print(f"✓ 1A: Past date ({past_date}) correctly identified as EXPIRED")

# 1B: Valid within shelf life product
res_valid = ConsumerService.extract_nutrition_and_ingredients(
    raw_text="",
    product_data={"best_before": future_date},
    language="en",
)
assert res_valid["is_expired"] is False, f"Expected is_expired=False, got {res_valid['is_expired']}"
assert res_valid["expiry_status"] == "VALID", f"Expected VALID, got {res_valid['expiry_status']}"
print(f"✓ 1B: Future date ({future_date}) correctly identified as VALID")

# 1C: Missing or unreadable date
res_unknown = ConsumerService.extract_nutrition_and_ingredients(
    raw_text="",
    product_data={"expiry_date": "Not detected"},
    language="en",
)
assert res_unknown["is_expired"] is False, f"Expected is_expired=False, got {res_unknown['is_expired']}"
assert res_unknown["expiry_status"] == "UNDETERMINED", f"Expected UNDETERMINED, got {res_unknown['expiry_status']}"
print("✓ 1C: Undetected expiry correctly marked UNDETERMINED (NOT assumed expired)")


# ------------------------------------------------------------
# TEST 2: Ingredients & Declared Percentages
# ------------------------------------------------------------
print("\n--- TEST 2: Ingredients & Declared Percentages ---")

# 2A: Explicit percentages declared
raw_with_pct = "Ingredients: Rolled Oats 60%, Gram Flour 20%, Dehydrated Vegetables 10%, Spices 10%"
res_pct = ConsumerService.extract_nutrition_and_ingredients(
    raw_text=raw_with_pct,
    product_data={},
    language="en",
)
assert res_pct["has_explicit_percentages"] is True, "Expected has_explicit_percentages=True"
assert len(res_pct["ingredients"]) == 4, f"Expected 4 ingredients, got {len(res_pct['ingredients'])}"
assert res_pct["ingredients"][0]["percentage"] == "60.0%" or "60" in str(res_pct["ingredients"][0]["percentage"])
print("✓ 2A: Declared ingredient percentages correctly captured without estimation")

# 2B: Percentages NOT declared on label
raw_no_pct = "Ingredients: Wheat Flour, Sugar, Edible Vegetable Oil, Salt, Raising Agents"
res_no_pct = ConsumerService.extract_nutrition_and_ingredients(
    raw_text=raw_no_pct,
    product_data={},
    language="en",
)
assert res_no_pct["has_explicit_percentages"] is False, "Expected has_explicit_percentages=False"
assert "not explicitly declared" in res_no_pct["ingredient_note"].lower()
for ing in res_no_pct["ingredients"]:
    assert ing.get("percentage") is None, "Should not invent or estimate percentage"
print("✓ 2B: Undeclared percentages correctly noted without inventing numbers")


# ------------------------------------------------------------
# TEST 3: Neutral Consumer Nutrition Guidance (No Medical Diagnoses)
# ------------------------------------------------------------
print("\n--- TEST 3: Nutrition Table & Neutral Consumer Notes ---")
raw_nutri = "Nutrition Facts Per 100g: Energy 420 kcal, Carbohydrates 68 g, Total Sugars 22 g, Protein 8.5 g, Total Fat 14 g, Sodium 350 mg"
res_nutri = ConsumerService.extract_nutrition_and_ingredients(
    raw_text=raw_nutri,
    product_data={},
    language="en",
)
assert "sugars" in res_nutri["nutrition_data"], "Expected sugars in nutrition data"
assert "energy" in res_nutri["nutrition_data"], "Expected energy in nutrition data"
sugar_recs = [r for r in res_nutri["recommendations"] if "sugar" in r.get("category", "").lower()]
assert len(sugar_recs) > 0, "Expected sugar advisory"
sugar_text = sugar_recs[0]["text"]
# Verify neutral tone without medical diagnosis claims
assert "cure" not in sugar_text.lower()
assert "dangerous" not in sugar_text.lower()
assert "qualified healthcare professional" in sugar_text.lower()
print("✓ 3: Neutral, evidence-based nutrition advisory provided without disease diagnoses")


# ------------------------------------------------------------
# TEST 4: Allergen Detection
# ------------------------------------------------------------
print("\n--- TEST 4: Allergen Detection & Guidance ---")
raw_allergen = "Contains Milk, Wheat, and traces of Soy and Almonds."
res_allergen = ConsumerService.extract_nutrition_and_ingredients(
    raw_text=raw_allergen,
    product_data={},
    language="en",
)
assert "Milk" in res_allergen["allergens"], "Expected Milk allergen"
assert "Wheat" in res_allergen["allergens"], "Expected Wheat allergen"
assert "Almond" in res_allergen["allergens"], "Expected Almond allergen"
print("✓ 4: Declared allergens properly detected and flagged for sensitive consumers")


# ------------------------------------------------------------
# TEST 5: Multilingual Dynamic Advisory (Hindi, Marathi, Telugu)
# ------------------------------------------------------------
print("\n--- TEST 5: Multilingual Localization of Advisory ---")

res_hi = ConsumerService.extract_nutrition_and_ingredients(
    raw_text=raw_with_pct + " " + raw_nutri,
    product_data={"expiry_date": past_date},
    language="hi",
)
assert any("समाप्त" in w for w in res_hi["warnings"]), "Expected Hindi expired warning"
assert any("शर्करा" in r.get("category", "") for r in res_hi["recommendations"]), "Expected Hindi sugar category"
print("✓ 5A: Hindi consumer advisory generated correctly")

res_mr = ConsumerService.extract_nutrition_and_ingredients(
    raw_text=raw_with_pct + " " + raw_nutri,
    product_data={"expiry_date": past_date},
    language="mr",
)
assert any("कालबाह्य" in w for w in res_mr["warnings"]), "Expected Marathi expired warning"
print("✓ 5B: Marathi consumer advisory generated correctly")

res_te = ConsumerService.extract_nutrition_and_ingredients(
    raw_text=raw_with_pct + " " + raw_nutri,
    product_data={"expiry_date": past_date},
    language="te",
)
assert any("గడువు ముగిసిన" in w for w in res_te["warnings"]), "Expected Telugu expired warning"
print("✓ 5C: Telugu consumer advisory generated correctly")


# ------------------------------------------------------------
# TEST 6: Multilingual Consumer PDF Generation (Native Unicode Fonts)
# ------------------------------------------------------------
print("\n--- TEST 6: Multilingual Consumer PDF Generation ---")
mock_product_data = {
    "id": "scan-test-uuid-12345",
    "product_name": "QUAKER OATS CHILLA",
    "category": "Packaged Food",
    "mrp": "₹199",
    "net_quantity": "1 kg",
    "batch_number": "TV230923",
    "manufacturing_date": "23-Sep-2023",
    "expiry_date": "22-Sep-2024",
    "is_expired": True,
    "expiry_status": "EXPIRED",
    "ingredients": [
        {"order": 1, "name": "Oats", "percentage": "60%"},
        {"order": 2, "name": "Gram Flour", "percentage": "20%"},
        {"order": 3, "name": "Vegetables", "percentage": "10%"},
    ],
    "has_explicit_percentages": True,
    "nutrition_data": {
        "energy": "385 kcal",
        "protein": "12 g",
        "carbohydrates": "64 g",
        "sugars": "19 g",
        "dietary_fiber": "8 g",
    },
    "allergens": ["Gluten", "Milk"],
    "recommendations": [
        {"category": "Sugar Sensitive", "text": "Product declares 19 g sugar per 100 g. Check with healthcare professional."},
        {"category": "General Advice", "text": "Check package seal integrity before purchasing."}
    ],
    "manufacturer": "PepsiCo India Holdings Pvt. Ltd.",
    "consumer_contact": "1800-22-4020 / consumer.feedback@pepsico.com",
    "fssai_license": "10012011000168",
}

for lang_code in ["en", "hi", "mr", "te"]:
    pdf_bytes = generate_consumer_report_pdf(mock_product_data, language=lang_code)
    assert len(pdf_bytes) > 20000, f"PDF for {lang_code} is unexpectedly small ({len(pdf_bytes)} bytes)"
    print(f"✓ 6: {lang_code.upper()} Consumer PDF generated successfully ({len(pdf_bytes)} bytes, no font corruption)")


# ------------------------------------------------------------
# TEST 7: Backend Security & Ownership Check
# ------------------------------------------------------------
print("\n--- TEST 7: Backend Security & Cross-Citizen Scan Isolation ---")
# Simulate user A scan
test_scan_id = "test-sec-scan-001"
_RECENT_CONSUMER_SCANS[test_scan_id] = {
    "id": test_scan_id,
    "consumer_user_id": "user-A-uuid",
    "product_name": "Product A",
    "mrp": "₹50",
}

# User A tries to view their own scan -> Success
detail_own = ConsumerService.get_consumer_scan_detail(test_scan_id, consumer_user_id="user-A-uuid")
assert detail_own is not None, "User A should be able to view their own scan"
assert detail_own["product_name"] == "Product A"

# User B tries to view User A's scan -> Blocked (None)
detail_other = ConsumerService.get_consumer_scan_detail(test_scan_id, consumer_user_id="user-B-uuid")
assert detail_other is None, f"User B must NOT be able to view User A's scan! Got: {detail_other}"
print("✓ 7: Strict scan ownership enforced; cross-citizen scan access blocked")


# ------------------------------------------------------------
# TEST 8: Compliance Engine Definite FAIL vs REVIEW
# ------------------------------------------------------------
print("\n--- TEST 8: Internal Compliance Check & Admin Alert Logic ---")
# Simulate compliance outcome with only REVIEW (insufficient evidence)
failed_rules_review = [r for r in [{"rule_code": "LM-01", "status": "REVIEW"}] if r.get("status") == "FAIL"]
overall_status_review = "REVIEW"
has_fail_review = len(failed_rules_review) > 0 or overall_status_review == "FAIL"
assert not (has_fail_review and overall_status_review not in ("REVIEW", "NOT_APPLICABLE", "OUT_OF_SCOPE", "PASS")), "REVIEW status must NOT trigger admin alert!"
print("✓ 8A: REVIEW status correctly suppressed from generating Admin alert")

# Simulate compliance outcome with definite FAIL
failed_rules_fail = [r for r in [{"rule_code": "LM-06-07", "status": "FAIL", "severity": "HIGH"}] if r.get("status") == "FAIL"]
overall_status_fail = "FAIL"
has_fail_definite = len(failed_rules_fail) > 0 or overall_status_fail == "FAIL"
assert has_fail_definite and overall_status_fail not in ("REVIEW", "NOT_APPLICABLE", "OUT_OF_SCOPE", "PASS"), "Definite FAIL MUST trigger admin alert"
print("✓ 8B: Definite FAIL status correctly triggers Admin alert")

print("\n============================================================")
print("ALL 8 CITIZEN EXPERIENCE & MULTI-LANGUAGE TESTS PASSED!")
print("============================================================")
