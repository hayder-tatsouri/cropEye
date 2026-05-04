
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import onnxruntime as ort
import os

app = Flask(__name__)
CORS(app)

# ── CONFIG — update MODEL_PATH to where you put best_yolov8n_int8_320.onnx ──
MODEL_PATH  = "best_yolov8n_int8_320.onnx"   # put model in same folder as this script
IMG_SIZE    = 320
CONF_THRESH = 0.25
IOU_THRESH  = 0.45
CLASS_NAMES = ["healthy", "damaged"]
BOX_COLORS  = {
    0: (34, 197, 94),    # green  → healthy
    1: (0, 0, 255),      # red    → damaged
}

# ── Load model ────────────────────────────────────────────────
print(f"[INFO] Loading model: {MODEL_PATH}")
session  = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
inp_name = session.get_inputs()[0].name
print(f"[INFO] Model loaded — Input: {session.get_inputs()[0].shape}")
print(f"[INFO] Classes: {CLASS_NAMES}")

# ═════════════════════════════════════════════════════════════
#  DETECTION HELPERS
# ═════════════════════════════════════════════════════════════

def letterbox(img, new_size=320):
    h, w = img.shape[:2]
    scale = new_size / max(h, w)
    nh, nw = int(h * scale), int(w * scale)
    resized = cv2.resize(img, (nw, nh))
    canvas = np.full((new_size, new_size, 3), 114, dtype=np.uint8)
    pad_top  = (new_size - nh) // 2
    pad_left = (new_size - nw) // 2
    canvas[pad_top:pad_top+nh, pad_left:pad_left+nw] = resized
    return canvas, scale, pad_left, pad_top

def preprocess(img):
    img_lb, scale, pl, pt = letterbox(img, IMG_SIZE)
    rgb  = cv2.cvtColor(img_lb, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    blob = np.transpose(rgb, (2, 0, 1))[np.newaxis]
    return blob, scale, pl, pt

def xywh2xyxy(boxes):
    out = np.zeros_like(boxes)
    out[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
    out[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
    out[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
    out[:, 3] = boxes[:, 1] + boxes[:, 3] / 2
    return out

def nms(boxes, scores, iou_thresh):
    x1, y1, x2, y2 = boxes[:,0], boxes[:,1], boxes[:,2], boxes[:,3]
    areas = (x2-x1)*(y2-y1)
    order = scores.argsort()[::-1]
    keep  = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0, xx2-xx1)*np.maximum(0, yy2-yy1)
        iou   = inter/(areas[i]+areas[order[1:]]-inter+1e-6)
        order = order[1:][iou <= iou_thresh]
    return keep

def postprocess(output, scale, pl, pt, orig_h, orig_w):
    pred      = output[0][0].T
    boxes_raw = pred[:, :4]
    scores    = pred[:, 4:]
    cls_ids   = np.argmax(scores, axis=1)
    confs     = scores[np.arange(len(scores)), cls_ids]
    mask = confs >= CONF_THRESH
    boxes_raw, confs, cls_ids = boxes_raw[mask], confs[mask], cls_ids[mask]
    if len(boxes_raw) == 0:
        return []
    boxes_xyxy = xywh2xyxy(boxes_raw)
    keep       = nms(boxes_xyxy, confs, IOU_THRESH)
    boxes_xyxy = boxes_xyxy[keep]
    confs      = confs[keep]
    cls_ids    = cls_ids[keep]
    results = []
    for (x1, y1, x2, y2), conf, cls_id in zip(boxes_xyxy, confs, cls_ids):
        x1 = max(0, (x1-pl)/scale)
        y1 = max(0, (y1-pt)/scale)
        x2 = min(orig_w, (x2-pl)/scale)
        y2 = min(orig_h, (y2-pt)/scale)
        results.append((int(x1),int(y1),int(x2),int(y2),float(conf),int(cls_id)))
    return results

# ═════════════════════════════════════════════════════════════
#  ROUTES
# ═════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return jsonify({
        "status": "running",
        "model":  MODEL_PATH,
        "classes": CLASS_NAMES,
        "endpoints": ["/predict", "/health"]
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_PATH})

@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts an image file via multipart form (field: 'file' or 'image').
    Returns list of detections compatible with your React app.
    """
    # Get image from request
    file = request.files.get("file") or request.files.get("image")
    if file is None:
        return jsonify({"error": "No file uploaded. Use field name 'file' or 'image'"}), 400

    # Decode image
    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "Could not decode image"}), 400

    orig_h, orig_w = img.shape[:2]

    # Run detection
    blob, scale, pl, pt = preprocess(img)
    output = session.run(None, {inp_name: blob})
    dets   = postprocess(output, scale, pl, pt, orig_h, orig_w)

    # Format response — matches your existing React normalizeBox() format
    detections = []
    healthy = 0
    damaged = 0
    for (x1, y1, x2, y2, conf, cls_id) in dets:
        cls_name = CLASS_NAMES[cls_id]
        detections.append({
            "x1":         x1,
            "y1":         y1,
            "x2":         x2,
            "y2":         y2,
            "confidence": round(conf, 3),
            "class":      cls_name,
            "label":      cls_name,
            "status":     "healthy" if cls_id == 0 else "infected",
        })
        if cls_id == 0:
            healthy += 1
        else:
            damaged += 1

    return jsonify({
        "detections":    detections,
        "healthy_count": healthy,
        "damaged_count": damaged,
        "total_count":   len(detections),
        "image_width":   orig_w,
        "image_height":  orig_h,
    })


if __name__ == "__main__":
    if not os.path.exists(MODEL_PATH):
        print(f"\n[ERROR] Model not found: {MODEL_PATH}")
        print("  → Put best_yolov8n_int8_320.onnx in the same folder as this script\n")
    else:
        print("\n" + "="*50)
        print("  Local Detection Server running!")
        print("  URL: http://localhost:5000")
        print("  Endpoint: POST http://localhost:5000/predict")
        print("="*50 + "\n")
        app.run(host="0.0.0.0", port=5000, debug=False)
