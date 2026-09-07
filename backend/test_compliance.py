from app.services.applicability_engine import applicability_engine
from app.services.compliance_engine import compliance_engine


print("=" * 70)
print("LEGAL METROLOGY COMPLIANCE ENGINE")
print("=" * 70)


# =========================================================
# TEST PRODUCT
# =========================================================

product_data = {
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


# =========================================================
# SIMULATED OCR EVIDENCE
# =========================================================

ocr_results = [
    {
        "text": "QUAKER OATS",
        "confidence": 0.98,
        "bbox": [100, 100, 400, 150],
    },
    {
        "text": "NET WEIGHT 1 kg",
        "confidence": 0.97,
        "bbox": [100, 200, 350, 250],
    },
    {
        "text": "MRP ₹199",
        "confidence": 0.96,
        "bbox": [100, 300, 300, 350],
    },
    {
        "text": "MANUFACTURED BY PEPSICO",
        "confidence": 0.95,
        "bbox": [100, 400, 500, 450],
    },
    {
        "text": "USE BY 22 SEP 24",
        "confidence": 0.94,
        "bbox": [100, 500, 400, 550],
    },
    {
        "text": "CONSUMER CARE 1800-123-456",
        "confidence": 0.93,
        "bbox": [100, 600, 500, 650],
    },
]


# =========================================================
# STEP 1 — APPLICABILITY
# =========================================================

print("\n" + "=" * 70)
print("STEP 1 — APPLICABILITY")
print("=" * 70)


applicability_result = applicability_engine.determine(
    product_data=product_data,
    ocr_text=[
        item["text"]
        for item in ocr_results
    ],
)


print("\nApplicability Summary:")
print(applicability_result["summary"])


# =========================================================
# STEP 2 — COMPLIANCE
# =========================================================

print("\n" + "=" * 70)
print("STEP 2 — COMPLIANCE EVALUATION")
print("=" * 70)


compliance_result = compliance_engine.evaluate(
    product_data=product_data,
    applicability_result=applicability_result,
    ocr_results=ocr_results,
)


print("\nOVERALL STATUS")
print(compliance_result["overall_status"])


print("\nSUMMARY")
print(compliance_result["summary"])


# =========================================================
# RULE RESULTS
# =========================================================

print("\n" + "=" * 70)
print("RULE RESULTS")
print("=" * 70)


for result in compliance_result["results"]:

    print(
        f'{result["rule_id"]} | '
        f'Rule {result["rule_number"]} | '
        f'{result["status"]}'
    )

    print(
        f'  Expected : {result["expected"]}'
    )

    print(
        f'  Extracted: {result["extracted"]}'
    )

    print(
        f'  Reason   : {result["reason"]}'
    )

    if result["evidence"]:

        print(
            f'  Evidence : {result["evidence"]}'
        )

    print(
        f'  Suggestion: {result["suggestion"]}'
    )

    print("-" * 70)