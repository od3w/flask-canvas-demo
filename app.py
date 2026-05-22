"""
Flask + MNIST CNN：手寫數字辨識網頁。
啟動：python app.py  → 開 http://localhost:5000
"""
import io
import os
import base64

import numpy as np
from flask import Flask, render_template, request, jsonify
from PIL import Image, ImageOps
from tensorflow.keras.models import load_model

MODEL_PATH = 'mnist_cnn.h5'

app = Flask(__name__)

model = load_model(MODEL_PATH)


def preprocess(image_bytes: bytes) -> np.ndarray | None:
    """
    畫布是「白底黑筆」，MNIST 是「黑底白字」，要做：
      1. 轉灰階
      2. 反相（白↔黑）
      3. 找畫的範圍 (getbbox) 裁切
      4. 等比縮放成最長邊 20 px（MNIST 數字實際大小）
      5. 貼到 28×28 黑色畫布的中央
    這樣準確率會比「整張畫布原樣縮 28×28」高非常多。
    """
    img = Image.open(io.BytesIO(image_bytes)).convert('L')
    img = ImageOps.invert(img)

    bbox = img.getbbox()
    if bbox is None:
        return None  # 完全沒畫東西

    img = img.crop(bbox)
    w, h = img.size
    scale = 20.0 / max(w, h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    img = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new('L', (28, 28), color=0)
    canvas.paste(img, ((28 - new_w) // 2, (28 - new_h) // 2))

    arr = np.array(canvas, dtype='float32') / 255.0
    return arr.reshape(1, 28, 28, 1)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(silent=True)
    if not data or 'image' not in data:
        return jsonify({'error': 'missing image'}), 400

    # data['image'] 格式："data:image/png;base64,XXXX"
    b64 = data['image'].split(',', 1)[-1]
    try:
        image_bytes = base64.b64decode(b64)
    except Exception:
        return jsonify({'error': 'invalid base64'}), 400

    arr = preprocess(image_bytes)
    if arr is None:
        return jsonify({'error': '畫布是空的，請先畫一個數字'}), 400

    probs = model.predict(arr, verbose=0)[0]
    digit = int(probs.argmax())
    confidence = float(probs[digit])
    top3 = sorted(enumerate(probs), key=lambda x: -x[1])[:3]

    return jsonify({
        'digit': digit,
        'confidence': confidence,
        'top3': [{'digit': int(d), 'prob': float(p)} for d, p in top3],
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
