import os
import re
from typing import Any, Dict, List, Optional, Tuple

import cv2


class VisualComplianceAnalyzer:
    """
    Visual analysis layer for Legal Metrology compliance.

    Purpose:
    - Analyze OCR bounding boxes.
    - Estimate text size in pixels.
    - Analyze declaration placement.
    - Estimate readability using OCR confidence and local contrast.
    - Detect visibility of important declaration groups.

    IMPORTANT:
    Physical font size in millimetres cannot be reliably determined from
    an ordinary product photograph unless physical calibration/reference
    information is available.

    Therefore this analyzer provides:
        - pixel-based measurements
        - OCR confidence
        - relative placement evidence
        - visibility evidence

    It does NOT automatically declare Rules 7, 8 or 9 as PASS.
    Those rules require contextual/legal interpretation.
    """

    def __init__(self):
        self.engine_name = "visual-compliance-analyzer-v1"

    # ------------------------------------------------------------------
    # PUBLIC METHOD
    # ------------------------------------------------------------------

    def analyze(
        self,
        ocr_details: Optional[List[Dict[str, Any]]] = None,
        image_path: Optional[str] = None,
    ) -> Dict[str, Any]:

        ocr_details = ocr_details or []

        image_width = None
        image_height = None

        if image_path and os.path.exists(image_path):
            try:
                image = cv2.imread(image_path)

                if image is not None:
                    image_height, image_width = image.shape[:2]

            except Exception as exc:
                print(
                    "Visual analyzer image read error:",
                    str(exc)
                )

        blocks = self._normalize_ocr_blocks(ocr_details)

        text_size = self._analyze_text_size(blocks)

        placement = self._analyze_placement(
            blocks=blocks,
            image_width=image_width,
            image_height=image_height,
        )

        readability = self._analyze_readability(
            blocks=blocks,
            image_path=image_path,
        )

        declaration_visibility = (
            self._analyze_declaration_visibility(blocks)
        )

        result = {
            "engine": self.engine_name,

            "image": {
                "width": image_width,
                "height": image_height,
                "calibrated": False,
            },

            "text_size": text_size,

            "placement": placement,

            "readability": readability,

            "declaration_visibility": declaration_visibility,

            "rules": {
                "7": {
                    "status": text_size.get("status", "REVIEW"),
                    "reason": (
                        "Visual text-height evidence is available in pixels. "
                        "Exact legal minimum letter/numeral height requires "
                        "physical calibration."
                    ),
                },

                "8": {
                    "status": placement.get("status", "REVIEW"),
                    "reason": (
                        "OCR geometry provides relative placement evidence. "
                        "Complete Principal Display Panel compliance requires "
                        "legal interpretation of the package layout."
                    ),
                },

                "9": {
                    "status": readability.get("status", "REVIEW"),
                    "reason": (
                        "OCR confidence and local contrast provide readability "
                        "evidence, but final declaration manner/readability "
                        "requires contextual inspection."
                    ),
                },
            },
        }

        return result

    # ------------------------------------------------------------------
    # OCR NORMALIZATION
    # ------------------------------------------------------------------

    def _normalize_ocr_blocks(
        self,
        ocr_details: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:

        normalized = []

        for item in ocr_details:

            if not isinstance(item, dict):
                continue

            text = item.get("text")

            if text is None:
                text = item.get("label")

            if text is None:
                continue

            text = str(text).strip()

            if not text:
                continue

            bbox = (
                item.get("bbox")
                or item.get("box")
                or item.get("points")
                or item.get("polygon")
                or item.get("coordinates")
            )

            normalized_bbox = self._normalize_bbox(bbox)

            confidence = self._extract_confidence(item)

            if normalized_bbox is None:
                normalized.append(
                    {
                        "text": text,
                        "bbox": None,
                        "confidence": confidence,
                    }
                )
                continue

            x1, y1, x2, y2 = normalized_bbox

            normalized.append(
                {
                    "text": text,
                    "bbox": [x1, y1, x2, y2],
                    "confidence": confidence,
                }
            )

        return normalized

    # ------------------------------------------------------------------
    # BBOX NORMALIZATION
    # ------------------------------------------------------------------

    def _normalize_bbox(
        self,
        bbox: Any,
    ) -> Optional[List[float]]:

        if bbox is None:
            return None

        try:

            # Standard [x1, y1, x2, y2]
            if (
                isinstance(bbox, (list, tuple))
                and len(bbox) == 4
                and all(
                    isinstance(v, (int, float))
                    for v in bbox
                )
            ):

                x1, y1, x2, y2 = bbox

                return [
                    float(min(x1, x2)),
                    float(min(y1, y2)),
                    float(max(x1, x2)),
                    float(max(y1, y2)),
                ]

            # Polygon:
            # [[x,y], [x,y], [x,y], [x,y]]
            if (
                isinstance(bbox, (list, tuple))
                and len(bbox) >= 2
            ):

                points = []

                for point in bbox:

                    if (
                        isinstance(point, (list, tuple))
                        and len(point) >= 2
                    ):
                        try:
                            points.append(
                                (
                                    float(point[0]),
                                    float(point[1]),
                                )
                            )
                        except Exception:
                            pass

                if points:

                    xs = [p[0] for p in points]
                    ys = [p[1] for p in points]

                    return [
                        min(xs),
                        min(ys),
                        max(xs),
                        max(ys),
                    ]

        except Exception:
            return None

        return None

    # ------------------------------------------------------------------
    # CONFIDENCE
    # ------------------------------------------------------------------

    def _extract_confidence(
        self,
        item: Dict[str, Any],
    ) -> Optional[float]:

        candidates = [
            item.get("confidence"),
            item.get("score"),
            item.get("rec_score"),
            item.get("text_score"),
        ]

        for value in candidates:

            if value is None:
                continue

            try:

                confidence = float(value)

                # Convert 0-100 to 0-1
                if confidence > 1:
                    confidence = confidence / 100.0

                confidence = max(
                    0.0,
                    min(1.0, confidence),
                )

                return confidence

            except Exception:
                continue

        return None

    # ------------------------------------------------------------------
    # TEXT SIZE
    # ------------------------------------------------------------------

    def _analyze_text_size(
        self,
        blocks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:

        heights = []

        for block in blocks:

            bbox = block.get("bbox")

            if not bbox:
                continue

            x1, y1, x2, y2 = bbox

            height = abs(y2 - y1)

            if height > 0:
                heights.append(float(height))

        if not heights:

            return {
                "status": "REVIEW",
                "text_blocks": len(blocks),

                "median_height": None,
                "min_height": None,
                "max_height": None,

                "median_height_px": None,
                "min_height_px": None,
                "max_height_px": None,

                "calibrated_height_mm": None,
            }

        heights_sorted = sorted(heights)

        count = len(heights_sorted)

        if count % 2 == 1:
            median_height = heights_sorted[count // 2]
        else:
            median_height = (
                heights_sorted[count // 2 - 1]
                + heights_sorted[count // 2]
            ) / 2.0

        return {
            "status": "REVIEW",

            "text_blocks": len(blocks),

            # Frontend-friendly names
            "median_height": round(
                median_height,
                2,
            ),

            "min_height": round(
                min(heights),
                2,
            ),

            "max_height": round(
                max(heights),
                2,
            ),

            # Explicit pixel names
            "median_height_px": round(
                median_height,
                2,
            ),

            "min_height_px": round(
                min(heights),
                2,
            ),

            "max_height_px": round(
                max(heights),
                2,
            ),

            # No physical calibration from image alone
            "calibrated_height_mm": None,
        }

    # ------------------------------------------------------------------
    # PLACEMENT
    # ------------------------------------------------------------------

    def _analyze_placement(
        self,
        blocks: List[Dict[str, Any]],
        image_width: Optional[int],
        image_height: Optional[int],
    ) -> Dict[str, Any]:

        bbox_count = 0

        positions = []

        for block in blocks:

            bbox = block.get("bbox")

            if not bbox:
                continue

            bbox_count += 1

            x1, y1, x2, y2 = bbox

            center_x = (
                x1 + x2
            ) / 2.0

            center_y = (
                y1 + y2
            ) / 2.0

            positions.append(
                {
                    "text": block.get("text", ""),
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                    "center_x": round(
                        center_x,
                        2,
                    ),
                    "center_y": round(
                        center_y,
                        2,
                    ),
                }
            )

        declaration_groups = (
            self._find_declaration_groups(
                blocks
            )
        )

        return {
            "status": "REVIEW",

            "text_blocks": len(blocks),

            "bbox_count": bbox_count,

            "regions": {
                "image_width": image_width,
                "image_height": image_height,
            },

            "label_positions": positions,

            "declaration_groups": declaration_groups,
        }

    # ------------------------------------------------------------------
    # READABILITY
    # ------------------------------------------------------------------

    def _analyze_readability(
        self,
        blocks: List[Dict[str, Any]],
        image_path: Optional[str],
    ) -> Dict[str, Any]:

        confidence_values = []

        for block in blocks:

            confidence = block.get(
                "confidence"
            )

            if confidence is not None:
                confidence_values.append(
                    confidence
                )

        if confidence_values:

            mean_confidence = (
                sum(confidence_values)
                / len(confidence_values)
            )

            high_confidence_ratio = (
                sum(
                    1
                    for value in confidence_values
                    if value >= 0.80
                )
                / len(confidence_values)
            )

        else:

            mean_confidence = None
            high_confidence_ratio = None

        local_contrast = (
            self._calculate_local_contrast(
                blocks,
                image_path,
            )
        )

        return {
            "status": "REVIEW",

            "mean_ocr_confidence": (
                round(
                    mean_confidence,
                    4,
                )
                if mean_confidence is not None
                else None
            ),

            "high_confidence_ratio": (
                round(
                    high_confidence_ratio,
                    4,
                )
                if high_confidence_ratio is not None
                else None
            ),

            # Frontend-friendly alias
            "local_contrast": local_contrast,

            # Original descriptive name
            "median_local_contrast": local_contrast,
        }

    # ------------------------------------------------------------------
    # LOCAL CONTRAST
    # ------------------------------------------------------------------

    def _calculate_local_contrast(
        self,
        blocks: List[Dict[str, Any]],
        image_path: Optional[str],
    ) -> Optional[float]:

        if not image_path:
            return None

        if not os.path.exists(image_path):
            return None

        try:

            image = cv2.imread(
                image_path,
                cv2.IMREAD_GRAYSCALE,
            )

            if image is None:
                return None

            contrast_values = []

            image_height, image_width = (
                image.shape[:2]
            )

            for block in blocks:

                bbox = block.get("bbox")

                if not bbox:
                    continue

                x1, y1, x2, y2 = bbox

                x1 = max(
                    0,
                    min(
                        image_width - 1,
                        int(x1),
                    ),
                )

                y1 = max(
                    0,
                    min(
                        image_height - 1,
                        int(y1),
                    ),
                )

                x2 = max(
                    0,
                    min(
                        image_width,
                        int(x2),
                    ),
                )

                y2 = max(
                    0,
                    min(
                        image_height,
                        int(y2),
                    ),
                )

                if x2 <= x1 or y2 <= y1:
                    continue

                crop = image[
                    y1:y2,
                    x1:x2
                ]

                if crop.size == 0:
                    continue

                # Standard deviation is used as a simple
                # local contrast/texture indicator.
                std_value = float(
                    cv2.meanStdDev(crop)[1][0][0]
                )

                contrast_values.append(
                    std_value
                )

            if not contrast_values:
                return None

            contrast_values.sort()

            count = len(contrast_values)

            if count % 2 == 1:

                median = contrast_values[
                    count // 2
                ]

            else:

                median = (
                    contrast_values[
                        count // 2 - 1
                    ]
                    + contrast_values[
                        count // 2
                    ]
                ) / 2.0

            return round(
                float(median),
                2,
            )

        except Exception as exc:

            print(
                "Local contrast calculation error:",
                str(exc),
            )

            return None

    # ------------------------------------------------------------------
    # DECLARATION VISIBILITY
    # ------------------------------------------------------------------

    def _analyze_declaration_visibility(
        self,
        blocks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:

        groups = {
            "manufacturer": [],
            "address": [],
            "country_of_origin": [],
            "product_name": [],
            "net_quantity": [],
            "manufacture_date": [],
            "best_before": [],
            "mrp": [],
            "consumer_contact": [],
            "unit_sale_price": [],
            "batch": [],
        }

        patterns = {

            "manufacturer": [
                r"\bmanufactured\s*by\b",
                r"\bmanufactured\s*&\s*marketed\s*by\b",
                r"\bmanufactured\b",
                r"\bpacked\s*by\b",
                r"\bpacker\b",
                r"\bmanufacturer\b",
                r"\bmarketed\s*by\b",
            ],

            "address": [
                r"\baddress\b",
                r"\broad\b",
                r"\bstreet\b",
                r"\bbuilding\b",
                r"\bflat\b",
                r"\bplot\b",
                r"\bvirar\b",
                r"\bdistrict\b",
                r"\bmaharashtra\b",
                r"\bindia\b",
            ],

            "country_of_origin": [
                r"\bcountry\s+of\s+origin\b",
                r"\bmade\s+in\b",
                r"\bmanufactured\s+in\b",
                r"\borigin\b",
            ],

            "product_name": [
                r"\bapple\s+slice\b",
                r"\bproduct\s+name\b",
                r"\bname\s+of\s+commodity\b",
            ],

            "net_quantity": [
                r"\bnet\s+(weight|quantity|wt)\b",
                r"\bnet\s+qty\b",
                r"\bquantity\b",
                r"\bweight\b",
            ],

            "manufacture_date": [
                r"\bmanufactur",
                r"\bpacked\s+on\b",
                r"\bpackaged\s+on\b",
                r"\bdate\s+of\s+packing\b",
            ],

            "best_before": [
                r"\bbest\s+before\b",
                r"\buse\s+by\b",
                r"\bexpiry\b",
                r"\bexpires\b",
            ],

            "mrp": [
                r"\bm\.?\s*r\.?\s*p\.?\b",
                r"\bmaximum\s+retail\s+price\b",
                r"\bincluding\s+all\s+taxes\b",
            ],

            "consumer_contact": [
                r"\breach\s+us\b",
                r"\bcontact\s+us\b",
                r"\bconsumer\s+care\b",
                r"\bcustomer\s+care\b",
                r"\bphone\b",
                r"\bph\s*[:.]",
                r"\bemail\b",
                r"@",
            ],

            "unit_sale_price": [
                r"\bunit\s+sale\s+price\b",
                r"\bunit\s+price\b",
                r"\bper\s+(g|kg|gram|kilogram|ml|l|litre|liter)\b",
            ],

            "batch": [
                r"\bbatch\b",
                r"\bbatch\s*(no|number)\b",
                r"\blot\b",
                r"\blot\s*(no|number)\b",
            ],
        }

        for block in blocks:

            text = str(
                block.get("text", "")
            ).strip()

            if not text:
                continue

            lower_text = text.lower()

            for group_name, group_patterns in patterns.items():

                matched = False

                for pattern in group_patterns:

                    try:

                        if re.search(
                            pattern,
                            lower_text,
                            re.IGNORECASE,
                        ):
                            matched = True
                            break

                    except re.error:
                        continue

                if matched:
                    groups[group_name].append(
                        {
                            "text": text,
                            "bbox": block.get("bbox"),
                            "confidence": block.get(
                                "confidence"
                            ),
                        }
                    )

        detected_count = sum(
            1
            for values in groups.values()
            if values
        )

        bbox_count = sum(
            1
            for block in blocks
            if block.get("bbox") is not None
        )

        return {
            "status": "REVIEW",

            # Frontend-friendly aggregate fields
            "detected_declarations": detected_count,
            "ocr_bbox_count": bbox_count,

            "manufacturer": groups[
                "manufacturer"
            ],

            "address": groups[
                "address"
            ],

            "country_of_origin": groups[
                "country_of_origin"
            ],

            "product_name": groups[
                "product_name"
            ],

            "net_quantity": groups[
                "net_quantity"
            ],

            "manufacture_date": groups[
                "manufacture_date"
            ],

            "best_before": groups[
                "best_before"
            ],

            "mrp": groups[
                "mrp"
            ],

            "consumer_contact": groups[
                "consumer_contact"
            ],

            "unit_sale_price": groups[
                "unit_sale_price"
            ],

            "batch": groups[
                "batch"
            ],
        }

    # ------------------------------------------------------------------
    # DECLARATION GROUP DETECTION
    # ------------------------------------------------------------------

    def _find_declaration_groups(
        self,
        blocks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:

        result = {
            "manufacturer": [],
            "address": [],
            "country_of_origin": [],
            "product_name": [],
            "net_quantity": [],
            "manufacture_date": [],
            "best_before": [],
            "mrp": [],
            "consumer_contact": [],
            "unit_sale_price": [],
            "batch": [],
        }

        patterns = {

            "manufacturer": (
                r"\b("
                r"manufactured\s+by|"
                r"manufactured|"
                r"packed\s+by|"
                r"packer|"
                r"manufacturer|"
                r"marketed\s+by"
                r")\b"
            ),

            "address": (
                r"\b("
                r"address|"
                r"road|"
                r"street|"
                r"building|"
                r"district|"
                r"india|"
                r"maharashtra"
                r")\b"
            ),

            "country_of_origin": (
                r"\b("
                r"country\s+of\s+origin|"
                r"made\s+in|"
                r"origin"
                r")\b"
            ),

            "product_name": (
                r"\b("
                r"product\s+name|"
                r"name\s+of\s+commodity|"
                r"apple\s+slice"
                r")\b"
            ),

            "net_quantity": (
                r"\b("
                r"net\s+weight|"
                r"net\s+quantity|"
                r"net\s+qty|"
                r"quantity|"
                r"weight"
                r")\b"
            ),

            "manufacture_date": (
                r"\b("
                r"manufactur|"
                r"packed\s+on|"
                r"packaged\s+on|"
                r"date\s+of\s+packing"
                r")\b"
            ),

            "best_before": (
                r"\b("
                r"best\s+before|"
                r"use\s+by|"
                r"expiry|"
                r"expires"
                r")\b"
            ),

            "mrp": (
                r"\b("
                r"mrp|"
                r"maximum\s+retail\s+price"
                r")\b"
            ),

            "consumer_contact": (
                r"\b("
                r"reach\s+us|"
                r"contact\s+us|"
                r"consumer\s+care|"
                r"customer\s+care|"
                r"phone|"
                r"email"
                r")\b|@"
            ),

            "unit_sale_price": (
                r"\b("
                r"unit\s+sale\s+price|"
                r"unit\s+price"
                r")\b"
            ),

            "batch": (
                r"\b("
                r"batch|"
                r"lot"
                r")\b"
            ),
        }

        for block in blocks:

            text = str(
                block.get("text", "")
            ).strip()

            if not text:
                continue

            for group_name, pattern in patterns.items():

                try:

                    if re.search(
                        pattern,
                        text,
                        re.IGNORECASE,
                    ):

                        result[group_name].append(
                            {
                                "text": text,
                                "bbox": block.get(
                                    "bbox"
                                ),
                                "confidence": block.get(
                                    "confidence"
                                ),
                            }
                        )

                except re.error:
                    pass

        return result


# ----------------------------------------------------------------------
# SINGLETON INSTANCE
# ----------------------------------------------------------------------

visual_compliance_analyzer = (
    VisualComplianceAnalyzer()
)