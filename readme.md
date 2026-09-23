                                            Metriscan-AI
                      AI-Powered Packaged Commodity Compliance & Inspection Platform

Metriscan-AI is an AI-assisted digital inspection platform designed to help Legal Metrology inspectors analyze packaged-product labels, extract mandatory declarations, verify applicable compliance rules, identify potential violations, generate evidence-based inspection reports, and maintain digital inspection records.

                                            📌 Overview

Traditional packaged-commodity inspection requires inspectors to manually examine product packages and verify declarations such as:

Maximum Retail Price (MRP)
Net quantity
Product/commodity name
Manufacturer / Packer / Importer details
Address
Country of origin where applicable
Manufacturing/packing information
Best-before / Use-by information where applicable
Consumer-care details
Other applicable declarations

The Department of Consumer Affairs describes the Legal Metrology (Packaged Commodities) Rules, 2011 as requiring specified declarations on pre-packaged commodities, including manufacturer/packer/importer details, commodity name, net quantity, relevant date information, MRP and consumer-care details.

Metriscan-AI digitizes this inspection workflow.

Instead of manually reading every declaration and recording the result, an Inspector can capture or upload a product-label image.

Product Image
      ↓
Image Preprocessing
      ↓
PaddleOCR + Vision AI
      ↓
Field Extraction & Validation
      ↓
Rule Applicability
      ↓
Compliance Engine
      ↓
PASS / FAIL / REVIEW
      ↓
Evidence & PDF Report
      ↓
Supabase
🎯 Problem Statement
Traditional Inspection

Manual inspection of packaged commodities can involve:

Reading multiple declarations manually
Checking applicable rules individually
Recording findings manually
Maintaining paper-based evidence
Repeating the same verification process for different products
Difficulty maintaining searchable historical inspection records
Problem

How can packaged-product label inspection be digitized so that inspectors can extract declarations, apply the relevant compliance rules, preserve evidence and generate standardized inspection records efficiently?

💡 Proposed Solution
Metriscan-AI

Metriscan-AI combines:

Computer vision
Image preprocessing
OCR
Vision AI
Regex-based structured extraction
Rule-based compliance evaluation
Dynamic compliance rules
Human-in-the-loop verification
Evidence management
Automated PDF reporting
Centralized digital storage

The system does not replace the Inspector's legal judgment.

Instead:

AI assists the Inspector; the Inspector remains responsible for final verification.

🏗️ System Architecture
                         ┌──────────────────────┐
                         │      Metriscan-AI    │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
        ┌───────────┐         ┌───────────┐        ┌───────────┐
        │ Inspector │         │   Admin   │        │ Consumer  │
        └─────┬─────┘         └─────┬─────┘        └─────┬─────┘
              │                     │                     │
              ▼                     ▼                     ▼
        Scan Product          Manage Rules          Scan Label
              │               Manage Users               │
              │               View Reports               │
              ▼                     │                     ▼
        ┌────────────────────────────────────────────────────┐
        │                  FastAPI Backend                   │
        └───────────────────────┬────────────────────────────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
                ▼               ▼                ▼
            OpenCV         PaddleOCR        Vision AI
                │               │                │
                └───────────────┼────────────────┘
                                ▼
                       Field Extraction
                                │
                       Regex + AI Fusion
                                │
                                ▼
                     Rule Applicability Engine
                                │
                                ▼
                       Compliance Engine
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                  PASS         FAIL       REVIEW
                    │           │           │
                    └───────────┼───────────┘
                                ▼
                         Evidence + Report
                                │
                                ▼
                             Supabase
🔄 Core Inspection Workflow
Inspector Workflow
Login
  ↓
Inspector Dashboard
  ↓
Scan / Upload Product Image
  ↓
OpenCV Image Preprocessing
  ↓
PaddleOCR Text Extraction
  +
Gemini Vision Analysis
  ↓
Extraction Fusion
  ↓
Regex-Based Field Validation
  ↓
Rule Applicability Engine
  ↓
Compliance Engine
  ↓
PASS / FAIL / REVIEW
  ↓
Evidence Collection
  ↓
PDF Compliance Report
  ↓
Store Inspection
  ↓
Inspection History
🤖 AI & Processing Pipeline
1. Image Capture

The Inspector captures or uploads an image of the product label.

Supported workflow:

Camera / Mobile Image
          ↓
Uploaded Product Image
2. Image Preprocessing

OpenCV is used to improve the input image before OCR.

Typical preprocessing includes operations such as:

Image resizing
Noise reduction
Contrast enhancement
Thresholding
Image normalization

Purpose:

Improve the quality of the image supplied to the OCR and Vision AI stages.

🔤 3. PaddleOCR

Metriscan-AI uses PaddleOCR to extract text from the product image.

Example:

Raw Product Image
       ↓
     PaddleOCR
       ↓
"MRP ₹120"
"Net Qty 500 g"
"Batch No: ABC123"
"Packed: 06/2026"

PaddleOCR provides the text and OCR information used by the subsequent extraction pipeline.

🧠 4. Vision AI

Vision AI is used as a complementary extraction layer.

While OCR primarily provides recognized text, Vision AI can analyze:

Label context
Text relationships
Product information
Visual layout
Missing/unclear information

The system combines the OCR and Vision AI outputs instead of relying on only one source.

🔎 5. Regex-Based Field Extraction

Metriscan-AI also uses deterministic pattern matching for structured information.

The extraction layer contains Regex patterns for fields such as:

MRP
Net quantity
Dates
Batch/Lot number
FSSAI/license number
PIN/address evidence
Phone number
Email address

Therefore the extraction architecture is:

                 Product Image
                       ↓
                    PaddleOCR
                       ↓
                  Raw OCR Text
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
          Regex Rules       Vision AI
              │                 │
              └────────┬────────┘
                       ↓
                Extraction Fusion
                       ↓
              Structured Product Data
Why Regex + AI?

Vision AI provides contextual understanding, while Regex provides deterministic extraction for well-defined patterns.

This combination reduces dependence on a single probabilistic model.

⚖️ 6. Rule Applicability Engine

Not every rule applies identically to every product.

Therefore, Metriscan-AI first determines:

What information was extracted?
          ↓
What type of product is this?
          ↓
Which rules are applicable?
          ↓
What declarations are mandatory?

This creates a separation between:

Extraction

"What does the package say?"

and

Compliance

"Does what the package says satisfy the applicable rule?"

⚙️ 7. Compliance Engine

The Compliance Engine receives:

Extracted Product Data
+
Applicable Rules
+
Validation Conditions

and evaluates the package.

Output:

PASS

Required declarations appear compliant.

FAIL

A potential compliance violation has been identified.

REVIEW

The system does not have sufficient confidence or evidence for an automatic determination.

This human-in-the-loop design is important because AI/OCR results can be affected by:

Blur
Glare
Curved packaging
Small fonts
Low resolution
Occlusion
Unclear printing
👨‍⚖️ Human-in-the-Loop

Metriscan-AI is an inspection assistance system, not an autonomous legal enforcement system.

AI Analysis
     ↓
PASS / FAIL / REVIEW
     ↓
Inspector Verification
     ↓
Final Inspection Decision

The Inspector can review the extracted information and supporting evidence before finalizing the inspection.

🔄 Dynamic Compliance Rules

One of the important architectural features is the dynamic rule system.

Admin

Admin can:

Add rules
Update rules
Enable/disable rules
Maintain rule metadata
Manage applicability conditions

Rules are stored in:

Supabase
   ↓
compliance_rules

The Inspector's Compliance Engine retrieves active rules.

Admin
  ↓
Add / Update Rule
  ↓
Supabase
  ↓
Active Compliance Rules
  ↓
Inspector Compliance Engine
  ↓
Future Inspections

This is particularly important because the official Department of Consumer Affairs publishes amendments and updates to the Packaged Commodities Rules over time. The official page currently lists amendments through 2026.

👥 System Roles
👮 Inspector — Primary Role

The Inspector is the main operational user.

Functions
Login
Scan/upload product
Run AI inspection
View extracted declarations
Review compliance results
Examine evidence
Generate PDF report
View inspection history
Maintain inspection records
Logout
🛠️ Admin — Management Role

Admin does not perform product scanning.

Functions
Admin login
Dashboard
Inspector account management
Create/deactivate Inspector credentials
Add/update compliance rules
View inspection statistics
View reports
Analyze inspection activity
Review consumer-submitted issues
Manage system data
👤 Consumer — Public Awareness Extension

The Consumer module is an additional public-facing feature.

Consumers can:

Login
Scan/upload a product
View extracted product information
View selected label information
View simplified warnings/information
Maintain scan history
Submit an issue

Consumer issues are routed to:

Consumer
   ↓
Submit Issue
   ↓
Admin Review

The Consumer module is not intended to perform formal regulatory enforcement.

🗄️ Database Architecture

Metriscan-AI uses Supabase for database, authentication and storage.

Main database entities
profiles
    │
    ├── users / roles
    │
inspections
    │
    ├── products
    ├── ocr_results
    ├── compliance_results
    ├── visual_analysis
    ├── inspection_evidence
    └── reports

compliance_rules

audit_logs
Storage
inspection-images
inspection-reports

Each inspection is associated with a unique inspection identifier.

This helps maintain the relationship:

Inspection ID
      │
      ├── Uploaded Image
      ├── OCR Result
      ├── Extracted Data
      ├── Compliance Result
      ├── Evidence
      └── PDF Report
🔐 Security & Access Control

The platform uses role-based access.

                    Metriscan
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
      Inspector       Admin      Consumer
          │            │            │
     Inspection      System       Product
       Data         Control       Info

Supabase authentication and row-level security can be used to restrict access to appropriate records.

🧰 Technology Stack
Layer	Technology
Frontend	React.js
Language	TypeScript
Build Tool	Vite
Backend	Python
API Framework	FastAPI
Image Processing	OpenCV
OCR	PaddleOCR
Vision AI	Gemini Vision
Structured Extraction	Python + Regex
Compliance	Python Rule Engine
Database	Supabase PostgreSQL
Authentication	Supabase Auth
File Storage	Supabase Storage
Reports	Python PDF Generation
Development	VS Code / Git / GitHub
📂 Project Architecture

Suggested repository structure:

Metriscan-AI/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── ocr.py
│   │   │   └── reports.py
│   │   │
│   │   ├── services/
│   │   │   ├── ocr_service.py
│   │   │   ├── gemini_service.py
│   │   │   ├── yolo_service.py
│   │   │   └── ...
│   │   │
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── uploads/
│   ├── requirements.txt
│   └── .env
│
├── database/
│   └── schema.sql
│
├── screenshots/
│
├── reports/
│
├── README.md
└── .gitignore

Adjust this structure to match the actual repository before publishing.

📸 Prototype Screenshots

You can put your actual screenshots in this section.

1. Login
![Metriscan Login](screenshots/login.png)

Description:
Role-based authentication for Inspector, Admin and Consumer users.

2. Inspector Dashboard
![Inspector Dashboard](screenshots/inspector-dashboard.png)

Shows inspection statistics and access to the scanning workflow.

3. Product Scanning
![Product Scanner](screenshots/product-scanner.png)

Inspector uploads or captures a product-label image.

4. OCR & AI Extraction
![AI Extraction](screenshots/ai-extraction.png)

Displays extracted product information from the uploaded package.

5. Compliance Result
![Compliance Result](screenshots/compliance-result.png)

Displays:

PASS
FAIL
REVIEW

along with the corresponding findings.

6. Evidence
![Evidence](screenshots/evidence.png)

Shows the evidence associated with detected declarations or potential violations.

7. Compliance Report
![Compliance Report](screenshots/report.png)

The system generates a standardized inspection report.

8. Admin Dashboard
![Admin Dashboard](screenshots/admin-dashboard.png)

Admin can view inspection statistics and manage the system.

9. Dynamic Rules
![Dynamic Rules](screenshots/dynamic-rules.png)

Admin can add/update compliance rules without changing the core inspection workflow.

10. Consumer Module
![Consumer Dashboard](screenshots/consumer-dashboard.png)

Provides simplified product information and issue submission functionality.

📊 Real-World Situation Analysis

This section is especially useful for your SIH README because it demonstrates why the system matters, rather than only describing the technology.

Scenario 1 — Correctly Declared Package
Real Situation

An Inspector checks a packaged product containing:

Product Name
Net Quantity
MRP
Manufacturer/Packer Details
Address
Applicable Date Information
Consumer Care Details
Traditional Approach
Read Package
     ↓
Identify Declarations
     ↓
Check Applicable Rules
     ↓
Record Findings
     ↓
Prepare Report
Metriscan-AI
Capture Image
     ↓
OCR + Vision AI
     ↓
Extract Fields
     ↓
Apply Rules
     ↓
PASS / REVIEW
     ↓
Generate Report
Analysis

The system converts repetitive reading and recording into a structured digital workflow while retaining Inspector verification.

📊 Scenario 2 — Missing Declaration

Suppose an applicable mandatory declaration is not detected on a package.

Traditional

The Inspector manually identifies the missing declaration and records it.

Metriscan-AI
Product Image
      ↓
Field Extraction
      ↓
Required Field Check
      ↓
Missing Declaration
      ↓
Potential Non-Compliance
      ↓
FAIL / REVIEW
      ↓
Evidence
      ↓
Report
Important

The result should be treated as an inspection finding requiring human verification, not as an automatic legal penalty.

📊 Scenario 3 — Poor Image Quality

Consider:

Curved Bottle
+ Glare
+ Small Text
+ Low Resolution

OCR may not confidently recover every declaration.

Metriscan-AI therefore uses:

OpenCV
   ↓
PaddleOCR
   +
Vision AI
   ↓
Extraction Fusion
   ↓
Confidence / Validation
   ↓
REVIEW
Analysis

Instead of forcing the system to make a potentially unreliable automatic decision, uncertain cases can be sent to the Inspector for verification.

📊 Scenario 4 — Rule Update

Imagine that an applicable compliance requirement changes.

Traditional Fixed Software
Rule Change
     ↓
Modify Application Code
     ↓
Test
     ↓
Deploy New Version
Metriscan-AI
Admin
 ↓
Update Rule
 ↓
Supabase
 ↓
Compliance Engine
 ↓
Future Inspections
Analysis

The dynamic rule architecture separates rule data from the core application logic.

This is important because the Department of Consumer Affairs publishes amendments to the Packaged Commodities Rules over time.

📈 Prototype Analysis vs Traditional Inspection
Parameter	Traditional Workflow	Metriscan-AI
Label reading	Manual	OCR + Vision AI assisted
Structured extraction	Manual	Automated
Pattern identification	Manual	Regex + AI
Rule verification	Manual/reference-based	Rule engine assisted
Evidence	Manual	Digital
Result recording	Manual	Automated
Report generation	Manual	Automated PDF
History	Paper/manual records	Centralized digital records
Rule updates	Manual process	Admin-managed dynamic rules
Human verification	Yes	Yes
Uncertain cases	Inspector judgment	REVIEW + Inspector judgment

Important: This table describes workflow differences; it does not claim a measured percentage improvement unless you have benchmark data.

🧪 Testing & Evaluation

The prototype should be evaluated at multiple levels.

1. OCR Evaluation

Test images containing:

Clear labels
Small text
Different fonts
Curved packaging
Low-light images
Glare
Different orientations

Measure:

Field Extraction Accuracy
Character/Text Recognition
Missing Field Detection
2. Structured Field Evaluation

Test fields such as:

MRP
Net Quantity
Batch Number
Date
Manufacturer
Address
License Number
Contact Information

Compare:

Ground Truth
      vs
Metriscan Extraction
3. Compliance Evaluation

Create test cases:

Valid Package
Missing MRP
Missing Quantity
Incorrect Format
Missing Manufacturer Information
Unclear Declaration

Compare:

Expected Result
      vs
System Result
📋 Recommended Evaluation Dataset

For a proper project evaluation, maintain a small manually verified dataset.

Example:

Test ID	Product	Image Quality	Expected	System	Status
T001	Product A	Clear	PASS	PASS	✓
T002	Product B	Clear	FAIL	FAIL	✓
T003	Product C	Blurry	REVIEW	REVIEW	✓
T004	Product D	Glare	REVIEW	REVIEW	✓
T005	Product E	Clear	PASS	PASS	✓

Once you have actual measurements, you can add:

Accuracy
Precision
Recall
F1-score
Field-level extraction accuracy
Compliance classification accuracy
Average processing time

Do not put invented percentages in the README.

⚠️ Current Limitations

Metriscan-AI is a prototype and has practical limitations.

Image Quality

Performance can be affected by:

Blur
Glare
Shadows
Curved surfaces
Low-resolution images
Very small text
AI Uncertainty

Vision AI may occasionally misinterpret unclear or incomplete information.

Rule Complexity

Legal Metrology requirements can depend on:

Product type
Package type
Applicable provisions
Exemptions
Amendments
Other applicable regulatory requirements

The official rules themselves contain exemptions and product-specific provisions, so the system should not treat every declaration as universally applicable.

Human Verification

AI-generated results require Inspector review in uncertain or legally significant situations.

🚀 Future Scope

Potential extensions include:

Multilingual OCR

Support for Indian regional languages.

Improved Visual Inspection

Detect:

Label placement
Visibility
Readability
Print quality
Package damage
Offline / Edge Processing

Run selected processing locally where connectivity is limited.

Mobile Application

Dedicated Android application for field inspectors.

Advanced Analytics
Inspector
Product
Location
Time
Violation Type
Compliance Trends

can be analyzed through dashboards.

Rule Versioning

Maintain:

Rule
Version
Effective Date
Expiry Date
Source
Applicability

for better regulatory traceability.

🔒 Data Integrity

A key design principle is that every report must correspond to the current inspection.

Unique Inspection ID
        │
        ├── Current Image
        ├── Current OCR Result
        ├── Current Product Data
        ├── Current Compliance Result
        ├── Current Evidence
        └── Current Report

This prevents unrelated product information from being reused between inspections.

🏛️ Regulatory Reference

Metriscan-AI is designed around the Legal Metrology framework and particularly the Legal Metrology (Packaged Commodities) Rules, 2011.

The Department of Consumer Affairs provides the official rules, amendments and implementation material. Its Legal Metrology overview also lists the mandatory declaration categories applicable to pre-packaged commodities.

Official references:

Department of Consumer Affairs — Legal Metrology
Legal Metrology Act and Rules
Legal Metrology Packaged Commodities Rules — official publication
📚 References
Department of Consumer Affairs, Government of India — Legal Metrology.
Legal Metrology Act, 2009.
Legal Metrology (Packaged Commodities) Rules, 2011 and subsequent amendments.
PaddleOCR documentation.
Supabase documentation.
FastAPI documentation.
OpenCV documentation.
Gemini API / Vision documentation.
🛠️ Installation
Prerequisites
Python 3.12+
Node.js
npm
Git
Supabase Account
Gemini API Key
Backend
cd backend

python -m venv venv
Windows
venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Configure environment variables:

SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
GOOGLE_API_KEY=your_google_api_key

Start the backend:

uvicorn app.main:app --reload
💻 Frontend
cd frontend
npm install
npm run dev

The Vite development server will provide the frontend URL.

🔄 Complete Data Flow
                    USER
                     │
                     ▼
             Product Image
                     │
                     ▼
                OpenCV
                     │
                     ▼
              ┌─────────────┐
              │  PaddleOCR  │
              └──────┬──────┘
                     │
                     ▼
              OCR Raw Text
                     │
            ┌────────┴─────────┐
            │                  │
            ▼                  ▼
        Regex Layer        Vision AI
            │                  │
            └────────┬─────────┘
                     ▼
              Extraction Fusion
                     │
                     ▼
             Structured Fields
                     │
                     ▼
          Rule Applicability Engine
                     │
                     ▼
             Compliance Engine
                     │
             ┌───────┼───────┐
             ▼       ▼       ▼
           PASS     FAIL    REVIEW
             │       │       │
             └───────┼───────┘
                     ▼
               Evidence
                     │
                     ▼
              PDF Report
                     │
                     ▼
                  Supabase


🌟 Key Innovation

Metriscan-AI is not simply an OCR scanner.

Its main contribution is the integration of multiple stages into one inspection workflow:

AI Extraction
      +
Structured Field Validation
      +
Dynamic Compliance Rules
      +
Human Verification
      +
Evidence
      +
Standardized Reporting
      +
Digital Inspection History

This creates a complete workflow from:

Product Image → Inspection → Compliance Assessment → Evidence → Report → Digital Record


🎯 Project Objective

The overall objective of Metriscan-AI is to provide a practical digital assistant for packaged-commodity inspection that can:

Reduce repetitive manual label checking, improve consistency of structured information extraction, assist rule-based compliance verification, preserve inspection evidence, and generate standardized digital reports while keeping the Inspector in control of the final decision.
