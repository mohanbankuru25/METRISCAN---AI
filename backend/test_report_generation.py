import os
import sys

# Ensure UTF-8 output encoding for Windows consoles
sys.stdout.reconfigure(encoding='utf-8')

from app.services.report_generator import (
    generate_compliance_pdf,
    generate_compliance_docx,
)
from app.services.applicability_engine import applicability_engine
from app.services.compliance_engine import compliance_engine

print("=" * 70)
print("TESTING LEGAL METROLOGY COMPLIANCE REPORT GENERATOR")
print("=" * 70)

# Sample product dataset matching realistic scan
sample_product = {
    "product_name": "QUAKER ROLLED OATS",
    "product_category": "Packaged Food",
    "net_quantity": "1 kg",
    "mrp": "₹199.00",
    "batch_number": "TV230923",
    "packed_on": "23/09/2023",
    "date_of_manufacture": "23/09/2023",
    "best_before": "12 Months",
    "use_by": "22/09/2024",
    "manufacturer_or_packer": "PepsiCo India Holdings Pvt Ltd",
    "address": "DLF Cyber City, Phase-II, Gurugram - 122002, Haryana, India",
    "consumer_contact": "1800-22-4020 / consumer.feedback@pepsico.com",
    "country_of_origin": "India",
    "marketed_by": "PepsiCo India Holdings Pvt Ltd",
}

sample_ocr = [
    {"text": "QUAKER ROLLED OATS", "confidence": 0.98, "bbox": [100, 100, 400, 150]},
    {"text": "NET WEIGHT 1 kg", "confidence": 0.97, "bbox": [100, 200, 350, 250]},
    {"text": "MRP ₹199.00 INCL. ALL TAXES", "confidence": 0.96, "bbox": [100, 300, 420, 350]},
    {"text": "MANUFACTURED BY PEPSICO INDIA", "confidence": 0.95, "bbox": [100, 400, 520, 450]},
    {"text": "USE BY 22/09/2024", "confidence": 0.94, "bbox": [100, 500, 400, 550]},
    {"text": "CONSUMER CARE 1800-22-4020", "confidence": 0.93, "bbox": [100, 600, 500, 650]},
]

sample_visual = {
    "text_size": {
        "median_height": 18.5,
        "min_height": 9.2,
        "max_height": 42.0,
    },
    "placement": {
        "text_blocks": len(sample_ocr),
        "bbox_count": len(sample_ocr),
    },
    "readability": {
        "mean_ocr_confidence": 0.955,
        "local_contrast": 0.88,
    }
}

print("\n1. Running Applicability and Compliance Engines...")
app_result = applicability_engine.determine(
    product_data=sample_product,
    ocr_text=[x["text"] for x in sample_ocr],
)

comp_result = compliance_engine.evaluate(
    product_data=sample_product,
    applicability_result=app_result,
    ocr_results=sample_ocr,
    visual_analysis=sample_visual,
)

print(f"Compliance engine overall status: {comp_result['overall_status']}")
print(f"Compliance engine score: {comp_result['compliance_score']}%")

report_payload = {
    "inspection_id": "LMR-20260909-0001",
    "filename": "quaker_oats_1kg_front.jpg",
    "timestamp": "2026-09-09T20:00:00",
    "product_data": sample_product,
    "compliance": comp_result,
    "visual_analysis": sample_visual,
    "ocr_details": sample_ocr,
}

print("\n2. Generating PDF Report via reportlab...")
pdf_bytes = generate_compliance_pdf(report_payload)
pdf_path = "test_compliance_report.pdf"
with open(pdf_path, "wb") as f:
    f.write(pdf_bytes)
print(f"✓ PDF generated successfully: {pdf_path} ({len(pdf_bytes)} bytes)")

print("\n3. Generating Editable DOCX Report via python-docx...")
docx_bytes = generate_compliance_docx(report_payload)
docx_path = "test_compliance_report.docx"
with open(docx_path, "wb") as f:
    f.write(docx_bytes)
print(f"✓ DOCX generated successfully: {docx_path} ({len(docx_bytes)} bytes)")

print("\n" + "=" * 70)
print("TEST COMPLETED SUCCESSFULLY!")
print("=" * 70)
