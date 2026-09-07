import os
import json
import base64
from typing import Any, Dict, List

from dotenv import load_dotenv
from google import genai

load_dotenv()


class GeminiVisionService:
    """
    Gemini Vision is used for visual field association and semantic understanding.

    Important:
    - PaddleOCR remains the exact text/bounding-box source.
    - Gemini must not invent values.
    - Missing or ambiguous fields must be returned as null.
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured in backend/.env"
            )

        self.client = genai.Client(api_key=api_key)
        self.model = os.getenv(
            "GEMINI_MODEL",
            "gemini-3.5-flash"
        )

    def extract_product_data(
        self,
        image_path: str,
        ocr_results: List[Dict[str, Any]] | None = None
    ) -> Dict[str, Any]:

        with open(image_path, "rb") as image_file:
            image_bytes = image_file.read()

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        mime_type = self._get_mime_type(image_path)

        ocr_context = self._build_ocr_context(
            ocr_results or []
        )

        prompt = self._build_prompt(ocr_context)
        response_schema = self._get_response_schema()

        interaction = self.client.interactions.create(
            model=self.model,
            input=[
                {
                    "type": "text",
                    "text": prompt
                },
                {
                    "type": "image",
                    "data": image_b64,
                    "mime_type": mime_type
                }
            ],
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": response_schema
            }
        )

        output_text = getattr(
            interaction,
            "output_text",
            None
        )

        if not output_text:
            raise ValueError(
                "Gemini returned an empty response."
            )

        try:
            data = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Gemini returned invalid JSON: {output_text}"
            ) from exc

        return self._normalize_response(data)

    def _build_prompt(
        self,
        ocr_context: str
    ) -> str:

        return f"""
You are an expert visual information extraction system
for packaged-product labels.

Analyze the PROVIDED LABEL IMAGE itself.

The IMAGE is the primary source of truth.
PaddleOCR text is supporting evidence only.

Your task is NOT ordinary OCR.

You must determine which visible text belongs to which
structured product field using:

1. Visual layout
2. Text position
3. Text physically adjacent to a field label
4. Boxes/tables
5. Typography and prominence
6. Section boundaries
7. Field abbreviations
8. PaddleOCR text and bounding boxes

GENERAL RULES
- Never invent information.
- Never infer a value that is not visibly supported.
- If a field is not clearly visible, return null.
- Do not use unrelated nearby text as a value.
- A field label by itself is NOT a field value.
- An instruction sentence is NOT a field value.
- Do not copy a heading into its own field.
- Do not use information from another field as a substitute.
- Preserve the visible wording where practical.
- Prefer the most complete clearly visible value.

FIELD ASSOCIATION IS CRITICAL.

==================================================
PRODUCT NAME
==================================================

Find the actual product name only when the image provides
reasonable visual evidence.

Strong evidence:
- prominent product title
- product name printed near the main brand/product area
- explicit product description

Reject as product name:
- CONTAINS CAFFEINE
- CONTAINS MILK
- MAY CONTAIN NUT
- NUTRITIONAL INFORMATION
- INGREDIENTS
- METHOD OF PREPARATION
- STORAGE instructions
- health claims
- marketing slogans
- consumer-contact headings
- manufacturer/marketer headings
- legal statements
- recycling statements

Do NOT infer a product name only from a trademark owner,
manufacturer, or company name.

If the product name is not clearly visible:
product_name = null

==================================================
PRODUCT CATEGORY
==================================================

Classify the visible product as exactly one of:

packaged_food
beverage
cosmetic
personal_care
household_product
pharmaceutical
supplement
electronic_product
other
unknown

Use the image and visible product information.
Do not guess from a company name alone.

==================================================
NET QUANTITY
==================================================

Look specifically for:
- Net Weight
- Net Qty
- Net Quantity
- N.QTY
- Quantity

Return the complete visible declaration.

Example:
"1 Litre (910g)"
must remain:
"1 Litre (910g)"

Do not use serving size or nutritional quantity.

==================================================
MRP
==================================================

Look specifically for:
- MRP
- M.R.P.
- MRP Rs.
- Maximum Retail Price

Return the actual visible price.

Do NOT return:
- "MRP"
- "MRP Rs."
- "MRP:"
- "inclusive of all taxes"
- another unrelated number

If the printed MRP field has no visible value:
mrp = null

==================================================
BATCH NUMBER
==================================================

Look specifically for:
- Batch
- Batch No.
- Batch Number
- B.No.
- B.NO.
- Lot
- Lot No.

The value must be physically associated with the batch label.

REJECT:
- field labels themselves
- "Use By"
- "Packed On"
- "MFD"
- "MRP"
- "See below"
- "See bottom"
- "See bottom of can"
- "Refer below"
- "Refer to bottom"
- "See label"
- "When stored in..."
- storage instructions
- preparation instructions
- any long natural-language sentence

Example:
B.NO.: TV230923
=> batch_number = "TV230923"

If the package says:
"BATCH NO. SEE BOTTOM OF CAN"
and the actual batch value is not visible:
batch_number = null

==================================================
MANUFACTURING DATE
==================================================

Look specifically for:
- MFD
- MFG
- MFG Date
- Mfd Date
- Manufactured
- Date of Manufacture

Do not convert another date field into manufacturing date.

==================================================
PACKED ON
==================================================

Look specifically for:
- Packed On
- Packed
- PKD
- PKD On
- Pkd On

Do not convert MFD into Packed On.

==================================================
USE BY
==================================================

Look specifically for:
- USE BY
- Use By
- Use Before

If:
USE BY: 22 SEP 24
return:
use_by = "22 SEP 24"

Do not rename USE BY as Best Before.

==================================================
BEST BEFORE
==================================================

Look specifically for:
- Best Before
- Best Before Date
- BBE

Only populate best_before when the label explicitly
associates the value with Best Before.

==================================================
EXPIRY
==================================================

Look for:
- Expiry
- Exp Date
- EXP
- Expires

Preserve separately as expiry_date.

==================================================
MANUFACTURER / PACKER
==================================================

Return the COMPANY/PERSON NAME, not its address.

Strong labels:
- Manufacturer
- Manufactured By
- Manufactured & Marketed By
- Packed By
- Packer
- Manufactured For

Example:
MANUFACTURED BY:
ITC LIMITED - FOODS DIVISION
SURVEY NO. 15/1...
=> manufacturer_or_packer = "ITC LIMITED - FOODS DIVISION"

Do NOT return the address as manufacturer_or_packer.

Do NOT return a heading such as "MANUFACTURED BY".

==================================================
MARKETED BY
==================================================

Return the actual company/person associated with:
- Marketed By
- Marketed & Distributed By
- Distributed By

Do NOT return:
- QUALITY GUARANTEED
- slogans
- contact headings
- addresses
- phone numbers
- emails
- random nearby text

If there is no clearly associated marketer:
marketed_by = null

==================================================
ADDRESS
==================================================

Return the address associated with the relevant
manufacturer, packer, marketer, or business.

Do not place the company name in address unless it is
actually part of the printed address.

Preserve multiple units/locations when clearly visible.

==================================================
CONSUMER CONTACT
==================================================

Look for explicit consumer/customer contact sections:
- Consumer Helpline
- Consumer Care
- Customer Care
- Consumer Relations
- Feedback / Complaint Contact
- For Feedback
- Contact Us
- Toll Free
- Email us
- Contact our customer care

A standalone website is NOT automatically a consumer-contact
field.

For example:
www.company.com
by itself should normally remain null unless the surrounding
section clearly identifies it as contact/information/consumer
contact.

When clearly associated, consumer_contact may contain:
- phone
- email
- website
- consumer-care address

==================================================
LICENSE NUMBER
==================================================

Extract only when explicitly associated with:
- FSSAI
- FSSAI Lic. No.
- Lic. No.
- License No.

Do not confuse:
- barcode
- phone number
- PIN code
- MRP
- batch
- other product numbers

Multiple clearly labelled licenses may be preserved.

==================================================
INGREDIENTS
==================================================

Extract the actual ingredient declaration only.

Do not use:
- nutrition values
- preparation instructions
- claims
- warnings

Preserve the complete visible ingredient list.

==================================================
COUNTRY OF ORIGIN
==================================================

Only populate when the country is explicitly associated with
a country-of-origin statement.

Accept:
- Country of Origin: India
- Country of origin - India
- Made in India
- Product of India

DO NOT infer country of origin from:
- a manufacturer address
- an Indian phone number
- an Indian PIN code
- company location
- "India" appearing inside an address

If there is no explicit country-of-origin evidence:
country_of_origin = null

==================================================
IMPORTANT FIELD/VALUE RULE
==================================================

For every field, ask:

1. Is there an actual value?
2. Is it physically/visually associated with the field?
3. Is it semantically the right type of value?
4. Is it not merely a heading?
5. Is it not an instruction?
6. Is it not another field's value?

If any answer is no:
return null.

PADDLEOCR SUPPORTING TEXT
-------------------------
{ocr_context}

Return ONLY JSON matching the requested schema.
"""

    @staticmethod
    def _get_response_schema() -> Dict[str, Any]:

        string_fields = [
            "product_name",
            "net_quantity",
            "mrp",
            "batch_number",
            "packed_on",
            "date_of_manufacture",
            "best_before",
            "use_by",
            "expiry_date",
            "manufacturer_or_packer",
            "address",
            "consumer_contact",
            "license_number",
            "ingredients",
            "country_of_origin",
            "marketed_by"
        ]

        properties: Dict[str, Any] = {}

        for field in string_fields:
            properties[field] = {
                "type": ["string", "null"]
            }

        properties["product_category"] = {
            "type": "string",
            "enum": [
                "packaged_food",
                "beverage",
                "cosmetic",
                "personal_care",
                "household_product",
                "pharmaceutical",
                "supplement",
                "electronic_product",
                "other",
                "unknown"
            ]
        }

        return {
            "type": "object",
            "properties": properties,
            "required": string_fields + [
                "product_category"
            ],
            "additionalProperties": False
        }

    @staticmethod
    def _build_ocr_context(
        ocr_results: List[Dict[str, Any]]
    ) -> str:

        if not ocr_results:
            return "No PaddleOCR results available."

        lines = []

        for index, item in enumerate(ocr_results):
            text = item.get("text", "")
            confidence = item.get("confidence", None)
            bbox = item.get("bbox", None)

            lines.append(
                f"{index + 1}. "
                f"text={text!r}; "
                f"confidence={confidence}; "
                f"bbox={bbox}"
            )

        return "\n".join(lines)

    @staticmethod
    def _normalize_response(
        data: Dict[str, Any]
    ) -> Dict[str, Any]:

        fields = [
            "product_name",
            "net_quantity",
            "mrp",
            "batch_number",
            "packed_on",
            "date_of_manufacture",
            "best_before",
            "use_by",
            "expiry_date",
            "manufacturer_or_packer",
            "address",
            "consumer_contact",
            "license_number",
            "ingredients",
            "country_of_origin",
            "marketed_by",
            "product_category"
        ]

        result: Dict[str, Any] = {}

        for field in fields:
            value = data.get(field)

            if isinstance(value, str):
                value = value.strip()

                if not value:
                    value = None

            result[field] = value

        if not result.get("product_category"):
            result["product_category"] = "unknown"

        return result

    @staticmethod
    def _get_mime_type(
        image_path: str
    ) -> str:

        extension = os.path.splitext(
            image_path
        )[1].lower()

        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".bmp": "image/bmp",
            ".gif": "image/gif"
        }

        return mime_types.get(
            extension,
            "image/jpeg"
        )


gemini_vision_service = GeminiVisionService()
