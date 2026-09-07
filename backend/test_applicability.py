from app.services.applicability_engine import applicability_engine


print("=" * 70)
print("LEGAL METROLOGY APPLICABILITY ENGINE")
print("=" * 70)


# ---------------------------------------------------------
# TEST 1: NORMAL RETAIL FOOD PACKAGE
# ---------------------------------------------------------

product_data = {
    "product_name": "QUAKER OATS",
    "net_quantity": "1 kg",
    "mrp": "₹199",
    "manufacturer_or_packer": "PepsiCo",
    "address": "India",
    "consumer_contact": "1800-123-456",
}


ocr_text = [
    "QUAKER OATS",
    "NET WEIGHT 1 kg",
    "MRP Rs 199",
    "MANUFACTURED BY PEPSICO",
]


result = applicability_engine.determine(
    product_data=product_data,
    ocr_text=ocr_text,
)


print("\nPACKAGE CONTEXT")
print(result["package_context"])


print("\nSUMMARY")
print(result["summary"])


print("\nRULES")
for rule in result["rules"]:
    print(
        f'{rule["rule_id"]} | '
        f'Rule {rule["rule_number"]} | '
        f'{rule["status"]} | '
        f'applicable={rule["applicable"]}'
    )


# ---------------------------------------------------------
# TEST 2: INDUSTRIAL PACKAGE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("INDUSTRIAL PACKAGE TEST")
print("=" * 70)


industrial_result = applicability_engine.determine(
    product_data={
        "product_name": "Industrial Chemical",
        "net_quantity": "30 kg",
    },
    ocr_text=[
        "INDUSTRIAL USE ONLY",
        "NOT FOR RETAIL SALE",
    ],
    context={
        "industrial_consumer": True,
    },
)


print("\nPACKAGE CONTEXT")
print(industrial_result["package_context"])


print("\nRULES 3-13")
for rule in industrial_result["rules"]:
    if 3 <= int(rule["rule_number"]) <= 13:
        print(
            f'{rule["rule_id"]} | '
            f'{rule["status"]} | '
            f'applicable={rule["applicable"]}'
        )


# ---------------------------------------------------------
# TEST 3: LARGE PACKAGE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("LARGE PACKAGE TEST")
print("=" * 70)


large_result = applicability_engine.determine(
    product_data={
        "product_name": "Rice",
        "net_quantity": "30 kg",
    },
    ocr_text=[
        "RICE",
        "NET WEIGHT 30 KG",
    ],
)


print("\nPACKAGE CONTEXT")
print(large_result["package_context"])


print("\nRULE 3")
print(
    next(
        rule
        for rule in large_result["rules"]
        if rule["rule_id"] == "LM-03"
    )
)