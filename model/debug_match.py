import cv2
import numpy as np
import imutils
import glob
import os

test_path = r"d:\LIFE\_KULIAH_ITENAS_\SEMESTER 4\TRANSAKSI ELEKTRONIK\PROJECT 2\model\test\100ribu.jpg"

print(f"Loading test image...")
image_test = cv2.imread(test_path)
if image_test is None:
    print("Cannot read test image")
    exit(1)

image_test_p = cv2.cvtColor(image_test, cv2.COLOR_BGR2GRAY)
image_test_p = cv2.Canny(image_test_p, 50, 200)

template_files = glob.glob(r"d:\LIFE\_KULIAH_ITENAS_\SEMESTER 4\TRANSAKSI ELEKTRONIK\PROJECT 2\model\template\*.jpg")

best_overall_val = -1
best_overall_nominal = None

for template_path in template_files:
    nominal = os.path.basename(template_path).replace('.jpg', '')
    print(f"Testing against template: {nominal}")
    
    tmp = cv2.imread(template_path)
    if tmp is None:
        continue

    tmp = imutils.resize(tmp, width=int(tmp.shape[1]*0.5))
    tmp = cv2.cvtColor(tmp, cv2.COLOR_BGR2GRAY)
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    tmp = cv2.filter2D(tmp, -1, kernel)
    tmp = cv2.blur(tmp, (3, 3))
    tmp = cv2.Canny(tmp, 50, 200)

    (tmp_height, tmp_width) = tmp.shape[:2]

    best_val = -1

    for scale in np.linspace(0.2, 1.0, 20)[::-1]:
        resized = imutils.resize(image_test_p, width=int(image_test_p.shape[1] * scale))
        if resized.shape[0] < tmp_height or resized.shape[1] < tmp_width:
            continue
        
        result = cv2.matchTemplate(resized, tmp, cv2.TM_CCOEFF_NORMED)
        (_, maxVal, _, maxLoc) = cv2.minMaxLoc(result)
        
        if maxVal > best_val:
            best_val = maxVal

    print(f"   => Best score for {nominal}: {best_val:.4f}")
    if best_val > best_overall_val:
        best_overall_val = best_val
        best_overall_nominal = nominal

print(f"\nWINNER: {best_overall_nominal} with score {best_overall_val:.4f}")
