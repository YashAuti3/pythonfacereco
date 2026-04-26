import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
from deepface import DeepFace

ref_dir = os.path.join(os.path.dirname(__file__), "reference_photos")
photos = [f for f in os.listdir(ref_dir) if f.endswith(('.jpg','.png')) and f != '.gitkeep']
print("Photos:", photos)

THRESHOLD = 0.75

for i, p1 in enumerate(photos):
    for j, p2 in enumerate(photos):
        r = DeepFace.verify(
            img1_path=os.path.join(ref_dir, p1),
            img2_path=os.path.join(ref_dir, p2),
            model_name="VGG-Face",
            distance_metric="euclidean_l2",
            enforce_detection=False,
            align=True,
        )
        match = "MATCH" if r["distance"] <= THRESHOLD else "NO MATCH"
        print(f"{p1} vs {p2}: dist={r['distance']:.4f}  [{match}]")
