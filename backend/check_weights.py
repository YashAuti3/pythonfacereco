import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

weights_dir = os.path.expanduser('~/.deepface/weights')
print("Weights dir:", weights_dir)
if os.path.exists(weights_dir):
    for f in os.listdir(weights_dir):
        size = os.path.getsize(os.path.join(weights_dir, f))
        print(f"  {f}  ({size//1024} KB)")
else:
    print("No weights folder found")

# Test VGG-Face (should already be loaded from previous runs)
print("\nTesting VGG-Face...")
try:
    from deepface import DeepFace
    r = DeepFace.represent(
        img_path=os.path.join(os.path.dirname(__file__), "reference_photos", "STU0003.jpg"),
        model_name="VGG-Face",
        enforce_detection=False,
        detector_backend="opencv"
    )
    print("VGG-Face OK, embedding size:", len(r[0]['embedding']))
except Exception as e:
    print("VGG-Face ERROR:", e)
