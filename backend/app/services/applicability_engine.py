from typing import Any, Dict, List, Optional
import re


class ApplicabilityEngine:
    """
    Phase 2.2
    Legal Metrology (Packaged Commodities) Rules, 2011
    Consolidated compliance applicability baseline.

    This engine is aligned to the current rule structure used by the
    compliance engine. Rule 5 is treated as omitted, and Rule 6(11)
    unit-sale-price applicability is included.

    This engine determines whether a rule is applicable.
    It does NOT determine legal PASS/FAIL.
    """

    def determine(
        self,
        product_data: Optional[Dict[str, Any]] = None,
        ocr_text: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:

        product_data = product_data or {}
        ocr_text = ocr_text or []
        context = context or {}

        full_text = self._build_text(product_data, ocr_text)

        package_context = self._determine_package_context(
            product_data,
            full_text,
            context,
        )

        chapter_ii = package_context["chapter_ii_applies"]

        rules = []

        # --------------------------------------------------
        # RULE 1
        # --------------------------------------------------

        rules.append(
            self._result(
                "LM-01",
                "1",
                "OUT_OF_SCOPE",
                False,
                "Short title and commencement provision; not a package-image compliance check.",
                [],
                "OUT_OF_SCOPE",
            )
        )

        # --------------------------------------------------
        # RULE 2
        # --------------------------------------------------

        rules.append(
            self._result(
                "LM-02",
                "2",
                "APPLICABLE",
                True,
                "Definitions are used to interpret the Rules.",
                [],
                "CONDITIONAL",
            )
        )

        # --------------------------------------------------
        # RULES 3 AND 4
        # --------------------------------------------------

        rules.append(
            self._result(
                "LM-03",
                "3",
                "APPLICABLE" if chapter_ii else "NOT_APPLICABLE",
                chapter_ii,
                package_context["chapter_ii_reason"],
                package_context["chapter_ii_evidence"],
                "CONDITIONAL",
            )
        )

        rules.append(
            self._result(
                "LM-04",
                "4",
                "APPLICABLE" if chapter_ii else "NOT_APPLICABLE",
                chapter_ii,
                (
                    "The package is within the Chapter II scope."
                    if chapter_ii
                    else "The package is outside the Chapter II scope."
                ),
                package_context["chapter_ii_evidence"],
                "CONDITIONAL",
            )
        )

        # --------------------------------------------------
        # RULE 5
        # --------------------------------------------------
        # Rule 5 was omitted by amendment. It must not be treated as an
        # active Second-Schedule package-quantity requirement.
        rules.append(
            self._result(
                "LM-05",
                "5",
                "OMITTED",
                False,
                "Rule 5 has been omitted; the former Second Schedule package-quantity requirement is not an active applicability check.",
                [],
                "OUT_OF_SCOPE",
            )
        )

        # --------------------------------------------------
        # RULE 6 — declaration applicability
        # --------------------------------------------------
        # Keep Rule 6 as separate declaration-level applicability results
        # so the compliance engine can distinguish unconditional,
        # conditional and evidence-limited checks.
        rule6_items = [
            (
                "LM-06A",
                "6(1)(a)",
                "Manufacturer/packer/importer name and address",
                True,
                "The responsible entity name and complete address are required for a covered retail package, subject to the rule's stated exceptions.",
            ),
            (
                "LM-06B",
                "6(1)(aa)",
                "Country of origin for imported goods",
                package_context["imported_package"],
                (
                    "Imported-package evidence was detected; country of origin is applicable."
                    if package_context["imported_package"]
                    else "No reliable imported-package evidence was detected."
                ),
            ),
            (
                "LM-06C",
                "6(1)(b)",
                "Common or generic name of the commodity",
                True,
                "The package should identify the commodity by its common or generic name.",
            ),
            (
                "LM-06D",
                "6(1)(c)",
                "Net quantity",
                True,
                "Net quantity is applicable to the covered pre-packaged commodity.",
            ),
            (
                "LM-06E",
                "6(1)(d)",
                "Month and year of manufacture/pre-packing/import",
                True,
                "Date declaration is applicable, subject to food-sector and other-law exceptions.",
            ),
            (
                "LM-06F",
                "6(1)(da)",
                "Best before/use by",
                package_context["time_sensitive_product"],
                (
                    "The commodity appears time-sensitive; best-before/use-by applicability is triggered."
                    if package_context["time_sensitive_product"]
                    else "No reliable evidence was found that a best-before/use-by declaration is specifically triggered."
                ),
            ),
            (
                "LM-06G",
                "6(1)(e)",
                "Maximum retail sale price",
                True,
                "Retail sale price/MRP is applicable to a covered retail package, subject to statutory exceptions.",
            ),
            (
                "LM-06H",
                "6(1)(f)",
                "Dimensions where applicable",
                package_context["dimension_declaration_context"],
                (
                    "Commodity/category evidence indicates that dimension declaration may apply."
                    if package_context["dimension_declaration_context"]
                    else "No commodity-specific dimension evidence was detected."
                ),
            ),
            (
                "LM-06I",
                "6(2)",
                "Consumer complaint contact details",
                True,
                "Consumer-care contact information is applicable where required by the rule.",
            ),
            (
                "LM-06J",
                "6(11)",
                "Unit sale price",
                package_context["unit_sale_price_applicable"],
                (
                    "Unit sale price is applicable under Rule 6(11) for the detected quantity/unit context."
                    if package_context["unit_sale_price_applicable"]
                    else "Unit sale price is not required where the detected MRP and unit-sale-price conditions make the declaration unnecessary or applicability cannot be triggered."
                ),
            ),
        ]

        for rule_id, rule_number, rule_name, applicable, reason in rule6_items:
            if not chapter_ii:
                status = "NOT_APPLICABLE"
                applicable_value = False
                final_reason = "Chapter II does not apply to this package."
            elif applicable:
                status = "APPLICABLE"
                applicable_value = True
                final_reason = reason
            else:
                status = "NOT_APPLICABLE"
                applicable_value = False
                final_reason = reason

            rules.append(
                self._result(
                    rule_id,
                    rule_number,
                    status,
                    applicable_value,
                    final_reason,
                    package_context["chapter_ii_evidence"],
                    "AUTOMATED" if rule_number in ("6(1)(b)", "6(1)(c)", "6(1)(e)") else "CONDITIONAL",
                )
            )

        # --------------------------------------------------
        # RULES 7-13
        # --------------------------------------------------

        core_rules = [
            (
                "LM-07",
                "7",
                "Principal display panel — area, size and lettering",
                "PARTIAL",
            ),
            (
                "LM-08",
                "8",
                "Declaration where to appear",
                "PARTIAL",
            ),
            (
                "LM-09",
                "9",
                "Manner in which declaration shall be made",
                "PARTIAL",
            ),
            (
                "LM-10",
                "10",
                "Declaration of name and address of the manufacturer, etc.",
                "AUTOMATED",
            ),
            (
                "LM-11",
                "11",
                "General provisions relating to declaration of quantity",
                "REVIEW",
            ),
            (
                "LM-12",
                "12",
                "Manner in which declaration of quantity shall be",
                "AUTOMATED",
            ),
            (
                "LM-13",
                "13",
                "Statement of units of weight, measure or number",
                "AUTOMATED",
            ),
        ]

        for rule_id, rule_number, rule_name, automation in core_rules:
            rules.append(
                self._result(
                    rule_id,
                    rule_number,
                    "APPLICABLE" if chapter_ii else "NOT_APPLICABLE",
                    chapter_ii,
                    (
                        "Chapter II applies to this package."
                        if chapter_ii
                        else "Chapter II does not apply to this package."
                    ),
                    package_context["chapter_ii_evidence"],
                    automation,
                )
            )

        # --------------------------------------------------
        # RULES 14-17
        # --------------------------------------------------

        special_rules = [
            (
                "LM-14",
                "14",
                "Declaration of dimensions",
                self._is_rule_14_context(full_text),
            ),
            (
                "LM-15",
                "15",
                "Declaration of dimensions and weight",
                self._is_rule_15_context(full_text),
            ),
            (
                "LM-16",
                "16",
                "Declaration relating to usable sheets",
                self._is_rule_16_context(full_text),
            ),
            (
                "LM-17",
                "17",
                "Declaration relating to container dimensions",
                self._is_rule_17_context(full_text),
            ),
        ]

        for rule_id, rule_number, rule_name, detected in special_rules:

            if not chapter_ii:

                rules.append(
                    self._result(
                        rule_id,
                        rule_number,
                        "NOT_APPLICABLE",
                        False,
                        "Chapter II does not apply to this package.",
                        [],
                        "CONDITIONAL",
                    )
                )

            elif detected:

                rules.append(
                    self._result(
                        rule_id,
                        rule_number,
                        "REVIEW",
                        True,
                        f"{rule_name} may apply based on detected commodity context.",
                        [rule_name],
                        "CONDITIONAL",
                    )
                )

            else:

                rules.append(
                    self._result(
                        rule_id,
                        rule_number,
                        "NOT_APPLICABLE",
                        False,
                        "No evidence that this commodity-specific rule applies.",
                        [],
                        "CONDITIONAL",
                    )
                )

        # --------------------------------------------------
        # RULE 18
        # --------------------------------------------------

        dealer = package_context["wholesale_or_dealer_context"]

        rules.append(
            self._result(
                "LM-18",
                "18",
                "APPLICABLE" if dealer else "REVIEW",
                dealer,
                (
                    "Wholesale/dealer context was identified."
                    if dealer
                    else "Dealer context cannot be reliably established from a package image alone."
                ),
                package_context["dealer_evidence"],
                "PARTIAL",
            )
        )

        # --------------------------------------------------
        # RULES 19-22
        # --------------------------------------------------

        inspection_rules = [
            (
                "LM-19",
                "19",
                "Inspection of quantity and error at manufacturer or packer premises",
            ),
            (
                "LM-20",
                "20",
                "Action based on inspection results",
            ),
            (
                "LM-21",
                "21",
                "Inspection of quantity at wholesale or retail dealer premises",
            ),
            (
                "LM-22",
                "22",
                "Maximum permissible error",
            ),
        ]

        for rule_id, rule_number, rule_name in inspection_rules:

            rules.append(
                self._result(
                    rule_id,
                    rule_number,
                    "OUT_OF_SCOPE",
                    False,
                    (
                        "Requires physical inspection, measurement, "
                        "sampling or enforcement evidence that cannot "
                        "be reliably established from a package image."
                    ),
                    [],
                    "OUT_OF_SCOPE",
                )
            )

        # --------------------------------------------------
        # RULE 23
        # --------------------------------------------------

        rules.append(
            self._result(
                "LM-23",
                "23",
                "APPLICABLE" if chapter_ii else "NOT_APPLICABLE",
                chapter_ii,
                (
                    "Potentially deceptive packaging can be "
                    "assessed as a partial visual AI check."
                    if chapter_ii
                    else "Chapter II does not apply."
                ),
                [],
                "PARTIAL",
            )
        )

        # --------------------------------------------------
        # RULE 24
        # --------------------------------------------------

        wholesale = package_context["wholesale_package"]

        rules.append(
            self._result(
                "LM-24",
                "24",
                "APPLICABLE" if wholesale else "NOT_APPLICABLE",
                wholesale,
                (
                    "Wholesale package context was identified."
                    if wholesale
                    else "No wholesale package context was established."
                ),
                package_context["wholesale_evidence"],
                "CONDITIONAL",
            )
        )

        # --------------------------------------------------
        # RULE 25
        # --------------------------------------------------

        export_package = package_context["export_package"]

        rules.append(
            self._result(
                "LM-25",
                "25",
                "APPLICABLE" if export_package else "NOT_APPLICABLE",
                export_package,
                (
                    "Export package context was identified."
                    if export_package
                    else "No export package context was established."
                ),
                package_context["export_evidence"],
                "CONDITIONAL",
            )
        )

        # --------------------------------------------------
        # RULE 26
        # --------------------------------------------------

        rule_26_possible = self._detect_rule_26_context(full_text)

        if not chapter_ii:

            rule_26_status = "NOT_APPLICABLE"
            rule_26_applicable = False

        elif rule_26_possible:

            rule_26_status = "REVIEW"
            rule_26_applicable = True

        else:

            rule_26_status = "APPLICABLE"
            rule_26_applicable = True

        rules.append(
            self._result(
                "LM-26",
                "26",
                rule_26_status,
                rule_26_applicable,
                (
                    "Potential exemption-related language detected; "
                    "specific legal exemption requires verification."
                    if rule_26_possible
                    else "No specific exemption was detected."
                ),
                rule_26_possible,
                "CONDITIONAL",
            )
        )

        # --------------------------------------------------
        # RULES 27-30
        # --------------------------------------------------

        rules.append(
            self._result(
                "LM-27",
                "27",
                "OUT_OF_SCOPE",
                False,
                "Registration is an administrative requirement and cannot be established from a package image alone.",
                [],
                "OUT_OF_SCOPE",
            )
        )

        rules.append(
            self._result(
                "LM-28",
                "28",
                "REVIEW",
                False,
                "Shorter registered address requires registration records.",
                [],
                "PARTIAL",
            )
        )

        rules.append(
            self._result(
                "LM-29",
                "29",
                "OUT_OF_SCOPE",
                False,
                "Registration records are administrative evidence.",
                [],
                "OUT_OF_SCOPE",
            )
        )

        rules.append(
            self._result(
                "LM-30",
                "30",
                "OUT_OF_SCOPE",
                False,
                "Registered manufacturer lists are administrative records.",
                [],
                "OUT_OF_SCOPE",
            )
        )

        # --------------------------------------------------
        # RULE 31
        # --------------------------------------------------

        advertisement = package_context["advertisement"]

        rules.append(
            self._result(
                "LM-31",
                "31",
                "APPLICABLE" if advertisement else "NOT_APPLICABLE",
                advertisement,
                (
                    "Advertisement context was identified."
                    if advertisement
                    else "Current input is a package image, not an advertisement."
                ),
                package_context["advertisement_evidence"],
                "LISTING",
            )
        )

        # --------------------------------------------------
        # RULES 32-34
        # --------------------------------------------------

        enforcement_rules = [
            (
                "LM-32",
                "32",
                "Fine for contravention of rules",
            ),
            (
                "LM-33",
                "33",
                "Power to relax",
            ),
            (
                "LM-34",
                "34",
                "Repeal and savings",
            ),
        ]

        for rule_id, rule_number, rule_name in enforcement_rules:

            rules.append(
                self._result(
                    rule_id,
                    rule_number,
                    "OUT_OF_SCOPE",
                    False,
                    f"{rule_name} is not a package-image compliance check.",
                    [],
                    "OUT_OF_SCOPE",
                )
            )

        # --------------------------------------------------
        # SUMMARY
        # --------------------------------------------------

        summary = {
            "applicable": sum(
                1 for r in rules if r["applicable"] is True
            ),
            "review": sum(
                1 for r in rules if r["status"] == "REVIEW"
            ),
            "not_applicable": sum(
                1 for r in rules if r["status"] == "NOT_APPLICABLE"
            ),
            "out_of_scope": sum(
                1 for r in rules if r["status"] == "OUT_OF_SCOPE"
            ),
        }

        return {
            "engine": "Legal Metrology Applicability Engine",
            "version": "consolidated-2011-rules-with-amendments",
            "rules_evaluated": len(rules),
            "package_context": package_context,
            "summary": summary,
            "rules": rules,
        }

    # ======================================================
    # PACKAGE CONTEXT
    # ======================================================

    def _determine_package_context(
        self,
        product_data: Dict[str, Any],
        full_text: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:

        industrial = self._explicit_bool(
            context,
            "industrial_consumer",
        )

        institutional = self._explicit_bool(
            context,
            "institutional_consumer",
        )

        retail = self._explicit_bool(
            context,
            "retail_sale",
        )

        quantity_value, quantity_unit = self._parse_quantity(
            product_data.get("net_quantity")
        )

        imported_package = self._is_imported_package(product_data, full_text, context)
        time_sensitive_product = self._is_time_sensitive_product(product_data, full_text)
        dimension_declaration_context = self._dimension_declaration_context(full_text)
        unit_sale_price_applicable = self._unit_sale_price_context(
            product_data,
            quantity_value,
            quantity_unit,
            retail,
        )

        cement_or_fertilizer = self._contains_any(
            full_text,
            [
                "cement",
                "fertilizer",
                "fertiliser",
            ],
        )

        if industrial is None:
            industrial = self._contains_any(
                full_text,
                [
                    "industrial consumer",
                    "industrial use",
                    "for industrial use",
                ],
            )

        if institutional is None:
            institutional = self._contains_any(
                full_text,
                [
                    "institutional consumer",
                    "institutional use",
                    "for institutional use",
                ],
            )

        quantity_excluded = False

        if quantity_value is not None:

            if quantity_unit == "kg" and quantity_value > 25:

                if not (
                    cement_or_fertilizer
                    and quantity_value <= 50
                ):
                    quantity_excluded = True

            elif quantity_unit == "litre" and quantity_value > 25:

                quantity_excluded = True

        if industrial:

            chapter_ii_applies = False

            chapter_reason = (
                "Package is identified as intended for an industrial consumer."
            )

            chapter_evidence = [
                "industrial consumer context"
            ]

        elif institutional:

            chapter_ii_applies = False

            chapter_reason = (
                "Package is identified as intended for an institutional consumer."
            )

            chapter_evidence = [
                "institutional consumer context"
            ]

        elif quantity_excluded:

            chapter_ii_applies = False

            chapter_reason = (
                "Declared quantity exceeds the Rule 3 threshold."
            )

            chapter_evidence = [
                f"net_quantity={product_data.get('net_quantity')}"
            ]

        elif retail is False:

            chapter_ii_applies = False

            chapter_reason = (
                "Package was explicitly identified as not intended for retail sale."
            )

            chapter_evidence = [
                "retail_sale=false"
            ]

        else:

            chapter_ii_applies = True

            chapter_reason = (
                "Available evidence indicates a retail package within Chapter II."
            )

            chapter_evidence = []

            if retail is True:
                chapter_evidence.append("retail_sale=true")

            if product_data.get("net_quantity"):
                chapter_evidence.append(
                    f"net_quantity={product_data['net_quantity']}"
                )

        wholesale = self._explicit_bool(
            context,
            "wholesale_package",
        )

        if wholesale is None:
            wholesale = self._contains_any(
                full_text,
                [
                    "wholesale package",
                    "wholesale",
                ],
            )

        export_package = self._explicit_bool(
            context,
            "export_package",
        )

        if export_package is None:
            export_package = self._contains_any(
                full_text,
                [
                    "for export",
                    "export only",
                    "export package",
                ],
            )

        advertisement = self._explicit_bool(
            context,
            "advertisement",
        )

        if advertisement is None:
            advertisement = self._contains_any(
                full_text,
                [
                    "advertisement",
                    "advertised price",
                ],
            )

        return {
            "chapter_ii_applies": chapter_ii_applies,
            "chapter_ii_reason": chapter_reason,
            "chapter_ii_evidence": chapter_evidence,
            "industrial_consumer": industrial,
            "institutional_consumer": institutional,
            "quantity_value": quantity_value,
            "quantity_unit": quantity_unit,
            "wholesale_package": wholesale,
            "wholesale_evidence": (
                ["wholesale context"]
                if wholesale
                else []
            ),
            "wholesale_or_dealer_context": wholesale,
            "dealer_evidence": (
                ["dealer/wholesale context"]
                if wholesale
                else []
            ),
            "export_package": export_package,
            "export_evidence": (
                ["export context"]
                if export_package
                else []
            ),
            "advertisement": advertisement,
            "advertisement_evidence": (
                ["advertisement context"]
                if advertisement
                else []
            ),
            "retail_sale": retail,
            "product_category": product_data.get(
                "product_category"
            ),
            "cement_or_fertilizer": cement_or_fertilizer,
            "imported_package": imported_package,
            "time_sensitive_product": time_sensitive_product,
            "dimension_declaration_context": dimension_declaration_context,
            "unit_sale_price_applicable": unit_sale_price_applicable,
        }

    # ======================================================
    # RULE 6 APPLICABILITY HELPERS
    # ======================================================

    def _is_imported_package(
        self,
        product_data: Dict[str, Any],
        text: str,
        context: Dict[str, Any],
    ) -> bool:
        explicit = self._explicit_bool(context, "imported_package")
        if explicit is not None:
            return explicit

        origin = product_data.get("country_of_origin")
        imported_markers = (
            "imported",
            "importer",
            "country of origin",
            "made in ",
            "manufactured in ",
            "assembled in ",
        )
        if origin:
            return True
        return self._contains_any(text, list(imported_markers))

    def _is_time_sensitive_product(
        self,
        product_data: Dict[str, Any],
        text: str,
    ) -> bool:
        if product_data.get("best_before") or product_data.get("use_by"):
            return True

        keywords = (
            "food",
            "fruit",
            "vegetable",
            "juice",
            "milk",
            "dairy",
            "meat",
            "fish",
            "bakery",
            "snack",
            "beverage",
            "medicine",
            "cosmetic",
            "perishable",
            "expiry",
            "expiration",
            "best before",
            "use by",
        )
        return self._contains_any(text, list(keywords))

    def _dimension_declaration_context(self, text: str) -> bool:
        return self._contains_any(
            text,
            [
                "length",
                "width",
                "height",
                "dimension",
                "dimensions",
                "area",
                "bedsheet",
                "bed sheet",
                "fabric",
                "dhoti",
                "saree",
                "sari",
                "napkin",
                "pillow cover",
                "towel",
                "table cloth",
                "tablecloth",
            ],
        )

    def _unit_sale_price_context(
        self,
        product_data: Dict[str, Any],
        quantity_value: Optional[float],
        quantity_unit: Optional[str],
        retail: Optional[bool],
    ) -> bool:
        if retail is False:
            return False

        # If MRP and USP are explicitly equal, Rule 6(11) does not
        # require a separate unit-sale-price declaration.
        mrp = str(product_data.get("mrp") or "").strip()
        usp = str(
            product_data.get("unit_sale_price")
            or product_data.get("unit_price")
            or ""
        ).strip()

        if mrp and usp:
            mrp_num = re.search(r"(\d+(?:\.\d+)?)", mrp.replace(",", ""))
            usp_num = re.search(r"(\d+(?:\.\d+)?)", usp.replace(",", ""))
            if mrp_num and usp_num:
                try:
                    if abs(float(mrp_num.group(1)) - float(usp_num.group(1))) < 0.005:
                        return False
                except ValueError:
                    pass

        # A parsed retail quantity gives enough evidence to trigger the
        # unit-sale-price check. Physical correctness remains for review
        # in the compliance engine.
        return quantity_value is not None and quantity_unit in ("kg", "litre")

    # ======================================================
    # RULE 14
    # ======================================================

    def _is_rule_14_context(self, text: str) -> bool:

        return self._contains_any(
            text,
            [
                "bedsheet",
                "bed sheet",
                "fabric",
                "dhoti",
                "saree",
                "sari",
                "napkin",
                "pillow cover",
                "towel",
                "table cloth",
                "tablecloth",
            ],
        )

    # ======================================================
    # RULE 15
    # ======================================================

    def _is_rule_15_context(self, text: str) -> bool:

        return self._contains_any(
            text,
            [
                "dimension",
                "dimensions",
            ],
        )

    # ======================================================
    # RULE 16
    # ======================================================

    def _is_rule_16_context(self, text: str) -> bool:

        return self._contains_any(
            text,
            [
                "usable sheets",
                "sheets",
            ],
        )

    # ======================================================
    # RULE 17
    # ======================================================

    def _is_rule_17_context(self, text: str) -> bool:

        return self._contains_any(
            text,
            [
                "container dimensions",
            ],
        )

    # ======================================================
    # RULE 26
    # ======================================================

    def _detect_rule_26_context(
        self,
        text: str,
    ) -> List[str]:

        keywords = [
            "exempt",
            "exemption",
            "not for retail sale",
            "industrial",
            "institutional",
        ]

        return [
            keyword
            for keyword in keywords
            if keyword in text
        ]

    # ======================================================
    # BUILD TEXT
    # ======================================================

    def _build_text(
        self,
        product_data: Dict[str, Any],
        ocr_text: List[str],
    ) -> str:

        values = []

        for value in product_data.values():

            if value is not None:
                values.append(str(value))

        for value in ocr_text:

            if value is not None:
                values.append(str(value))

        return " ".join(values).lower()

    # ======================================================
    # BOOLEAN
    # ======================================================

    def _explicit_bool(
        self,
        context: Dict[str, Any],
        key: str,
    ) -> Optional[bool]:

        if key not in context:
            return None

        value = context[key]

        if isinstance(value, bool):
            return value

        if isinstance(value, str):

            value = value.strip().lower()

            if value in ("true", "yes", "1"):
                return True

            if value in ("false", "no", "0"):
                return False

        return None

    # ======================================================
    # KEYWORD
    # ======================================================

    def _contains_any(
        self,
        text: str,
        keywords: List[str],
    ) -> bool:

        return any(
            keyword.lower() in text
            for keyword in keywords
        )

    # ======================================================
    # QUANTITY
    # ======================================================

    def _parse_quantity(
        self,
        quantity: Any,
    ):

        if quantity is None:
            return None, None

        text = str(quantity).lower()

        match = re.search(
            r"(\d+(?:\.\d+)?)\s*"
            r"(kg|kgs|kilogram|kilograms|g|gm|gram|grams|"
            r"l|ltr|litre|liter|litres|liters|ml)",
            text,
            re.IGNORECASE,
        )

        if not match:
            return None, None

        value = float(match.group(1))
        unit = match.group(2).lower()

        if unit in (
            "g",
            "gm",
            "gram",
            "grams",
        ):
            value = value / 1000
            unit = "kg"

        elif unit == "ml":
            value = value / 1000
            unit = "litre"

        elif unit in (
            "l",
            "ltr",
            "litre",
            "liter",
            "litres",
            "liters",
        ):
            unit = "litre"

        else:
            unit = "kg"

        return value, unit

    # ======================================================
    # RESULT
    # ======================================================

    def _result(
        self,
        rule_id: str,
        rule_number: str,
        status: str,
        applicable: bool,
        reason: str,
        evidence: List[Any],
        automation: str,
    ) -> Dict[str, Any]:

        return {
            "rule_id": rule_id,
            "rule_number": rule_number,
            "status": status,
            "applicable": applicable,
            "reason": reason,
            "evidence": evidence,
            "automation": automation,
        }


applicability_engine = ApplicabilityEngine()