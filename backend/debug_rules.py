import sys
import os
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.supabase_service import SupabaseService
from app.services.compliance_rules import RULE_MASTER

print(f"Total rules in RULE_MASTER: {len(RULE_MASTER)}")
for r in RULE_MASTER:
    auto = r.get("automation", {}).get("type")
    print(f"  {r['rule_id']}: {r.get('rule_number'):6} | auto={str(auto):15} | {r['rule_name']}")

rules = SupabaseService.get_rules(include_deleted=True, limit=200)
print(f"Total rules in Supabase: {len(rules)}")

approved = [r for r in rules if r.get("status") in ("APPROVED", None)]
print(f"APPROVED rules: {len(approved)}")

approved_enabled = [
    r for r in rules
    if r.get("status") in ("APPROVED", None) and (r.get("active") is True or r.get("is_active") is True or (r.get("active") is None and r.get("is_active") is None)) and not r.get("is_deleted")
]
print(f"APPROVED + ENABLED rules: {len(approved_enabled)}")

disabled = [
    r for r in rules
    if (r.get("active") is False or r.get("is_active") is False) and not r.get("is_deleted")
]
print(f"DISABLED rules: {len(disabled)}")

print("\nAll Rules Summary:")
for r in sorted(rules, key=lambda x: str(x.get("rule_code"))):
    code = r.get("rule_code")
    status = r.get("status")
    active = r.get("active")
    is_active = r.get("is_active")
    is_deleted = r.get("is_deleted")
    name = r.get("rule_name")
    print(f"  {code:10} | status={status:10} | active={str(active):5} | is_active={str(is_active):5} | is_deleted={str(is_deleted):5} | {name}")
