import sys
import os
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.supabase_service import SupabaseService
from app.services.applicability_engine import applicability_engine
from app.services.compliance_engine import compliance_engine

print("=" * 80)
print("COMPARING ADMIN ACTIVE RULES VS COMPLIANCE ENGINE EVALUATION")
print("=" * 80)

# 1. Admin Active Rules from Supabase
all_rules = SupabaseService.get_rules(include_deleted=True, limit=200)
admin_active_rules = [
    r for r in all_rules
    if r.get("status") in ("APPROVED", None)
    and (r.get("active") is True or r.get("is_active") is True or (r.get("active") is None and r.get("is_active") is None))
    and not r.get("is_deleted")
]
print(f"ADMIN ACTIVE RULE COUNT: {len(admin_active_rules)}")
admin_rule_codes = {r.get("rule_code"): r for r in admin_active_rules}

# 2. Evaluate Compliance Engine
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

evaluated_results = compliance_result.get("results", [])
print(f"INSPECTION ACTIVE RULE COUNT (EVALUATED): {len(evaluated_results)}")

evaluated_rule_ids = [r.get("rule_id") for r in evaluated_results]
print("\nEvaluated Rule IDs:")
for idx, r in enumerate(evaluated_results, 1):
    print(f"  {idx:2d}. {r.get('rule_id'):10} | {r.get('rule_number'):12} | {r.get('status'):15} | {r.get('rule_name')}")

print("\n" + "=" * 80)
print("ANALYSIS OF DISCREPANCIES:")
print("=" * 80)
# Check missing in evaluation vs admin active
missing_in_eval = set(admin_rule_codes.keys()) - set(evaluated_rule_ids)
print(f"MISSING RULE IDs in evaluation (present in Admin active, missing in eval): {len(missing_in_eval)}")
for m in sorted(missing_in_eval):
    print(f"  - {m}: {admin_rule_codes[m].get('rule_name')}")

# Extra in evaluation not in admin active
extra_in_eval = set(evaluated_rule_ids) - set(admin_rule_codes.keys())
print(f"\nEXTRA RULE IDs in evaluation: {len(extra_in_eval)}")
for e in sorted(extra_in_eval):
    print(f"  + {e}")

# Duplicates in evaluation
seen = set()
duplicates = [x for x in evaluated_rule_ids if x in seen or seen.add(x)]
print(f"\nDUPLICATE RULE IDs in evaluation: {duplicates}")
