# 📦 DineInGo Storage Guide (Persistent Uploads)

## ⚠️ The Issue: Ephemeral Storage on Render
Render's local file system is **ephemeral**. This means any files uploaded to the `backend/uploads/` directory (like user avatars or restaurant images) are **deleted** whenever:
1.  You deploy a new version of the code.
2.  The backend service restarts.
3.  The service "spins down" due to inactivity (Free Tier).

This is why you are seeing **404 (Not Found)** errors for images that were previously working.

---

## ✅ Solution 1: Cloudinary (Recommended - Easiest)
Cloudinary provides a permanent cloud home for your images. It also automatically optimizes them for the web.

### 1. Setup
1.  Create a free account at [Cloudinary.com](https://cloudinary.com/).
2.  Get your **Cloud Name**, **API Key**, and **API Secret** from the dashboard.

### 2. Implementation Steps
1.  **Install dependencies**:
    ```bash
    cd backend
    npm install cloudinary multer-storage-cloudinary
    ```
2.  **Update `.env`**:
    Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
3.  **Update Upload Middleware**:
    Modify your multer configuration (usually in `backend/src/middleware/upload.ts`) to use `CloudinaryStorage` instead of `diskStorage`.

---

## 🛠️ Solution 2: Persistent Disk (Easiest - But Paid)
If you want to keep using the current local storage code, you can attach a **Persistent Disk** to your Render service.
- **Cost**: Starts at ~$5/month for 1GB.
- **How**: In Render Dashboard > Your Service > Disks > **Add Disk**.
- **Mount Path**: Set it to `/opt/render/project/src/backend/uploads`.

---

## 🚀 Solution 3: Firebase Storage (Free Tier Friendly)
Since you are already using Firebase for Authentication, you can use **Firebase Storage**.
1.  Enable Storage in your Firebase Console.
2.  Update the backend to upload files to Firebase Storage using the `firebase-admin` SDK.

---

> [!TIP]
> **Need help migrating?**
> If you decide to go with Cloudinary or Firebase, I can help you update the code to support these services! Just let me know which one you prefer.
