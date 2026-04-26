import os, sys, cv2
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
sys.path.insert(0, os.path.dirname(__file__))
from app.services.face_service import FaceRecognitionService

ref_dir = os.path.join(os.path.dirname(__file__), "reference_photos")
svc = FaceRecognitionService(ref_dir)
svc.rebuild()
print("Embeddings:", list(svc._store.keys()))

photos = [f for f in os.listdir(ref_dir) if f.endswith('.jpg') and f != '.gitkeep']
for p in photos:
    path = os.path.join(ref_dir, p)
    img  = cv2.imread(path)
    sid  = p.replace('.jpg', '')
    print(f"\n=== {p} ===")

    variants = {
        "Same file":           (path, None, None),
        "Webcam 640x480":      (None, cv2.resize(img,(640,480)), None),
        "Webcam 1280x720":     (None, cv2.resize(img,(1280,720)), None),
        "Mirrored (webcam)":   (None, cv2.flip(img,1), None),
        "Bright lighting":     (None, cv2.convertScaleAbs(img,alpha=1.5,beta=50), None),
        "Dark lighting":       (None, cv2.convertScaleAbs(img,alpha=0.5,beta=-30), None),
        "10deg head tilt":     (None, cv2.warpAffine(img, cv2.getRotationMatrix2D((img.shape[1]//2,img.shape[0]//2),10,1),(img.shape[1],img.shape[0])), None),
        "JPEG q40":            (None, img, [cv2.IMWRITE_JPEG_QUALITY, 40]),
    }

    for name, (fixed, out_img, params) in variants.items():
        if fixed:
            r = svc.recognize(fixed)
        else:
            tmp = os.path.join(ref_dir, "_tmp.jpg")
            cv2.imwrite(tmp, out_img, params or [])
            r = svc.recognize(tmp)
            os.remove(tmp)
        ok = "PASS" if r["student_id"] == sid else "FAIL"
        print(f"  {name:<25} matched={str(r['student_id']):<10} conf={r['confidence']:.3f}  [{ok}]")
