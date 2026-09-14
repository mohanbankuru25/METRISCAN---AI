import sys
sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("=" * 70)
print("TESTING FASTAPI BACKEND REPORT ENDPOINTS")
print("=" * 70)

# 1. Health check
res = client.get("/api/report/health")
print("Report Health Status:", res.status_code, res.json())
assert res.status_code == 200

# Sample Payload
sample_payload = {
    "inspection_id": "LMR-TEST-001",
    "filename": "sample_commodity.jpg",
    "timestamp": "2026-09-09T20:00:00",
    "product_data": {
        "product_name": "Amul Pasteurised Butter 500g",
        "product_category": "Dairy / Packaged Food",
        "net_quantity": "500 g",
        "mrp": "₹275.00",
        "batch_number": "B260815",
        "packed_on": "15/08/2026",
        "date_of_manufacture": "15/08/2026",
        "best_before": "12 Months from Packaging",
        "manufacturer_or_packer": "Kaira District Co-operative Milk Producers Union Ltd",
        "address": "Anand, Gujarat - 388001",
        "consumer_contact": "1800 258 3333 / customercare@amul.coop",
        "country_of_origin": "India",
    },
    "compliance": {
        "overall_status": "PASS",
        "compliance_score": 95.0,
        "score": 95.0,
        "summary": {
            "PASS": 14,
            "FAIL": 0,
            "REVIEW": 1,
            "NOT APPLICABLE": 3,
            "OUT OF SCOPE": 2,
        },
        "results": [
            {
                "rule_id": "RULE_6_1_A",
                "rule_number": "Rule 6(1)(a)",
                "rule_name": "Generic / Common Name",
                "status": "PASS",
                "applicable": True,
                "expected": "Name of commodity clearly displayed",
                "extracted": "Amul Pasteurised Butter",
                "reason": "Product name clearly declared on front label.",
            },
            {
                "rule_id": "RULE_6_1_B",
                "rule_number": "Rule 6(1)(b)",
                "rule_name": "Net Quantity Declaration",
                "status": "PASS",
                "applicable": True,
                "expected": "Standard units (g/kg/ml/l/N)",
                "extracted": "500 g",
                "reason": "Net quantity declared in prescribed standard units.",
            },
            {
                "rule_id": "RULE_6_1_C",
                "rule_number": "Rule 6(1)(c)",
                "rule_name": "Retail Sale Price (MRP)",
                "status": "PASS",
                "applicable": True,
                "expected": "MRP in Indian Rupees (inclusive of all taxes)",
                "extracted": "₹275.00",
                "reason": "MRP clearly declared with inclusive of taxes clause.",
            },
            {
                "rule_id": "RULE_6_11",
                "rule_number": "Rule 6(11)",
                "rule_name": "Unit Sale Price",
                "status": "REVIEW",
                "applicable": True,
                "expected": "Unit sale price per 100g or 1kg",
                "extracted": None,
                "reason": "Unit sale price not explicitly detected on primary display.",
                "suggestion": "Verify unit sale price declaration on side/back panel.",
            },
        ],
    },
    "visual_analysis": {
        "text_size": {"median_height": 22.0, "min_height": 10.0, "max_height": 55.0},
        "placement": {"text_blocks": 12, "bbox_count": 12},
        "readability": {"mean_ocr_confidence": 0.98, "local_contrast": 0.92},
    },
    "ocr_details": [
        {"text": "Amul Pasteurised Butter", "confidence": 0.99, "bbox": [120, 80, 850, 180]},
        {"text": "Net Qty: 500g", "confidence": 0.97, "bbox": [140, 220, 420, 280]},
        {"text": "MRP Rs 275.00 incl. of all taxes", "confidence": 0.98, "bbox": [140, 310, 720, 370]},
    ],
}

# 2. Test PDF endpoint
pdf_res = client.post("/api/report/pdf", json=sample_payload)
print(f"POST /api/report/pdf status: {pdf_res.status_code}")
print(f"Content-Type: {pdf_res.headers.get('content-type')}")
print(f"Content-Disposition: {pdf_res.headers.get('content-disposition')}")
print(f"PDF bytes received: {len(pdf_res.content)}")
assert pdf_res.status_code == 200
assert pdf_res.content[:4] == b"%PDF"

# 3. Test DOCX endpoint
docx_res = client.post("/api/report/docx", json=sample_payload)
print(f"\nPOST /api/report/docx status: {docx_res.status_code}")
print(f"Content-Type: {docx_res.headers.get('content-type')}")
print(f"Content-Disposition: {docx_res.headers.get('content-disposition')}")
print(f"DOCX bytes received: {len(docx_res.content)}")
assert docx_res.status_code == 200
assert docx_res.content[:2] == b"PK"  # DOCX is a zip archive

print("\n" + "=" * 70)
print("ALL BACKEND ENDPOINTS PASSED WITH 100% SUCCESS!")
print("=" * 70)
