import re
from typing import Any, Dict, List, Optional, Tuple


class FieldExtractor:

    # =========================================================
    # TEXT HELPERS
    # =========================================================

    @staticmethod
    def normalize(text: str) -> str:
        if not text:
            return ""

        text = str(text)
        text = text.replace("₹", " INR ")
        text = text.replace("–", "-")
        text = text.replace("—", "-")
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    @staticmethod
    def clean_value(text: str) -> str:
        if not text:
            return ""

        text = str(text).strip()
        text = re.sub(r"^[\s:;,|\-]+", "", text)
        text = re.sub(r"[\s:;,|\-]+$", "", text)

        return text.strip()

    @staticmethod
    def get_bbox(item: Dict[str, Any]) -> Optional[List[float]]:
        bbox = item.get("bbox")

        if bbox is None:
            return None

        try:
            if hasattr(bbox, "tolist"):
                bbox = bbox.tolist()

            if len(bbox) >= 4:
                return [
                    float(bbox[0]),
                    float(bbox[1]),
                    float(bbox[2]),
                    float(bbox[3])
                ]
        except Exception:
            pass

        return None

    @staticmethod
    def bbox_info(item: Dict[str, Any]) -> Dict[str, float]:
        bbox = FieldExtractor.get_bbox(item)

        if not bbox:
            return {
                "x1": 0,
                "y1": 0,
                "x2": 0,
                "y2": 0,
                "width": 0,
                "height": 0,
                "area": 0,
                "cx": 0,
                "cy": 0
            }

        x1, y1, x2, y2 = bbox

        return {
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
            "width": max(0, x2 - x1),
            "height": max(0, y2 - y1),
            "area": max(0, x2 - x1) * max(0, y2 - y1),
            "cx": (x1 + x2) / 2,
            "cy": (y1 + y2) / 2
        }

    @staticmethod
    def get_confidence(item: Dict[str, Any]) -> float:
        try:
            return float(item.get("confidence") or 0)
        except Exception:
            return 0.0

    # =========================================================
    # PREPARE OCR DATA
    # =========================================================

    def prepare_items(
        self,
        texts: List[str],
        ocr_details: Optional[List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:

        items = []

        if ocr_details:

            for index, item in enumerate(ocr_details):

                text = str(
                    item.get("text", "")
                ).strip()

                if not text:
                    continue

                info = self.bbox_info(item)

                items.append({
                    "index": index,
                    "text": text,
                    "norm": self.normalize(text).lower(),
                    "confidence": self.get_confidence(item),
                    "bbox": item.get("bbox"),
                    **info
                })

        else:

            for index, text in enumerate(texts or []):

                if not text:
                    continue

                items.append({
                    "index": index,
                    "text": str(text).strip(),
                    "norm": self.normalize(text).lower(),
                    "confidence": 0.0,
                    "bbox": None,
                    "x1": 0,
                    "y1": 0,
                    "x2": 0,
                    "y2": 0,
                    "width": 0,
                    "height": 0,
                    "area": 0,
                    "cx": 0,
                    "cy": 0
                })

        return items

    # =========================================================
    # FIELD LABELS
    # =========================================================

    LABELS = {

        "net_quantity": [
            "net quantity",
            "net qty",
            "net weight",
            "n.qty",
            "quantity"
        ],

        "mrp": [
            "maximum retail price",
            "max retail price",
            "mrp"
        ],

        "batch_number": [
            "batch number",
            "batch no.",
            "batch no",
            "b.no.",
            "b.no",
            "lot number",
            "lot no",
            "batch"
        ],

        "packed_on": [
            "packed on",
            "packed-on",
            "pkd on",
            "packed date",
            "date packed"
        ],

        "date_of_manufacture": [
            "date of manufacture",
            "manufactured on",
            "manufacturing date",
            "mfd.",
            "mfd",
            "mfg.",
            "mfg"
        ],

        "best_before": [
            "best before",
            "best-before",
            "use by",
            "use-by",
            "expiry date",
            "expiry",
            "expires"
        ],

        "manufacturer_or_packer": [
            "manufactured and packed by",
            "manufactured & packed by",
            "manufactured by",
            "packed by",
            "packer",
            "manufacturer"
        ],

        "marketed_by": [
            "marketed and distributed by",
            "marketed & distributed by",
            "marketed by"
        ],

        "license_number": [
            "fssai license number",
            "fssai license no",
            "fssai lic no",
            "license number",
            "license no",
            "lic no."
        ]
    }

    # =========================================================
    # FIND LABELS
    # =========================================================

    def find_labels(
        self,
        items: List[Dict[str, Any]],
        field: str
    ) -> List[int]:

        labels = self.LABELS.get(field, [])

        labels = sorted(
            labels,
            key=len,
            reverse=True
        )

        matches = []

        for i, item in enumerate(items):

            text = item["norm"]

            for label in labels:

                if label in text:
                    matches.append(i)
                    break

        return matches

    # =========================================================
    # DATE
    # =========================================================

    @staticmethod
    def extract_date(text: str) -> Optional[str]:

        if not text:
            return None

        patterns = [

            r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",

            r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}\b",

            r"\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}\b"
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                text,
                re.IGNORECASE
            )

            if match:
                return match.group(0).strip()

        return None

    @staticmethod
    def is_date(text: str) -> bool:
        return FieldExtractor.extract_date(text) is not None

    # =========================================================
    # QUANTITY
    # =========================================================

    @staticmethod
    def extract_quantity(text: str) -> Optional[str]:

        pattern = (
            r"\b\d+(?:\.\d+)?\s*"
            r"(?:kg|kgs|g|gm|gms|gram|grams|mg|ml|l|ltr|"
            r"litre|litres)\b"
        )

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            return match.group(0).strip()

        return None

    # =========================================================
    # MRP
    # =========================================================

    @staticmethod
    def extract_mrp(text: str) -> Optional[str]:

        patterns = [

            r"₹\s*\d+(?:\.\d+)?",

            r"\b(?:rs|inr)\.?\s*\d+(?:\.\d+)?",

            r"\b\d+(?:\.\d+)?\s*/-"
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                text,
                re.IGNORECASE
            )

            if match:

                value = match.group(0).strip()

                if "/-" in value:

                    number = re.search(
                        r"\d+(?:\.\d+)?",
                        value
                    )

                    if number:
                        return "₹" + number.group(0)

                return value

        return None

    @staticmethod
    def is_mrp(text: str) -> bool:
        return FieldExtractor.extract_mrp(text) is not None

    # =========================================================
    # BATCH VALIDATION
    # =========================================================

    FIELD_WORDS = {
        "batch",
        "batch no",
        "batch no.",
        "batch number",
        "packed on",
        "packed by",
        "mfd",
        "mfd.",
        "mfg",
        "mfg.",
        "use by",
        "best before",
        "mrp",
        "net weight",
        "net quantity",
        "marketed by",
        "license",
        "lic no",
        "lic no."
    }

    @classmethod
    def is_batch(
        cls,
        text: str
    ) -> bool:

        if not text:
            return False

        value = text.strip()
        lower = value.lower()

        for field_word in cls.FIELD_WORDS:

            if lower == field_word:
                return False

            if lower.startswith(
                field_word + ":"
            ):
                return False

        if "http" in lower:
            return False

        if "www." in lower:
            return False

        if "@" in value:
            return False

        if "₹" in value:
            return False

        if "/-" in value:
            return False

        if cls.is_date(value):
            return False

        if re.fullmatch(
            r"\d{1,2}:\d{2}(?:-\d{1,2})?",
            value
        ):
            return False

        compact = re.sub(
            r"[\s:./-]",
            "",
            value
        )

        if len(compact) < 3:
            return False

        if len(compact) > 30:
            return False

        # Reject barcode-like values.
        if re.fullmatch(
            r"\d{10,14}",
            compact
        ):
            return False

        return bool(
            re.fullmatch(
                r"[A-Za-z0-9]+",
                compact
            )
        )

    # =========================================================
    # MANUFACTURER VALIDATION
    # =========================================================

    @classmethod
    def is_manufacturer(
        cls,
        text: str
    ) -> bool:

        if not text:
            return False

        value = text.strip()
        lower = value.lower()

        invalid = [
            "packed by",
            "manufactured by",
            "marketed by",
            "mrp",
            "net weight",
            "net quantity",
            "batch",
            "packed on",
            "best before",
            "use by"
        ]

        if lower in invalid:
            return False

        if cls.is_mrp(value):
            return False

        if cls.is_date(value):
            return False

        if cls.extract_quantity(value):
            return False

        if re.fullmatch(
            r"[\d\s./-]+",
            value
        ):
            return False

        if "@" in value:
            return False

        return len(value) >= 2

    # =========================================================
    # SAME LINE
    # =========================================================

    def same_line_value(
        self,
        item: Dict[str, Any],
        field: str
    ) -> Optional[str]:

        text = item["text"]

        if field == "net_quantity":

            return self.extract_quantity(text)

        if field == "mrp":

            return self.extract_mrp(text)

        if field in {
            "packed_on",
            "date_of_manufacture",
            "best_before"
        }:

            return self.extract_date(text)

        if field == "batch_number":

            labels = self.LABELS[field]

            for label in labels:

                pattern = re.compile(
                    re.escape(label)
                    + r"\s*[:\-]?\s*(.+)$",
                    re.IGNORECASE
                )

                match = pattern.search(text)

                if match:

                    value = self.clean_value(
                        match.group(1)
                    )

                    if self.is_batch(value):
                        return value

        if field == "license_number":

            match = re.search(
                r"\b\d{14}\b",
                text
            )

            if match:
                return match.group(0)

        return None

    # =========================================================
    # NEXT OCR VALUE
    # =========================================================

    def next_valid_value(
        self,
        items: List[Dict[str, Any]],
        label_index: int,
        field: str,
        lookahead: int = 6
    ) -> Optional[str]:

        end = min(
            len(items),
            label_index + lookahead + 1
        )

        for j in range(
            label_index + 1,
            end
        ):

            text = items[j]["text"].strip()

            if not text:
                continue

            if field == "net_quantity":

                value = self.extract_quantity(text)

                if value:
                    return value

            elif field == "mrp":

                value = self.extract_mrp(text)

                if value:
                    return value

            elif field in {
                "packed_on",
                "date_of_manufacture",
                "best_before"
            }:

                value = self.extract_date(text)

                if value:
                    return value

            elif field == "batch_number":

                if self.is_batch(text):
                    return self.clean_value(text)

            elif field == "license_number":

                if self.is_license(text):

                    match = re.search(
                        r"\b\d{14}\b",
                        text
                    )

                    if match:
                        return match.group(0)

        return None

    # =========================================================
    # LICENSE
    # =========================================================

    @staticmethod
    def is_license(
        text: str
    ) -> bool:

        if not text:
            return False

        if re.search(
            r"applied\s+for",
            text,
            re.IGNORECASE
        ):
            return False

        return bool(
            re.search(
                r"\b\d{14}\b",
                text
            )
        )

    # =========================================================
    # SPATIAL CANDIDATES
    # =========================================================

    def spatial_candidates(
        self,
        items: List[Dict[str, Any]],
        label_index: int
    ) -> List[Tuple[float, Dict[str, Any]]]:

        label = items[label_index]

        candidates = []

        for i, item in enumerate(items):

            if i == label_index:
                continue

            if item["bbox"] is None:
                continue

            dx = item["cx"] - label["cx"]
            dy = item["cy"] - label["cy"]

            # Right side
            if (
                dx >= -100
                and abs(dy)
                <= max(
                    label["height"] * 2.5,
                    120
                )
            ):

                distance = (
                    abs(dx)
                    + abs(dy) * 1.5
                )

                candidates.append(
                    (distance, item)
                )

            # Below
            elif (
                abs(dx) <= 800
                and dy > 0
                and dy < 500
            ):

                distance = (
                    abs(dy) * 1.5
                    + abs(dx) * 0.3
                )

                candidates.append(
                    (distance, item)
                )

        candidates.sort(
            key=lambda x: x[0]
        )

        return candidates

    # =========================================================
    # SPATIAL VALUE
    # =========================================================

    def spatial_value(
        self,
        items: List[Dict[str, Any]],
        label_index: int,
        field: str
    ) -> Optional[str]:

        candidates = self.spatial_candidates(
            items,
            label_index
        )

        for _, item in candidates:

            text = item["text"].strip()

            if field == "net_quantity":

                value = self.extract_quantity(text)

                if value:
                    return value

            elif field == "mrp":

                value = self.extract_mrp(text)

                if value:
                    return value

            elif field in {
                "packed_on",
                "date_of_manufacture",
                "best_before"
            }:

                value = self.extract_date(text)

                if value:
                    return value

            elif field == "batch_number":

                if self.is_batch(text):
                    return self.clean_value(text)

            elif field == "manufacturer_or_packer":

                if self.is_manufacturer(text):
                    return self.clean_value(text)

            elif field == "license_number":

                if self.is_license(text):

                    match = re.search(
                        r"\b\d{14}\b",
                        text
                    )

                    if match:
                        return match.group(0)

        return None

    # =========================================================
    # GENERIC LABELED FIELD
    # =========================================================

    def extract_labeled_field(
        self,
        items: List[Dict[str, Any]],
        field: str
    ) -> Optional[str]:

        label_indices = self.find_labels(
            items,
            field
        )

        if not label_indices:
            return None

        for index in label_indices:

            # 1. Same line
            value = self.same_line_value(
                items[index],
                field
            )

            if value:
                return value

            # 2. OCR order
            value = self.next_valid_value(
                items,
                index,
                field
            )

            if value:
                return value

            # 3. Spatial
            value = self.spatial_value(
                items,
                index,
                field
            )

            if value:
                return value

        return None

    # =========================================================
    # MANUFACTURER / PACKER
    # =========================================================

    def extract_manufacturer(
        self,
        items: List[Dict[str, Any]]
    ) -> Optional[str]:

        indices = self.find_labels(
            items,
            "manufacturer_or_packer"
        )

        if not indices:
            return None

        for index in indices:

            candidates = self.spatial_candidates(
                items,
                index
            )

            for _, item in candidates:

                text = item["text"].strip()

                if self.is_manufacturer(text):
                    return text

            for j in range(
                index + 1,
                min(
                    index + 7,
                    len(items)
                )
            ):

                text = items[j]["text"].strip()

                if self.is_manufacturer(text):
                    return text

        return None

    # =========================================================
    # MARKETED BY
    # =========================================================

    def extract_marketed_by(
        self,
        items: List[Dict[str, Any]]
    ) -> Optional[str]:

        indices = self.find_labels(
            items,
            "marketed_by"
        )

        if not indices:
            return None

        for index in indices:

            label = items[index]

            # ---------------------------------------------
            # RIGHT SIDE
            # ---------------------------------------------

            right_candidates = []

            for item in items:

                if item["bbox"] is None:
                    continue

                if item["cx"] <= label["cx"]:
                    continue

                vertical_distance = abs(
                    item["cy"] - label["cy"]
                )

                horizontal_distance = (
                    item["cx"] - label["cx"]
                )

                if vertical_distance <= max(
                    label["height"] * 2.5,
                    120
                ):

                    distance = (
                        horizontal_distance
                        + vertical_distance * 1.5
                    )

                    right_candidates.append(
                        (distance, item)
                    )

            right_candidates.sort(
                key=lambda x: x[0]
            )

            for _, item in right_candidates:

                text = item["text"].strip()

                if self.is_manufacturer(text):
                    return text

            # ---------------------------------------------
            # BELOW
            # ---------------------------------------------

            below_candidates = []

            for item in items:

                if item["bbox"] is None:
                    continue

                if item["cy"] <= label["cy"]:
                    continue

                vertical_distance = (
                    item["cy"] - label["cy"]
                )

                horizontal_distance = abs(
                    item["cx"] - label["cx"]
                )

                if vertical_distance <= 250:

                    distance = (
                        vertical_distance
                        + horizontal_distance * 0.3
                    )

                    below_candidates.append(
                        (distance, item)
                    )

            below_candidates.sort(
                key=lambda x: x[0]
            )

            for _, item in below_candidates:

                text = item["text"].strip()

                if self.is_manufacturer(text):
                    return text

            # ---------------------------------------------
            # OCR ORDER
            # ---------------------------------------------

            for j in range(
                index + 1,
                min(
                    index + 5,
                    len(items)
                )
            ):

                text = items[j]["text"].strip()

                if self.is_manufacturer(text):
                    return text

        return None

    # =========================================================
    # ADDRESS
    # =========================================================

    @staticmethod
    def looks_like_address(
        text: str
    ) -> bool:

        lower = text.lower()

        address_keywords = [
            "road",
            "rd",
            "street",
            "st.",
            "marg",
            "nagar",
            "building",
            "bldg",
            "villa",
            "pada",
            "lane",
            "near",
            "district",
            "state",
            "india",
            "city",
            "east",
            "west",
            "north",
            "south",
            "taluka",
            "village",
            "plot",
            "sector",
            "industrial",
            "estate"
        ]

        # PIN code
        if re.search(
            r"\b\d{6}\b",
            text
        ):
            return True

        # Strong address terms
        if any(
            word in lower
            for word in address_keywords
        ):
            return True

        # House/building number
        if (
            "/" in text
            and re.search(
                r"\d",
                text
            )
        ):
            return True

        return False

    def extract_address(
        self,
        items: List[Dict[str, Any]]
    ) -> Optional[str]:

        manufacturer_indices = self.find_labels(
            items,
            "manufacturer_or_packer"
        )

        # IMPORTANT:
        # If there is no explicit manufacturer/packer,
        # don't guess an address.
        if not manufacturer_indices:
            return None

        label_index = manufacturer_indices[0]

        # ---------------------------------------------
        # Find manufacturer value
        # ---------------------------------------------

        manufacturer_item = None

        candidates = self.spatial_candidates(
            items,
            label_index
        )

        for _, item in candidates:

            if self.is_manufacturer(
                item["text"]
            ):

                manufacturer_item = item
                break

        # OCR-order fallback
        if manufacturer_item is None:

            for j in range(
                label_index + 1,
                min(
                    label_index + 8,
                    len(items)
                )
            ):

                if self.is_manufacturer(
                    items[j]["text"]
                ):

                    manufacturer_item = items[j]
                    break

        if manufacturer_item is None:
            return None

        start_y = manufacturer_item["y2"]

        # ---------------------------------------------
        # Find address lines
        # ---------------------------------------------

        address_lines = []

        for item in items:

            text = item["text"].strip()

            if not text:
                continue

            if item["bbox"] is None:
                continue

            # Must occur after manufacturer.
            if item["y1"] <= start_y:
                continue

            # Don't search too far away.
            if item["y1"] > start_y + 500:
                continue

            lower = text.lower()

            # -----------------------------------------
            # Ignore unrelated sections
            # -----------------------------------------

            ignored = [
                "marketed by",
                "reach us",
                "email",
                "phone",
                "mobile",
                "mrp",
                "n.qty",
                "net qty",
                "best before",
                "use by",
                "packed on",
                "mfd",
                "mfg",
                "batch",
                "ingredients",
                "nutritional value",
                "recipe",
                "method",
                "you will need"
            ]

            if any(
                marker in lower
                for marker in ignored
            ):
                continue

            # -----------------------------------------
            # Ignore phone
            # -----------------------------------------

            if self.extract_phone(text):
                continue

            # -----------------------------------------
            # Ignore email
            # -----------------------------------------

            if self.extract_email(text):
                continue

            # -----------------------------------------
            # Ignore packaging/marketing text
            # -----------------------------------------

            marketing_words = [
                "one oats",
                "many benefits",
                "natural",
                "wholegrain",
                "lasting energy",
                "good source",
                "rich source",
                "tasty",
                "try",
                "every day"
            ]

            if any(
                word in lower
                for word in marketing_words
            ):
                continue

            # -----------------------------------------
            # Address evidence
            # -----------------------------------------

            if self.looks_like_address(text):

                address_lines.append(item)

        if not address_lines:
            return None

        # ---------------------------------------------
        # Physical order
        # ---------------------------------------------

        address_lines.sort(
            key=lambda x: (
                x["y1"],
                x["x1"]
            )
        )

        result = []

        for item in address_lines:

            text = item["text"].strip()

            if text and text not in result:
                result.append(text)

        if not result:
            return None

        return " ".join(result)

    # =========================================================
    # PHONE
    # =========================================================

    @staticmethod
    def extract_phone(
        text: str
    ) -> Optional[str]:

        patterns = [

            r"\+91[\s-]*[6-9]\d{3}[\s-]?\d{3}[\s-]?\d{3}",

            r"\+91[\s-]*[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}",

            r"\b[6-9]\d{3}[\s-]?\d{3}[\s-]?\d{3}\b",

            r"\b[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b"
        ]

        for pattern in patterns:

            match = re.search(
                pattern,
                text
            )

            if match:

                return re.sub(
                    r"\s+",
                    " ",
                    match.group(0).strip()
                )

        return None

    # =========================================================
    # EMAIL
    # =========================================================

    @staticmethod
    def extract_email(
        text: str
    ) -> Optional[str]:

        match = re.search(
            r"\b[A-Za-z0-9._%+-]+@"
            r"[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
            text
        )

        if match:
            return match.group(0)

        return None

    # =========================================================
    # CONSUMER CONTACT
    # =========================================================

    def extract_consumer_contact(
        self,
        items: List[Dict[str, Any]]
    ) -> Optional[str]:

        phones = []
        emails = []

        for item in items:

            text = item["text"]

            phone = self.extract_phone(text)

            if phone and phone not in phones:
                phones.append(phone)

            email = self.extract_email(text)

            if email and email not in emails:
                emails.append(email)

        values = phones + emails

        if not values:
            return None

        return " | ".join(values)

    # =========================================================
    # PRODUCT NAME
    # =========================================================

    PRODUCT_REJECT_WORDS = {
        "online grocery store",
        "ready to cook",
        "nutritional value",
        "calories",
        "fat",
        "carbohydrate",
        "fiber",
        "sugar",
        "protein",
        "vitamin",
        "potassium",
        "mineral",
        "packed on",
        "best before",
        "batch",
        "mrp",
        "net weight",
        "marketed by",
        "packed by",
        "reach us",
        "email",
        "method",
        "you will need",
        "recipe developed",
        "good source",
        "rich source",
        "wholegrain",
        "lasting energy"
    }

    def product_candidate_score(
        self,
        item: Dict[str, Any],
        nutrition_y: Optional[float],
        recipe_y: Optional[float]
    ) -> float:

        text = item["text"].strip()

        if len(text) < 3:
            return -999

        if len(text) > 60:
            return -999

        lower = text.lower()

        # ---------------------------------------------
        # Reject obvious non-product text
        # ---------------------------------------------

        if lower in self.PRODUCT_REJECT_WORDS:
            return -999

        for word in self.PRODUCT_REJECT_WORDS:

            if lower.startswith(word + " "):
                return -999

        if "@" in text:
            return -999

        if "www." in lower:
            return -999

        if "http" in lower:
            return -999

        if self.is_date(text):
            return -999

        if self.is_mrp(text):
            return -999

        if self.extract_quantity(text):
            return -999

        # ---------------------------------------------
        # Nutrition area
        # ---------------------------------------------

        if nutrition_y is not None:

            if item["y1"] >= nutrition_y:

                nutrient_words = {
                    "sugar",
                    "fat",
                    "protein",
                    "fiber",
                    "calories",
                    "carbohydrate",
                    "potassium",
                    "vitamin a",
                    "vitamin c",
                    "mineral"
                }

                if lower in nutrient_words:
                    return -999

        # ---------------------------------------------
        # Recipe area
        # ---------------------------------------------

        if (
            recipe_y is not None
            and item["y1"] >= recipe_y
        ):

            return -999

        score = 0.0

        # OCR confidence
        score += item["confidence"] * 20

        # Bounding box
        score += min(
            item["area"] / 10000,
            40
        )

        # Text height
        score += min(
            item["height"] / 5,
            20
        )

        # Uppercase ratio
        letters = [
            c for c in text
            if c.isalpha()
        ]

        if letters:

            uppercase_ratio = (
                sum(
                    c.isupper()
                    for c in letters
                )
                / len(letters)
            )

            score += uppercase_ratio * 20

        # Short product-style text
        word_count = len(text.split())

        if 1 <= word_count <= 4:
            score += 10

        # Common product words
        product_terms = [
            "apple",
            "oats",
            "rice",
            "flour",
            "dal",
            "juice",
            "milk",
            "biscuit",
            "cookie",
            "noodle",
            "atta",
            "salt",
            "oil",
            "masala",
            "snack",
            "slice",
            "powder"
        ]

        for term in product_terms:

            if term in lower:
                score += 15

        return score

    def extract_product_name(
        self,
        items: List[Dict[str, Any]]
    ) -> Optional[str]:

        if not items:
            return None

        nutrition_y = None
        recipe_y = None

        for item in items:

            lower = item["norm"]

            if "nutritional value" in lower:

                nutrition_y = item["y1"]

            if any(
                marker in lower
                for marker in [
                    "you will need",
                    "recipe developed",
                    "method"
                ]
            ):

                if recipe_y is None:
                    recipe_y = item["y1"]

        candidates = []

        for item in items:

            score = self.product_candidate_score(
                item,
                nutrition_y,
                recipe_y
            )

            if score > 0:

                candidates.append(
                    (score, item)
                )

        if not candidates:
            return None

        candidates.sort(
            key=lambda x: x[0],
            reverse=True
        )

        return candidates[0][1]["text"].strip()

    # =========================================================
    # MAIN EXTRACTION
    # =========================================================

    def extract(
        self,
        texts: List[str],
        ocr_details: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:

        items = self.prepare_items(
            texts,
            ocr_details
        )

        # Product
        product_name = self.extract_product_name(
            items
        )

        # Quantity
        net_quantity = self.extract_labeled_field(
            items,
            "net_quantity"
        )

        # MRP
        mrp = self.extract_labeled_field(
            items,
            "mrp"
        )

        # Batch
        batch_number = self.extract_labeled_field(
            items,
            "batch_number"
        )

        # Packed date
        packed_on = self.extract_labeled_field(
            items,
            "packed_on"
        )

        # Manufacturing date
        date_of_manufacture = self.extract_labeled_field(
            items,
            "date_of_manufacture"
        )

        # Best before / Use by
        best_before = self.extract_labeled_field(
            items,
            "best_before"
        )

        # Manufacturer / Packer
        manufacturer_or_packer = self.extract_manufacturer(
            items
        )

        # Address
        address = self.extract_address(
            items
        )

        # Contact
        consumer_contact = self.extract_consumer_contact(
            items
        )

        # License
        license_number = self.extract_labeled_field(
            items,
            "license_number"
        )

        # Marketed By
        marketed_by = self.extract_marketed_by(
            items
        )

        return {
            "product_name": product_name,
            "net_quantity": net_quantity,
            "mrp": mrp,
            "batch_number": batch_number,
            "packed_on": packed_on,
            "date_of_manufacture": date_of_manufacture,
            "best_before": best_before,
            "manufacturer_or_packer": manufacturer_or_packer,
            "address": address,
            "consumer_contact": consumer_contact,
            "license_number": license_number,
            "ingredients": None,
            "country_of_origin": None,
            "marketed_by": marketed_by
        }


# =============================================================
# SINGLE EXTRACTOR INSTANCE
# =============================================================

field_extractor = FieldExtractor()  