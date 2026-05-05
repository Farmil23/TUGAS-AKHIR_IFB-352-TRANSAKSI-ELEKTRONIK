import glob
import cv2 
import numpy as np
import os

# Helper function instead of using an external imutils dependency for backend
def resize_image(image, width=None, height=None, inter=cv2.INTER_AREA):
    dim = None
    (h, w) = image.shape[:2]

    if width is None and height is None:
        return image

    if width is None:
        r = height / float(h)
        dim = (int(w * r), height)
    else:
        r = width / float(w)
        dim = (width, int(h * r))

    resized = cv2.resize(image, dim, interpolation=inter)
    return resized

class RupiahDetectionService:
    def __init__(self):
        self.template_data = []
        self._load_templates()

    def _load_templates(self):
        # Resolve to the model/template folder correctly
        template_dir = os.path.join(os.getcwd(), 'model', 'template', '*.jpg')
        template_files = glob.glob(template_dir, recursive=True)
        
        for template_file in template_files:
            tmp = cv2.imread(template_file)
            if tmp is None:
                continue
                
            tmp = resize_image(tmp, width=int(tmp.shape[1] * 0.5))  # scalling
            tmp = cv2.cvtColor(tmp, cv2.COLOR_BGR2GRAY)  # grayscale
            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            tmp = cv2.filter2D(tmp, -1, kernel)  # sharpening
            tmp = cv2.blur(tmp, (3, 3))  # smoothing
            tmp = cv2.Canny(tmp, 50, 200)  # Edge with Canny 
            
            # Extract nominal value from filename
            basename = os.path.basename(template_file)
            nominal = basename.replace('.jpg', '')
            self.template_data.append({"glob": tmp, "nominal": nominal})
            
    def detect_rupiah_from_bytes(self, image_bytes: bytes) -> dict:
        """
        Menerima bytes gambar uang (misal dari UploadFile FastAPI),
        memprosesnya dengan OpenCV, dan mengembalikan hasil deteksi (seperti nominal dan confidence).
        """
        if not self.template_data:
            return {"status": "error", "message": "Template data not loaded"}

        # Decode image from stream
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_test = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image_test is None:
            return {"status": "error", "message": "Invalid image data"}

        # Pra-pemrosesan
        image_test_p = cv2.cvtColor(image_test, cv2.COLOR_BGR2GRAY)
        image_test_p = cv2.Canny(image_test_p, 50, 200)

        best_match = None
        threshold = 0.2

        print("\n--- MULAI DETEKSI UANG ---")

        for template in self.template_data:
            (tmp_height, tmp_width) = template['glob'].shape[:2]
            
            found = None
            for scale in np.linspace(0.2, 1.0, 20)[::-1]:
                # scaling test image
                resized = resize_image(image_test_p, width=int(image_test_p.shape[1] * scale))
                r = image_test_p.shape[1] / float(resized.shape[1])
                
                if resized.shape[0] < tmp_height or resized.shape[1] < tmp_width:
                    break

                # template matching
                result = cv2.matchTemplate(resized, template['glob'], cv2.TM_CCOEFF_NORMED)
                (_, maxVal, _, maxLoc) = cv2.minMaxLoc(result)
                
                if found is None or maxVal > found[0]:
                    found = (maxVal, maxLoc, r)
                    
            if found is not None:
                (maxVal, maxLoc, r) = found
                print(f"Template [{template['nominal']}] -> Skor Maksimal: {maxVal:.4f}")
                
                if maxVal >= threshold:
                    # Update best match if current template has higher confidence
                    if best_match is None or maxVal > best_match["confidence"]:
                        best_match = {
                            "nominal": template['nominal'],
                            "confidence": float(maxVal),
                            "status": "success"
                        }

        print(f"Hasil Akhir Pemenang: {best_match['nominal'] if best_match else 'GAGAL'} (Threshold: {threshold})")
        print("----------------------------\n")

        if best_match:
            return best_match
            
        return {"status": "failed", "message": "Uang tidak dikenali / Nominal tidak ditemukan."}

# Buat singleton instance dari service agar template diload 1x saja selama lifecycle FastAPI
rupiah_detector = RupiahDetectionService()
