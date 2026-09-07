from app.services.compliance_rules import (
    get_rule,
    get_rule_check,
    get_rule_summary,
    get_automatable_rules,
    get_package_image_rules,
    get_baseline_info,
)


print("=" * 70)
print("LEGAL METROLOGY RULE MASTER")
print("=" * 70)

baseline = get_baseline_info()

print("Name:", baseline["name"])
print("Notification:", baseline["notification"])
print("Notification Date:", baseline["notification_date"])
print("Effective From:", baseline["effective_from"])
print("Version:", baseline["version"])


print()
print("=" * 70)
print("RULE SUMMARY")
print("=" * 70)

print(get_rule_summary())


print()
print("=" * 70)
print("ALL RULES")
print("=" * 70)

from app.services.compliance_rules import get_all_rules

for rule in get_all_rules():

    automation = rule["automation"]["type"]

    print(
        f'{rule["rule_id"]} | '
        f'Rule {rule["rule_number"]} | '
        f'{rule["rule_name"]} | '
        f'{automation}'
    )


print()
print("=" * 70)
print("RULE 6")
print("=" * 70)

rule_6 = get_rule("LM-06")

print(rule_6["rule_name"])

for check in rule_6["checks"]:

    print(
        f'{check["check_id"]} | '
        f'{check["name"]} | '
        f'{check["field"]}'
    )


print()
print("=" * 70)
print("RULE 6-01 CHECK")
print("=" * 70)

print(
    get_rule_check("LM-06-01")
)


print()
print("=" * 70)
print("PACKAGE IMAGE RULES")
print("=" * 70)

for rule in get_package_image_rules():

    print(
        f'{rule["rule_id"]} | '
        f'{rule["rule_name"]}'
    )


print()
print("=" * 70)
print("AUTOMATABLE RULES")
print("=" * 70)

for rule in get_automatable_rules():

    print(
        f'{rule["rule_id"]} | '
        f'{rule["automation"]["type"]}'
    )