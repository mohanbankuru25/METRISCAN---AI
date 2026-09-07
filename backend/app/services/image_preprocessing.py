import cv2
import os


class ImagePreprocessor:

    def process(self, image_path: str) -> str:

        image = cv2.imread(image_path)

        if image is None:
            raise ValueError(
                f"Unable to read image: {image_path}"
            )

        # ---------------------------------------------
        # 1. Resize small images
        # ---------------------------------------------

        height, width = image.shape[:2]

        min_width = 1200

        if width < min_width:

            scale = min_width / width

            new_width = int(width * scale)
            new_height = int(height * scale)

            image = cv2.resize(
                image,
                (new_width, new_height),
                interpolation=cv2.INTER_CUBIC
            )

        # ---------------------------------------------
        # 2. Convert to grayscale
        # ---------------------------------------------

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY
        )

        # ---------------------------------------------
        # 3. Light denoising
        # ---------------------------------------------

        denoised = cv2.fastNlMeansDenoising(
            gray,
            None,
            10,
            7,
            21
        )

        # ---------------------------------------------
        # 4. Improve contrast
        # ---------------------------------------------

        clahe = cv2.createCLAHE(
            clipLimit=2.0,
            tileGridSize=(8, 8)
        )

        enhanced = clahe.apply(
            denoised
        )

        # ---------------------------------------------
        # 5. Save processed image
        # ---------------------------------------------

        directory = os.path.dirname(
            image_path
        )

        filename = os.path.basename(
            image_path
        )

        name, extension = os.path.splitext(
            filename
        )

        output_path = os.path.join(
            directory,
            f"{name}_processed.png"
        )

        cv2.imwrite(
            output_path,
            enhanced
        )

        return output_path


image_preprocessor = ImagePreprocessor()