"""
DineInGo AI Food 3D Reconstruction Service
──────────────────────────────────────────
Hugging Face ZeroGPU Gradio Inference Application
Model: TripoSR (stabilityai/TripoSR) - MIT License
"""

import os
import sys
import uuid
import json
import tempfile
import numpy as np  # type: ignore
from PIL import Image  # type: ignore
import trimesh  # type: ignore

# Try importing Hugging Face ZeroGPU spaces decorator
try:
    import spaces  # type: ignore
except ImportError:
    # Graceful fallback for local CPU testing or non-ZeroGPU environments
    class DummySpaces:
        @staticmethod
        def GPU(duration=60):
            def decorator(func):
                return func
            return decorator
    spaces = DummySpaces()

import gradio as gr  # type: ignore

# Global model and session singletons
tsr_model = None
rembg_session = None

def get_rembg_session():
    global rembg_session
    if rembg_session is None:
        try:
            import rembg  # type: ignore
            rembg_session = rembg.new_session("u2net")
        except Exception as e:
            print(f"[TripoSR App] Warning: rembg session initialization failed: {e}")
    return rembg_session

def load_triposr_model():
    global tsr_model
    if tsr_model is None:
        try:
            import torch  # type: ignore
            from tsr.system import TSR  # type: ignore

            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            print(f"[TripoSR App] Loading model weights stabilityai/TripoSR onto {device}...")
            
            tsr_model = TSR.from_pretrained(
                "stabilityai/TripoSR",
                config_name="config.yaml",
                weight_name="model.ckpt"
            )
            tsr_model.renderer.set_chunk_size(131072)
            tsr_model.to(device)
            print("[TripoSR App] TripoSR neural pipeline successfully initialized.")
        except Exception as e:
            print(f"[TripoSR App] Error loading TripoSR model: {e}")
            raise RuntimeError(f"Failed to load TripoSR model: {str(e)}")
    return tsr_model

def preprocess_food_image(input_image: Image.Image, foreground_ratio: float = 0.85) -> Image.Image:
    """
    Remove background and pad/center food object on transparent or neutral background.
    """
    try:
        import rembg  # type: ignore
        session = get_rembg_session()
        
        # Ensure RGBA
        if input_image.mode != "RGBA":
            input_image = input_image.convert("RGBA")
            
        # Segment foreground
        if session:
            no_bg = rembg.remove(input_image, session=session)
        else:
            no_bg = rembg.remove(input_image)
            
        # Find bounding box of non-zero alpha
        alpha = np.array(no_bg)[:, :, 3]
        bbox = np.argwhere(alpha > 10)
        
        if len(bbox) == 0:
            return input_image.convert("RGB")
            
        y_min, x_min = bbox.min(axis=0)
        y_max, x_max = bbox.max(axis=0)
        
        cropped = no_bg.crop((x_min, y_min, x_max, y_max))
        
        # Fit into square canvas of 512x512 with desired foreground ratio
        w, h = cropped.size
        max_dim = max(w, h)
        target_dim = int(512 * foreground_ratio)
        scale = target_dim / max_dim
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        canvas = Image.new("RGBA", (512, 512), (128, 128, 128, 0))
        paste_x = (512 - new_w) // 2
        paste_y = (512 - new_h) // 2
        canvas.paste(resized, (paste_x, paste_y), resized)
        
        # Composite onto 50% neutral gray for TripoSR encoder
        bg = Image.new("RGB", (512, 512), (128, 128, 128))
        bg.paste(canvas, mask=canvas.split()[3])
        return bg
    except Exception as e:
        print(f"[TripoSR App] Preprocessing fallback: {e}")
        return input_image.convert("RGB").resize((512, 512))

@spaces.GPU(duration=60)
def generate_3d_mesh(processed_image: Image.Image, mc_resolution: int = 256):
    """
    Executes real TripoSR feed-forward neural reconstruction on Hugging Face ZeroGPU.
    """
    import torch  # type: ignore
    model = load_triposr_model()
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    
    with torch.no_grad():
        scene_codes = model(processed_image, device=device)
        meshes = model.extract_mesh(scene_codes, resolution=int(mc_resolution), threshold=25.0)
        
    return meshes[0]

def calibrate_and_export_glb(raw_mesh, reference_plate_diameter: float = 0.24) -> tuple[str, dict]:
    """
    Calibrate mesh geometry for mobile AR:
    1. Align contact plane so Y_min = 0.000m.
    2. Center X and Z at origin.
    3. Uniformly scale mesh using known physical reference (e.g. plate diameter).
    4. Validate geometry (no NaNs, positive volume, finite bounds).
    5. Export web-compliant GLB.
    """
    if not isinstance(raw_mesh, trimesh.Trimesh):
        # Convert if necessary
        vertices = np.array(raw_mesh.vertices)
        faces = np.array(raw_mesh.faces)
        vertex_colors = getattr(raw_mesh, 'vertex_colors', None)
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces, vertex_colors=vertex_colors)
    else:
        mesh = raw_mesh.copy()

    # Validate finite coordinates
    if not np.all(np.isfinite(mesh.vertices)):
        raise ValueError("Mesh contains invalid non-finite vertices (NaN or Inf).")

    bounds = mesh.bounds
    min_b = bounds[0]
    max_b = bounds[1]
    
    raw_w = float(max_b[0] - min_b[0])
    raw_h = float(max_b[1] - min_b[1])
    raw_d = float(max_b[2] - min_b[2])

    if raw_w <= 0 or raw_h <= 0 or raw_d <= 0:
        raise ValueError("Degenerate 3D geometry with non-positive dimensions.")

    # 1. Center in X and Z
    x_center = (min_b[0] + max_b[0]) / 2.0
    z_center = (min_b[2] + max_b[2]) / 2.0
    mesh.vertices[:, 0] -= x_center
    mesh.vertices[:, 2] -= z_center

    # 2. Place bottom on horizontal contact plane (Y_min = 0.000m)
    mesh.vertices[:, 1] -= min_b[1]

    # 3. Uniform metric calibration based on reference plate diameter
    ref_diam = float(reference_plate_diameter) if reference_plate_diameter > 0 else 0.24
    horizontal_span = max(raw_w, raw_d)
    scale_factor = ref_diam / horizontal_span if horizontal_span > 0 else 1.0

    # UNIFORM scaling preserves natural food geometry
    mesh.apply_scale(scale_factor)

    calibrated_bounds = mesh.bounds
    final_w = float(calibrated_bounds[1][0] - calibrated_bounds[0][0])
    final_h = float(calibrated_bounds[1][1] - calibrated_bounds[0][1])
    final_d = float(calibrated_bounds[1][2] - calibrated_bounds[0][2])

    # 4. Export GLB
    output_dir = tempfile.gettempdir()
    unique_filename = f"reconstruction_{uuid.uuid4().hex[:12]}.glb"
    output_path = os.path.join(output_dir, unique_filename)

    glb_data = trimesh.exchange.gltf.export_glb(mesh)
    with open(output_path, "wb") as f:
        f.write(glb_data)

    # Validate output file
    if not os.path.exists(output_path) or os.path.getsize(output_path) < 100:
        raise IOError("GLB exporter failed to generate valid binary payload.")

    metadata = {
        "success": True,
        "modelName": "TripoSR",
        "modelId": "stabilityai/TripoSR",
        "license": "MIT",
        "assetQuality": "reconstructed-model",
        "dimensions": {
            "widthMeters": round(final_w, 3),
            "heightMeters": round(final_h, 3),
            "depthMeters": round(final_d, 3)
        },
        "contactPlaneAligned": True,
        "referencePlateDiameterMeters": ref_diam,
        "vertexCount": int(len(mesh.vertices)),
        "faceCount": int(len(mesh.faces)),
        "fileSizeBytes": int(os.path.getsize(output_path))
    }

    return output_path, metadata

def reconstruct(image: Image.Image, reference_plate_diameter: float = 0.24, mc_resolution: int = 256):
    """
    Main Gradio API endpoint:
    Takes food image -> pre-processes -> runs ZeroGPU inference -> calibrates -> returns GLB & metadata.
    """
    if image is None:
        raise gr.Error("No food image was provided.")

    print(f"[TripoSR API] Processing reconstruction request (plate reference: {reference_plate_diameter}m)...")
    
    # Preprocess
    processed = preprocess_food_image(image)
    
    # Run ZeroGPU inference
    raw_mesh = generate_3d_mesh(processed, mc_resolution=mc_resolution)
    
    # Calibrate and export
    glb_path, metadata = calibrate_and_export_glb(raw_mesh, reference_plate_diameter)
    
    print(f"[TripoSR API] Successfully exported calibrated model: {glb_path} ({metadata['dimensions']})")
    return glb_path, metadata

# Build Gradio UI & API
with gr.Blocks(title="DineInGo Food 3D Reconstruction") as demo:
    gr.Markdown("# 🍲 DineInGo AI Food 3D Reconstruction Service")
    gr.Markdown("Real-time feed-forward image-to-3D food model generator using open-weight **TripoSR** on Hugging Face ZeroGPU.")

    with gr.Row():
        with gr.Column():
            input_image = gr.Image(type="pil", label="Input Food Photo")
            plate_diam = gr.Slider(
                minimum=0.10,
                maximum=0.45,
                value=0.24,
                step=0.01,
                label="Reference Plate / Bowl Diameter (meters)"
            )
            res_slider = gr.Slider(
                minimum=128,
                maximum=320,
                value=256,
                step=64,
                label="Marching Cubes Grid Resolution"
            )
            submit_btn = gr.Button("Generate 3D Model", variant="primary")
            
        with gr.Column():
            output_model = gr.Model3D(label="Calibrated 3D GLB Model")
            output_meta = gr.JSON(label="AR Geometry Metadata")

    submit_btn.click(
        fn=reconstruct,
        inputs=[input_image, plate_diam, res_slider],
        outputs=[output_model, output_meta],
        api_name="reconstruct"
    )

if __name__ == "__main__":
    demo.queue(max_size=20).launch()
