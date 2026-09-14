import re
from typing import Any, Dict, List, Optional

from .visual_compliance_analyzer import VisualComplianceAnalyzer


class ComplianceEngine:
    """
    Legal Metrology (Packaged Commodities) Rules, 2011,
    as amended - Compliance evaluation engine.

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

    PASS_SCORE_THRESHOLD = 80.0
    REVIEW_SCORE_THRESHOLD = 50.0

    def evaluate(
        self,
        product_data: Dict[str, Any],
        applicability_result: Dict[str, Any],
        ocr_results: Optional[List[Dict[str, Any]]] = None,
        visual_analysis: Optional[Dict[str, Any]] = None,
        dynamic_rules: Optional[List[Dict[str, Any]]] = None,
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
                applicability_rules.get("LM-07"),
                visual_analysis,
            )
        )

        results.append(
            self._evaluate_rule_08(
                applicability_rules.get("LM-08"),
                visual_analysis,
            )
        )

        results.append(
            self._evaluate_rule_09(
                applicability_rules.get("LM-09"),
                visual_analysis,
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
        # Dynamic Compliance Rules (from Supabase)
        # --------------------------------------------------------------
        dynamic_results = self._evaluate_dynamic_rules(
            dynamic_rules,
            product_data,
            ocr_results,
            visual_analysis
        )
        results.extend(dynamic_results)

        # --------------------------------------------------------------
        # Summary
        # --------------------------------------------------------------

        summary = self._build_summary(results)

        # --------------------------------------------------------------
        # REAL COMPLIANCE SCORE
        # --------------------------------------------------------------

        compliance_score = self._calculate_compliance_score(results)

        # --------------------------------------------------------------
        # Overall legal-review status (evaluated according to compliance score)
        # --------------------------------------------------------------

        overall_status = self._calculate_overall_status(
            results,
            compliance_score=compliance_score,
        )

        return {
            "overall_status": overall_status,
            "compliance_score": compliance_score,
            "score": compliance_score,
            "summary": summary,
            "results": results,
            "engine_version": "LM-PC-current-amendments-evidence-v3",
            "legal_framework": "Legal Metrology (Packaged Commodities) Rules, 2011, as amended",
            "decision_note": (
                f"Overall status is evaluated according to compliance score thresholds "
                f"(PASS >= {self.PASS_SCORE_THRESHOLD}%, REVIEW >= {self.REVIEW_SCORE_THRESHOLD}%, "
                f"FAIL < {self.REVIEW_SCORE_THRESHOLD}%). "
                "Evidence-based indicator; physical quantity, calibrated dimensions, placement and "
                "other context-dependent requirements may require enforcement verification."
            ),
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
            "source": "Legal Metrology (Packaged Commodities) Rules, 2011, as amended",
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
            "REVIEW",
            expected="Chapter II applicability must be determined from package type and legal exclusions.",
            reason="The package appears within the general scope, but image evidence alone does not establish every Rule 3 exclusion.",
            suggestion="Verify the package against the Rule 3 exclusions when required.",
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

        # Rule 5 was omitted by the Legal Metrology (Packaged
        # Commodities) (Amendment) Rules, 2021.
        return self._result(
            "LM-05",
            "5",
            "Rule 5 - omitted",
            "OUT_OF_SCOPE",
            applicable=False,
            expected="Rule 5 is omitted from the current operative Rules.",
            reason=(
                "Rule 5 was omitted by the 2021 amendment and therefore "
                "is not evaluated as an active package-compliance requirement."
            ),
            suggestion=None,
            rule_reference=(
                "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 5 "
                "(omitted by 2021 amendment)"
            ),
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
        """
        Rule 6 is the main declaration rule.

        Important design choice:
        A field being absent from OCR is NOT automatically treated as a legal
        violation.  The engine returns REVIEW when evidence is insufficient.
        FAIL is reserved for evidence that positively indicates a declaration
        is incorrect or conflicts with the rule.
        """

        if self._is_out_of_scope(applicability):
            return self._rule6_status(
                "OUT_OF_SCOPE",
                applicability,
                product_data,
                ocr_results,
            )

        if self._is_not_applicable(applicability):
            return self._rule6_status(
                "NOT_APPLICABLE",
                applicability,
                product_data,
                ocr_results,
            )

        results = []

        # 6(1)(a) Manufacturer / packer / importer name and address
        results.append(
            self._evaluate_manufacturer_declaration(
                product_data,
                ocr_results,
            )
        )

        # 6(1)(aa) Country of origin is mandatory for imported products.
        results.append(
            self._evaluate_country_of_origin(
                applicability,
                product_data,
                ocr_results,
            )
        )

        # 6(1)(b) Common / generic name
        results.append(
            self._evaluate_field(
                rule_id="LM-06-03",
                rule_number="6(1)(b)",
                rule_name="Common / generic name",
                field_name="product_name",
                product_data=product_data,
                ocr_results=ocr_results,
                expected="Common or generic name of the commodity.",
            )
        )

        # 6(1)(c) Net quantity
        results.append(
            self._evaluate_quantity(
                rule_id="LM-06-04",
                product_data=product_data,
                ocr_results=ocr_results,
            )
        )

        # 6(1)(d) Month/year of manufacture / pre-packing / import
        results.append(
            self._evaluate_date(
                rule_id="LM-06-05",
                rule_number="6(1)(d)",
                rule_name="Manufacturing / pre-packing / import date",
                product_data=product_data,
                ocr_results=ocr_results,
                fields=[
                    "date_of_manufacture",
                    "packed_on",
                ],
                expected="Applicable month and year of manufacture, pre-packing or import.",
            )
        )

        # 6(1)(da) Best before / use by for commodities that can become
        # unfit for human consumption.
        results.append(
            self._evaluate_date(
                rule_id="LM-06-06",
                rule_number="6(1)(da)",
                rule_name="Best before / use by",
                product_data=product_data,
                ocr_results=ocr_results,
                fields=[
                    "best_before",
                    "use_by",
                    "expiry_date",
                ],
                expected="Best before or use by date, month and year where applicable.",
            )
        )

        # 6(1)(e) Maximum retail price
        results.append(
            self._evaluate_mrp(
                product_data,
                ocr_results,
            )
        )

        # 6(1)(f) Dimensions where relevant
        results.append(
            self._evaluate_dimensions(
                product_data,
                applicability,
                ocr_results,
            )
        )

        # 6(2) Consumer complaint contact
        results.append(
            self._evaluate_field(
                rule_id="LM-06-09",
                rule_number="6(2)",
                rule_name="Consumer complaint contact",
                field_name="consumer_contact",
                product_data=product_data,
                ocr_results=ocr_results,
                expected="Name, address, telephone number and/or email/contact details of the person or office for consumer complaints, as applicable.",
                label_patterns=[
                    "consumer care",
                    "consumer complaint",
                    "customer care",
                    "customer service",
                    "contact us",
                    "reach us",
                    "helpline",
                    "complaint",
                ],
            )
        )

        # 6(11) Unit sale price.
        results.append(
            self._evaluate_unit_sale_price(
                product_data,
                ocr_results,
            )
        )

        return results

    def _rule6_status(
        self,
        status,
        applicability,
        product_data,
        ocr_results,
    ):
        names = [
            ("LM-06-01", "6(1)(a)", "Manufacturer / packer / importer"),
            ("LM-06-02", "6(1)(aa)", "Country of origin"),
            ("LM-06-03", "6(1)(b)", "Common / generic name"),
            ("LM-06-04", "6(1)(c)", "Net quantity"),
            ("LM-06-05", "6(1)(d)", "Manufacturing / pre-packing / import date"),
            ("LM-06-06", "6(1)(da)", "Best before / use by"),
            ("LM-06-07", "6(1)(e)", "Maximum Retail Price"),
            ("LM-06-08", "6(1)(f)", "Dimensions where relevant"),
            ("LM-06-09", "6(2)", "Consumer complaint contact"),
            ("LM-06-10", "6(11)", "Unit sale price"),
        ]

        return [
            self._result(
                rule_id,
                rule_number,
                name,
                status,
                applicable=False,
                reason=(
                    "Rule 6 is not applicable to this package context."
                    if status == "NOT_APPLICABLE"
                    else "Package is outside the evaluated Legal Metrology scope."
                ),
            )
            for rule_id, rule_number, name in names
        ]

    def _evaluate_manufacturer_declaration(
        self,
        product_data,
        ocr_results,
    ):
        manufacturer = product_data.get("manufacturer_or_packer")
        address = product_data.get("address")

        if not self._valid_value(manufacturer) and not self._valid_value(address):
            return self._result(
                "LM-06-01",
                "6(1)(a)",
                "Manufacturer / packer / importer",
                "REVIEW",
                expected="Applicable manufacturer, packer or importer name and address.",
                extracted={"name": manufacturer, "address": address},
                reason="No reliable manufacturer/packer/importer identification and address were detected.",
                suggestion="Capture the complete Manufacturer/Packer/Importer declaration and its associated address.",
            )

        if not self._valid_value(manufacturer) or not self._valid_value(address):
            return self._result(
                "LM-06-01",
                "6(1)(a)",
                "Manufacturer / packer / importer",
                "REVIEW",
                expected="Applicable manufacturer, packer or importer name and address.",
                extracted={"name": manufacturer, "address": address},
                reason="Only part of the required identity/address information was detected.",
                suggestion="Capture the complete name and address together.",
            )

        evidence = self._find_evidence(
            [manufacturer, address],
            ocr_results,
        )

        if not evidence:
            return self._result(
                "LM-06-01",
                "6(1)(a)",
                "Manufacturer / packer / importer",
                "REVIEW",
                expected="Applicable manufacturer, packer or importer name and address.",
                extracted={"name": manufacturer, "address": address},
                reason="The extracted identity/address could not be matched reliably to OCR evidence.",
                suggestion="Verify the declaration visually before treating it as compliant.",
            )

        return self._result(
            "LM-06-01",
            "6(1)(a)",
            "Manufacturer / packer / importer",
            "PASS",
            expected="Applicable manufacturer, packer or importer name and address.",
            extracted={"name": manufacturer, "address": address},
            evidence=evidence,
            reason="A manufacturer/packer/importer identity and associated address were detected.",
        )

    def _evaluate_country_of_origin(
        self,
        applicability,
        product_data,
        ocr_results,
    ):
        imported = self._is_imported_product(applicability, product_data, ocr_results)

        if imported is False:
            return self._result(
                "LM-06-02",
                "6(1)(aa)",
                "Country of origin",
                "NOT_APPLICABLE",
                applicable=False,
                expected="Country of origin for imported products.",
                extracted=product_data.get("country_of_origin"),
                reason="The available evidence does not indicate that the product is imported.",
            )

        country = product_data.get("country_of_origin")

        if self._valid_value(country):
            evidence = self._find_labeled_evidence(
                country,
                ocr_results,
                ["country of origin", "made in", "manufactured in", "origin"],
            )
            return self._result(
                "LM-06-02",
                "6(1)(aa)",
                "Country of origin",
                "PASS" if evidence else "REVIEW",
                expected="Country of origin for imported products.",
                extracted=country,
                evidence=evidence,
                reason=(
                    "Country of origin was detected with supporting label evidence."
                    if evidence
                    else "Country of origin was extracted but its label association could not be confirmed."
                ),
                suggestion=None if evidence else "Verify the explicit Country of Origin declaration.",
            )

        if imported is True:
            return self._result(
                "LM-06-02",
                "6(1)(aa)",
                "Country of origin",
                "REVIEW",
                expected="Country of origin for imported products.",
                extracted=country,
                reason="The package appears to be imported, but an explicit country-of-origin declaration was not confidently detected.",
                suggestion="Capture the explicit Country of Origin / Made In declaration.",
            )

        return self._result(
            "LM-06-02",
            "6(1)(aa)",
            "Country of origin",
            "REVIEW",
            expected="Country of origin for imported products.",
            extracted=country,
            reason="Import status could not be determined reliably from the available evidence.",
            suggestion="Verify whether the package is imported before evaluating country of origin.",
        )

    def _is_imported_product(
        self,
        applicability,
        product_data,
        ocr_results,
    ):
        for key in ("is_imported", "imported"):
            value = product_data.get(key)
            if isinstance(value, bool):
                return value

        for key in ("is_imported", "imported", "country_of_origin"):
            value = applicability.get(key) if isinstance(applicability, dict) else None
            if isinstance(value, bool):
                return value

        country = product_data.get("country_of_origin")
        if self._valid_value(country):
            normalized = str(country).strip().lower()
            if normalized not in {"india", "indian"}:
                return True

        text = " ".join(
            str(item.get("text", ""))
            for item in (ocr_results or [])
            if isinstance(item, dict)
        ).lower()

        import_markers = [
            "imported by",
            "importer",
            "country of origin",
            "made in china",
            "made in usa",
            "made in japan",
            "made in uae",
            "made in korea",
            "made in vietnam",
        ]

        if any(marker in text for marker in import_markers):
            return True

        return False

    def _evaluate_mrp(self, product_data, ocr_results):
        value = product_data.get("mrp")

        if not self._valid_value(value):
            return self._result(
                "LM-06-07",
                "6(1)(e)",
                "Maximum Retail Price",
                "REVIEW",
                expected="Maximum Retail Price in Indian currency, inclusive of all taxes, where applicable.",
                extracted=value,
                reason="MRP was not confidently detected.",
                suggestion="Capture the MRP declaration clearly, including its association with the price.",
            )

        evidence = self._find_labeled_evidence(
            value,
            ocr_results,
            ["mrp", "maximum retail price", "retail sale price"],
        )

        if not evidence:
            return self._result(
                "LM-06-07",
                "6(1)(e)",
                "Maximum Retail Price",
                "REVIEW",
                expected="Maximum Retail Price in Indian currency, inclusive of all taxes, where applicable.",
                extracted=value,
                reason="A price value was extracted but its MRP label association was not confirmed.",
                suggestion="Verify that the detected price is explicitly marked as MRP / Maximum Retail Price.",
            )

        return self._result(
            "LM-06-07",
            "6(1)(e)",
            "Maximum Retail Price",
            "PASS",
            expected="Maximum Retail Price in Indian currency, inclusive of all taxes, where applicable.",
            extracted=value,
            evidence=evidence,
            reason="An explicitly labelled MRP declaration was detected.",
        )

    def _evaluate_dimensions(
        self,
        product_data,
        applicability,
        ocr_results,
    ):
        dimensions = product_data.get("dimensions")

        # A generic packaged-food label normally does not require Rule 6(1)(f)
        # dimensions.  If applicability explicitly says dimensions are relevant,
        # evaluate them; otherwise do not penalize the package.
        relevant = self._flag_from_context(
            applicability,
            ["dimensions_relevant", "size_relevant"],
        )

        if relevant is False:
            return self._result(
                "LM-06-08",
                "6(1)(f)",
                "Dimensions where relevant",
                "NOT_APPLICABLE",
                applicable=False,
                expected="Dimensions where relevant to the commodity.",
                extracted=dimensions,
                reason="Available applicability information indicates that dimensions are not relevant.",
            )

        if self._valid_value(dimensions):
            evidence = self._find_evidence([dimensions], ocr_results)
            return self._result(
                "LM-06-08",
                "6(1)(f)",
                "Dimensions where relevant",
                "PASS" if evidence else "REVIEW",
                expected="Dimensions of the commodity where relevant.",
                extracted=dimensions,
                evidence=evidence,
                reason=(
                    "Relevant dimensions were detected."
                    if evidence
                    else "Dimensions were extracted but supporting OCR evidence is weak."
                ),
            )

        if relevant is True:
            return self._result(
                "LM-06-08",
                "6(1)(f)",
                "Dimensions where relevant",
                "REVIEW",
                expected="Dimensions of the commodity where relevant.",
                extracted=dimensions,
                reason="The commodity context indicates dimensions may be required, but no reliable declaration was detected.",
                suggestion="Capture the dimensions declaration clearly.",
            )

        return self._result(
            "LM-06-08",
            "6(1)(f)",
            "Dimensions where relevant",
            "REVIEW",
            expected="Dimensions of the commodity where relevant.",
            extracted=dimensions,
            reason="The system could not determine from the available evidence whether dimensions are relevant.",
            suggestion="Verify commodity-specific dimensional applicability.",
        )

    def _evaluate_unit_sale_price(
        self,
        product_data,
        ocr_results,
    ):
        declared = (
            product_data.get("unit_sale_price")
            or product_data.get("unit_price")
            or product_data.get("usp")
        )

        quantity = product_data.get("net_quantity")
        mrp = product_data.get("mrp")

        expected_unit = self._calculate_expected_unit_sale_price(
            quantity,
            product_data.get("unit_of_measure"),
            mrp,
        )

        if not self._valid_value(declared):
            return self._result(
                "LM-06-10",
                "6(11)",
                "Unit sale price",
                "REVIEW",
                expected=(
                    "Unit sale price should be declared in the prescribed form."
                    + (
                        f" Expected approximately {expected_unit} from the detected quantity/MRP."
                        if expected_unit is not None
                        else ""
                    )
                ),
                extracted={
                    "declared": declared,
                    "calculated_reference": expected_unit,
                },
                reason="A separate unit sale price declaration was not confidently detected.",
                suggestion="Verify whether the package carries the applicable unit sale price declaration.",
            )

        evidence = self._find_labeled_evidence(
            declared,
            ocr_results,
            [
                "per g",
                "per gram",
                "per kg",
                "per ml",
                "per litre",
                "per liter",
                "per number",
                "unit sale price",
            ],
        )

        if not evidence:
            return self._result(
                "LM-06-10",
                "6(11)",
                "Unit sale price",
                "REVIEW",
                expected="Applicable unit sale price declaration.",
                extracted={
                    "declared": declared,
                    "calculated_reference": expected_unit,
                },
                reason="A unit price value was extracted, but its required unit-sale-price label could not be confirmed.",
                suggestion="Verify the explicit unit sale price declaration and its unit.",
            )

        comparison = self._compare_money(declared, expected_unit)

        if comparison is False:
            return self._result(
                "LM-06-10",
                "6(11)",
                "Unit sale price",
                "FAIL",
                expected=f"Applicable unit sale price consistent with quantity and declared MRP; calculated reference: {expected_unit}.",
                extracted={
                    "declared": declared,
                    "calculated_reference": expected_unit,
                },
                evidence=evidence,
                reason="The declared unit sale price conflicts with the quantity/MRP reference calculation.",
                suggestion="Verify the printed unit sale price, net quantity and MRP.",
            )

        return self._result(
            "LM-06-10",
            "6(11)",
            "Unit sale price",
            "PASS" if comparison is True else "REVIEW",
            expected=f"Applicable unit sale price; calculated reference: {expected_unit}.",
            extracted={
                "declared": declared,
                "calculated_reference": expected_unit,
            },
            evidence=evidence,
            reason=(
                "Unit sale price was detected and is consistent with the available quantity/MRP evidence."
                if comparison is True
                else "Unit sale price was detected, but quantity/MRP evidence is insufficient for a reliable numerical comparison."
            ),
            suggestion=None if comparison is True else "Verify the unit sale price against the declared quantity and MRP.",
        )

    def _calculate_expected_unit_sale_price(
        self,
        quantity,
        unit_of_measure,
        mrp,
    ):
        q = self._parse_quantity(quantity)

        if q is None or q[0] <= 0:
            return None

        price = self._parse_money(mrp)
        if price is None:
            return None

        amount, unit = q
        unit = unit.lower()

        if unit in {"g", "gm", "gram", "grams"}:
            # Rule 6(11): per gram when quantity is below 1 kg.
            if amount < 1000:
                return f"₹{price / amount:.2f} per g"
            return f"₹{price / (amount / 1000.0):.2f} per kg"

        if unit in {"kg", "kilogram", "kilograms"}:
            if amount >= 1:
                return f"₹{price / amount:.2f} per kg"
            return f"₹{price / (amount * 1000.0):.2f} per g"

        if unit in {"ml", "millilitre", "milliliter"}:
            if amount < 1000:
                return f"₹{price / amount:.2f} per ml"
            return f"₹{price / (amount / 1000.0):.2f} per litre"

        if unit in {"l", "litre", "liter", "litres", "liters"}:
            if amount >= 1:
                return f"₹{price / amount:.2f} per litre"
            return f"₹{price / (amount * 1000.0):.2f} per ml"

        if unit in {"number", "no", "nos", "piece", "unit", "pair", "set"}:
            return f"₹{price / amount:.2f} per number"

        return None

    def _parse_quantity(self, value):
        if not self._valid_value(value):
            return None

        text = str(value).strip().lower().replace(",", "")
        match = re.search(
            r"(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|grams|mg|l|litre|liter|litres|liters|ml|number|nos?|piece|unit|pair|set)\b",
            text,
        )
        if not match:
            return None

        try:
            return float(match.group(1)), match.group(2)
        except (TypeError, ValueError):
            return None

    def _parse_money(self, value):
        if not self._valid_value(value):
            return None

        match = re.search(r"(\d+(?:\.\d+)?)", str(value).replace(",", ""))
        if not match:
            return None

        try:
            return float(match.group(1))
        except (TypeError, ValueError):
            return None

    def _compare_money(self, declared, expected):
        if expected is None:
            return None

        declared_amount = self._parse_money(declared)
        expected_match = re.search(r"₹\s*(\d+(?:\.\d+)?)", str(expected))

        if declared_amount is None or not expected_match:
            return None

        expected_amount = float(expected_match.group(1))
        return abs(declared_amount - expected_amount) <= 0.02

    def _flag_from_context(self, context, keys):
        if not isinstance(context, dict):
            return None

        for key in keys:
            value = context.get(key)
            if isinstance(value, bool):
                return value

        return None

    # ==================================================================
    # RULE 7
    # ==================================================================

    def _evaluate_rule_07(
        self,
        applicability,
        visual_analysis=None,
    ):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-07",
                "7",
                "Principal display panel - area, size and letters",
                "NOT_APPLICABLE",
                applicable=False,
            )

        visual = visual_analysis or {}
        size = visual.get("text_size", {})
        placement = visual.get("placement", {})

        evidence = {
            "text_blocks": size.get("text_blocks"),
            "median_height_px": size.get("median_height_px"),
            "min_height_px": size.get("min_height_px"),
            "max_height_px": size.get("max_height_px"),
            "calibrated_height_mm": size.get("calibrated_height_mm"),
            "bbox_count": placement.get("bbox_count"),
        }

        if not visual:
            reason = (
                "No visual analysis payload was supplied. OCR can identify text, "
                "but physical letter/numeral dimensions cannot be proven without "
                "calibration."
            )
        elif size.get("calibrated_height_mm") is not None:
            reason = (
                "Calibrated text-height evidence is available. The applicable "
                "commodity/package threshold still requires verification against "
                "the Rule 7 requirements."
            )
        else:
            reason = (
                "OCR bounding boxes provide measurable relative text-size evidence, "
                "but physical letter/numeral height cannot be proven from pixels alone."
            )

        return self._result(
            "LM-07",
            "7",
            "Principal display panel - area, size and letters",
            "REVIEW",
            expected=(
                "Principal display panel and prescribed letter/numeral "
                "dimensions must satisfy the Rule."
            ),
            extracted=evidence,
            evidence=[evidence],
            reason=reason,
            suggestion=(
                "Use a calibrated image or physical reference to verify the "
                "principal-display-panel area and prescribed letter/numeral height."
            ),
        )

    # ==================================================================
    # RULE 8
    # ==================================================================

    def _evaluate_rule_08(
        self,
        applicability,
        visual_analysis=None,
    ):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-08",
                "8",
                "Declarations where to appear",
                "NOT_APPLICABLE",
                applicable=False,
            )

        visual = visual_analysis or {}
        placement = visual.get("placement", {})
        visibility = visual.get("declaration_visibility", {})

        evidence = {
            "bbox_count": placement.get("bbox_count"),
            "regions": placement.get("regions", {}),
            "label_positions": placement.get("label_positions", []),
            "declaration_groups": {
                key: value.get("detected", False)
                for key, value in visibility.items()
                if isinstance(value, dict)
            },
        }

        detected_groups = sum(
            1 for value in evidence["declaration_groups"].values() if value
        )

        return self._result(
            "LM-08",
            "8",
            "Declarations where to appear",
            "REVIEW",
            expected=(
                "Required declarations should appear in the prescribed "
                "location and principal display panel where applicable."
            ),
            extracted=evidence,
            evidence=[evidence],
            reason=(
                "OCR geometry now provides relative declaration-position evidence, "
                "but the Principal Display Panel and complete legal placement "
                "requirements require package-layout interpretation."
            ),
            suggestion=(
                "Verify applicable declarations against the prescribed location "
                "and Principal Display Panel requirements."
            ),
            weight=1.0,
        )

    # ==================================================================
    # RULE 9
    # ==================================================================

    def _evaluate_rule_09(
        self,
        applicability,
        visual_analysis=None,
    ):

        if self._is_not_applicable(applicability):
            return self._result(
                "LM-09",
                "9",
                "Manner of declarations",
                "NOT_APPLICABLE",
                applicable=False,
            )

        visual = visual_analysis or {}
        readability = visual.get("readability", {})
        size = visual.get("text_size", {})

        evidence = {
            "mean_ocr_confidence": readability.get("mean_ocr_confidence"),
            "high_confidence_ratio": readability.get("high_confidence_ratio"),
            "median_local_contrast": readability.get("median_local_contrast"),
            "text_blocks": size.get("text_blocks"),
        }

        confidence = readability.get("mean_ocr_confidence")
        contrast = readability.get("median_local_contrast")

        if confidence is not None and confidence < 0.60:
            reason = (
                "OCR confidence is low, which may indicate blur, glare, obstruction "
                "or poor visibility. This is a warning signal, not by itself a legal FAIL."
            )
        elif contrast is not None:
            reason = (
                "OCR confidence and local image contrast provide supporting "
                "readability evidence, but image-only analysis cannot conclusively "
                "establish every legibility, prominence and prescribed-manner requirement."
            )
        else:
            reason = (
                "OCR confidence provides supporting visibility evidence, but image-only "
                "analysis cannot conclusively establish every legibility, prominence "
                "and prescribed-manner requirement."
            )

        return self._result(
            "LM-09",
            "9",
            "Manner of declarations",
            "REVIEW",
            expected=(
                "Declarations should be legible, prominent and presented "
                "in the prescribed manner."
            ),
            extracted=evidence,
            evidence=[evidence],
            reason=reason,
            suggestion=(
                "Verify legibility, prominence, contrast and prescribed "
                "language/display requirements."
            ),
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
                "PASS" if evidence else "REVIEW",
                expected="Manufacturer / packer / importer name and applicable address.",
                extracted={
                    "name": manufacturer,
                    "address": address,
                },
                evidence=evidence,
                reason=(
                    "Manufacturer/packer/importer identification and associated address "
                    "were detected with supporting OCR evidence."
                    if evidence
                    else "The identity and address were extracted, but supporting OCR "
                         "evidence could not be matched reliably."
                ),
                suggestion=None if evidence else "Verify the responsible-party declaration visually.",
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

        if not self._valid_value(quantity):
            return self._result(
                "LM-11",
                "11",
                "General provisions relating to declaration of quantity",
                "REVIEW",
                expected="Net quantity must be accurately declared in the prescribed manner.",
                reason="Net quantity declaration was not confidently detected.",
                suggestion="Capture the complete quantity declaration.",
            )

        evidence = self._find_evidence([quantity], ocr_results)

        return self._result(
            "LM-11",
            "11",
            "General provisions relating to declaration of quantity",
            "REVIEW",
            expected="Net quantity must be accurately declared; image analysis alone cannot verify the actual physical quantity.",
            extracted=quantity,
            evidence=evidence,
            reason="The declared quantity is visible, but actual quantity accuracy cannot be established from a label image alone.",
            suggestion="Verify the physical quantity using an appropriate verified weighing/measuring method.",
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
        parsed = self._parse_quantity(quantity)

        if parsed is None:
            return self._result(
                "LM-12",
                "12",
                "Manner in which declaration of quantity shall be made",
                "REVIEW",
                expected="Quantity should be declared using the unit appropriate to the commodity.",
                extracted=quantity,
                reason="The quantity/unit could not be parsed reliably.",
                suggestion="Capture a clearer net quantity declaration.",
            )

        amount, unit = parsed
        unit = unit.lower()

        solid_like = str(
            product_data.get("category")
            or product_data.get("product_category")
            or ""
        ).lower()

        liquid_hint = any(
            token in solid_like
            for token in ["liquid", "beverage", "oil", "juice", "drink", "water"]
        )

        mass_units = {"kg", "g", "gm", "gram", "grams"}
        volume_units = {"l", "litre", "liter", "litres", "liters", "ml"}
        count_units = {"number", "no", "nos", "piece", "unit", "pair", "set"}

        length_units = {
            "m", "cm", "mm", "metre", "meter", "metres", "meters"
        }
        area_units = {"m2", "cm2", "sq m", "sq cm"}

        length_hint = any(
            token in solid_like
            for token in [
                "length", "linear", "rope", "wire", "cable",
                "cloth by metre", "fabric by metre"
            ]
        )
        area_hint = any(
            token in solid_like
            for token in ["area", "square metre", "square meter"]
        )

        if liquid_hint and unit in volume_units:
            status = "PASS"
            reason = "The detected liquid-type commodity uses a volume declaration."
        elif not liquid_hint and unit in mass_units and not length_hint and not area_hint:
            status = "PASS"
            reason = "The detected solid/semi-solid commodity uses a mass declaration."
        elif length_hint and unit in length_units:
            status = "PASS"
            reason = "The detected commodity context indicates a length declaration."
        elif area_hint and unit in area_units:
            status = "PASS"
            reason = "The detected commodity context indicates an area declaration."
        elif unit in count_units:
            status = "PASS"
            reason = "The commodity is declared by number/unit/piece."
        else:
            status = "REVIEW"
            reason = "The unit is recognizable, but commodity-specific quantity form could not be verified confidently."

        return self._result(
            "LM-12",
            "12",
            "Manner in which declaration of quantity shall be made",
            status,
            expected="Quantity declaration in the appropriate mass, volume, length, area or number form.",
            extracted=quantity,
            evidence=self._find_evidence([quantity], ocr_results),
            reason=reason,
            suggestion=None if status == "PASS" else "Verify the quantity form against the commodity and applicable schedule.",
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
        parsed = self._parse_quantity(quantity)

        if parsed is None:
            return self._result(
                "LM-13",
                "13",
                "Statement of units of weight, measure or number",
                "REVIEW",
                expected="Quantity should use the applicable prescribed SI-based unit form.",
                extracted=quantity,
                reason="Quantity/unit could not be parsed.",
                suggestion="Capture the complete quantity and unit.",
            )

        amount, unit = parsed
        unit = unit.lower()

        # Common acceptable textual variants are retained as REVIEW rather
        # than hard FAIL because the Department has issued enforcement
        # guidance around SI notation/case-form variations.
        standard_units = {
            "g", "kg", "mg", "ml", "l", "m", "cm", "mm",
            "number", "piece", "pair", "set", "unit",
        }

        review_variants = {
            "gm", "gram", "grams", "ltr", "litre", "liter",
            "litres", "liters", "no", "nos",
        }

        if unit in standard_units:
            status = "PASS"
            reason = "The quantity uses a recognized prescribed/SI-compatible unit or number/unit form."
        elif unit in review_variants:
            status = "REVIEW"
            reason = "A recognizable unit variant was detected; exact prescribed notation should be verified."
        else:
            status = "FAIL"
            reason = "The detected quantity unit is not a recognized prescribed unit form."

        return self._result(
            "LM-13",
            "13",
            "Statement of units of weight, measure or number",
            status,
            expected="Applicable prescribed unit of weight, measure or number.",
            extracted=quantity,
            evidence=self._find_evidence([quantity], ocr_results),
            reason=reason,
            suggestion=None if status == "PASS" else "Verify the exact unit notation against the applicable Legal Metrology requirement.",
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
        label_patterns=None,
    ):
        value = product_data.get(field_name)

        if not self._valid_value(value):
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

        if label_patterns:
            evidence = self._find_labeled_evidence(
                value,
                ocr_results,
                label_patterns,
            )

            if not evidence:
                return self._result(
                    rule_id,
                    rule_number,
                    rule_name,
                    "REVIEW",
                    expected=expected,
                    extracted=value,
                    reason="The value was extracted, but its required declaration label/association could not be confirmed.",
                    suggestion="Verify the field label and associated value on the package.",
                )
        else:
            evidence = self._find_evidence([value], ocr_results)

        return self._result(
            rule_id,
            rule_number,
            rule_name,
            "PASS" if evidence else "REVIEW",
            expected=expected,
            extracted=value,
            evidence=evidence,
            reason=(
                f"{field_name.replace('_', ' ').title()} was detected with supporting OCR evidence."
                if evidence
                else f"{field_name.replace('_', ' ').title()} was extracted but could not be matched to OCR evidence."
            ),
            suggestion=None if evidence else "Verify the extracted declaration visually.",
        )

    def _find_labeled_evidence(
        self,
        value,
        ocr_results,
        label_patterns,
    ):
        if not self._valid_value(value) or not ocr_results:
            return []

        normalized_value = self._normalize_text(str(value))
        labels = [
            self._normalize_text(label)
            for label in label_patterns
            if label
        ]

        evidence = []

        for index, item in enumerate(ocr_results):
            if not isinstance(item, dict):
                continue

            text = str(item.get("text", "")).strip()
            if not text:
                continue

            normalized_text = self._normalize_text(text)

            has_value = (
                normalized_value
                and (
                    normalized_value in normalized_text
                    or normalized_text in normalized_value
                )
            )

            has_label = any(label and label in normalized_text for label in labels)

            if has_value and has_label:
                evidence.append(
                    {
                        "text": text,
                        "confidence": item.get("confidence"),
                        "bbox": item.get("bbox"),
                        "match_type": "same_line_label_value",
                    }
                )
                continue

            if has_label:
                # Look at nearby OCR lines for a value. This handles labels such
                # as "MRP :" followed by the price on the next OCR line.
                for nearby in ocr_results[max(0, index - 1): index + 3]:
                    if not isinstance(nearby, dict):
                        continue

                    nearby_text = str(nearby.get("text", "")).strip()
                    nearby_normalized = self._normalize_text(nearby_text)

                    if normalized_value and (
                        normalized_value in nearby_normalized
                        or nearby_normalized in normalized_value
                    ):
                        evidence.append(
                            {
                                "text": nearby_text,
                                "confidence": nearby.get("confidence"),
                                "bbox": nearby.get("bbox"),
                                "match_type": "nearby_label_value",
                                "label_text": text,
                            }
                        )
                        break

        return evidence

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
                "6(1)(c)",
                "Net quantity",
                "PASS",
                expected="Net quantity of the commodity.",
                extracted=quantity,
                evidence=evidence,
                reason="Net quantity was detected.",
            )

        return self._result(
            rule_id,
            "6(1)(c)",
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
        rule_number,
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
            evidence = self._find_evidence([value], ocr_results)

            return self._result(
                rule_id,
                rule_number,
                rule_name,
                "PASS" if evidence else "REVIEW",
                expected=expected,
                extracted=value,
                evidence=evidence,
                reason=(
                    "Relevant date declaration was detected with OCR evidence."
                    if evidence
                    else "A date was extracted but supporting OCR evidence could not be matched reliably."
                ),
                suggestion=None if evidence else "Verify the date declaration visually.",
            )

        return self._result(
            rule_id,
            rule_number,
            rule_name,
            "REVIEW",
            expected=expected,
            extracted=None,
            reason="No sufficiently reliable date declaration was detected.",
            suggestion="Capture the relevant manufacturing/packing or best-before/use-by area clearly.",
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
        compliance_score: Optional[float] = None,
    ):
        """
        Overall status evaluated according to the compliance score:

        PASS:
            Compliance score >= PASS_SCORE_THRESHOLD (80.0%).

        REVIEW:
            Compliance score >= REVIEW_SCORE_THRESHOLD (50.0%) and < PASS_SCORE_THRESHOLD (80.0%).

        FAIL:
            Compliance score < REVIEW_SCORE_THRESHOLD (50.0%).
        """
        if compliance_score is None:
            compliance_score = self._calculate_compliance_score(results)

        if compliance_score is not None:
            if compliance_score >= self.PASS_SCORE_THRESHOLD:
                return "PASS"
            elif compliance_score >= self.REVIEW_SCORE_THRESHOLD:
                return "REVIEW"
            else:
                return "FAIL"

        has_applicable_result = False
        for result in results:
            status = str(result.get("status", "")).upper()
            if status not in self.EXCLUDED_FROM_SCORE:
                has_applicable_result = True
                break

        return "PASS" if has_applicable_result else "REVIEW"

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

        Each evaluated rule has equal weight by default.

        IMPORTANT:
        The score is only a prioritization indicator. It must never be used
        as a substitute for the legal PASS/FAIL/REVIEW decision.
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

    # ==================================================================
    # DYNAMIC COMPLIANCE RULES EVALUATOR
    # ==================================================================

    def _evaluate_dynamic_rules(
        self,
        dynamic_rules: Optional[List[Dict[str, Any]]],
        product_data: Dict[str, Any],
        ocr_results: List[Dict[str, Any]],
        visual_analysis: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        if dynamic_rules is None:
            try:
                from .supabase_service import SupabaseService
                dynamic_rules = SupabaseService.get_active_compliance_rules()
            except Exception as e:
                print(f"Notice: Dynamic rules fetch from Supabase skipped: {e}")
                dynamic_rules = []

        if not dynamic_rules:
            return []

        from datetime import date, datetime
        today = date.today()

        full_ocr_text = " ".join(
            str(item.get("text", "")) for item in ocr_results if isinstance(item, dict)
        ).lower()

        results = []

        for rule in dynamic_rules:
            if not isinstance(rule, dict):
                continue

            # Respect active flag
            if not rule.get("active", True):
                continue

            # Respect effective dates
            eff_from = rule.get("effective_from")
            if eff_from:
                try:
                    if isinstance(eff_from, str):
                        eff_from = datetime.strptime(eff_from[:10], "%Y-%m-%d").date()
                    if today < eff_from:
                        continue
                except Exception:
                    pass

            eff_to = rule.get("effective_to")
            if eff_to:
                try:
                    if isinstance(eff_to, str):
                        eff_to = datetime.strptime(eff_to[:10], "%Y-%m-%d").date()
                    if today > eff_to:
                        continue
                except Exception:
                    pass

            rule_code = rule.get("rule_code") or f"DR-{rule.get('id', '')[:6]}"
            rule_name = rule.get("rule_name") or "Dynamic Regulatory Rule"
            category = rule.get("category") or "GENERAL"
            field_name = (rule.get("field_name") or "").strip().lower()
            condition_type = (rule.get("condition_type") or "field_presence").strip().lower()
            operator = (rule.get("operator") or "exists").strip().lower()
            expected_val = str(rule.get("expected_value") or "").strip()
            severity = str(rule.get("severity", "MEDIUM")).upper()
            mandatory = bool(rule.get("mandatory", True))

            # Extract value from product_data or OCR
            extracted_val = None
            evidence = []

            # 1. Check direct product_data field
            if field_name:
                for k, v in product_data.items():
                    if k.lower() == field_name or field_name in k.lower():
                        if v:
                            extracted_val = v
                            break

            # 2. Check OCR evidence if not found in product_data
            if not extracted_val and field_name:
                for block in ocr_results:
                    txt = str(block.get("text", ""))
                    if field_name.replace("_", " ") in txt.lower():
                        extracted_val = txt
                        evidence.append(block)
                        break

            # If still nothing, check if expected value appears in full OCR
            if not extracted_val and expected_val and expected_val.lower() in full_ocr_text:
                extracted_val = expected_val
                for block in ocr_results:
                    if expected_val.lower() in str(block.get("text", "")).lower():
                        evidence.append(block)

            # Evaluate condition
            status = "REVIEW"
            reason = ""
            suggestion = ""

            if condition_type in ("field_presence", "presence", "mandatory_field"):
                if extracted_val and str(extracted_val).strip() and str(extracted_val).strip().lower() not in ("none", "null"):
                    status = "PASS"
                    reason = f"Mandatory declaration '{field_name or rule_name}' was detected on label."
                else:
                    status = "FAIL" if mandatory else "REVIEW"
                    reason = f"Required statutory declaration '{field_name or rule_name}' was missing or could not be detected."
                    suggestion = f"Ensure '{field_name or rule_name}' is legibly displayed on principal display panel."

            elif condition_type in ("field_contains", "contains") or operator == "contains":
                if extracted_val and expected_val and expected_val.lower() in str(extracted_val).lower():
                    status = "PASS"
                    reason = f"Declaration satisfies requirement; contained expected text '{expected_val}'."
                elif expected_val and expected_val.lower() in full_ocr_text:
                    status = "PASS"
                    reason = f"Expected text '{expected_val}' was verified in label text."
                else:
                    status = "FAIL" if mandatory else "REVIEW"
                    reason = f"Declaration did not contain expected content '{expected_val}'."
                    suggestion = f"Verify package text contains '{expected_val}'."

            elif condition_type in ("equals", "match") or operator in ("equals", "=="):
                if extracted_val and expected_val and str(extracted_val).strip().lower() == expected_val.lower():
                    status = "PASS"
                    reason = f"Declaration matches required value '{expected_val}'."
                else:
                    status = "FAIL" if mandatory else "REVIEW"
                    reason = f"Expected '{expected_val}', but detected '{extracted_val}'."
                    suggestion = f"Update label to reflect required value '{expected_val}'."

            elif condition_type in ("regex", "regex_match") or operator in ("regex", "matches"):
                try:
                    pattern = re.compile(expected_val, re.IGNORECASE)
                    if (extracted_val and pattern.search(str(extracted_val))) or pattern.search(full_ocr_text):
                        status = "PASS"
                        reason = f"Label evidence matches regulatory pattern '{expected_val}'."
                    else:
                        status = "FAIL" if mandatory else "REVIEW"
                        reason = f"Pattern '{expected_val}' not matched in label evidence."
                        suggestion = f"Check format requirements for '{rule_name}'."
                except Exception as ex:
                    status = "REVIEW"
                    reason = f"Regex validation error: {ex}"

            else:
                # Default fallback evaluation
                if extracted_val:
                    status = "PASS"
                    reason = f"Declaration detected for rule '{rule_name}'."
                else:
                    status = "FAIL" if mandatory else "REVIEW"
                    reason = f"Statutory declaration for '{rule_name}' not detected."
                    suggestion = f"Ensure '{rule_name}' compliance on package."

            weight = 1.5 if severity == "CRITICAL" else (1.2 if severity == "HIGH" else 1.0)

            results.append({
                "rule_id": rule_code,
                "rule_number": rule_code,
                "rule_name": rule_name,
                "status": status,
                "applicable": True,
                "expected": expected_val or rule.get("description") or f"Statutory declaration for {rule_name}",
                "extracted": str(extracted_val) if extracted_val is not None else None,
                "extracted_value": str(extracted_val) if extracted_val is not None else None,
                "evidence": evidence,
                "reason": reason,
                "suggestion": suggestion,
                "rule_reference": f"Legal Metrology Rule [{rule_code}] — {rule_name}",
                "source": "Dynamic Regulatory Rule Registry (Supabase)",
                "severity": severity,
                "mandatory": mandatory,
                "category": category,
                "weight": weight,
            })

        return results


# ======================================================================
# SINGLETON
# ======================================================================

compliance_engine = ComplianceEngine()