# Metriscan-AI

## AI-Powered Packaged Commodity Compliance Inspection System

Metriscan-AI is an AI-powered software system designed to assist Legal Metrology Inspectors in checking the compliance of packaged commodities with the applicable requirements of the Legal Metrology (Packaged Commodities) Rules, 2011.

The system uses image processing, Optical Character Recognition (OCR), Vision AI, and a rule-based compliance engine to extract package declarations, identify applicable requirements, evaluate compliance, and generate evidence-based inspection reports.

## Problem Statement

Packaged commodity inspections traditionally require Inspectors to manually examine product labels and verify mandatory declarations such as:

- Maximum Retail Price (MRP)
- Net quantity
- Batch or lot number
- Date-related declarations
- Manufacturer, packer or importer details
- Address details
- Other applicable declarations

Manual verification can be time-consuming and repetitive.

Metriscan-AI provides an AI-assisted digital workflow to support Inspectors during these inspections.

## Key Objective

To provide an AI-assisted platform that can:

1. Scan or upload a packaged-product label image.
2. Extract relevant information from the package.
3. Identify applicable compliance requirements.
4. Check extracted information against configured rules.
5. Identify potential compliance issues.
6. Provide PASS, FAIL, or REVIEW results.
7. Store inspection evidence and history.
8. Generate a standardized inspection report.

## Key Features

### Inspector Module

The Inspector is the primary user of Metriscan-AI.

- Secure Inspector login
- Upload or scan packaged-product images
- Image preprocessing using OpenCV
- Text extraction using PaddleOCR
- Context and label understanding using Vision AI
- Structured field extraction from package labels
- Detection of mandatory package declarations
- Automatic rule applicability identification
- Compliance evaluation using the configured Legal Metrology rules
- PASS, FAIL, or REVIEW classification
- Visual and readability analysis
- Evidence collection for inspection results
- Inspection history
- Standardized PDF report generation
- Human-in-the-loop verification for uncertain results

### Admin Module

The Admin module manages the system and compliance rules.

- Secure Admin login
- Inspector account management
- Create and deactivate Inspector credentials
- Add new compliance rules
- Update existing compliance rules
- Activate or deactivate rules
- Manage rule applicability and conditions
- View inspection statistics
- Review inspection reports and analysis
- Review issues submitted by Consumers
- Maintain centralized compliance configuration

### Consumer Module

The Consumer module is an additional public-awareness feature.

- Consumer login
- Product image scanning
- Product information extraction
- Ingredient and nutrition information
- Age and usage-related information
- Consumer-oriented warnings and safety information
- Scan history
- Submit product-related issues
- Issues are forwarded to Admin for review

## System Architecture

Metriscan-AI follows a modular architecture where the Inspector, Admin, and Consumer modules interact with the backend services, AI/OCR pipeline, compliance engine, and Supabase database.


                      METRISCAN-AI
                           |
          +----------------+----------------+
          |                |                |
      Inspector          Admin          Consumer
          |                |                |
          |                |                |
          +----------------+----------------+
                           |
                      React + TypeScript
                           |
                        FastAPI
                           |
                  Image Preprocessing
                       (OpenCV)
                           |
                +----------+----------+
                |                     |
            PaddleOCR             Vision AI
                |                     |
                +----------+----------+
                           |
                    Field Extraction
                           |
                    Extraction Fusion
                           |
                Rule Applicability Engine
                           |
                   Compliance Engine
                           |
                  PASS / FAIL / REVIEW
                           |
            +--------------+--------------+
            |                             |
        Evidence & Reports             Supabase
                                          |
                          +---------------+---------------+
                          |               |               |
                      PostgreSQL       Storage          Auth
                          |               |               |
                    Inspection Data    Images/Reports   Users

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, TypeScript, Vite |
| Backend | Python, FastAPI |
| Image Processing | OpenCV |
| OCR | PaddleOCR |
| Vision AI | Gemini Vision |
| Compliance Engine | Python-based Rule Engine |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Authentication |
| File Storage | Supabase Storage |
| Report Generation | Python PDF Generation |
| Development Environment | VS Code |
| Version Control | Git and GitHub |

## AI and Compliance Pipeline

### 1. Image Preprocessing

OpenCV is used to preprocess the uploaded product image before OCR.

The preprocessing stage prepares the product image for text extraction and analysis.

### 2. Optical Character Recognition

PaddleOCR extracts text from the packaged-product label.

The system can identify information such as:

- MRP
- Net quantity
- Batch or lot number
- Date-related declarations
- Manufacturer details
- Packer details
- Importer details
- Address details
- Other package declarations

### 3. Structured Field Extraction

The extracted OCR text is processed to identify structured fields from the package label.

Regex-based extraction is used for well-defined patterns such as:

- Dates
- MRP
- Net quantity
- Batch or lot numbers
- License numbers
- Phone numbers
- Email addresses
- PIN codes

### 4. Vision AI

Vision AI is used together with OCR to understand the visual context and structure of the product label.

This provides additional information when raw OCR text alone is not sufficient.

### 5. Extraction Fusion

The outputs from PaddleOCR and Vision AI are combined to create a structured representation of the product label.

Missing or uncertain fields can be recovered or validated using the available extracted information.

### 6. Rule Applicability Engine

The system determines which configured compliance requirements are applicable to the scanned product.

This prevents irrelevant rules from being applied to every product.

### 7. Compliance Engine

The structured product information is evaluated against the applicable compliance rules.

The system produces one of three outcomes:

- **PASS** — No identified compliance issue.
- **FAIL** — One or more potential compliance issues are identified.
- **REVIEW** — The information is uncertain or requires Inspector verification.

### 8. Visual Compliance Analysis

The system also considers visual aspects of the package label, including readability and visibility of relevant declarations.

### 9. Evidence and Report Generation

The inspection result is supported with extracted information and inspection evidence.

A standardized PDF report is generated containing the inspection findings and final result.

### 10. Human-in-the-Loop Verification

Metriscan-AI is an Inspector-assistance system.

The AI assists with information extraction and compliance checking, while the Inspector remains responsible for final verification and determination in uncertain cases.

## Database and Supabase Structure

Metriscan-AI uses Supabase as the centralized backend data platform for authentication, PostgreSQL database storage, file storage, inspection history, compliance rules, and generated reports.

### Supabase Components

| Component | Purpose |
|---|---|
| Supabase Authentication | Manages Admin and Inspector authentication |
| PostgreSQL | Stores users, inspections, products, OCR results, compliance results, rules, and audit information |
| Supabase Storage | Stores product images, inspection evidence, and generated reports |
| Row Level Security | Controls access to protected data |
| Database Rules | Stores dynamically managed compliance rules |

### Main Database Tables

| Table | Purpose |
|---|---|
| profiles | Stores user profile and role information |
| inspections | Stores inspection records |
| products | Stores extracted product information |
| ocr_results | Stores OCR and extracted text results |
| compliance_results | Stores compliance evaluation results |
| visual_analysis | Stores visual inspection findings |
| inspection_evidence | Stores inspection evidence information |
| reports | Stores generated inspection report information |
| audit_logs | Maintains system activity and audit records |
| compliance_rules | Stores configurable Legal Metrology compliance rules |

### Compliance Rules Management

The `compliance_rules` table allows the Admin to manage compliance requirements dynamically.

A rule can contain information such as:

- Rule code
- Rule name
- Rule description
- Compliance category
- Applicable field
- Condition type
- Expected value
- Operator
- Severity
- Mandatory status
- Active status
- Effective date
- Expiry date
- Created by

### Dynamic Rule Flow

                            Admin creates or updates a rule.

                                          ↓

                      The rule is stored in the `compliance_rules` table.

                                          ↓

                  The Compliance Engine retrieves active rules from Supabase.

                                          ↓

          The Rule Applicability Engine determines the applicable rules for the product.

                                          ↓

                  The Compliance Engine evaluates the product information.

                                          ↓

                  The Inspector receives the updated compliance result.

This allows compliance rules to be updated without modifying the core inspection workflow.

### Storage Structure

Supabase Storage is used for inspection-related files.

**Inspection Images**

Product images uploaded during inspections are stored for evidence and future reference.

**Inspection Reports**

Generated PDF reports are stored and linked to their corresponding inspection records.

### Inspection Data Relationship

Each inspection is associated with a unique inspection record.

The inspection record connects:

**Product Image**

↓

**OCR Results**

↓

**Extracted Product Data**

↓

**Applicable Rules**

↓

**Compliance Results**

↓

**Visual Analysis**

↓

**Inspection Evidence**

↓

**Generated Report**

This relationship ensures that the inspection report is generated from the corresponding inspection data rather than unrelated or previously stored sample data.

### Role-Based Access

Metriscan-AI separates access according to user roles.

**Admin**

- Manages Inspectors
- Manages compliance rules
- Reviews inspection information
- Reviews Consumer-submitted issues
- Accesses administrative dashboards

**Inspector**

- Performs product inspections
- Views applicable compliance rules
- Reviews AI-generated findings
- Generates inspection reports
- Maintains inspection history

**Consumer**

- Scans products
- Views product information
- Maintains personal scan history
- Submits product-related issues

The Admin manages the system and compliance configuration, while the Inspector performs the primary compliance inspection workflow.

## Security and Access Control

Metriscan-AI uses role-based access control to ensure that each user can access only the functionality relevant to their role.

### Authentication

Supabase Authentication is used to manage user authentication.

The system provides separate access for:

- **Admin**
- **Inspector**
- **Consumer**

### Admin Access

The Admin can:

- Manage Inspector accounts
- Manage compliance rules
- Activate or deactivate rules
- View inspection information
- Review Consumer-submitted issues
- Access administrative information

The Admin does not perform product scanning.

### Inspector Access

The Inspector can:

- Scan or upload product images
- Perform product inspections
- View applicable compliance rules
- Review AI-generated findings
- Generate inspection reports
- Access inspection history

### Consumer Access

The Consumer can:

- Scan products
- View product information
- Access personal scan history
- Submit product-related issues

### Data Protection

Inspection information and uploaded files are stored in Supabase.

Role-based access and database security mechanisms are used to protect application data and restrict unauthorized access.

### Auditability

Inspection-related activities and important system operations can be recorded through audit logs.

This provides traceability for inspection records, rule management, and administrative activities.

## End-to-End Workflow

Metriscan-AI follows a complete digital workflow from product image capture to compliance verification and report generation.

### Inspector Workflow

**Step 1 — Login**

The Inspector securely logs into the Metriscan-AI system.

**Step 2 — Scan Product**

The Inspector captures or uploads an image of the packaged product label.

**Step 3 — Image Preprocessing**

The uploaded image is processed using OpenCV to prepare it for OCR and Vision AI analysis.

**Step 4 — Text Extraction**

PaddleOCR extracts text from the product label.

**Step 5 — Vision Analysis**

Gemini Vision analyzes the product label to understand its visual structure and contextual information.

**Step 6 — Information Extraction**

The system extracts relevant package declarations such as:

- MRP
- Net quantity
- Batch or lot number
- Dates
- Manufacturer
- Packer
- Importer
- Address
- Other applicable declarations

**Step 7 — Extraction Fusion**

OCR and Vision AI results are combined to improve the completeness of the extracted information.

**Step 8 — Rule Applicability**

The system identifies the compliance rules applicable to the scanned product.

**Step 9 — Compliance Checking**

The Compliance Engine evaluates the extracted product information against the applicable configured rules.

**Step 10 — Result Generation**

The system generates:

- **PASS**
- **FAIL**
- **REVIEW**

**Step 11 — Evidence Analysis**

Relevant OCR information, visual findings, and inspection evidence are associated with the inspection.

**Step 12 — Report Generation**

A standardized PDF inspection report is generated from the current inspection data.

**Step 13 — Data Storage**

The inspection, extracted information, compliance results, evidence, and report information are stored in Supabase.

**Step 14 — Inspector Verification**

The Inspector reviews the generated findings and performs the final verification, especially when the system produces a REVIEW result.

### Overall Data Flow

**Product Image**

↓

**OpenCV**

↓

**PaddleOCR + Vision AI**

↓

**Field Extraction**

↓

**Extraction Fusion**

↓

**Rule Applicability Engine**

↓

**Compliance Engine**

↓

**PASS / FAIL / REVIEW**

↓

**Evidence**

↓

**PDF Report**

↓

**Supabase**

↓

**Inspection History**

## Compliance and Rule Engine

Metriscan-AI uses a rule-based compliance engine to evaluate the extracted package information against the applicable Legal Metrology compliance requirements.

### Rule Applicability

Not every rule applies to every packaged commodity.

The Rule Applicability Engine determines which configured rules are relevant based on the available product information and rule conditions.

### Compliance Evaluation

The Compliance Engine receives:

- Extracted product information
- Applicable compliance rules
- Rule conditions
- Expected values
- Validation requirements

It then evaluates the available information against the applicable rules.

### Compliance Result

The system provides three possible outcomes:

- **PASS** — The applicable requirement is satisfied based on the available information.
- **FAIL** — A potential non-compliance is identified.
- **REVIEW** — The available information is insufficient, uncertain, or requires Inspector verification.

### Dynamic Compliance Rules

Compliance rules are managed by the Admin through the system.

The workflow is:

**Admin**

↓

**Create / Update Compliance Rule**

↓

**Store Rule in Supabase**

↓

**Compliance Engine Retrieves Active Rules**

↓

**Rule Applicability Engine Identifies Relevant Rules**

↓

**Compliance Engine Evaluates Product**

↓

**Inspector Receives Result**

### Rule Configuration

The system can store configurable rule information such as:

- Rule code
- Rule name
- Rule description
- Compliance category
- Applicable field
- Condition type
- Expected value
- Operator
- Severity
- Mandatory status
- Active status
- Effective date
- Expiry date

### Human Verification

The compliance engine is designed to assist the Inspector rather than replace the Inspector's legal judgment.

When extracted information is unclear or the AI cannot confidently determine compliance, the system produces a **REVIEW** result.

The Inspector can then examine the product label and supporting evidence before making the final determination.

### Benefits of the Rule Engine

- Centralized compliance configuration
- Dynamic rule management
- Consistent evaluation
- Reduced repetitive manual checking
- Traceable compliance results
- Support for future rule updates
- Human-in-the-loop verification

## OCR, Regex and Vision AI

Metriscan-AI uses a hybrid information extraction approach that combines OCR, Regex-based extraction, and Vision AI.

### PaddleOCR

PaddleOCR is used to extract text from the uploaded product label image.

The OCR output provides the raw textual information required for further processing.

### Regex-Based Field Extraction

Regex is used as a deterministic structured-field extraction and validation layer after OCR.

It helps identify well-defined patterns such as:

- MRP
- Net quantity
- Dates
- Batch or lot numbers
- License numbers
- Phone numbers
- Email addresses
- PIN codes

Regex provides deterministic pattern matching for information that follows known formats.

### Gemini Vision

Gemini Vision is used to analyze the product label image and understand information from its visual and contextual structure.

It provides an additional source of information when OCR text alone may not fully represent the package label.

### Hybrid Extraction

The extraction process combines the outputs of different components:

**Product Image**

↓

**PaddleOCR**

↓

**Raw OCR Text**

↓

**Regex-Based Structured Extraction**

+

**Gemini Vision Analysis**

↓

**Extraction Fusion**

↓

**Validated Product Information**

This approach combines deterministic pattern matching with AI-based visual and contextual understanding.

### Why Use OCR + Regex + Vision AI?

**OCR** is useful for reading text from the package.

**Regex** is useful for identifying structured patterns from extracted text.

**Vision AI** is useful for understanding the visual context and structure of the label.

Together, these components provide multiple sources of information for the compliance pipeline.

### Handling Uncertain Information

AI and OCR can produce incorrect or incomplete results when labels contain:

- Blur
- Glare
- Curved surfaces
- Small text
- Low image quality
- Partially visible declarations
- Complex package layouts

Metriscan-AI therefore uses validation and human-in-the-loop review.

When the available information is not sufficiently reliable, the system can produce a **REVIEW** result for Inspector verification.

## Inspection Reports and Evidence

Metriscan-AI generates a standardized inspection report based on the current product inspection.

### Inspection Report

The generated report can contain:

- Inspection summary
- Product information
- Extracted package declarations
- Applicable compliance requirements
- Compliance findings
- Visual inspection findings
- OCR and extraction evidence
- Items requiring attention
- Final inspection result
- Inspector remarks
- Inspection evidence

### Report Result

The report reflects the compliance result generated by the inspection workflow:

- **PASS**
- **FAIL**
- **REVIEW**

### Evidence-Based Inspection

The system associates the inspection findings with the relevant inspection evidence.

Evidence can include:

- Uploaded product image
- Extracted OCR information
- Structured product fields
- Compliance findings
- Visual analysis results
- Applicable rules

### Inspection Traceability

Each inspection is associated with its corresponding inspection data.

The inspection information connects the:

**Inspection ID**

↓

**Product Image**

↓

**OCR Results**

↓

**Extracted Product Information**

↓

**Applicable Rules**

↓

**Compliance Results**

↓

**Evidence**

↓

**Generated Report**

This helps ensure that the generated report corresponds to the current inspection.

### Report Storage

Generated inspection reports are stored using Supabase Storage and associated with their inspection records.

Inspection history allows authorized users to access previously generated inspection information.

### Human Verification

The generated report supports the Inspector's verification process.

The report is an evidence-based representation of the system's analysis and does not replace the Inspector's final judgment.

## Admin Module

The Admin module is responsible for system management, compliance rule configuration, Inspector management, and administrative review.

### Admin Responsibilities

The Admin can:

- Log into the Admin dashboard
- Create Inspector accounts
- Deactivate Inspector accounts
- Manage compliance rules
- Add new compliance rules
- Update existing compliance rules
- Activate or deactivate rules
- View inspection statistics
- Review inspection reports and analysis
- Review Consumer-submitted issues
- Monitor system and audit information

### Compliance Rule Management

The Admin can manage the rules used by the Inspector Compliance Engine.

**Admin**

↓

**Create / Update Rule**

↓

**Save Rule in Supabase**

↓

**Rule Becomes Available to Compliance Engine**

↓

**Inspector Uses Updated Rule During Future Inspections**

This provides a centralized way to maintain the compliance configuration.

### Inspector Management

The Admin can create and manage Inspector accounts.

Each Inspector has role-specific access to the inspection workflow.

The Admin can deactivate an Inspector account when required.

### Dashboard and Monitoring

The Admin dashboard provides an overview of inspection-related information.

It can include:

- Total inspections
- Compliant inspections
- Non-compliant inspections
- Inspections requiring review
- Inspection activity
- Inspector-related information
- Reports and analysis

### Consumer and Inspector Issue Review

Inspector & Consumer-submitted product issues are made available to the Admin for review.

The workflow is:

**Consumer** or **Inspector**

↓

**Submit Issue**

↓

**Issue Stored in Supabase**

↓

**Admin Reviews Issue**

The Consumer module does not directly modify the official Inspector compliance workflow.

### Admin and Inspector Separation

The Admin manages the system and compliance configuration.

The Inspector performs the primary packaged-product inspection.

The Admin does not perform product scanning as part of the Admin workflow.

## Consumer Module

The Consumer module is an additional public-awareness feature of Metriscan-AI.

It provides consumers with a simple way to scan packaged products and understand important information available on the product label.

### Consumer Features

The Consumer can:

- Log into the Consumer interface
- Scan or upload a product image
- Extract product label information
- View ingredient information
- View nutrition-related information
- View expiry or date-related information
- View product usage information
- View age-related suitability information where applicable
- Receive consumer-oriented warnings and cautions
- View scan history
- Submit product-related issues

### Consumer Product Information Workflow

**Product Image**

↓

**Image Processing**

↓

**OCR + Vision AI**

↓

**Product Information Extraction**

↓

**Information Classification**

↓

**Consumer-Friendly Product Information**

### Consumer Warnings

The system can present relevant product information and warnings based on the information extracted from the product label.

Warnings can include:

- Important ingredient information
- Nutrition-related cautions
- Age-related suitability
- Usage-related information
- Other relevant product warnings

The Consumer interface is designed to present this information in a simple and understandable format.

### Issue Submission

Consumers can submit an issue when they identify a concern with a product.

The workflow is:

**Consumer**

↓

**Submit Product Issue**

↓

**Issue Stored in Supabase**

↓

**Admin Review**

The Admin can review the submitted issue through the administrative interface.

### Consumer and Inspector Separation

The Consumer module is intended for public awareness and product information.

It does not replace the official Inspector inspection workflow.

The Inspector remains the primary user responsible for packaged commodity compliance inspection.

## Challenges and Limitations

Metriscan-AI is designed as an AI-assisted inspection system. Like any image-based AI system, its performance can be affected by the quality and availability of the product label information.

### Image Quality

Product images may contain:

- Blur
- Glare
- Shadows
- Low resolution
- Poor lighting
- Distorted text
- Curved packaging surfaces

These conditions can affect OCR and Vision AI extraction.

### OCR Limitations

OCR may produce incorrect or incomplete text when:

- Text is very small
- Characters are unclear
- Multiple text styles are present
- The label contains complex layouts
- Parts of the declaration are hidden or damaged

Image preprocessing and additional Vision AI analysis are used to improve the extraction process.

### Vision AI Limitations

Vision AI may interpret unclear or partially visible information incorrectly.

Therefore, the system uses validation and provides a **REVIEW** result when the available information requires further verification.

### Compliance Rule Complexity

Different packaged commodities may have different applicable requirements.

The Rule Applicability Engine and dynamically managed compliance rules are used to handle different rule conditions.

### Rule Updates

Compliance requirements can change over time.

The Admin can update the configured compliance rules through the system so that future inspections can use the updated configuration.

### Human-in-the-Loop

Metriscan-AI does not replace the Legal Metrology Inspector.

The system assists with:

- Information extraction
- Rule identification
- Compliance checking
- Evidence organization
- Report generation

The Inspector remains responsible for final verification and determination.

### Connectivity

The current system depends on the backend and configured cloud services for processing, authentication, database access, and storage.

Offline inspection capabilities can be considered as a future enhancement.

### Accuracy Evaluation

The system should be evaluated using representative product images and inspection cases.

Field-level extraction accuracy, compliance evaluation accuracy, and performance under different image conditions should be measured using a suitable test dataset rather than assuming a fixed accuracy value.

## Future Enhancements

Metriscan-AI can be extended with additional capabilities to improve inspection coverage, usability, scalability, and automation.

### Multilingual Label Support

Support for additional Indian languages can be added to improve product label processing across different regions.

### Improved Image Processing

Additional image enhancement techniques can be integrated to improve processing of:

- Blurred images
- Low-light images
- Curved packaging
- Small text
- Complex label layouts

### Offline Inspection Support

An offline or edge-processing mode can be explored for inspection environments with limited internet connectivity.

### Advanced Analytics

The Admin dashboard can be extended with advanced analytics such as:

- Inspection trends
- Frequently identified compliance issues
- Product-category analysis
- Inspector activity analysis
- Regional inspection statistics

### Mobile Application

A dedicated mobile application can be developed to allow Inspectors to capture product images directly using mobile devices.

### Expanded Rule Coverage

The compliance engine can be extended to support additional regulatory requirements and future rule amendments through the dynamic rule-management system.

### Improved Evidence Management

Future versions can provide more detailed evidence linking between:

- Product images
- Extracted fields
- Applicable rules
- Compliance findings
- Inspector remarks
- Generated reports

### Model Evaluation and Improvement

A larger and representative dataset can be used to evaluate and improve:

- OCR extraction
- Structured field extraction
- Vision AI interpretation
- Compliance classification
- Image-quality handling

### Advanced Human-in-the-Loop Review

Future versions can provide confidence indicators and more detailed review workflows to help Inspectors focus on uncertain or potentially non-compliant declarations.

## Project Benefits and Impact

Metriscan-AI is designed to support digital, consistent, and evidence-based packaged commodity inspections.

### Benefits for Inspectors

- Reduces repetitive manual label checking
- Speeds up information extraction
- Helps identify applicable compliance requirements
- Provides structured compliance findings
- Organizes inspection evidence
- Generates standardized inspection reports
- Supports human-in-the-loop verification

### Benefits for Authorities

- Centralized inspection information
- Digital inspection history
- Configurable compliance rules
- Better traceability of inspection activities
- Data-driven inspection analysis
- Reduced dependency on paper-based records

### Benefits for Consumers

- Easier access to product label information
- Simple understanding of important product details
- Consumer-oriented warnings and cautions
- Ability to maintain scan history
- Ability to submit product-related issues for administrative review

### Benefits for Businesses

- Encourages accurate and complete package declarations
- Promotes awareness of packaged commodity requirements
- Supports transparency in product labeling
- Can contribute to more consistent compliance practices

### Social Impact

- Improves consumer awareness
- Supports transparency in packaged products
- Helps make product information easier to understand
- Supports more efficient inspection workflows

### Economic Impact

- Reduces repetitive inspection effort
- Reduces manual paperwork
- Improves inspection workflow efficiency
- Supports scalable digital inspection processes

### Governance Impact

- Digital inspection records
- Centralized compliance rule management
- Evidence-based inspection reporting
- Traceable inspection history
- Role-based system access

### Environmental Impact

- Reduces dependence on paper-based inspection records
- Supports digital evidence storage
- Enables digital report generation and storage

## API Endpoints

Metriscan-AI uses FastAPI to provide backend APIs for authentication, product inspection, OCR processing, and report generation.

### Authentication API

The authentication API handles user login and role-based access.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Authenticates an application user |

### OCR and Inspection API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/ocr/` | Uploads a product image and processes the inspection pipeline |

The OCR endpoint performs the major inspection operations including:

- Image upload and validation
- Image preprocessing
- PaddleOCR processing
- Structured field extraction
- Gemini Vision processing
- Extraction fusion
- OCR field recovery
- Rule applicability evaluation
- Compliance evaluation

### Report API

The report API handles generation and access to inspection reports.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/reports/` | Generates an inspection report based on inspection data |

### API Processing Flow

**Client Application**

↓

**FastAPI API**

↓

**Authentication / Validation**

↓

**Inspection Processing**

↓

**AI and OCR Pipeline**

↓

**Compliance Engine**

↓

**Supabase**

↓

**API Response**

### API Design

The backend APIs are designed to keep the major application responsibilities separated.

- Authentication APIs handle user access.
- OCR APIs handle product image processing.
- Compliance services handle rule evaluation.
- Report APIs handle inspection report generation.
- Supabase handles persistent application data and storage.

The API layer connects the React frontend with the Metriscan-AI backend processing pipeline.

## Working Product

The working Metriscan-AI application can be accessed using the link below.

**Live Demo:**  
[Open Metriscan-AI](https://metriscan-ai-omega.vercel.app/)

The live application demonstrates the Inspector, Admin, and Consumer workflows, including product scanning, AI-assisted extraction, compliance evaluation, and inspection reporting.

## Project Demonstration Video

A complete demonstration of the Metriscan-AI system is available in the video below.

**YouTube Video:**  
[Watch Metriscan-AI Demonstration](YOUR_YOUTUBE_LINK)
