from typing import Any, Dict, List, Optional


class ComplianceEngine:
    """
    Legal Metrology (Packaged Commodities) Rules, 2011
    Compliance evaluation engine.

    Important:
    - This engine evaluates image/OCR evidence.
    - REVIEW means the available evidence is insufficient to conclusively
      determine compliance/non-compliance.
    - Compliance score is an evidence-based indicator.
    - Compliance score does NOT by itself determine legal status.
    """

    # ------------------------------------------------------------------
    # SCORE CONFIGURATION
    # ------------------------------------------------------------------

    STATUS_SCORE = {
        "PASS": 1.0,
        "REVIEW": 0.5,
        "FAIL": 0.0,
    }

    EXCLUDED_FROM_SCORE = {
        "NOT_APPLICABLE",
        "OUT_OF_SCOPE",
    }

    def evaluate(
        self,
        product_data: Dict[str, Any],
        applicability_result: Dict[str, Any],
        ocr_results: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:

        ocr_results = ocr_results or []

        results: List[Dict[str, Any]] = []

        # --------------------------------------------------------------
        # Get applicability information
        # --------------------------------------------------------------

        applicability_rules = self._get_applicability_rules(
            applicability_result
        )

        # --------------------------------------------------------------
        # Rules 2-34
        # --------------------------------------------------------------

        results.append(
            self._evaluate_rule_02(
                applicability_rules.get("LM-02")
            )
        )

        results.append(
            self._evaluate_rule_03(
                applicability_rules.get("LM-03")
            )
        )

        results.append(
            self._evaluate_rule_04(
                applicability_rules.get("LM-04")
            )
        )

        results.append(
            self._evaluate_rule_05(
                applicability_rules.get("LM-05")
            )
        )

        # Rule 6 is expanded into individual declaration checks.
        results.extend(
            self._evaluate_rule_06(
                applicability_rules.get("LM-06"),
                product_data,
                ocr_results,
            )
        )

        results.append(
            self._evaluate_rule_07(
                applicability_rules.get("LM-07")
            )
        )

        results.append(
            self._evaluate_rule_08(
                applicability_rules.get("LM-08")
            )
        )

        results.append(
            self._evaluate_rule_09(
                applicability_rules.get("LM-09")
            )
        )

        results.append(
            self._evaluate_rule_10(
                applicability_rules.get("LM-10"),
                product_data,
                ocr_results,
            )
        )

        results.append(
            self._evaluate_rule_11(
                applicability_rules.get("LM-11"),
                product_data,
                ocr_results,
            )
        )

        results.append(
            self._evaluate_rule_12(
                applicability_rules.get("LM-12"),
                product_data,
                ocr_results,
            )
        )

        results.append(
            self._evaluate_rule_13(
                applicability_rules.get("LM-13"),
                product_data,
                ocr_results,
            )
        )

        results.append(
            self._evaluate_rule_14(
                applicability_rules.get("LM-14")
            )
        )

        results.append(
            self._evaluate_rule_15(
                applicability_rules.get("LM-15")
            )
        )

        results.append(
            self._evaluate_rule_16(
                applicability_rules.get("LM-16")
            )
        )

        results.append(
            self._evaluate_rule_17(
                applicability_rules.get("LM-17")
            )
        )

        results.append(
            self._evaluate_rule_18(
                applicability_rules.get("LM-18")
            )
        )

        results.append(
            self._evaluate_rule_23(
                applicability_rules.get("LM-23")
            )
        )

        results.append(
            self._evaluate_rule_24(
                applicability_rules.get("LM-24")
            )
        )

        results.append(
            self._evaluate_rule_25(
                applicability_rules.get("LM-25")
            )
        )

        results.append(
            self._evaluate_rule_26(
                applicability_rules.get("LM-26")
            )
        )

        # --------------------------------------------------------------
        # Summary
        # --------------------------------------------------------------

        summary = self._build_summary(results)

        # --------------------------------------------------------------
        # Overall legal-review status
        # --------------------------------------------------------------

        overall_status = self._calculate_overall_status(results)

        # --------------------------------------------------------------
        # REAL COMPLIANCE SCORE
        # --------------------------------------------------------------

        compliance_score = self._calculate_compliance_score(results)

        return {
            "overall_status": overall_status,
            "compliance_score": compliance_score,
            "score": compliance_score,
            "summary": summary,
            "results": results,
        }

    # ==================================================================
    # APPLICABILITY
    # ==================================================================

    def _get_applicability_rules(
        self,
        applicability_result: Optional[Dict[str, Any]],
    ) -> Dict[str, Dict[str, Any]]:

        if not applicability_result:
            return {}

        rules = applicability_result.get("rules")

        if isinstance(rules, list):
            output = {}

            for rule in rules:
                rule_id = rule.get("rule_id")

                if rule_id:
                    output[rule_id] = rule

            return output

        if isinstance(rules, dict):
            return rules

        return {}

    def _is_not_applicable(
        self,
        applicability: Optional[Dict[str, Any]],
    ) -> bool:

        if not applicability:
            return False

        status = str(
            applicability.get("status", "")
        ).upper()

        return status == "NOT_APPLICABLE"

    def _is_out_of_scope(
        self,
        applicability: Optional[Dict[str, Any]],
    ) -> bool:

        if not applicability:
            return False

        status = str(
            applicability.get("status", "")
        ).upper()

        return status == "OUT_OF_SCOPE"

    # ==================================================================
    # GENERIC RESULT BUILDER
    # ==================================================================

    def _result(
        self,
        rule_id: str,
        rule_number: str,
        rule_name: str,
        status: str,
        expected: Optional[str] = None,
        extracted: Any = None,
        evidence: Optional[List[Any]] = None,
        reason: Optional[str] = None,
        suggestion: Optional[str] = None,
        applicable: Optional[bool] = True,
        rule_reference: Optional[str] = None,
        weight: float = 1.0,
    ) -> Dict[str, Any]:

        return {
            "rule_id": rule_id,
            "rule_number": rule_number,
            "rule_name": rule_name,
            "status": status,
            "applicable": applicable,
            "expected": expected,
            "extracted": extracted,
            "extracted_value": extracted,
            "evidence": evidence or [],
            "reason": reason,
            "suggestion": suggestion,
            "rule_reference": rule_reference
            or f"Legal Metrology (Packaged Commodities) Rules, 2011 - Rule {rule_number}",
            "source": "Legal Metrology (Packaged Commodities) Rules, 2011",
            "weight": weight,
        }

    # ==================================================================
    # RULE 2
    # ==================================================================

    def _evaluate_rule_02(self, applicability):

        return self._result(
            "LM-02",
            "2",
            "Definitions / interpretive provision",
            "PASS",
            expected="Definitions are interpreted according to the Rules.",
            reason="Rule 2 is an interpretive provision rather than a package declaration check.",
            suggestion=None,
        )

    # ==================================================================
    # RULE 3
    # ==================================================================

    def _evaluate_rule_03(self, applicability):

        if self._is_out_of_scope(applicability):
            return self._result(
                "LM-03",
                "3",
                "Packages to which Chapter II does not apply",
                "OUT_OF_SCOPE",
                applicable=False,
                reason="Package falls outside the applicable Chapter II scope.",
            )

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-03",
                "3",
                "Packages to which Chapter II does not apply",
                "NOT_APPLICABLE",
                applicable=False,
                reason="Chapter II applicability is excluded for this package.",
            )

        return self._result(
            "LM-03",
            "3",
            "Packages to which Chapter II does not apply",
            "PASS",
            expected="Chapter II applicability determined from package context.",
            reason="Available package evidence indicates that Chapter II applies.",
        )

    # ==================================================================
    # RULE 4
    # ==================================================================

    def _evaluate_rule_04(self, applicability):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-04",
                "4",
                "Pre-packing and sale of packaged commodities",
                "NOT_APPLICABLE",
                applicable=False,
                reason="Rule is not applicable based on package applicability.",
            )

        return self._result(
            "LM-04",
            "4",
            "Pre-packing and sale of packaged commodities",
            "PASS",
            expected="Package should bear applicable required declarations.",
            reason="The rule is applicable and declaration checks are evaluated through the relevant declaration rules.",
        )

    # ==================================================================
    # RULE 5
    # ==================================================================

    def _evaluate_rule_05(self, applicability):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-05",
                "5",
                "Specific commodities to be packed in standard quantities",
                "NOT_APPLICABLE",
                applicable=False,
                reason="Rule 5 is not applicable based on current package context.",
            )

        return self._result(
            "LM-05",
            "5",
            "Specific commodities to be packed in standard quantities",
            "REVIEW",
            expected="Commodity-specific standard package quantity must be checked against the applicable Second Schedule entry.",
            reason="Commodity-specific Second Schedule classification is required before a definitive automated result can be given.",
            suggestion="Verify the commodity and applicable standard package quantity in the Second Schedule.",
        )

    # ==================================================================
    # RULE 6
    # ==================================================================

    def _evaluate_rule_06(
        self,
        applicability,
        product_data,
        ocr_results,
    ):

        results = []

        if self._is_not_applicable(applicability):

            for suffix, name in [
                ("01", "Manufacturer / packer / importer"),
                ("02", "Common or generic name"),
                ("03", "Net quantity"),
                ("04", "Manufacturing / pre-packing / import date"),
                ("05", "Best before / use by"),
                ("06", "Maximum Retail Price"),
                ("07", "Consumer complaint contact"),
            ]:

                results.append(
                    self._result(
                        f"LM-06-{suffix}",
                        "6",
                        name,
                        "NOT_APPLICABLE",
                        applicable=False,
                        reason="Rule 6 is not applicable based on package context.",
                    )
                )

            return results

        # --------------------------------------------------------------
        # 06-01 Manufacturer / Packer / Importer
        # --------------------------------------------------------------

        results.append(
            self._evaluate_field(
                rule_id="LM-06-01",
                rule_number="6",
                rule_name="Manufacturer / packer / importer",
                field_name="manufacturer_or_packer",
                product_data=product_data,
                ocr_results=ocr_results,
                expected="Applicable manufacturer, packer or importer identification.",
            )
        )

        # --------------------------------------------------------------
        # 06-02 Product name
        # --------------------------------------------------------------

        results.append(
            self._evaluate_field(
                rule_id="LM-06-02",
                rule_number="6",
                rule_name="Common or generic name",
                field_name="product_name",
                product_data=product_data,
                ocr_results=ocr_results,
                expected="Common or generic name of the commodity.",
            )
        )

        # --------------------------------------------------------------
        # 06-03 Net quantity
        # --------------------------------------------------------------

        results.append(
            self._evaluate_quantity(
                rule_id="LM-06-03",
                product_data=product_data,
                ocr_results=ocr_results,
            )
        )

        # --------------------------------------------------------------
        # 06-04 Manufacturing / pre-packing / import date
        # --------------------------------------------------------------

        results.append(
            self._evaluate_date(
                rule_id="LM-06-04",
                rule_name="Manufacturing / pre-packing / import date",
                product_data=product_data,
                ocr_results=ocr_results,
                fields=[
                    "date_of_manufacture",
                    "packed_on",
                ],
                expected="Applicable date of manufacture, pre-packing or import.",
            )
        )

        # --------------------------------------------------------------
        # 06-05 Best before / use by
        # --------------------------------------------------------------

        results.append(
            self._evaluate_date(
                rule_id="LM-06-05",
                rule_name="Best before / use by",
                product_data=product_data,
                ocr_results=ocr_results,
                fields=[
                    "best_before",
                    "use_by",
                    "expiry_date",
                ],
                expected="Applicable best-before, use-by or expiry declaration where required.",
            )
        )

        # --------------------------------------------------------------
        # 06-06 MRP
        # --------------------------------------------------------------

        results.append(
            self._evaluate_field(
                rule_id="LM-06-06",
                rule_number="6",
                rule_name="Maximum Retail Price",
                field_name="mrp",
                product_data=product_data,
                ocr_results=ocr_results,
                expected="Maximum Retail Price inclusive of all taxes, where applicable.",
            )
        )

        # --------------------------------------------------------------
        # 06-07 Consumer complaint contact
        # --------------------------------------------------------------

        results.append(
            self._evaluate_field(
                rule_id="LM-06-07",
                rule_number="6",
                rule_name="Consumer complaint contact",
                field_name="consumer_contact",
                product_data=product_data,
                ocr_results=ocr_results,
                expected="Consumer complaint/contact information where applicable.",
            )
        )

        return results

    # ==================================================================
    # RULE 7
    # ==================================================================

    def _evaluate_rule_07(self, applicability):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-07",
                "7",
                "Principal display panel - area, size and letters",
                "NOT_APPLICABLE",
                applicable=False,
            )

        return self._result(
            "LM-07",
            "7",
            "Principal display panel - area, size and letters",
            "REVIEW",
            expected="Principal display panel and prescribed letter/numeral dimensions must satisfy the Rule.",
            reason="Image evidence can identify visible text but cannot reliably establish physical dimensions without a calibrated scale.",
            suggestion="Verify principal display panel area and prescribed letter/numeral height using a physical measurement/reference.",
        )

    # ==================================================================
    # RULE 8
    # ==================================================================

    def _evaluate_rule_08(self, applicability):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-08",
                "8",
                "Declarations where to appear",
                "NOT_APPLICABLE",
                applicable=False,
            )

        return self._result(
            "LM-08",
            "8",
            "Declarations where to appear",
            "REVIEW",
            expected="Required declarations should appear in the prescribed location and principal display panel where applicable.",
            reason="The system can inspect OCR positions, but definitive legal placement requires package-layout interpretation.",
            suggestion="Verify declaration placement against the prescribed principal display panel requirements.",
        )

    # ==================================================================
    # RULE 9
    # ==================================================================

    def _evaluate_rule_09(self, applicability):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-09",
                "9",
                "Manner of declarations",
                "NOT_APPLICABLE",
                applicable=False,
            )

        return self._result(
            "LM-09",
            "9",
            "Manner of declarations",
            "REVIEW",
            expected="Declarations should be legible, prominent and presented in the prescribed manner.",
            reason="OCR confirms visible text but image-only evidence cannot conclusively verify every readability and contrast requirement.",
            suggestion="Verify legibility, prominence, contrast and prescribed language/display requirements.",
        )

    # ==================================================================
    # RULE 10
    # ==================================================================

    def _evaluate_rule_10(
        self,
        applicability,
        product_data,
        ocr_results,
    ):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-10",
                "10",
                "Name and address of manufacturer / packer / importer",
                "NOT_APPLICABLE",
                applicable=False,
            )

        manufacturer = product_data.get(
            "manufacturer_or_packer"
        )

        address = product_data.get(
            "address"
        )

        if self._valid_value(manufacturer) and self._valid_value(address):

            evidence = self._find_evidence(
                [
                    manufacturer,
                    address,
                ],
                ocr_results,
            )

            return self._result(
                "LM-10",
                "10",
                "Name and address of manufacturer / packer / importer",
                "PASS",
                expected="Manufacturer / packer / importer name and address.",
                extracted={
                    "name": manufacturer,
                    "address": address,
                },
                evidence=evidence,
                reason="Manufacturer/packer identification and address were detected.",
            )

        return self._result(
            "LM-10",
            "10",
            "Name and address of manufacturer / packer / importer",
            "REVIEW",
            expected="Manufacturer / packer / importer name and address.",
            extracted={
                "name": manufacturer,
                "address": address,
            },
            reason="Required identification or address evidence was not completely detected.",
            suggestion="Capture a clearer image of the manufacturer/packer/importer declaration.",
        )

    # ==================================================================
    # RULE 11
    # ==================================================================

    def _evaluate_rule_11(
        self,
        applicability,
        product_data,
        ocr_results,
    ):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-11",
                "11",
                "General provisions relating to declaration of quantity",
                "NOT_APPLICABLE",
                applicable=False,
            )

        quantity = product_data.get("net_quantity")

        if self._valid_value(quantity):

            evidence = self._find_evidence(
                [quantity],
                ocr_results,
            )

            return self._result(
                "LM-11",
                "11",
                "General provisions relating to declaration of quantity",
                "PASS",
                expected="Net quantity declaration in the prescribed manner.",
                extracted=quantity,
                evidence=evidence,
                reason="Net quantity declaration was detected.",
            )

        return self._result(
            "LM-11",
            "11",
            "General provisions relating to declaration of quantity",
            "REVIEW",
            expected="Net quantity declaration.",
            reason="Net quantity was not confidently detected.",
            suggestion="Capture the quantity declaration clearly.",
        )

    # ==================================================================
    # RULE 12
    # ==================================================================

    def _evaluate_rule_12(
        self,
        applicability,
        product_data,
        ocr_results,
    ):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-12",
                "12",
                "Manner in which declaration of quantity shall be made",
                "NOT_APPLICABLE",
                applicable=False,
            )

        quantity = product_data.get("net_quantity")

        if not self._valid_value(quantity):
            return self._result(
                "LM-12",
                "12",
                "Manner in which declaration of quantity shall be made",
                "REVIEW",
                expected="Quantity should be declared in the prescribed manner.",
                reason="Net quantity was not detected, so manner of declaration cannot be fully evaluated.",
                suggestion="Capture a clearer image of the quantity declaration.",
            )

        evidence = self._find_evidence(
            [quantity],
            ocr_results,
        )

        return self._result(
            "LM-12",
            "12",
            "Manner in which declaration of quantity shall be made",
            "PASS",
            expected="Quantity declaration is visibly present.",
            extracted=quantity,
            evidence=evidence,
            reason="A quantity declaration was detected.",
        )

    # ==================================================================
    # RULE 13
    # ==================================================================

    def _evaluate_rule_13(
        self,
        applicability,
        product_data,
        ocr_results,
    ):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-13",
                "13",
                "Statement of units of weight, measure or number",
                "NOT_APPLICABLE",
                applicable=False,
            )

        quantity = product_data.get("net_quantity")

        if not self._valid_value(quantity):
            return self._result(
                "LM-13",
                "13",
                "Statement of units of weight, measure or number",
                "REVIEW",
                expected="Quantity should use the applicable prescribed unit.",
                reason="Quantity was not detected.",
                suggestion="Capture the net quantity and unit clearly.",
            )

        quantity_text = str(quantity).lower()

        valid_units = [
            "kg",
            "g",
            "gm",
            "gram",
            "grams",
            "mg",
            "l",
            "ltr",
            "litre",
            "liter",
            "ml",
            "millilitre",
            "milliliter",
            "m",
            "cm",
            "mm",
            "number",
            "nos",
            "no.",
            "n",
        ]

        has_unit = any(
            unit in quantity_text
            for unit in valid_units
        )

        evidence = self._find_evidence(
            [quantity],
            ocr_results,
        )

        if has_unit:

            return self._result(
                "LM-13",
                "13",
                "Statement of units of weight, measure or number",
                "PASS",
                expected="Applicable prescribed unit of weight, measure or number.",
                extracted=quantity,
                evidence=evidence,
                reason="Quantity includes a recognizable unit.",
            )

        return self._result(
            "LM-13",
            "13",
            "Statement of units of weight, measure or number",
            "REVIEW",
            expected="Applicable prescribed unit.",
            extracted=quantity,
            evidence=evidence,
            reason="A quantity was detected but the applicable unit could not be confidently verified.",
            suggestion="Verify the unit against the applicable commodity requirements.",
        )

    # ==================================================================
    # RULES 14-18
    # ==================================================================

    def _evaluate_rule_14(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-14",
            "14",
            "Dimensions of certain commodities",
            "Commodity-specific dimensional requirements must be verified where applicable.",
        )

    def _evaluate_rule_15(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-15",
            "15",
            "Dimensions and weight when related to price",
            "Where quantity/price depends on dimensions or weight, the applicable requirement must be verified.",
        )

    def _evaluate_rule_16(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-16",
            "16",
            "Usable sheets - count and dimensions",
            "Sheet count and dimensions must be checked for applicable commodities.",
        )

    def _evaluate_rule_17(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-17",
            "17",
            "Container-type commodities",
            "Container dimensions/requirements must be checked where applicable.",
        )

    def _evaluate_rule_18(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-18",
            "18",
            "Wholesale / retail dealer provisions",
            "Dealer-specific requirements and sale price conditions require transaction/business-context evidence.",
        )

    # ==================================================================
    # RULES 23-26
    # ==================================================================

    def _evaluate_rule_23(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-23",
            "23",
            "Deceptive packages",
            "Package size/appearance must not be deceptive in relation to quantity.",
        )

    def _evaluate_rule_24(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-24",
            "24",
            "Wholesale packages",
            "Wholesale-package declarations must be checked where the package qualifies as a wholesale package.",
        )

    def _evaluate_rule_25(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-25",
            "25",
            "Export packages",
            "Export-package conditions require package destination and sale context.",
        )

    def _evaluate_rule_26(self, applicability):

        return self._generic_review_or_na(
            applicability,
            "LM-26",
            "26",
            "Exemptions",
            "Any applicable exemption must be determined from package type and legal conditions.",
        )

    # ==================================================================
    # GENERIC CONDITIONAL RULE
    # ==================================================================

    def _generic_review_or_na(
        self,
        applicability,
        rule_id,
        rule_number,
        rule_name,
        expected,
    ):

        if self._is_out_of_scope(applicability):

            return self._result(
                rule_id,
                rule_number,
                rule_name,
                "OUT_OF_SCOPE",
                applicable=False,
                expected=expected,
                reason="Package is outside the applicable scope.",
            )

        if self._is_not_applicable(applicability):

            return self._result(
                rule_id,
                rule_number,
                rule_name,
                "NOT_APPLICABLE",
                applicable=False,
                expected=expected,
                reason="The rule does not apply to the detected package context.",
            )

        return self._result(
            rule_id,
            rule_number,
            rule_name,
            "REVIEW",
            expected=expected,
            reason="The available image/OCR evidence is insufficient for a definitive automated determination.",
            suggestion="Verify this requirement using the applicable package, commodity or transaction context.",
        )

    # ==================================================================
    # FIELD EVALUATION
    # ==================================================================

    def _evaluate_field(
        self,
        rule_id,
        rule_number,
        rule_name,
        field_name,
        product_data,
        ocr_results,
        expected,
    ):

        value = product_data.get(field_name)

        if self._valid_value(value):

            evidence = self._find_evidence(
                [value],
                ocr_results,
            )

            return self._result(
                rule_id,
                rule_number,
                rule_name,
                "PASS",
                expected=expected,
                extracted=value,
                evidence=evidence,
                reason=f"{field_name.replace('_', ' ').title()} was detected in the package information.",
            )

        return self._result(
            rule_id,
            rule_number,
            rule_name,
            "REVIEW",
            expected=expected,
            extracted=value,
            reason=f"{field_name.replace('_', ' ').title()} was not confidently detected.",
            suggestion="Capture a clearer image containing this declaration.",
        )

    # ==================================================================
    # QUANTITY
    # ==================================================================

    def _evaluate_quantity(
        self,
        rule_id,
        product_data,
        ocr_results,
    ):

        quantity = product_data.get(
            "net_quantity"
        )

        if self._valid_value(quantity):

            evidence = self._find_evidence(
                [quantity],
                ocr_results,
            )

            return self._result(
                rule_id,
                "6",
                "Net quantity",
                "PASS",
                expected="Net quantity of the commodity.",
                extracted=quantity,
                evidence=evidence,
                reason="Net quantity was detected.",
            )

        return self._result(
            rule_id,
            "6",
            "Net quantity",
            "REVIEW",
            expected="Net quantity of the commodity.",
            extracted=quantity,
            reason="Net quantity was not confidently detected.",
            suggestion="Capture the net quantity declaration clearly.",
        )

    # ==================================================================
    # DATE
    # ==================================================================

    def _evaluate_date(
        self,
        rule_id,
        rule_name,
        product_data,
        ocr_results,
        fields,
        expected,
    ):

        value = None

        for field in fields:

            candidate = product_data.get(field)

            if self._valid_value(candidate):
                value = candidate
                break

        if self._valid_value(value):

            evidence = self._find_evidence(
                [value],
                ocr_results,
            )

            return self._result(
                rule_id,
                "6",
                rule_name,
                "PASS",
                expected=expected,
                extracted=value,
                evidence=evidence,
                reason="Relevant date declaration was detected.",
            )

        return self._result(
            rule_id,
            "6",
            rule_name,
            "REVIEW",
            expected=expected,
            extracted=None,
            reason="No sufficiently reliable date declaration was detected.",
            suggestion="Capture the manufacturing/packing or best-before/use-by area clearly.",
        )

    # ==================================================================
    # VALUE VALIDATION
    # ==================================================================

    def _valid_value(self, value):

        if value is None:
            return False

        if isinstance(value, str):

            cleaned = value.strip().lower()

            if not cleaned:
                return False

            invalid_values = {
                "not detected",
                "not_detected",
                "unknown",
                "null",
                "none",
                "n/a",
                "na",
                "—",
                "-",
            }

            if cleaned in invalid_values:
                return False

        return True

    # ==================================================================
    # OCR EVIDENCE
    # ==================================================================

    def _find_evidence(
        self,
        values,
        ocr_results,
    ):

        evidence = []

        if not ocr_results:
            return evidence

        normalized_values = []

        for value in values:

            if not self._valid_value(value):
                continue

            normalized_values.append(
                self._normalize_text(
                    str(value)
                )
            )

        for item in ocr_results:

            text = item.get("text")

            if not text:
                continue

            normalized_text = self._normalize_text(
                str(text)
            )

            for value in normalized_values:

                if (
                    value
                    and (
                        value in normalized_text
                        or normalized_text in value
                    )
                ):

                    evidence.append(
                        {
                            "text": text,
                            "confidence": item.get(
                                "confidence"
                            ),
                            "bbox": item.get(
                                "bbox"
                            ),
                        }
                    )

                    break

        return evidence

    def _normalize_text(self, text):

        return (
            text.lower()
            .replace("₹", "")
            .replace("rs.", "")
            .replace("rs", "")
            .replace(",", "")
            .replace(" ", "")
            .replace(":", "")
            .strip()
        )

    # ==================================================================
    # SUMMARY
    # ==================================================================

    def _build_summary(
        self,
        results,
    ):

        summary = {
            "pass": 0,
            "fail": 0,
            "review": 0,
            "not_applicable": 0,
            "out_of_scope": 0,
        }

        for result in results:

            status = str(
                result.get("status", "")
            ).lower()

            if status == "pass":
                summary["pass"] += 1

            elif status == "fail":
                summary["fail"] += 1

            elif status == "review":
                summary["review"] += 1

            elif status == "not_applicable":
                summary["not_applicable"] += 1

            elif status == "out_of_scope":
                summary["out_of_scope"] += 1

        return summary

    # ==================================================================
    # OVERALL STATUS
    # ==================================================================

    def _calculate_overall_status(
        self,
        results,
    ):

        has_review = False

        for result in results:

            status = str(
                result.get("status", "")
            ).upper()

            if status == "FAIL":
                return "FAIL"

            if status == "REVIEW":
                has_review = True

        if has_review:
            return "REVIEW"

        return "PASS"

    # ==================================================================
    # REAL COMPLIANCE SCORE
    # ==================================================================

    def _calculate_compliance_score(
        self,
        results,
    ):

        """
        Calculate score using ONLY applicable compliance results.

        PASS           = 100%
        REVIEW         = 50%
        FAIL           = 0%
        NOT_APPLICABLE = excluded
        OUT_OF_SCOPE   = excluded

        Each rule has equal weight by default.
        """

        total_weight = 0.0
        earned_weight = 0.0

        for result in results:

            status = str(
                result.get("status", "")
            ).upper()

            # Do not penalize rules that do not apply.
            if status in self.EXCLUDED_FROM_SCORE:
                continue

            # Ignore unexpected statuses.
            if status not in self.STATUS_SCORE:
                continue

            try:
                weight = float(
                    result.get(
                        "weight",
                        1.0
                    )
                )
            except (
                TypeError,
                ValueError,
            ):
                weight = 1.0

            if weight <= 0:
                continue

            total_weight += weight

            earned_weight += (
                self.STATUS_SCORE[status]
                * weight
            )

        if total_weight == 0:
            return None

        score = (
            earned_weight
            / total_weight
        ) * 100

        return round(
            score,
            1
        )


# ======================================================================
# SINGLETON
# ======================================================================

compliance_engine = ComplianceEngine()