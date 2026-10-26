---
title: DineInGo Food 3D TripoSR
emoji: 🍲
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: mit
short_description: Free Image-to-3D Food Reconstruction for DineInGo WebAR
---

# DineInGo AI Food 3D Reconstruction Space

This is the private Hugging Face ZeroGPU inference service for **DineInGo**. It performs feed-forward image-to-3D reconstruction on single food photographs using the open-weight **TripoSR** model.

## Model Specifications
* **Architecture:** Triplane Structure Reconstruction (TripoSR)
* **Model ID:** `stabilityai/TripoSR`
* **Official Repository:** `https://github.com/VAST-AI-Research/TripoSR`
* **License:** MIT License (Permissive open-source)
* **Hardware Target:** Hugging Face ZeroGPU (NVIDIA A10G)

## API Endpoints
* `POST /reconstruct`: Generates a calibrated 3D GLB model from a food image.
  * Inputs:
    * `image`: Input food image (file or base64)
    * `reference_plate_diameter`: Reference plate diameter in meters (default: `0.24`)
    * `mc_resolution`: Marching cubes grid resolution (default: `256`)
  * Outputs:
    * `output_model`: Calibrated `.glb` 3D model file
    * `metadata`: JSON object containing bounding box dimensions, vertex count, and alignment status.
* `GET /health`: Health check endpoint.
