import re
from typing import Any, Dict, Optional


class ExtractionFusion:
    """
    Combines PaddleOCR field extraction with Gemini Vision.

    Design goals:
    - Prefer verified values over guessed values.
    - Reject field labels and instruction text.
    - Keep complete visible values.
    - Use Gemini primarily for visual association.
    - Never force a value when evidence is weak.
    - Do not contain Legal Metrology compliance rules.
    """

    FIELDS = [
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
        "product_category",
    ]

    FIELD_LABELS = {
        "product_name": {
            "product name",
            "name",
            "product",
        },
        "net_quantity": {
            "net quantity",
            "net qty",
            "net weight",
            "n.qty",
            "quantity",
        },
        "mrp": {
            "mrp",
            "m.r.p",
            "mrp rs",
            "maximum retail price",
        },
        "batch_number": {
            "batch",
            "batch no",
            "batch number",
            "b.no",
            "b.no.",
            "b no",
            "lot",
            "lot no",
            "lot number",
        },
        "packed_on": {
            "packed",
            "packed on",
            "pkd",
            "pkd on",
            "pkd.",
        },
        "date_of_manufacture": {
            "mfd",
            "mfg",
            "mfd date",
            "mfg date",
            "manufactured",
            "date of manufacture",
        },
        "best_before": {
            "best before",
            "best before date",
            "bbe",
        },
        "use_by": {
            "use by",
            "use before",
        },
        "expiry_date": {
            "expiry",
            "expiry date",
            "exp",
            "exp date",
            "expires",
        },
        "manufacturer_or_packer": {
            "manufacturer",
            "manufactured by",
            "manufactured & marketed by",
            "manufactured and marketed by",
            "packed by",
            "packer",
            "manufactured for",
        },
        "marketed_by": {
            "marketed by",
            "marketed & distributed by",
            "marketed and distributed by",
            "distributed by",
        },
        "address": {
            "address",
        },
        "consumer_contact": {
            "consumer helpline",
            "consumer care",
            "customer care",
            "consumer relations",
            "feedback",
            "complaint contact",
            "contact us",
            "toll free",
            "email us",
        },
        "license_number": {
            "lic no",
            "lic. no",
            "license no",
            "license number",
            "fssai",
            "fssai lic no",
            "fssai license no",
        },
        "ingredients": {
            "ingredients",
            "ingredient",
        },
        "country_of_origin": {
            "country of origin",
            "made in",
            "product of",
        },
    }


    # Explicit label phrases have higher evidentiary priority than a
    # free-standing value returned by a model. These are used to prevent
    # cross-field contamination during fusion.
    STRONG_FIELD_LABELS = {
        "batch_number": (
            "batch number", "batch no", "batch no.", "batch", "b.no",
            "b.no.", "b no", "lot number", "lot no"
        ),
        "net_quantity": (
            "net quantity", "net qty", "net weight", "n.qty", "quantity"
        ),
        "mrp": (
            "mrp", "m.r.p", "mrp rs", "maximum retail price"
        ),
        "packed_on": (
            "packed on", "packed date", "pkd on", "date packed"
        ),
        "date_of_manufacture": (
            "date of manufacture", "manufactured on",
            "manufacturing date", "mfd", "mfg"
        ),
        "best_before": ("best before", "best before date", "bbe"),
        "use_by": ("use by", "use before"),
        "expiry_date": ("expiry", "expiry date", "exp", "exp date", "expires"),
        "manufacturer_or_packer": (
            "manufactured by", "manufactured and packed by",
            "manufactured & packed by", "packed by", "packer",
            "manufacturer", "manufactured for"
        ),
        "marketed_by": (
            "marketed by", "marketed and distributed by",
            "marketed & distributed by", "distributed by"
        ),
    }

    GENERIC_REJECT_PHRASES = {
        "see below",
        "see bottom",
        "see bottom of can",
        "see bottom of pack",
        "see bottom of the can",
        "see bottom of the pack",
        "refer below",
        "refer to bottom",
        "refer below",
        "see label",
        "refer label",
        "quality guaranteed",
        "not to be sold loose",
    }

    INSTRUCTION_STARTS = (
        "see ",
        "refer ",
        "when stored",
        "store in",
        "store at",
        "keep in",
        "keep away",
        "do not",
        "may be",
        "for best",
        "for any",
        "scan ",
        "visit ",
        "use the",
        "method:",
        "ingredients:",
        "nutritional information",
        "nutrition information",
    )

    PRODUCT_NAME_REJECT_PHRASES = (
        "contains ",
        "may contain",
        "nutritional information",
        "nutrition information",
        "ingredients",
        "method of preparation",
        "method:",
        "for feedback",
        "consumer",
        "manufactured by",
        "manufactured & marketed by",
        "manufactured and marketed by",
        "marketed by",
        "packed by",
        "packed on",
        "use by",
        "best before",
        "expiry",
        "net quantity",
        "net weight",
        "mrp",
        "quality guaranteed",
        "please recycle",
        "scan to",
        "store in",
        "keep ",
    )

    COMPANY_ADDRESS_MARKERS = (
        "plot",
        "survey",
        "road",
        "street",
        "village",
        "taluk",
        "taluka",
        "district",
        "mandal",
        "mandal",
        "p.o.",
        "post",
        "pin",
        "india",
        "phase",
        "ida",
        "industrial",
        "nagar",
        "building",
        "lane",
        "layout",
        "estate",
    )

    CONTACT_MARKERS = (
        "@",
        "email",
        "e-mail",
        "toll free",
        "helpline",
        "phone",
        "ph:",
        "contact",
        "www.",
        "http://",
        "https://",
    )

    def merge(
        self,
        paddle_data: Optional[Dict[str, Any]],
        gemini_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:

        paddle = self._clean_source(
            paddle_data or {}
        )

        gemini = self._clean_source(
            gemini_data or {}
        )

        result: Dict[str, Any] = {}

        for field in self.FIELDS:
            if field == "product_category":
                result[field] = self._merge_category(
                    paddle.get(field),
                    gemini.get(field),
                )
                continue

            result[field] = self._merge_field(
                field,
                paddle.get(field),
                gemini.get(field),
            )

        # Final cross-field cleanup.
        result = self._cross_field_cleanup(
            result,
            paddle,
            gemini,
        )

        return result

    def _merge_field(
        self,
        field: str,
        paddle_value: Any,
        gemini_value: Any,
    ) -> Optional[str]:

        p = self._normalize_value(paddle_value)
        g = self._normalize_value(gemini_value)

        p = self._validate_candidate(
            field,
            p
        )

        g = self._validate_candidate(
            field,
            g
        )

        if p is None and g is None:
            return None

        if p is None:
            return g

        if g is None:
            return p

        # If both sources agree, preserve the more complete form.
        if self._values_similar(p, g):
            return self._prefer_complete(
                p,
                g
            )

        # Field-specific fusion.
        if field == "mrp":
            if self._valid_mrp(p):
                return p

            if self._valid_mrp(g):
                return g

        if field == "batch_number":
            # Batch is a high-risk cross-field contamination point. When
            # PaddleOCR has a valid explicitly-labelled batch value, prefer
            # it over an unassociated Gemini guess.
            p_valid = self._valid_batch(p)
            g_valid = self._valid_batch(g)

            p_explicit = self._has_explicit_label(p, "batch_number")
            g_explicit = self._has_explicit_label(g, "batch_number")

            if p_valid and p_explicit:
                return self._extract_batch_value(p)

            if g_valid and g_explicit:
                return self._extract_batch_value(g)

            if p_valid and not g_valid:
                return self._extract_batch_value(p)

            if g_valid and not p_valid:
                return self._extract_batch_value(g)

            if p_valid and g_valid:
                # If neither source contains the label, do not let Gemini
                # arbitrarily replace OCR. Prefer the shorter/cleaner
                # candidate and let recovery use the original OCR evidence.
                return self._prefer_batch_candidate(p, g)

            return None

        if field in {
            "packed_on",
            "date_of_manufacture",
            "best_before",
            "use_by",
            "expiry_date",
        }:
            p_valid = self._valid_date_candidate(p)
            g_valid = self._valid_date_candidate(g)

            if p_valid and not g_valid:
                return p

            if g_valid and not p_valid:
                return g

            if p_valid and g_valid:
                # When both are valid, visual association from Gemini
                # is generally the stronger signal.
                return g

            return None

        if field == "product_name":
            p_score = self._product_name_score(p)
            g_score = self._product_name_score(g)

            return g if g_score >= p_score else p

        if field == "manufacturer_or_packer":
            return self._merge_company(
                p,
                g
            )

        if field == "marketed_by":
            return self._merge_company(
                p,
                g
            )

        if field == "address":
            return self._merge_long_text(
                p,
                g
            )

        if field == "consumer_contact":
            return self._merge_contact(
                p,
                g
            )

        if field == "ingredients":
            return self._merge_long_text(
                p,
                g
            )

        if field == "license_number":
            return self._merge_license(
                p,
                g
            )

        if field == "net_quantity":
            return self._merge_quantity(
                p,
                g
            )

        if field == "country_of_origin":
            # Country of origin must have explicit association. Never allow
            # an address or a bare country name inferred from the image to
            # silently become the declaration.
            if g and self._has_explicit_label(g, "country_of_origin"):
                return g
            return None

        # Default:
        # Gemini wins when both are plausible because it has access
        # to the actual visual layout.
        return g

    def _clean_source(
        self,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:

        cleaned = {}

        for field in self.FIELDS:
            value = data.get(field)

            if field == "product_category":
                cleaned[field] = value
                continue

            cleaned[field] = self._normalize_value(
                value
            )

        return cleaned

    @staticmethod
    def _normalize_value(
        value: Any
    ) -> Optional[str]:

        if value is None:
            return None

        if isinstance(value, bool):
            return None

        text = str(value).strip()

        if not text:
            return None

        # Remove accidental surrounding JSON-ish quotes.
        if len(text) >= 2:
            if (
                text.startswith('"')
                and text.endswith('"')
            ) or (
                text.startswith("'")
                and text.endswith("'")
            ):
                text = text[1:-1].strip()

        if not text:
            return None

        return text

    def _validate_candidate(
        self,
        field: str,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        normalized = self._norm(value)

        if not normalized:
            return None

        # Candidate is exactly another field label.
        all_labels = set()

        for labels in self.FIELD_LABELS.values():
            all_labels.update(
                self._norm(label)
                for label in labels
            )

        if normalized in all_labels:
            return None

        # Generic rejected phrases.
        if normalized in {
            self._norm(item)
            for item in self.GENERIC_REJECT_PHRASES
        }:
            return None

        # Instructions should never become structured field values.
        if self._looks_like_instruction(value):
            # Long address/contact/ingredient strings can naturally
            # contain words like "for" or "contact", so only apply
            # instruction rejection broadly to short candidates.
            if len(value.split()) <= 12:
                return None

        if field == "product_name":
            if self._product_name_score(value) <= 0:
                return None

        if field == "batch_number":
            if not self._valid_batch(value):
                return None

        if field == "mrp":
            if self._is_mrp_label_only(value):
                return None

        if field in {
            "packed_on",
            "date_of_manufacture",
            "best_before",
            "use_by",
            "expiry_date",
        }:
            if not self._valid_date_candidate(value):
                return None

        if field == "manufacturer_or_packer":
            if self._looks_like_address(value):
                return None

            if self._is_bad_company_candidate(value):
                return None

        if field == "marketed_by":
            if self._looks_like_address(value):
                return None

            if self._is_bad_company_candidate(value):
                return None

        if field == "country_of_origin":
            if not self._valid_country(value):
                return None

        return value.strip()

    def _product_name_score(
        self,
        value: Optional[str]
    ) -> int:

        if not value:
            return -100

        text = value.strip()
        normalized = self._norm(text)

        for phrase in self.PRODUCT_NAME_REJECT_PHRASES:
            if normalized.startswith(
                self._norm(phrase)
            ):
                return -100

            if self._norm(phrase) in normalized:
                return -80

        score = 50

        words = text.split()

        if len(words) <= 8:
            score += 10

        if len(text) <= 80:
            score += 10

        if re.search(
            r"\b(nutritional|nutrition|ingredients|method|contains|marketed|manufactured|packed|use by|best before)\b",
            normalized,
        ):
            score -= 60

        if re.search(
            r"\b(quality guaranteed|please recycle|scan to|store in)\b",
            normalized,
        ):
            score -= 60

        if re.search(
            r"\b(by|at|email|phone|toll free)\b",
            normalized,
        ):
            score -= 15

        return score

    def _merge_company(
        self,
        paddle_value: Optional[str],
        gemini_value: Optional[str],
    ) -> Optional[str]:

        p = self._company_score(
            paddle_value
        )

        g = self._company_score(
            gemini_value
        )

        if p <= 0 and g <= 0:
            return None

        if g > p:
            return gemini_value

        if p > g:
            return paddle_value

        if gemini_value:
            return gemini_value

        return paddle_value

    def _company_score(
        self,
        value: Optional[str]
    ) -> int:

        if not value:
            return -100

        text = value.strip()

        if self._looks_like_address(text):
            return -100

        if self._is_bad_company_candidate(text):
            return -100

        score = 50

        if re.search(
            r"\b(ltd|limited|pvt|private|llp|inc|corporation|corp|company|co\.)\b",
            text,
            re.I,
        ):
            score += 30

        if len(text.split()) <= 15:
            score += 10

        if any(
            marker in text.lower()
            for marker in (
                "survey no",
                "plot no",
                "road",
                "district",
                "village",
                "taluk",
                "mandal",
            )
        ):
            score -= 50

        return score

    def _merge_long_text(
        self,
        paddle_value: Optional[str],
        gemini_value: Optional[str],
    ) -> Optional[str]:

        if not paddle_value:
            return gemini_value

        if not gemini_value:
            return paddle_value

        p_norm = self._norm(paddle_value)
        g_norm = self._norm(gemini_value)

        if p_norm == g_norm:
            return self._prefer_complete(
                paddle_value,
                gemini_value
            )

        # Prefer the more complete source when one contains the other.
        if p_norm in g_norm:
            return gemini_value

        if g_norm in p_norm:
            return paddle_value

        # For visual association and structured labels, Gemini gets
        # preference when both sources provide substantial text.
        return gemini_value

    def _merge_contact(
        self,
        paddle_value: Optional[str],
        gemini_value: Optional[str],
    ) -> Optional[str]:

        if not paddle_value:
            return gemini_value

        if not gemini_value:
            return paddle_value

        # Prefer the value containing more actual contact signals.
        p_score = self._contact_score(
            paddle_value
        )

        g_score = self._contact_score(
            gemini_value
        )

        if g_score > p_score:
            return gemini_value

        if p_score > g_score:
            return paddle_value

        return self._prefer_complete(
            paddle_value,
            gemini_value
        )

    def _contact_score(
        self,
        value: str
    ) -> int:

        text = value.lower()
        score = 0

        if "@" in text:
            score += 30

        if re.search(
            r"\b\d{7,15}\b",
            re.sub(r"\D", " ", text),
        ):
            score += 25

        if "toll free" in text:
            score += 20

        if "helpline" in text:
            score += 20

        if "contact" in text:
            score += 10

        if "email" in text or "e-mail" in text:
            score += 10

        if "www." in text:
            score += 5

        return score

    def _merge_license(
        self,
        paddle_value: Optional[str],
        gemini_value: Optional[str],
    ) -> Optional[str]:

        values = []

        for value in (
            paddle_value,
            gemini_value,
        ):
            if not value:
                continue

            if self._looks_like_license(
                value
            ):
                values.append(value)

        if not values:
            return None

        # Prefer the value with the most license-number evidence.
        values.sort(
            key=lambda item: len(
                re.findall(
                    r"\d{8,20}",
                    item
                )
            ),
            reverse=True,
        )

        return values[0]

    def _merge_quantity(
        self,
        paddle_value: Optional[str],
        gemini_value: Optional[str],
    ) -> Optional[str]:

        if not paddle_value:
            return gemini_value

        if not gemini_value:
            return paddle_value

        # Preserve a complete visible declaration.
        return self._prefer_complete(
            paddle_value,
            gemini_value
        )

    @staticmethod
    def _merge_category(
        paddle_value: Any,
        gemini_value: Any,
    ) -> str:

        valid = {
            "packaged_food",
            "beverage",
            "cosmetic",
            "personal_care",
            "household_product",
            "pharmaceutical",
            "supplement",
            "electronic_product",
            "other",
            "unknown",
        }

        g = str(
            gemini_value
        ).strip() if gemini_value else ""

        p = str(
            paddle_value
        ).strip() if paddle_value else ""

        if g in valid and g != "unknown":
            return g

        if p in valid and p != "unknown":
            return p

        return "unknown"

    def _cross_field_cleanup(
        self,
        result: Dict[str, Any],
        paddle: Dict[str, Any],
        gemini: Dict[str, Any],
    ) -> Dict[str, Any]:

        # A product name must never be an obviously unrelated warning,
        # heading, or instruction.
        result["product_name"] = (
            self._validate_candidate(
                "product_name",
                result.get("product_name")
            )
        )

        # Batch must never be another field label/instruction.
        batch_candidate = self._validate_candidate(
            "batch_number",
            result.get("batch_number")
        )
        result["batch_number"] = self._extract_batch_value(batch_candidate)

        # Manufacturer/packer must be a company/person, not an address.
        result["manufacturer_or_packer"] = (
            self._validate_candidate(
                "manufacturer_or_packer",
                result.get("manufacturer_or_packer")
            )
        )

        # Marketed-by must be a company/person.
        result["marketed_by"] = (
            self._validate_candidate(
                "marketed_by",
                result.get("marketed_by")
            )
        )

        # Country of origin must have explicit evidence from Gemini
        # under the new prompt. Paddle-only values are not trusted.
        gemini_country = self._validate_candidate(
            "country_of_origin",
            gemini.get("country_of_origin")
        )

        if gemini_country:
            result["country_of_origin"] = gemini_country
        else:
            result["country_of_origin"] = None

        # If a date field accidentally contains another date-field label,
        # clear it.
        for field in (
            "packed_on",
            "date_of_manufacture",
            "best_before",
            "use_by",
            "expiry_date",
        ):
            result[field] = self._validate_candidate(
                field,
                result.get(field)
            )

        # If use_by is explicit and best_before contains the same value,
        # do not duplicate the same date across fields.
        use_by = result.get("use_by")
        best_before = result.get("best_before")

        if (
            use_by
            and best_before
            and self._norm(use_by)
            == self._norm(best_before)
        ):
            gemini_use_by = self._validate_candidate(
                "use_by",
                gemini.get("use_by")
            )

            if gemini_use_by:
                result["use_by"] = gemini_use_by
                result["best_before"] = None

        return result

    def _has_explicit_label(
        self,
        value: Optional[str],
        field: str
    ) -> bool:
        """Return True when a value visibly contains its field label."""
        if not value:
            return False

        normalized = self._norm(value)

        labels = self.STRONG_FIELD_LABELS.get(field, ())
        return any(
            self._norm(label) in normalized
            for label in labels
        )

    def _extract_batch_value(
        self,
        value: Optional[str]
    ) -> Optional[str]:
        """Extract only the value portion from a labelled batch string."""
        if not value:
            return None

        text = value.strip()

        labels = sorted(
            self.STRONG_FIELD_LABELS["batch_number"],
            key=len,
            reverse=True
        )

        for label in labels:
            pattern = re.compile(
                r"^\s*" + re.escape(label) +
                r"\s*(?:[:#=\-]\s*)?(.+?)\s*$",
                re.IGNORECASE
            )
            match = pattern.match(text)

            if match:
                candidate = match.group(1).strip()
                if self._valid_batch_value_only(candidate):
                    return candidate
                return None

        if self._valid_batch_value_only(text):
            return text

        return None

    def _valid_batch_value_only(
        self,
        value: Optional[str]
    ) -> bool:
        """Validate a batch value after its label has been removed."""
        if not value:
            return False

        text = value.strip()
        normalized = self._norm(text)

        if not normalized:
            return False

        if self._looks_like_instruction(text):
            return False

        if self._looks_like_address(text):
            return False

        if self._is_mrp_label_only(text):
            return False

        if re.search(
            r"\b(?:net\s+(?:weight|quantity)|quantity)\b",
            normalized,
            re.I
        ):
            return False

        if re.search(
            r"\b(?:packed\s+on|best\s+before|use\s+by|expiry|"
            r"mfd|mfg|date\s+of\s+manufacture|mrp)\b",
            normalized,
            re.I
        ):
            return False

        if self._valid_date_candidate(text):
            return False

        if "@" in text or "http" in normalized or "www." in normalized:
            return False

        if "₹" in text or "/-" in text:
            return False

        # A bare numeric batch can be valid when explicitly labelled, but
        # reject typical phone-number and barcode lengths.
        compact = re.sub(r"[\s:./-]", "", text)

        if len(compact) < 3 or len(compact) > 30:
            return False

        if re.fullmatch(r"\d+", compact):
            # Numeric batch codes are valid when they came through the
            # explicit Batch/Lot-labelled extraction path. Reject only
            # common PIN/mobile shapes.
            if len(compact) == 6:
                return False
            if len(compact) == 10 and compact[0] in "6789":
                return False
            return 4 <= len(compact) <= 15

        return bool(re.fullmatch(r"[A-Za-z0-9]+", compact))

    def _prefer_batch_candidate(
        self,
        first: str,
        second: str
    ) -> str:
        """Choose a conservative batch candidate when both are plausible."""
        first_clean = self._extract_batch_value(first)
        second_clean = self._extract_batch_value(second)

        if first_clean and not second_clean:
            return first_clean

        if second_clean and not first_clean:
            return second_clean

        if first_clean and second_clean:
            # If one candidate is purely numeric, prefer it when it has the
            # shape of a batch identifier. This prevents words such as
            # "Sugar" from replacing an explicitly labelled code.
            first_digits = re.sub(r"\D", "", first_clean)
            second_digits = re.sub(r"\D", "", second_clean)
            if first_clean.isdigit() and not second_clean.isdigit():
                return first_clean
            if second_clean.isdigit() and not first_clean.isdigit():
                return second_clean

            # Prefer a compact identifier over a long natural-language value.
            first_words = len(first_clean.split())
            second_words = len(second_clean.split())

            if first_words < second_words:
                return first_clean

            if second_words < first_words:
                return second_clean

            return (
                first_clean
                if len(first_clean) <= len(second_clean)
                else second_clean
            )

        return first

    def _valid_batch(
        self,
        value: Optional[str]
    ) -> bool:

        if not value:
            return False

        text = value.strip()
        normalized = self._norm(text)

        if len(text) < 2:
            return False

        if normalized in {
            self._norm(label)
            for label in self.FIELD_LABELS["batch_number"]
        }:
            return False

        if self._looks_like_instruction(text):
            return False

        if self._looks_like_address(text):
            return False

        # Batch identifiers are usually compact, mixed alphanumeric
        # strings. Pure natural-language sentences are rejected.
        words = text.split()

        if len(words) > 6:
            return False

        if re.search(
            r"\b(net\s+(?:weight|quantity)|quantity|packed\s+on|"
            r"best\s+before|use\s+by|mfd|mfg|mrp|expiry|"
            r"manufactured\s+by|packed\s+by|marketed\s+by)\b",
            normalized,
            re.I,
        ):
            return False

        if re.fullmatch(r"[\d\W_]+", text):
            # Structured field values have already come from the Batch/Lot
            # extraction path. Permit legitimate numeric identifiers here,
            # but reject common PIN/mobile-number forms.
            compact = re.sub(r"\D", "", text)
            if len(compact) == 6:
                return False
            if len(compact) == 10 and compact[0] in "6789":
                return False
            return 4 <= len(compact) <= 15

        return bool(re.search(r"[A-Za-z0-9]", text))

    def _valid_mrp(
        self,
        value: Optional[str]
    ) -> bool:

        if not value:
            return False

        if self._is_mrp_label_only(value):
            return False

        return bool(
            re.search(
                r"(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d+)?",
                value,
                re.I,
            )
            or re.search(
                r"\b\d+(?:\.\d+)?\s*/-",
                value,
            )
        )

    def _is_mrp_label_only(
        self,
        value: str
    ) -> bool:

        normalized = self._norm(value)

        return normalized in {
            "mrp",
            "m.r.p",
            "mrp rs",
            "mrp rs.",
            "mrp:",
            "maximum retail price",
            "inclusive of all taxes",
        }

    def _valid_date_candidate(
        self,
        value: Optional[str]
    ) -> bool:

        if not value:
            return False

        text = value.strip()
        normalized = self._norm(text)

        # A field label cannot be its own date.
        for field in (
            "packed_on",
            "date_of_manufacture",
            "best_before",
            "use_by",
            "expiry_date",
        ):
            for label in self.FIELD_LABELS[field]:
                if normalized == self._norm(label):
                    return False

        if self._looks_like_instruction(text):
            return False

        # Date-like evidence:
        # numeric dates, month names, year.
        has_date_pattern = bool(
            re.search(
                r"\b\d{1,4}[\s./-]\d{1,2}(?:[\s./-]\d{1,4})?\b",
                text,
            )
            or re.search(
                r"\b\d{1,2}\s+"
                r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)"
                r"\s+\d{2,4}\b",
                text,
                re.I,
            )
            or re.search(
                r"\b"
                r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)"
                r"\s+\d{1,2},?\s+\d{2,4}"
                r"\b",
                text,
                re.I,
            )
        )

        return has_date_pattern

    def _valid_country(
        self,
        value: Optional[str]
    ) -> bool:

        if not value:
            return False

        text = value.strip()

        # Gemini prompt is responsible for explicit association.
        # The fusion layer rejects obvious address-only fragments.
        if self._looks_like_address(text):
            return False

        return len(text.split()) <= 8

    def _looks_like_instruction(
        self,
        value: str
    ) -> bool:

        normalized = self._norm(value)

        if normalized in {
            self._norm(item)
            for item in self.GENERIC_REJECT_PHRASES
        }:
            return True

        if normalized.startswith(
            self.INSTRUCTION_STARTS
        ):
            return True

        if re.search(
            r"\b(see|refer)\s+(below|bottom|label)\b",
            normalized,
        ):
            return True

        if re.search(
            r"\bwhen stored\b",
            normalized,
        ):
            return True

        if re.search(
            r"\bstore in\b",
            normalized,
        ):
            return True

        return False

    def _looks_like_address(
        self,
        value: str
    ) -> bool:

        normalized = self._norm(value)

        marker_count = sum(
            1
            for marker in self.COMPANY_ADDRESS_MARKERS
            if self._norm(marker) in normalized
        )

        # A long value with multiple address markers is almost certainly
        # an address rather than a company name.
        if marker_count >= 2:
            return True

        if re.search(
            r"\b\d{6}\b",
            value,
        ) and len(value.split()) >= 5:
            return True

        return False

    def _is_bad_company_candidate(
        self,
        value: str
    ) -> bool:

        normalized = self._norm(value)

        bad_phrases = (
            "quality guaranteed",
            "consumer helpline",
            "consumer care",
            "customer care",
            "for feedback",
            "for complaint",
            "email",
            "toll free",
            "ingredients",
            "nutritional information",
            "net quantity",
            "mrp",
            "batch",
            "use by",
            "best before",
            "packed on",
            "see below",
            "see bottom",
        )

        return any(
            phrase in normalized
            for phrase in bad_phrases
        )

    def _looks_like_license(
        self,
        value: str
    ) -> bool:

        return bool(
            re.search(
                r"\d{8,20}",
                value
            )
        )

    @staticmethod
    def _values_similar(
        first: str,
        second: str
    ) -> bool:

        a = ExtractionFusion._norm(first)
        b = ExtractionFusion._norm(second)

        if a == b:
            return True

        return (
            a in b
            or b in a
        )

    @staticmethod
    def _prefer_complete(
        first: str,
        second: str
    ) -> str:

        if len(second) > len(first):
            return second

        return first

    @staticmethod
    def _norm(
        value: str
    ) -> str:

        text = value.lower().strip()

        text = re.sub(
            r"\s+",
            " ",
            text,
        )

        text = text.replace(
            "–",
            "-"
        ).replace(
            "—",
            "-"
        )

        text = re.sub(
            r"[ ]*:[ ]*$",
            "",
            text,
        )

        return text


extraction_fusion = ExtractionFusion()
