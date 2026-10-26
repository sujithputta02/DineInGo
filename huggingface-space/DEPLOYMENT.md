# Hugging Face Space Deployment Guide: `sujithputta/dineingo-food-3d`

This document details the exact process for deploying the DineInGo TripoSR 3D food reconstruction pipeline to your private Hugging Face ZeroGPU Space.

---

## 1. Space Overview
* **Space Name:** `sujithputta/dineingo-food-3d`
* **SDK:** Gradio 4.44.0
* **Hardware:** ZeroGPU (NVIDIA A10G allocation)
* **Access Level:** Private
* **Core Model:** `stabilityai/TripoSR` (MIT License)

---

## 2. Deployment Instructions (Pushing Code to the Space)

### Method A: Git Push Directly to Hugging Face Space (Recommended)

1. Clone your Hugging Face Space repository:
   ```bash
   git clone https://huggingface.co/spaces/sujithputta/dineingo-food-3d /tmp/hf-space-clone
   ```
   *(When prompted for credentials, use your Hugging Face username and a write-capable personal access token)*

2. Copy the files from `huggingface-space/` into the cloned repository:
   ```bash
   cp huggingface-space/app.py /tmp/hf-space-clone/
   cp huggingface-space/requirements.txt /tmp/hf-space-clone/
   cp huggingface-space/README.md /tmp/hf-space-clone/
   ```

3. Commit and push:
   ```bash
   cd /tmp/hf-space-clone
   git add app.py requirements.txt README.md
   git commit -m "Deploy DineInGo TripoSR ZeroGPU Gradio pipeline"
   git push origin main
   ```

### Method B: Hugging Face Web Interface (Drag & Drop)

1. Navigate to: `https://huggingface.co/spaces/sujithputta/dineingo-food-3d`
2. Click **Files and versions** -> **Add file** -> **Upload files**.
3. Upload:
   - `app.py`
   - `requirements.txt`
   - `README.md`
4. Commit changes directly to `main`.

---

## 3. Verifying Space Build & Startup

1. Open the Space in your browser: `https://huggingface.co/spaces/sujithputta/dineingo-food-3d`.
2. Observe the **Build logs**:
   - ZeroGPU environment installs dependencies from `requirements.txt`.
   - On initial start, the app loads `stabilityai/TripoSR` weights.
3. Once the badge turns **Running**, the `/reconstruct` Gradio API is live!

---

## 4. Backend Environment Configuration

In your backend `.env`:
```env
HF_SPACE_ID=sujithputta/dineingo-food-3d
HF_TOKEN=your_huggingface_read_token_here
HF_RECONSTRUCTION_ENABLED=true
HF_RECONSTRUCTION_TIMEOUT_MS=120000
```

> **Security Note:** The `HF_TOKEN` must NEVER be exposed to the client or placed in Vite variables. It is strictly used by the Node.js Express backend to communicate with the private Space.
