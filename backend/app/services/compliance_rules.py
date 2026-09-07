from typing import Any, Dict, List, Optional


# ============================================================
# COLLEGE DEMO LEGAL BASELINE
# ============================================================
#
# This version intentionally uses the ORIGINAL
# Legal Metrology (Packaged Commodities) Rules, 2011
# as the baseline.
#
# Amendments are NOT applied in this college-demo version.
#
# Later we can introduce:
#   - amendment registry
#   - effective dates
#   - historical versions
#   - current consolidated rules
#
# ============================================================


RULE_BASELINE = {
    "name": "Legal Metrology (Packaged Commodities) Rules, 2011",
    "notification": "G.S.R. 202(E)",
    "notification_date": "2011-03-07",
    "effective_from": "2011-04-01",
    "version": "2011-original",
}


AUTOMATION_TYPES = {
    "AUTOMATED": (
        "AI can evaluate the requirement primarily "
        "from OCR and structured package evidence."
    ),

    "CONDITIONAL": (
        "AI can evaluate after determining whether "
        "the requirement applies to the product."
    ),

    "PARTIAL": (
        "AI can provide evidence, but human verification "
        "may be required."
    ),

    "LISTING": (
        "Requires product-listing or e-commerce evidence."
    ),

    "OUT_OF_SCOPE": (
        "Cannot reliably be determined from package imagery alone."
    ),
}


# ============================================================
# RULE MASTER
# ============================================================

RULE_MASTER: List[Dict[str, Any]] = [

    # --------------------------------------------------------
    # RULE 1
    # --------------------------------------------------------

    {
        "rule_id": "LM-01",
        "rule_number": "1",
        "rule_name": "Short title and commencement",

        "category": "GENERAL",

        "requirement": (
            "These rules may be called the Legal Metrology "
            "(Packaged Commodities) Rules, 2011 and came into "
            "force on 1 April 2011."
        ),

        "applicability": "General legal provision.",

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
        },

        "evidence_needed": [],

        "expected": (
            "Used as the legal baseline for the college demonstration."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 1"
        ),
    },


    # --------------------------------------------------------
    # RULE 2
    # --------------------------------------------------------

    {
        "rule_id": "LM-02",
        "rule_number": "2",
        "rule_name": "Definitions",

        "category": "GENERAL",

        "requirement": (
            "Defines terms used throughout the Rules, including "
            "Act, dealer, manufacturer, package, pre-packaged "
            "commodity, net quantity, packer, principal display "
            "panel, quantity, retail dealer and retail package."
        ),

        "applicability": "General interpretation provision.",

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_context": True,
        },

        "evidence_needed": [
            "product_information",
            "package_image",
        ],

        "expected": (
            "The product should first be classified using the "
            "definitions applicable to the Rules."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 2"
        ),
    },


    # --------------------------------------------------------
    # RULE 3
    # --------------------------------------------------------

    {
        "rule_id": "LM-03",
        "rule_number": "3",
        "rule_name": "Applicability of the Chapter",

        "category": "APPLICABILITY",

        "requirement": (
            "Determines the packages and categories to which "
            "the applicable chapter provisions apply."
        ),

        "applicability": (
            "Must be determined before evaluating the package "
            "against the declaration requirements."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_category": True,
            "requires_package_type": True,
        },

        "evidence_needed": [
            "product_category",
            "package_type",
            "net_quantity",
            "intended_use",
        ],

        "expected": (
            "The package should be correctly classified as "
            "within or outside the applicable scope."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 3"
        ),
    },


    # --------------------------------------------------------
    # RULE 4
    # --------------------------------------------------------

    {
        "rule_id": "LM-04",
        "rule_number": "4",
        "rule_name": "Applicability of the provisions",

        "category": "APPLICABILITY",

        "requirement": (
            "Packages covered by the Rules must comply with "
            "the applicable provisions concerning declarations "
            "and package information."
        ),

        "applicability": "Pre-packaged commodities within scope.",

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_context": True,
        },

        "evidence_needed": [
            "product_category",
            "package_image",
        ],

        "expected": (
            "Applicable declaration requirements should be "
            "evaluated after scope determination."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 4"
        ),
    },


    # --------------------------------------------------------
    # RULE 5
    # --------------------------------------------------------

    {
        "rule_id": "LM-05",
        "rule_number": "5",
        "rule_name": (
            "Specific commodities to be packed and sold "
            "in recommended standard packages"
        ),

        "category": "QUANTITY",

        "requirement": (
            "The commodities specified in the Second Schedule "
            "are to be packed for sale, distribution or delivery "
            "in the standard quantities specified in that Schedule."
        ),

        "applicability": (
            "Only when the product belongs to a commodity "
            "specified in the Second Schedule."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_category": True,
            "requires_second_schedule": True,
        },

        "evidence_needed": [
            "product_category",
            "net_quantity",
            "second_schedule_entry",
        ],

        "expected": (
            "The declared package quantity should correspond "
            "to the applicable standard package quantity."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 5"
        ),

        "suggestion": (
            "Determine the commodity category and consult "
            "the Second Schedule before evaluating."
        ),
    },


    # --------------------------------------------------------
    # RULE 6
    # --------------------------------------------------------

    {
        "rule_id": "LM-06",
        "rule_number": "6",
        "rule_name": "Declarations to be made on every package",

        "category": "MANDATORY_DECLARATIONS",

        "requirement": (
            "Every package shall bear a definite, plain and "
            "conspicuous declaration in accordance with the Rules."
        ),

        "applicability": (
            "Primary declaration rule for pre-packaged commodities."
        ),

        "automation": {
            "type": "AUTOMATED",
            "ai_checkable": True,
            "requires_ocr": True,
            "requires_structured_product_data": True,
        },

        "checks": [

            {
                "check_id": "LM-06-01",
                "name": "Manufacturer / packer / importer",
                "field": "manufacturer_or_packer",

                "required": True,

                "automation": "AUTOMATED",

                "expected": (
                    "Name and address of manufacturer, packer "
                    "and/or importer as applicable."
                ),
            },

            {
                "check_id": "LM-06-02",
                "name": "Common or generic name",
                "field": "product_name",

                "required": True,

                "automation": "AUTOMATED",

                "expected": (
                    "The common or generic name of the commodity "
                    "should be identifiable."
                ),
            },

            {
                "check_id": "LM-06-03",
                "name": "Net quantity",
                "field": "net_quantity",

                "required": True,

                "automation": "AUTOMATED",

                "expected": (
                    "Net quantity should be declared using "
                    "the applicable standard unit or number."
                ),
            },

            {
                "check_id": "LM-06-04",
                "name": "Manufacturing / pre-packing / import date",
                "field": "date_of_manufacture",

                "required": True,

                "automation": "CONDITIONAL",

                "expected": (
                    "Applicable month and year information "
                    "should be declared."
                ),
            },

            {
                "check_id": "LM-06-05",
                "name": "Best before / use by",
                "field": "best_before",

                "required_when": (
                    "Commodity may become unfit for human consumption "
                    "after a period of time."
                ),

                "automation": "CONDITIONAL",

                "expected": (
                    "Best before or use-by information should be "
                    "declared where applicable."
                ),
            },

            {
                "check_id": "LM-06-06",
                "name": "Maximum Retail Price",
                "field": "mrp",

                "required": True,

                "automation": "AUTOMATED",

                "expected": (
                    "Retail sale price should be declared as required "
                    "by the applicable Rule."
                ),
            },

            {
                "check_id": "LM-06-07",
                "name": "Consumer complaint contact",
                "field": "consumer_contact",

                "required": True,

                "automation": "AUTOMATED",

                "expected": (
                    "Name/address/telephone/e-mail information "
                    "for consumer complaints should be available "
                    "as applicable."
                ),
            },
        ],

        "evidence_needed": [
            "product_name",
            "manufacturer_or_packer",
            "address",
            "net_quantity",
            "mrp",
            "date_of_manufacture",
            "best_before",
            "use_by",
            "consumer_contact",
            "ocr_text",
        ],

        "expected": (
            "All applicable mandatory declarations should be "
            "present, identifiable and sufficiently evidenced."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6"
        ),

        "suggestion": (
            "Verify each mandatory declaration individually. "
            "Do not mark a declaration as absent merely because "
            "OCR failed to detect it."
        ),
    },


    # --------------------------------------------------------
    # RULE 7
    # --------------------------------------------------------

    {
        "rule_id": "LM-07",
        "rule_number": "7",
        "rule_name": (
            "Principal display panel — area, size and lettering"
        ),

        "category": "DISPLAY_PANEL",

        "requirement": (
            "The principal display panel and the required "
            "height/size of numerals and letters shall comply "
            "with the prescribed requirements and applicable table."
        ),

        "applicability": (
            "Applies to declarations required to appear on "
            "the principal display panel."
        ),

        "automation": {
            "type": "PARTIAL",
            "ai_checkable": True,
            "requires_image_geometry": True,
            "requires_ocr_boxes": True,
            "requires_physical_scale": True,
        },

        "evidence_needed": [
            "package_image",
            "ocr_bounding_boxes",
            "principal_display_panel",
            "physical_scale",
        ],

        "expected": (
            "Required declarations should satisfy applicable "
            "principal-display-panel size requirements."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 7"
        ),

        "suggestion": (
            "Without a reliable physical scale, AI should return "
            "REVIEW rather than claiming an exact physical font size."
        ),
    },


    # --------------------------------------------------------
    # RULE 8
    # --------------------------------------------------------

    {
        "rule_id": "LM-08",
        "rule_number": "8",
        "rule_name": "Declaration where to appear",

        "category": "PLACEMENT",

        "requirement": (
            "Declarations required under the Rules shall appear "
            "on the principal display panel, subject to the "
            "specified provisions concerning the quantity declaration."
        ),

        "applicability": (
            "Declarations subject to principal display panel requirements."
        ),

        "automation": {
            "type": "PARTIAL",
            "ai_checkable": True,
            "requires_ocr_boxes": True,
            "requires_layout_analysis": True,
        },

        "evidence_needed": [
            "package_image",
            "ocr_bounding_boxes",
            "principal_display_panel",
        ],

        "expected": (
            "Required declarations should be located in the "
            "prescribed display area."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 8"
        ),

        "suggestion": (
            "Use OCR bounding boxes and visual analysis. "
            "Request another image if the complete panel is not visible."
        ),
    },


    # --------------------------------------------------------
    # RULE 9
    # --------------------------------------------------------

    {
        "rule_id": "LM-09",
        "rule_number": "9",
        "rule_name": "Manner in which declaration shall be made",

        "category": "READABILITY",

        "requirement": (
            "Declarations shall be legible and prominent. "
            "The retail sale price and net quantity declarations "
            "must have appropriate visual contrast, subject to "
            "the specified exceptions."
        ),

        "applicability": (
            "Applies to declarations made on the package."
        ),

        "automation": {
            "type": "PARTIAL",
            "ai_checkable": True,
            "requires_ocr": True,
            "requires_visual_analysis": True,
            "requires_image_quality": True,
        },

        "evidence_needed": [
            "package_image",
            "ocr_text",
            "ocr_confidence",
            "ocr_bounding_boxes",
            "visual_contrast",
        ],

        "expected": (
            "Mandatory declarations should be readable, clear "
            "and sufficiently prominent."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 9"
        ),

        "suggestion": (
            "Use OCR confidence and image analysis as evidence, "
            "but use REVIEW where image quality is insufficient."
        ),
    },


    # --------------------------------------------------------
    # RULE 10
    # --------------------------------------------------------

    {
        "rule_id": "LM-10",
        "rule_number": "10",
        "rule_name": (
            "Declaration of name and address of "
            "the manufacturer, etc."
        ),

        "category": "MANDATORY_DECLARATIONS",

        "requirement": (
            "Every package kept, offered, exposed or sold shall "
            "bear the name and complete address of the manufacturer "
            "or, where applicable, manufacturer and packer, and "
            "for imported packages the importer."
        ),

        "applicability": (
            "Pre-packaged commodities covered by the Rules."
        ),

        "automation": {
            "type": "AUTOMATED",
            "ai_checkable": True,
            "requires_text_extraction": True,
            "requires_entity_association": True,
        },

        "evidence_needed": [
            "manufacturer_or_packer",
            "address",
            "country_of_origin",
            "ocr_text",
        ],

        "expected": (
            "Responsible-party name and applicable address "
            "should be identifiable."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 10"
        ),

        "suggestion": (
            "Verify that the extracted organization is actually "
            "the manufacturer, packer or importer and not merely "
            "the brand/marketer."
        ),
    },


    # --------------------------------------------------------
    # RULE 11
    # --------------------------------------------------------

    {
        "rule_id": "LM-11",
        "rule_number": "11",
        "rule_name": "Declaration of quantity",

        "category": "QUANTITY",

        "requirement": (
            "The quantity declaration shall conform to the "
            "requirements applicable to the commodity and "
            "the prescribed manner of declaration."
        ),

        "applicability": (
            "Where quantity is required to be declared."
        ),

        "automation": {
            "type": "AUTOMATED",
            "ai_checkable": True,
            "requires_quantity_parsing": True,
        },

        "evidence_needed": [
            "net_quantity",
            "ocr_text",
        ],

        "expected": (
            "Quantity should be clearly declared and "
            "associated with the commodity."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 11"
        ),

        "suggestion": (
            "Verify both the numerical quantity and its unit."
        ),
    },


    # --------------------------------------------------------
    # RULE 12
    # --------------------------------------------------------

    {
        "rule_id": "LM-12",
        "rule_number": "12",
        "rule_name": "Declaration of quantity",

        "category": "QUANTITY",

        "requirement": (
            "The quantity declaration shall be expressed in "
            "the prescribed manner and shall not create an "
            "exaggerated, misleading or inadequate impression "
            "about the quantity contained in the package."
        ),

        "applicability": (
            "Applies to quantity declarations."
        ),

        "automation": {
            "type": "AUTOMATED",
            "ai_checkable": True,
            "requires_quantity_parsing": True,
            "requires_text_analysis": True,
        },

        "evidence_needed": [
            "net_quantity",
            "ocr_text",
        ],

        "expected": (
            "The quantity statement should be clear and "
            "should not contain misleading quantity expressions."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 12"
        ),
    },


    # --------------------------------------------------------
    # RULE 13
    # --------------------------------------------------------

    {
        "rule_id": "LM-13",
        "rule_number": "13",
        "rule_name": (
            "Statement of units of weight, measure or number"
        ),

        "category": "UNITS",

        "requirement": (
            "Units of weight, measure or number shall be specified "
            "according to the prescribed unit requirements."
        ),

        "applicability": (
            "Applies to quantity declarations expressed "
            "by weight, measure or number."
        ),

        "automation": {
            "type": "AUTOMATED",
            "ai_checkable": True,
            "requires_unit_validation": True,
        },

        "evidence_needed": [
            "net_quantity",
            "unit",
        ],

        "expected": (
            "The quantity should use an appropriate unit such as "
            "gram, kilogram, millilitre, litre, metre, etc., "
            "according to the applicable declaration."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 13"
        ),
    },


    # --------------------------------------------------------
    # RULE 14
    # --------------------------------------------------------

    {
        "rule_id": "LM-14",
        "rule_number": "14",
        "rule_name": "Declaration of dimensions",

        "category": "CONDITIONAL",

        "requirement": (
            "Where dimensions are required for the applicable "
            "commodity, the prescribed dimensional declaration "
            "shall be made."
        ),

        "applicability": (
            "Commodity-specific."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_category": True,
        },

        "evidence_needed": [
            "product_category",
            "dimensions",
            "ocr_text",
        ],

        "expected": (
            "Applicable dimensions should be declared."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 14"
        ),
    },


    # --------------------------------------------------------
    # RULE 15
    # --------------------------------------------------------

    {
        "rule_id": "LM-15",
        "rule_number": "15",
        "rule_name": "Declaration of dimensions and weight",

        "category": "CONDITIONAL",

        "requirement": (
            "Where applicable, prescribed information concerning "
            "dimensions and weight shall be declared."
        ),

        "applicability": (
            "Commodity-specific."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_category": True,
        },

        "evidence_needed": [
            "product_category",
            "dimensions",
            "net_quantity",
        ],

        "expected": (
            "Applicable dimensional and quantity information "
            "should be present."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 15"
        ),
    },


    # --------------------------------------------------------
    # RULE 16
    # --------------------------------------------------------

    {
        "rule_id": "LM-16",
        "rule_number": "16",
        "rule_name": "Declaration relating to usable sheets",

        "category": "CONDITIONAL",

        "requirement": (
            "Where applicable, commodities sold by usable sheets "
            "must satisfy the prescribed declaration requirements."
        ),

        "applicability": (
            "Only applicable to relevant sheet-based commodities."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_category": True,
        },

        "evidence_needed": [
            "product_category",
            "sheet_quantity",
            "ocr_text",
        ],

        "expected": (
            "Required sheet quantity information should be declared."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 16"
        ),
    },


    # --------------------------------------------------------
    # RULE 17
    # --------------------------------------------------------

    {
        "rule_id": "LM-17",
        "rule_number": "17",
        "rule_name": "Declaration relating to container dimensions",

        "category": "CONDITIONAL",

        "requirement": (
            "Where applicable, the prescribed container-dimension "
            "information shall be declared."
        ),

        "applicability": (
            "Conditional on commodity/container type."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_category": True,
        },

        "evidence_needed": [
            "product_category",
            "container_dimensions",
            "ocr_text",
        ],

        "expected": (
            "Applicable container dimensions should be declared."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 17"
        ),
    },


    # --------------------------------------------------------
    # RULE 18
    # --------------------------------------------------------

    {
        "rule_id": "LM-18",
        "rule_number": "18",
        "rule_name": (
            "Provisions relating to wholesale and retail dealers"
        ),

        "category": "SALE",

        "requirement": (
            "Persons dealing in packaged commodities must comply "
            "with the applicable requirements relating to sale "
            "and package declarations."
        ),

        "applicability": (
            "Dealer / sale context."
        ),

        "automation": {
            "type": "PARTIAL",
            "ai_checkable": True,
            "requires_sale_context": True,
        },

        "evidence_needed": [
            "package_image",
            "mrp",
            "actual_sale_price",
            "seller_type",
        ],

        "expected": (
            "The package should comply with the applicable "
            "requirements and should not be sold above the "
            "declared retail sale price."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 18"
        ),

        "suggestion": (
            "A package image alone cannot establish actual sale price."
        ),
    },


    # --------------------------------------------------------
    # RULE 19
    # --------------------------------------------------------

    {
        "rule_id": "LM-19",
        "rule_number": "19",
        "rule_name": (
            "Inspection of quantity and error at "
            "manufacturer or packer premises"
        ),

        "category": "PHYSICAL_INSPECTION",

        "requirement": (
            "Quantity and error may be determined through "
            "prescribed inspection and sampling procedures."
        ),

        "applicability": (
            "Official physical inspection."
        ),

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
            "requires_physical_measurement": True,
        },

        "evidence_needed": [
            "physical_measurement",
            "sample",
            "inspection_record",
        ],

        "expected": (
            "Physical quantity testing must follow the prescribed "
            "inspection procedure."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 19"
        ),
    },


    # --------------------------------------------------------
    # RULE 20
    # --------------------------------------------------------

    {
        "rule_id": "LM-20",
        "rule_number": "20",
        "rule_name": "Action based on inspection results",

        "category": "PHYSICAL_INSPECTION",

        "requirement": (
            "Action is taken based on the results of the "
            "prescribed inspection and quantity testing."
        ),

        "applicability": "Official enforcement process.",

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
        },

        "evidence_needed": [
            "inspection_result",
            "test_result",
        ],

        "expected": (
            "Enforcement action should follow the official "
            "inspection result."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 20"
        ),
    },


    # --------------------------------------------------------
    # RULE 21
    # --------------------------------------------------------

    {
        "rule_id": "LM-21",
        "rule_number": "21",
        "rule_name": (
            "Inspection of quantity at wholesale or "
            "retail dealer premises"
        ),

        "category": "PHYSICAL_INSPECTION",

        "requirement": (
            "Quantity inspection at dealer premises shall be "
            "conducted using the prescribed procedure."
        ),

        "applicability": "Official physical inspection.",

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
            "requires_physical_measurement": True,
        },

        "evidence_needed": [
            "physical_measurement",
            "declared_quantity",
            "inspection_record",
        ],

        "expected": (
            "Measured quantity should be compared with "
            "declared quantity using the applicable procedure."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 21"
        ),
    },


    # --------------------------------------------------------
    # RULE 22
    # --------------------------------------------------------

    {
        "rule_id": "LM-22",
        "rule_number": "22",
        "rule_name": "Maximum permissible error",

        "category": "PHYSICAL_INSPECTION",

        "requirement": (
            "Maximum permissible error shall be determined "
            "according to the applicable Schedule."
        ),

        "applicability": (
            "Physical quantity verification."
        ),

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
            "requires_physical_measurement": True,
            "requires_first_schedule": True,
        },

        "evidence_needed": [
            "declared_quantity",
            "actual_quantity",
            "maximum_permissible_error",
        ],

        "expected": (
            "Measured quantity deficiency should remain "
            "within the applicable permissible error."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 22"
        ),
    },


    # --------------------------------------------------------
    # RULE 23
    # --------------------------------------------------------

    {
        "rule_id": "LM-23",
        "rule_number": "23",
        "rule_name": "Deceptive packages",

        "category": "PACKAGE_DESIGN",

        "requirement": (
            "A package should not be designed in a manner "
            "that gives a misleading impression concerning "
            "the quantity of the commodity."
        ),

        "applicability": (
            "Potentially deceptive package presentation."
        ),

        "automation": {
            "type": "PARTIAL",
            "ai_checkable": True,
            "requires_package_image": True,
            "requires_human_verification": True,
        },

        "evidence_needed": [
            "package_image",
            "declared_quantity",
            "package_dimensions",
            "physical_quantity",
        ],

        "expected": (
            "Package presentation should not deliberately "
            "create a misleading impression regarding quantity."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 23"
        ),

        "suggestion": (
            "AI may flag a suspicious package for human inspection; "
            "it should not independently make a final legal "
            "determination from an image."
        ),
    },


    # --------------------------------------------------------
    # RULE 24
    # --------------------------------------------------------

    {
        "rule_id": "LM-24",
        "rule_number": "24",
        "rule_name": (
            "Declarations applicable to be made on "
            "every wholesale package"
        ),

        "category": "WHOLESALE",

        "requirement": (
            "Every wholesale package shall bear the prescribed "
            "declarations concerning the manufacturer/importer/packer, "
            "identity of the commodity and the total number of retail "
            "packages or net quantity."
        ),

        "applicability": (
            "Only wholesale packages."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_package_type": True,
            "requires_ocr": True,
        },

        "evidence_needed": [
            "package_type",
            "manufacturer_or_importer",
            "product_name",
            "wholesale_quantity",
            "retail_package_count",
        ],

        "expected": (
            "A wholesale package should contain the declarations "
            "specified under Rule 24."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 24"
        ),
    },


    # --------------------------------------------------------
    # RULE 25
    # --------------------------------------------------------

    {
        "rule_id": "LM-25",
        "rule_number": "25",
        "rule_name": (
            "Restrictions on sale of export packages in India"
        ),

        "category": "EXPORT",

        "requirement": (
            "Export packages are subject to the prescribed "
            "restrictions when sold in India."
        ),

        "applicability": (
            "Only where an export package is offered for sale in India."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_market_context": True,
        },

        "evidence_needed": [
            "package_image",
            "export_status",
            "sale_in_india_context",
        ],

        "expected": (
            "An export package sold in India must comply "
            "with the applicable provisions."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 25"
        ),
    },


    # --------------------------------------------------------
    # RULE 26
    # --------------------------------------------------------

    {
        "rule_id": "LM-26",
        "rule_number": "26",
        "rule_name": (
            "Exemptions in respect of certain packages"
        ),

        "category": "EXEMPTION",

        "requirement": (
            "Certain packages are exempted from specified "
            "requirements subject to the conditions provided "
            "in the Rule."
        ),

        "applicability": (
            "Product/category-specific exemption."
        ),

        "automation": {
            "type": "CONDITIONAL",
            "ai_checkable": True,
            "requires_product_category": True,
            "requires_exemption_conditions": True,
        },

        "evidence_needed": [
            "product_category",
            "package_type",
            "net_quantity",
            "exemption_condition",
        ],

        "expected": (
            "An exemption should only be applied when the "
            "package satisfies the applicable conditions."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 26"
        ),
    },


    # --------------------------------------------------------
    # RULE 27
    # --------------------------------------------------------

    {
        "rule_id": "LM-27",
        "rule_number": "27",
        "rule_name": (
            "Registration of manufacturers, packers and importers"
        ),

        "category": "REGISTRATION",

        "requirement": (
            "Manufacturers, packers and importers covered by "
            "the Rule must obtain registration as prescribed."
        ),

        "applicability": (
            "Manufacturer / packer / importer registration."
        ),

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
            "requires_registration_database": True,
        },

        "evidence_needed": [
            "registration_number",
            "registration_certificate",
            "business_identity",
        ],

        "expected": (
            "Required registration should exist in the appropriate "
            "official registration record."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 27"
        ),
    },


    # --------------------------------------------------------
    # RULE 28
    # --------------------------------------------------------

    {
        "rule_id": "LM-28",
        "rule_number": "28",
        "rule_name": "Registration of shorter address",

        "category": "REGISTRATION",

        "requirement": (
            "A shorter address may be used subject to the "
            "registration requirements prescribed by the Rules."
        ),

        "applicability": (
            "Only when a shorter registered address is used."
        ),

        "automation": {
            "type": "PARTIAL",
            "ai_checkable": True,
            "requires_registration_database": True,
        },

        "evidence_needed": [
            "package_address",
            "manufacturer_or_packer",
            "registration_record",
        ],

        "expected": (
            "A short address should be verified against "
            "the relevant registration information."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 28"
        ),
    },


    # --------------------------------------------------------
    # RULE 29
    # --------------------------------------------------------

    {
        "rule_id": "LM-29",
        "rule_number": "29",
        "rule_name": (
            "Registration records of manufacturers and packers"
        ),

        "category": "ADMINISTRATIVE",

        "requirement": (
            "Registration records are maintained by the "
            "competent authority."
        ),

        "applicability": "Administrative provision.",

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
        },

        "evidence_needed": [
            "official_registration_record",
        ],

        "expected": (
            "Verification should be performed against "
            "official registration records."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 29"
        ),
    },


    # --------------------------------------------------------
    # RULE 30
    # --------------------------------------------------------

    {
        "rule_id": "LM-30",
        "rule_number": "30",
        "rule_name": (
            "Compilation and circulation of registered "
            "manufacturer lists"
        ),

        "category": "ADMINISTRATIVE",

        "requirement": (
            "The competent authority maintains and circulates "
            "the prescribed registration information."
        ),

        "applicability": "Administrative provision.",

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
        },

        "evidence_needed": [
            "authority_registration_list",
        ],

        "expected": (
            "The prescribed administrative record should exist."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 30"
        ),
    },


    # --------------------------------------------------------
    # RULE 31
    # --------------------------------------------------------

    {
        "rule_id": "LM-31",
        "rule_number": "31",
        "rule_name": (
            "Declarations in advertisements mentioning "
            "retail sale price"
        ),

        "category": "ADVERTISEMENT",

        "requirement": (
            "Where an advertisement mentions the retail sale price, "
            "the prescribed quantity information must also be declared "
            "in the manner required by the Rules."
        ),

        "applicability": (
            "Only advertisements mentioning retail sale price."
        ),

        "automation": {
            "type": "LISTING",
            "ai_checkable": True,
            "requires_advertisement": True,
        },

        "evidence_needed": [
            "advertisement_image",
            "advertised_mrp",
            "advertised_quantity",
            "font_measurement",
        ],

        "expected": (
            "Advertisement should contain the required quantity "
            "information and satisfy applicable presentation requirements."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 31"
        ),
    },


    # --------------------------------------------------------
    # RULE 32
    # --------------------------------------------------------

    {
        "rule_id": "LM-32",
        "rule_number": "32",
        "rule_name": "Fine for contravention of rules",

        "category": "ENFORCEMENT",

        "requirement": (
            "Contraventions for which no specific punishment "
            "is provided are subject to the applicable fine."
        ),

        "applicability": (
            "After a contravention has been legally established."
        ),

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
        },

        "evidence_needed": [
            "established_contravention",
            "legal_provision",
        ],

        "expected": (
            "Penalty determination should follow the applicable "
            "legal provision."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 32"
        ),
    },


    # --------------------------------------------------------
    # RULE 33
    # --------------------------------------------------------

    {
        "rule_id": "LM-33",
        "rule_number": "33",
        "rule_name": "Power to relax",

        "category": "EXEMPTION",

        "requirement": (
            "The Central Government may permit relaxation "
            "of specified provisions under the prescribed conditions."
        ),

        "applicability": (
            "Only where an authorized relaxation exists."
        ),

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
        },

        "evidence_needed": [
            "official_relaxation_order",
            "validity_period",
            "product_category",
        ],

        "expected": (
            "A relaxation should only be recognized when supported "
            "by a valid official order."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 33"
        ),
    },


    # --------------------------------------------------------
    # RULE 34
    # --------------------------------------------------------

    {
        "rule_id": "LM-34",
        "rule_number": "34",
        "rule_name": "Repeal and savings",

        "category": "LEGAL_TRANSITION",

        "requirement": (
            "The Standards of Weights and Measures "
            "(Packaged Commodities) Rules, 1977 are repealed, "
            "subject to the savings specified in the Rule."
        ),

        "applicability": (
            "Historical/legal transition provision."
        ),

        "automation": {
            "type": "OUT_OF_SCOPE",
            "ai_checkable": False,
        },

        "evidence_needed": [
            "historical_record",
            "legal_proceeding",
        ],

        "expected": (
            "Historical matters should be handled according "
            "to the savings provisions."
        ),

        "possible_status": [
            "PASS",
            "FAIL",
            "REVIEW",
            "NOT_APPLICABLE",
        ],

        "rule_reference": (
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 34"
        ),
    },
]


# ============================================================
# SCHEDULE MASTER
# ============================================================

SCHEDULE_MASTER = [

    {
        "schedule_id": "SCH-01",
        "schedule_number": "First Schedule",
        "name": "Maximum permissible error",
        "used_by": ["LM-22"],
        "automation": "PHYSICAL_TEST_REQUIRED",
    },

    {
        "schedule_id": "SCH-02",
        "schedule_number": "Second Schedule",
        "name": "Standard package quantities",
        "used_by": ["LM-05"],
        "automation": "CONDITIONAL",
    },

    {
        "schedule_id": "SCH-03",
        "schedule_number": "Third Schedule",
        "name": "Quantity declaration provisions",
        "used_by": ["LM-11", "LM-12"],
        "automation": "CONDITIONAL",
    },

    {
        "schedule_id": "SCH-04",
        "schedule_number": "Fourth Schedule",
        "name": "Unit / commodity-specific provisions",
        "used_by": ["LM-12", "LM-13"],
        "automation": "CONDITIONAL",
    },

    {
        "schedule_id": "SCH-05",
        "schedule_number": "Fifth Schedule",
        "name": "Sampling procedure",
        "used_by": ["LM-19", "LM-21"],
        "automation": "PHYSICAL_TEST_REQUIRED",
    },

    {
        "schedule_id": "SCH-06",
        "schedule_number": "Sixth Schedule",
        "name": "Determination of net quantity",
        "used_by": ["LM-19", "LM-21", "LM-22"],
        "automation": "PHYSICAL_TEST_REQUIRED",
    },

    {
        "schedule_id": "SCH-07",
        "schedule_number": "Seventh Schedule",
        "name": "Inspection data sheets",
        "used_by": ["LM-19", "LM-21"],
        "automation": "RECORD_ONLY",
    },
]


# ============================================================
# HELPER FUNCTIONS
# ============================================================


def get_rule(
    rule_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Return one rule from the 2011 baseline.
    """

    for rule in RULE_MASTER:

        if rule["rule_id"] == rule_id:
            return rule

    return None


def get_rule_by_number(
    rule_number: str,
) -> Optional[Dict[str, Any]]:
    """
    Find a rule using its legal rule number.
    """

    for rule in RULE_MASTER:

        if rule["rule_number"] == str(rule_number):
            return rule

    return None


def get_all_rules() -> List[Dict[str, Any]]:
    """
    Return all rules in the 2011 baseline.
    """

    return RULE_MASTER


def get_rules_by_category(
    category: str,
) -> List[Dict[str, Any]]:
    """
    Return rules belonging to a category.
    """

    return [
        rule
        for rule in RULE_MASTER
        if rule.get("category") == category
    ]


def get_rules_by_automation_type(
    automation_type: str,
) -> List[Dict[str, Any]]:
    """
    Return rules according to their AI automation capability.
    """

    return [
        rule
        for rule in RULE_MASTER
        if rule.get("automation", {}).get("type")
        == automation_type
    ]


def get_rule_check(
    check_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Find a sub-check such as LM-06-01.
    """

    for rule in RULE_MASTER:

        for check in rule.get("checks", []):

            if check.get("check_id") == check_id:

                return {
                    "rule": rule,
                    "check": check,
                }

    return None


def get_schedule(
    schedule_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Return a schedule by ID.
    """

    for schedule in SCHEDULE_MASTER:

        if schedule["schedule_id"] == schedule_id:
            return schedule

    return None


def get_rule_summary() -> Dict[str, int]:
    """
    Return summary of the college-demo Rule Master.
    """

    summary = {
        "total_rules": len(RULE_MASTER),
        "automated": 0,
        "conditional": 0,
        "partial": 0,
        "listing": 0,
        "out_of_scope": 0,
    }

    for rule in RULE_MASTER:

        automation_type = (
            rule
            .get("automation", {})
            .get("type")
        )

        if automation_type == "AUTOMATED":
            summary["automated"] += 1

        elif automation_type == "CONDITIONAL":
            summary["conditional"] += 1

        elif automation_type == "PARTIAL":
            summary["partial"] += 1

        elif automation_type == "LISTING":
            summary["listing"] += 1

        elif automation_type == "OUT_OF_SCOPE":
            summary["out_of_scope"] += 1

    return summary


def get_automatable_rules() -> List[Dict[str, Any]]:
    """
    Return rules that can provide useful AI evidence.
    """

    return [
        rule
        for rule in RULE_MASTER
        if rule.get("automation", {}).get("type")
        in {
            "AUTOMATED",
            "CONDITIONAL",
            "PARTIAL",
            "LISTING",
        }
    ]


def get_package_image_rules() -> List[Dict[str, Any]]:
    """
    Rules relevant to the package-image compliance demo.
    """

    return [
        rule
        for rule in RULE_MASTER
        if rule.get("automation", {}).get("ai_checkable")
        is True
    ]


# ============================================================
# DEMO INFORMATION
# ============================================================


def get_baseline_info() -> Dict[str, Any]:
    """
    Return legal baseline information.
    """

    return RULE_BASELINE