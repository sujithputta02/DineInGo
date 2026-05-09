import os, json
import tensorflow as tf
import tensorflowjs as tfjs

SAVED_DIR = os.path.join(os.path.dirname(__file__), 'saved_model')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'food_recognition')
LABELS_PATH = os.path.join(OUTPUT_DIR, 'labels.json')

os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"📦 Loading pre-trained EfficientNetV2S from {SAVED_DIR}...")
# Load as a Keras model specifically
model = tf.keras.models.load_model(SAVED_DIR)
print("✅ Model loaded successfully!")

print("\n🚀 Converting to TF.js using internal API...")
# This avoids the protobuf CLI conflict
tfjs.converters.save_keras_model(model, OUTPUT_DIR)
print(f"✅ TF.js Model saved to {OUTPUT_DIR}")

# Standard Food-101 Labels
CLASS_NAMES = [
    "apple_pie", "baby_back_ribs", "baklava", "beef_carpaccio", "beef_tartare", "beet_salad", "beignets",
    "bibimbap", "bread_pudding", "breakfast_burrito", "bruschetta", "caesar_salad", "cannoli", "caprese_salad",
    "carrot_cake", "ceviche", "cheesecake", "cheese_plate", "chicken_curry", "chicken_quesadilla", "chicken_wings",
    "chocolate_cake", "chocolate_mousse", "churros", "clam_chowder", "club_sandwich", "crab_cakes", "creme_brulee",
    "croque_madame", "cup_cakes", "deviled_eggs", "donuts", "dumplings", "edamame", "eggs_benedict", "escargots",
    "falafel", "filet_mignon", "fish_and_chips", "foie_gras", "french_fries", "french_onion_soup", "french_toast",
    "fried_calamari", "fried_rice", "frozen_yogurt", "garlic_bread", "gnocchi", "greek_salad", "grilled_cheese_sandwich",
    "grilled_salmon", "guacamole", "gyozas", "hamburger", "hot_and_sour_soup", "hot_dog", "huevos_rancheros",
    "hummus", "ice_cream", "lasagna", "lobster_bisque", "lobster_roll_sandwich", "macaroni_and_cheese", "macarons",
    "miso_soup", "mussels", "nachos", "omelette", "onion_rings", "oysters", "pad_thai", "paella", "pancakes",
    "panna_cotta", "peking_duck", "pho", "pizza", "pork_chop", "poutine", "prime_rib", "pulled_pork_sandwich",
    "ramen", "ravioli", "red_velvet_cake", "risotto", "samosa", "sashimi", "scallops", "seaweed_salad",
    "shrimp_and_grits", "spaghetti_bolognese", "spaghetti_carbonara", "spring_rolls", "steak", "strawberry_shortcake",
    "sushi", "tacos", "takoyaki", "tiramisu", "tuna_tartare", "waffles"
]

with open(LABELS_PATH, 'w') as f:
    json.dump(CLASS_NAMES, f)
print(f"💾 Labels saved to {LABELS_PATH}")
