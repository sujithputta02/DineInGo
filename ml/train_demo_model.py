"""
DineInGo Quick Food Demo Model
"""
import os, json, subprocess
import numpy as np
import tensorflow as tf

OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'food_recognition')
SAVED_DIR    = os.path.join(os.path.dirname(__file__), 'saved_model')
LABELS_PATH  = os.path.join(OUTPUT_DIR, 'labels.json')
IMG_SIZE     = 224

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(SAVED_DIR, exist_ok=True)

CLASSES = [
    'biryani','burger','butter_chicken','cake','curry',
    'dosa','noodles','pasta','pizza','salad',
    'samosa','sandwich','soup','sushi','tikka_masala'
]
NUM_CLASSES = len(CLASSES)

with open(LABELS_PATH, 'w') as f:
    json.dump(CLASSES, f)
print(f"✅ Labels saved: {CLASSES}")

# Synthetic data
np.random.seed(42)
X = np.random.rand(400, IMG_SIZE, IMG_SIZE, 3).astype(np.float32)
y = np.array([i % NUM_CLASSES for i in range(400)])

print("🧠 Building model...")
base = tf.keras.applications.MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3), include_top=False, weights='imagenet'
)
base.trainable = False

inputs  = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x       = base(inputs, training=False)
x       = tf.keras.layers.GlobalAveragePooling2D()(x)
x       = tf.keras.layers.Dense(256, activation='relu')(x)
outputs = tf.keras.layers.Dense(NUM_CLASSES, activation='softmax')(x)
model   = tf.keras.Model(inputs, outputs)
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

model.fit(X, y, epochs=3, batch_size=16, verbose=1)

# Save as SavedModel
model.export(SAVED_DIR)
print(f"✅ SavedModel written to {SAVED_DIR}")

# Convert via CLI (avoids JAX import bug in tensorflowjs Python API)
print("📤 Converting to TF.js via CLI...")
result = subprocess.run([
    'tensorflowjs_converter',
    '--input_format=tf_saved_model',
    '--output_format=tfjs_graph_model',
    '--signature_name=serving_default',
    '--saved_model_tags=serve',
    SAVED_DIR,
    OUTPUT_DIR,
], capture_output=True, text=True)

if result.returncode == 0:
    print("✅ Demo model ready! Files in:", OUTPUT_DIR)
else:
    print("⚠️  CLI conversion failed:", result.stderr)
    print("Run manually: tensorflowjs_converter --input_format=tf_saved_model", SAVED_DIR, OUTPUT_DIR)
