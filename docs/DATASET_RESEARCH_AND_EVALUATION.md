# DineInGo AI Food Intelligence & 3D AR — Dataset Research & Model Evaluation Plan

> **Executive Summary:** Building a trustworthy, production-grade food intelligence and AR platform requires decomposing the machine learning problem into specialized subtasks. Food classification, ingredient segmentation, portion estimation, nutritional composition analysis, and 3D reconstruction cannot be solved by a single generic model. This document presents a comprehensive evaluation of authoritative food datasets, licensing constraints, regional coverage gaps, and a defensible engineering roadmap for custom training.

---

## 1. Machine Learning Task Decomposition

Food understanding involves distinct physical, chemical, and geometric modalities. Attempting to force an LLM or basic image classifier to perform 3D reconstruction and nutritional lab analysis produces hallucinations. We decouple the system into five distinct ML tasks:

```
                    ┌─────────────────────────┐
                    │    Input Food Photo     │
                    └────────────┬────────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     ▼                           ▼                           ▼
┌──────────────┐        ┌─────────────────┐        ┌──────────────────┐
│ Task 1: Food │        │ Task 2: Segment │        │ Task 3: 3D       │
│ Classification│       │ & Ingredients   │        │ Reconstruction   │
│ (Food-101 /  │        │ (FoodSeg103)    │        │ (MetaFood3D /    │
│  Vision LLM) │        └────────┬────────┘        │  NeRF / Meshy)   │
└──────┬───────┘                 │                 └────────┬─────────┘
       │                         │                          │
       │                         ▼                          │
       │                ┌─────────────────┐                 │
       │                │ Task 4: Portion │                 │
       │                │ & Volume (5k)   │                 │
       │                └────────┬────────┘                 │
       │                         │                          │
       └─────────────────────────┼──────────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │ Task 5: Nutrition       │
                    │ Intelligence (USDA/IFCT)│
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Real-World AR Display   │
                    │ & Meal Tracking Diary   │
                    └─────────────────────────┘
```

1. **Task 1 — Food Classification:** Identifying the culinary entity and dish category from visual appearance.
2. **Task 2 — Semantic Segmentation & Component Detection:** Isolating individual foods, garnishes, and side dishes on a plate.
3. **Task 3 — 3D Reconstruction & Tabletop Geometry:** Inferring depth, mesh geometry, UV textures, servingware bounds, and contact planes ($Y_{\min} = 0.000\text{m}$).
4. **Task 4 — Volumetric & Portion Estimation:** Predicting mass ($g$) and serving volume from 2D/3D visual cues with explicit uncertainty intervals.
5. **Task 5 — Nutritional Composition & Provenance:** Mapping identified components to verified biochemical lab records (USDA FoodData Central / IFCT).

---

## 2. Comprehensive Dataset Registry Matrix

| Dataset Name | Primary Task | Annotation Types | License & Commercial Use | Download Size / Access | Cuisine Coverage | 3D / Depth Available? | DineInGo Suitability |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Nutrition5k** (Google Research) | Portion & Mass, Calorie Prediction | RGB images, 4x overhead video, depth maps, mass ($g$), calories, macros | **CC-BY-4.0** (Commercial use permitted with attribution) | ~1.5 TB (Full video/depth) / ~15 GB (Downsampled RGB-D) | Western, Cafeteria, Mixed plates | **Yes** (Overhead Intel RealSense depth streams) | **High** for portion & calorie estimation validation |
| **MetaFood3D** (Purdue University) | 3D Food Reconstruction & Shape Modeling | 3D meshes (OBJ/PLY), multi-view RGB, camera extrinsics, nutritional tags | **Research Only / Non-Commercial** (Academic license) | ~80 GB (Requires university credential request) | Continental, American, Asian | **Yes** (True calibrated 3D meshes and point clouds) | **High** for 3D geometric validation; **Restricted** for commercial bundling |
| **FoodSeg103** | Semantic Ingredient Segmentation | Pixel-level semantic masks, 103 ingredient categories, 7,118 images | **CC-BY-NC-SA 4.0** (Non-commercial share-alike) | ~2.5 GB (Available via HuggingFace) | Global, Asian, Western | **No** (2D pixel segmentation only) | **Moderate** for component segmentation benchmarks |
| **Food-101** (ETH Zurich) | Food Classification & Category Screening | 101,000 images, 101 dish classes (1,000 images per class) | **Non-Commercial Research** (Flickr image rights retained by authors) | ~5 GB (Tarball) | Global, Continental, Fast food | **No** (2D images only) | **High** for on-device MobileNet edge classification |
| **USDA FoodData Central** | Chemical Food Composition & Provenance | 800,000+ foods, biochemical nutrients (energy, protein, fat, vitamins) | **Public Domain (US Government)** (Unrestricted commercial use) | REST API / Full JSON export (~2.2 GB) | American, Branded commercial products, Commodity staples | **No** (Tabular and relational biochemical records) | **Highest** for verified macro provenance and nutrition retrieval |
| **IFCT 2017** (ICMR - National Institute of Nutrition) | Indian Food Composition & Regional Recipes | 528 key Indian foods, 151 nutrient parameters, regional staples | **Crown/Gov Copyright** (Reference with attribution) | Published tables & PDF database | Comprehensive North/South/East/West Indian | **No** (Biochemical composition tables) | **Essential** for Indian regional cuisine nutrition fallback |

---

## 3. Deep-Dive Dataset Evaluations

### 3.1 Nutrition5k
* **Official Repository:** `https://github.com/google-research-datasets/Nutrition5k`
* **Scale:** 5,006 natural cafeteria food scanning sessions, 252 unique culinary ingredients.
* **Sensory Modalities:** 4 synchronized Intel RealSense D435 cameras capturing RGB and 16-bit depth streams, precision scale measurements to $\pm 0.1\text{g}$, and bomb-calorimetry validated nutritional composition.
* **Licensing:** CC-BY-4.0. Clean commercial rights for algorithmic benchmarking.
* **Cuisine Gaps:** Primarily North American corporate cafeteria meals (salads, grain bowls, grilled proteins). Completely lacks authentic Indian gravies, biryanis, dosas, and curries.
* **Suitability:** Exceptional benchmark for validating whether depth cues reliably improve portion weight prediction compared to single-frame 2D heuristics.

### 3.2 MetaFood3D
* **Official Portal:** `https://lorenz.ecn.purdue.edu/~food3d/`
* **Scale:** 1,200+ 3D textured mesh models with calibrated turntable multi-view photography.
* **Sensory Modalities:** High-resolution photogrammetric point clouds, reconstructed surface meshes, and paired nutritional annotations.
* **Licensing:** Academic research only. Cannot be bundled directly into commercial proprietary software without bilateral licensing.
* **Significance for AR:** Proves that food geometries exhibit non-convex topologies, specular sheen (oils/sauces), and subsurface scattering that generic industrial CAD datasets (ShapeNet) cannot represent.

### 3.3 FoodSeg103
* **Official Repository:** `https://huggingface.co/datasets/XiaoYuYa/FoodSeg103`
* **Scale:** 7,118 images with fine-grained polygon masks spanning 103 food ingredient classes.
* **Licensing:** CC-BY-NC-SA 4.0.
* **Suitability:** Essential for multi-dish plate isolation. Enables the system to separate a salad garnish from a steak cut on the same plate rather than conflating them into a single blob.

### 3.4 USDA FoodData Central
* **Official Portal:** `https://fdc.nal.usda.gov/`
* **Licensing:** Public Domain.
* **API Integration:** Already integrated into DineInGo via `src/services/usdaNutritionService.ts`.
* **Coverage Notes:** Excellent for raw ingredients (e.g., "romaine lettuce", "beef tenderloin", "yellow onion"), but poor for complex prepared regional ethnic cuisines where cooking methods dramatically alter fat absorption.

---

## 4. Regional Indian Cuisine Gap Analysis

Standard computer-vision and 3D datasets suffer from severe Western bias. The following table highlights critical failure modes for Indian cuisine and DineInGo's mitigation strategy:

| Indian Culinary Characteristic | Western Dataset Assumption | Impact on Computer Vision / AR | DineInGo Architectural Mitigation |
| :--- | :--- | :--- | :--- |
| **Liquid / Semi-Solid Curries** (Butter Chicken, Dal Makhani) | Discrete solid geometric objects with defined polygon edges | Photogrammetry struggles with specular sauce reflections and lacks internal depth | Classify outer serving vessel (e.g. handi/katori); infer volume from fill line; estimate nutrition from recipe ratios |
| **Layered Multi-Component Foods** (Dum Biryani) | Surface reflects entire nutritional content | Internal meat/paneer chunks, fried onions, and ghee layers are hidden under rice | Implement explicit **Uncertainty Intervals** (e.g. $\pm 55\text{g}$) and require user confirmation of portion size |
| **High Ghee / Oil Absorption** (Tandoori Roti, Paratha) | Baked goods have predictable standardized crumb and fat | Visual surface sheen does not indicate whether dough was kneaded with ghee or brushed lightly | Mark fat and calorie values with provenance `ai-estimated` rather than claiming verified lab accuracy |
| **Deep-Fried Specialties** (Samosa, Pakora) | Thin exterior crust with uniform filling | Air pockets inside puff pastry cause optical volume to overestimate actual food mass | Calibrated servingware dimensions prevent visual scale inflation |

---

## 5. Roadmap for Custom Model Training & Fine-Tuning

### Phase 1: Zero-Shot Foundation Models with Constrained Prompts (Current Baseline)
* Utilize multimodal vision models (OpenRouter Vision / Sarvam AI / Gemma 3) with rigid JSON schema output.
* Cascade to local MobileNet on-device model when offline.
* Combine with curated regional databases for immediate deterministic macro mapping.

### Phase 2: Domain-Specific Fine-Tuning of Food Segmentation Heads
* Train a lightweight YOLOv8-seg or MobileNetV4-seg model on a merged dataset:
  * FoodSeg103 (103 classes)
  * Curated Indian Food Dataset (5,000 labeled images of biryanis, curries, thalis, and south Indian breakfast items).
* Deploy as an ONNX WebAssembly model in the browser for instant sub-100ms bounding box and polygon extraction.

### Phase 3: Volumetric 3D Reconstruction via Turntable Gaussian Splatting / NeRF
* Capture multi-view video of authentic restaurant dishes placed on calibrated fiducial marker mats (providing real-world scale reference).
* Train 3D Gaussian Splatting (3DGS) representations to capture specular food gloss and complex geometries.
* Export lightweight, LOD-decimated GLB models optimized for mobile WebAR ($< 5\text{MB}$, fixed ground plane $Y_{\min}=0.000\text{m}$).

---

## 6. Scientific Ethics and Safety Standards

1. **Allergen Integrity:** An unverified model estimate or absent database entry must **NEVER** be displayed as "Allergen-Free". The system explicitly presents `INCOMPLETE_ALLERGEN_DATA` and warns the diner to confirm with restaurant staff.
2. **Provenance Transparency:** Every calorie and macronutrient number is strictly tagged with its origin:
   - `verified-restaurant`: Lab or chef verified.
   - `usda-database`: Government food-composition record.
   - `recipe-calculated`: Calculated from known recipe ingredient weights.
   - `ai-estimated`: Statistical heuristic estimate.
3. **Physical Scale Fidelity:** Models must use true metric dimensions with `ar-scale="fixed"`. Scale distortion creates false user expectations of food portion sizes.
