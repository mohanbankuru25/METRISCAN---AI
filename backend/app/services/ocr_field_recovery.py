import re
from typing import Any, Dict, List, Optional, Tuple


class OCRFieldRecovery:
    """
    Evidence-first recovery layer.

    Purpose:
        Recover structured product fields directly from PaddleOCR
        when the normal field extractor or Gemini fusion leaves a
        field empty.

    Important:
        - This layer only fills missing/invalid fields.
        - It never invents a value.
        - It uses OCR text plus spatial proximity to field labels.
        - Gemini/Paddle fusion remains the primary source.
        - Recovered values should be treated as OCR evidence.
    """

    DATE_RE = re.compile(
        r"\b(?:"
        r"\d{1,4}[./-]\d{1,2}[./-]\d{2,4}"
        r"|"
        r"\d{1,2}\s+"
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)"
        r"\s+\d{2,4}"
        r"|"
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)"
        r"\s+\d{1,2},?\s+\d{2,4}"
        r")\b",
        re.I,
    )

    MRP_RE = re.compile(
        r"(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d{1,2})?"
        r"|\b\d+(?:\.\d{1,2})?\s*/-",
        re.I,
    )

    LICENSE_RE = re.compile(r"\b\d{8,20}\b")

    EMAIL_RE = re.compile(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        re.I,
    )

    PHONE_RE = re.compile(
        r"(?<!\d)(?:\+91[\s-]?)?"
        r"(?:[6-9]\d{9}|\d{3,5}[\s-]\d{3,5}[\s-]\d{3,5})"
        r"(?!\d)"
    )

    ADDRESS_MARKERS = (
        "plot",
        "survey",
        "road",
        "street",
        "village",
        "taluk",
        "taluka",
        "district",
        "mandal",
        "p.o",
        "post",
        "pin",
        "india",
        "phase",
        "industrial",
        "nagar",
        "building",
        "lane",
        "layout",
        "estate",
        "patiala",
        "gurugram",
        "haryana",
        "punjab",
        "maharashtra",
        "karnataka",
        "kolkata",
        "bengaluru",
    )

    BAD_VALUE_WORDS = (
        "not detected",
        "unknown",
        "null",
        "none",
        "n/a",
        "mrp",
        "batch",
        "use by",
        "best before",
        "packed on",
        "mfd",
        "mfg",
        "expiry",
        "net quantity",
        "license no",
        "lic no",
        "manufactured by",
        "marketed by",
        "consumer contact",
        "consumer helpline",
        "customer care",
    )

    def recover(
        self,
        product_data: Optional[Dict[str, Any]],
        ocr_results: Optional[List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        result = dict(product_data or {})
        items = self._prepare_items(ocr_results or [])

        if not items:
            return result

        # Strong exact-label/value fields first.
        self._fill_mrp(result, items)
        self._fill_batch(result, items)
        self._fill_dates(result, items)
        self._fill_license(result, items)
        self._fill_contact(result, items)
        self._fill_manufacturer(result, items)
        self._fill_marketed_by(result, items)
        self._fill_address(result, items)
        self._fill_quantity(result, items)

        # Category is only recovered when OCR gives strong semantic evidence.
        self._fill_category(result, items)

        return result

    # ---------------------------------------------------------
    # Preparation
    # ---------------------------------------------------------

    def _prepare_items(
        self,
        ocr_results: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        prepared = []

        for index, item in enumerate(ocr_results):
            text = str(item.get("text") or "").strip()

            if not text:
                continue

            bbox = self._bbox(item.get("bbox"))

            prepared.append(
                {
                    "index": index,
                    "text": text,
                    "norm": self._norm(text),
                    "bbox": bbox,
                    "confidence": item.get("confidence"),
                }
            )

        return prepared

    @staticmethod
    def _bbox(value: Any) -> Optional[Tuple[float, float, float, float]]:
        if value is None:
            return None

        try:
            values = list(value)

            if len(values) >= 4:
                x1, y1, x2, y2 = values[:4]
                return (
                    float(x1),
                    float(y1),
                    float(x2),
                    float(y2),
                )
        except Exception:
            return None

        return None

    @staticmethod
    def _norm(value: str) -> str:
        text = value.lower().strip()
        text = text.replace("–", "-").replace("—", "-")
        text = re.sub(r"\s+", " ", text)
        return text

    def _has_value(self, value: Any) -> bool:
        if value is None:
            return False

        text = str(value).strip().lower()

        if not text:
            return False

        if text in {
            "not detected",
            "unknown",
            "null",
            "none",
            "n/a",
            "na",
        }:
            return False

        # Treat field labels accidentally stored as values as missing.
        if text in self.BAD_VALUE_WORDS:
            return False

        return True

    def _is_bad_value(self, value: str) -> bool:
        normalized = self._norm(value)

        if not normalized:
            return True

        return normalized in self.BAD_VALUE_WORDS

    # ---------------------------------------------------------
    # Geometry
    # ---------------------------------------------------------

    @staticmethod
    def _center(
        bbox: Optional[Tuple[float, float, float, float]]
    ) -> Optional[Tuple[float, float]]:
        if not bbox:
            return None

        x1, y1, x2, y2 = bbox
        return (
            (x1 + x2) / 2,
            (y1 + y2) / 2,
        )

    def _nearby_items(
        self,
        label_item: Dict[str, Any],
        items: List[Dict[str, Any]],
        max_vertical: float = 180,
        max_horizontal: float = 500,
    ) -> List[Dict[str, Any]]:
        label_center = self._center(label_item.get("bbox"))

        if label_center is None:
            return []

        lx, ly = label_center
        candidates = []

        for item in items:
            if item is label_item:
                continue

            center = self._center(item.get("bbox"))

            if center is None:
                continue

            x, y = center
            dx = abs(x - lx)
            dy = y - ly

            # Same line / right side.
            if dy <= 45 and 0 < x - lx <= max_horizontal:
                candidates.append((1, dx + dy, item))
                continue

            # Directly below the label.
            if 0 < dy <= max_vertical and dx <= 260:
                candidates.append((2, dy + dx, item))
                continue

            # Slightly above/right can happen with rotated or fragmented labels.
            if abs(dy) <= 100 and dx <= 300:
                candidates.append((3, dx + abs(dy), item))

        candidates.sort(key=lambda value: (value[0], value[1]))

        return [item for _, _, item in candidates]

    def _find_labels(
        self,
        items: List[Dict[str, Any]],
        labels: Tuple[str, ...],
    ) -> List[Dict[str, Any]]:
        normalized_labels = tuple(self._norm(label) for label in labels)
        found = []

        for item in items:
            text = item["norm"]

            if any(label in text for label in normalized_labels):
                found.append(item)

        return found

    # ---------------------------------------------------------
    # Generic candidate helpers
    # ---------------------------------------------------------

    def _extract_after_label(
        self,
        text: str,
        labels: Tuple[str, ...],
    ) -> Optional[str]:
        escaped = sorted(
            [re.escape(label) for label in labels],
            key=len,
            reverse=True,
        )

        pattern = (
            r"(?:"
            + "|".join(escaped)
            + r")"
            r"\s*(?:[:#=-]|is)?\s*(.+)$"
        )

        match = re.search(
            pattern,
            text,
            re.I,
        )

        if not match:
            return None

        value = match.group(1).strip(" :#=-")

        if self._is_bad_value(value):
            return None

        return value or None

    def _best_nearby_text(
        self,
        label_item: Dict[str, Any],
        items: List[Dict[str, Any]],
        validator,
    ) -> Optional[str]:
        nearby = self._nearby_items(
            label_item,
            items,
        )

        for item in nearby:
            value = item["text"].strip()

            if validator(value):
                return value

        return None

    # ---------------------------------------------------------
    # MRP
    # ---------------------------------------------------------

    def _fill_mrp(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        if self._has_value(result.get("mrp")):
            return

        # First: direct OCR line containing both label and price.
        for item in items:
            if "mrp" not in item["norm"] and "maximum retail price" not in item["norm"]:
                continue

            match = self.MRP_RE.search(item["text"])

            if match:
                result["mrp"] = match.group(0).strip()
                return

            value = self._extract_after_label(
                item["text"],
                (
                    "mrp",
                    "m.r.p",
                    "mrp rs",
                    "maximum retail price",
                ),
            )

            if value and self.MRP_RE.search(value):
                result["mrp"] = self.MRP_RE.search(value).group(0)
                return

        # Second: use spatially associated value.
        labels = self._find_labels(
            items,
            (
                "mrp",
                "m.r.p",
                "maximum retail price",
            ),
        )

        for label_item in labels:
            value = self._best_nearby_text(
                label_item,
                items,
                lambda text: bool(self.MRP_RE.search(text)),
            )

            if value:
                match = self.MRP_RE.search(value)

                if match:
                    result["mrp"] = match.group(0).strip()
                    return

    # ---------------------------------------------------------
    # Batch
    # ---------------------------------------------------------

    def _fill_batch(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        if self._has_value(result.get("batch_number")):
            return

        labels = self._find_labels(
            items,
            (
                "batch",
                "batch no",
                "batch number",
                "b.no",
                "lot no",
                "lot number",
            ),
        )

        for label_item in labels:
            # Same OCR block.
            same_line = self._extract_after_label(
                label_item["text"],
                (
                    "batch",
                    "batch no",
                    "batch number",
                    "b.no",
                    "lot",
                    "lot no",
                    "lot number",
                ),
            )

            if same_line and self._valid_batch(same_line):
                result["batch_number"] = same_line
                return

            # Nearby OCR block.
            value = self._best_nearby_text(
                label_item,
                items,
                self._valid_batch,
            )

            if value:
                result["batch_number"] = value
                return

    # ---------------------------------------------------------
    # Dates
    # ---------------------------------------------------------

    def _fill_dates(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        mappings = {
            "date_of_manufacture": (
                "mfd",
                "mfg",
                "mfd date",
                "mfg date",
                "manufactured",
                "date of manufacture",
            ),
            "packed_on": (
                "packed on",
                "packed",
                "pkd",
                "pkd on",
            ),
            "use_by": (
                "use by",
                "use before",
            ),
            "best_before": (
                "best before",
                "best before date",
                "bbe",
            ),
            "expiry_date": (
                "expiry",
                "expiry date",
                "exp date",
                "expires",
            ),
        }

        for field, labels in mappings.items():
            if self._has_value(result.get(field)):
                continue

            label_items = self._find_labels(
                items,
                labels,
            )

            for label_item in label_items:
                match = self.DATE_RE.search(
                    label_item["text"]
                )

                if match:
                    result[field] = match.group(0).strip()
                    break

                value = self._best_nearby_text(
                    label_item,
                    items,
                    lambda text: bool(self.DATE_RE.search(text)),
                )

                if value:
                    match = self.DATE_RE.search(value)

                    if match:
                        result[field] = match.group(0).strip()
                        break

    # ---------------------------------------------------------
    # License
    # ---------------------------------------------------------

    def _fill_license(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        if self._has_value(result.get("license_number")):
            return

        labels = self._find_labels(
            items,
            (
                "lic no",
                "lic. no",
                "license no",
                "license number",
                "fssai",
            ),
        )

        values = []

        for label_item in labels:
            match = self.LICENSE_RE.search(
                label_item["text"]
            )

            if match:
                values.append(match.group(0))
                continue

            nearby = self._nearby_items(
                label_item,
                items,
                max_vertical=150,
                max_horizontal=350,
            )

            for item in nearby:
                match = self.LICENSE_RE.search(
                    item["text"]
                )

                if match:
                    values.append(match.group(0))
                    break

        if values:
            # Preserve the longest/most complete labelled license.
            result["license_number"] = max(
                values,
                key=len,
            )

    # ---------------------------------------------------------
    # Consumer contact
    # ---------------------------------------------------------

    def _fill_contact(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        if self._has_value(result.get("consumer_contact")):
            return

        contact_lines = []

        # Collect explicit consumer/contact sections.
        labels = self._find_labels(
            items,
            (
                "consumer",
                "customer care",
                "consumer care",
                "consumer helpline",
                "consumer relations",
                "for feedback",
                "complaint",
                "toll free",
                "contact us",
            ),
        )

        for label_item in labels:
            contact_lines.append(label_item["text"])

            for nearby in self._nearby_items(
                label_item,
                items,
                max_vertical=260,
                max_horizontal=500,
            ):
                text = nearby["text"]

                if (
                    self.EMAIL_RE.search(text)
                    or self.PHONE_RE.search(text)
                    or "toll free" in text.lower()
                    or "email" in text.lower()
                ):
                    contact_lines.append(text)

        # Also accept clearly visible email/phone only when they are
        # present in OCR. This is still evidence from the package image.
        for item in items:
            text = item["text"]

            if self.EMAIL_RE.search(text):
                contact_lines.append(text)

            elif self.PHONE_RE.search(text):
                if any(
                    marker in text.lower()
                    for marker in (
                        "toll",
                        "phone",
                        "contact",
                        "helpline",
                        "consumer",
                        "care",
                    )
                ):
                    contact_lines.append(text)

        if contact_lines:
            cleaned = []
            seen = set()

            for line in contact_lines:
                key = self._norm(line)

                if key and key not in seen:
                    cleaned.append(line.strip())
                    seen.add(key)

            if cleaned:
                result["consumer_contact"] = " | ".join(
                    cleaned
                )

    # ---------------------------------------------------------
    # Manufacturer
    # ---------------------------------------------------------

    def _fill_manufacturer(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        if self._has_value(result.get("manufacturer_or_packer")):
            return

        labels = self._find_labels(
            items,
            (
                "manufactured by",
                "manufactured & marketed by",
                "manufactured and marketed by",
                "manufactured for",
                "manufacturer",
                "packed by",
                "packer",
                "mfd by",
            ),
        )

        for label_item in labels:
            value = self._extract_after_label(
                label_item["text"],
                (
                    "manufactured by",
                    "manufactured & marketed by",
                    "manufactured and marketed by",
                    "manufactured for",
                    "manufacturer",
                    "packed by",
                    "packer",
                    "mfd by",
                ),
            )

            if value and self._valid_company(value):
                result["manufacturer_or_packer"] = self._clean_company(
                    value
                )
                return

            nearby = self._nearby_items(
                label_item,
                items,
                max_vertical=170,
                max_horizontal=600,
            )

            for item in nearby:
                value = item["text"].strip()

                if self._valid_company(value):
                    result["manufacturer_or_packer"] = self._clean_company(
                        value
                    )
                    return

    # ---------------------------------------------------------
    # Marketed by
    # ---------------------------------------------------------

    def _fill_marketed_by(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        if self._has_value(result.get("marketed_by")):
            return

        labels = self._find_labels(
            items,
            (
                "marketed by",
                "marketed & distributed by",
                "marketed and distributed by",
                "distributed by",
            ),
        )

        for label_item in labels:
            value = self._extract_after_label(
                label_item["text"],
                (
                    "marketed by",
                    "marketed & distributed by",
                    "marketed and distributed by",
                    "distributed by",
                ),
            )

            if value and self._valid_company(value):
                result["marketed_by"] = self._clean_company(
                    value
                )
                return

            for item in self._nearby_items(
                label_item,
                items,
                max_vertical=170,
                max_horizontal=600,
            ):
                value = item["text"].strip()

                if self._valid_company(value):
                    result["marketed_by"] = self._clean_company(
                        value
                    )
                    return

    # ---------------------------------------------------------
    # Address
    # ---------------------------------------------------------

    def _fill_address(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        if self._has_value(result.get("address")):
            return

        address_lines = []

        labels = self._find_labels(
            items,
            (
                "address",
                "registered office",
                "manufactured by",
                "manufactured for",
                "packed by",
            ),
        )

        for label_item in labels:
            nearby = self._nearby_items(
                label_item,
                items,
                max_vertical=300,
                max_horizontal=650,
            )

            for item in nearby:
                text = item["text"].strip()

                if self._looks_like_address_line(text):
                    address_lines.append(text)

        # Also collect standalone OCR lines that strongly look like
        # address fragments. Indian PIN codes may be OCR'd as "147 004",
        # so support both 6-digit and 3+3 forms.
        for item in items:
            text = item["text"].strip()

            normalized = self._norm(text)

            if (
                re.search(r"\b\d{6}\b", text)
                or re.search(r"\b\d{3}\s+\d{3}\b", text)
                or sum(
                    1
                    for marker in self.ADDRESS_MARKERS
                    if marker in normalized
                ) >= 2
            ):
                address_lines.append(text)

        if address_lines:
            cleaned = []
            seen = set()

            for line in address_lines:
                key = self._norm(line)

                if key in seen:
                    continue

                if self._valid_address_line(line):
                    cleaned.append(line)
                    seen.add(key)

            if cleaned:
                result["address"] = " ".join(cleaned)

    # ---------------------------------------------------------
    # Net quantity
    # ---------------------------------------------------------

    def _fill_quantity(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        if self._has_value(result.get("net_quantity")):
            return

        labels = self._find_labels(
            items,
            (
                "net quantity",
                "net qty",
                "net weight",
                "n.qty",
                "quantity",
            ),
        )

        unit_pattern = re.compile(
            r"\b\d+(?:\.\d+)?\s*"
            r"(?:kg|g|gm|gram|grams|mg|l|litre|liter|litres|liters|ml)\b",
            re.I,
        )

        for label_item in labels:
            match = unit_pattern.search(
                label_item["text"]
            )

            if match:
                result["net_quantity"] = match.group(0).strip()
                return

            value = self._best_nearby_text(
                label_item,
                items,
                lambda text: bool(unit_pattern.search(text)),
            )

            if value:
                match = unit_pattern.search(value)

                if match:
                    result["net_quantity"] = match.group(0).strip()
                    return

    # ---------------------------------------------------------
    # Category
    # ---------------------------------------------------------

    def _fill_category(
        self,
        result: Dict[str, Any],
        items: List[Dict[str, Any]],
    ) -> None:
        current = result.get("product_category")

        if current and str(current).strip().lower() != "unknown":
            return

        text = " ".join(
            item["text"].lower()
            for item in items
        )

        if any(
            word in text
            for word in (
                "carbonated water",
                "soft drink",
                "beverage",
                "cola",
                "juice",
                "drink",
            )
        ):
            result["product_category"] = "beverage"
            return

        if any(
            word in text
            for word in (
                "ingredients",
                "nutrition",
                "calories",
                "protein",
                "carbohydrate",
                "food",
            )
        ):
            result["product_category"] = "packaged_food"

    # ---------------------------------------------------------
    # Validators
    # ---------------------------------------------------------

    def _valid_batch(self, value: str) -> bool:
        text = value.strip()

        if not text or self._is_bad_value(text):
            return False

        if len(text.split()) > 5:
            return False

        if re.search(
            r"\b(use by|packed on|mfd|mfg|mrp|net quantity|best before|expiry)\b",
            text,
            re.I,
        ):
            return False

        if re.fullmatch(r"[\d\W_]+", text):
            return False

        # Avoid accepting phone numbers as batch values.
        digits = re.sub(r"\D", "", text)

        if re.fullmatch(r"\d{7,15}", digits):
            return False

        return bool(re.search(r"[A-Za-z0-9]", text))

    def _valid_company(self, value: str) -> bool:
        text = value.strip()

        if not text or self._is_bad_value(text):
            return False

        if len(text.split()) > 20:
            return False

        if self._looks_like_address(text):
            return False

        if self.EMAIL_RE.search(text):
            return False

        if self.PHONE_RE.search(text) and len(text.split()) <= 5:
            return False

        return bool(
            re.search(
                r"[A-Za-z]{2,}",
                text,
            )
        )

    @staticmethod
    def _clean_company(value: str) -> str:
        text = value.strip()

        text = re.sub(
            r"^(?:[:\-–—]\s*)",
            "",
            text,
        )

        return text.strip()

    def _looks_like_address(self, value: str) -> bool:
        normalized = self._norm(value)

        marker_count = sum(
            1
            for marker in self.ADDRESS_MARKERS
            if marker in normalized
        )

        return (
            marker_count >= 2
            or bool(re.search(r"\b\d{6}\b", value))
        )

    def _looks_like_address_line(self, value: str) -> bool:
        if not value.strip():
            return False

        normalized = self._norm(value)

        return (
            bool(re.search(r"\b\d{6}\b", value))
            or any(
                marker in normalized
                for marker in self.ADDRESS_MARKERS
            )
        )

    def _valid_address_line(self, value: str) -> bool:
        normalized = self._norm(value)

        if not normalized:
            return False

        if normalized in {
            "manufacturer",
            "manufactured by",
            "marketed by",
            "consumer contact",
            "address",
        }:
            return False

        return len(value.strip()) >= 4


ocr_field_recovery = OCRFieldRecovery()
