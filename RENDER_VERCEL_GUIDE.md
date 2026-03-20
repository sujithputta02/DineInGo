# 🚀 DineInGo Deployment Guide (Render + Vercel)

This guide provides step-by-step instructions for hosting your **Frontend on Vercel** and your **Backend on Render.com** (No credit card required).

---

## 🎨 Step 1: Frontend Deployment (Vercel)

1.  **Push your code to GitHub.**
2.  **Go to [Vercel](https://vercel.com/)** and click **"Add New" > "Project"**.
3.  **Import your repository.**
4.  **Configure Project:**
    *   **Framework Preset:** Vite.
    *   **Root Directory:** `./`.
5.  **Environment Variables:**
    *   Add `VITE_API_URL`: Your **Render Backend URL** (e.g., `https://your-backend.onrender.com`).
6.  **Click Deploy.**

---

## ⚙️ Step 2: Backend Deployment (Render)

Render is free and doesn't require a credit card for the "Free" plan.

1.  **Go to [Render.com](https://render.com/)** and sign in with GitHub.
2.  **Click "New" > "Web Service"**.
3.  **Select your repository.**
4.  **Configure Web Service:**
    *   **Name**: `dineingo-backend`
    *   **Region**: Select the one closest to you.
    *   **Branch**: `main`
    *   **Root Directory**: `backend` (⚠️ **CRITICAL: Set this to the backend folder**)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `node dist/server.js`
5.  **Instance Type**: Select **"Free"**.
6.  **Environment Variables:**
    *   Click **"Advanced" > "Add Environment Variable"**:
    *   `PORT`: `10000` (Render's default, or leave blank—Render handles this).
    *   `NODE_ENV`: `production`
    *   `MONGODB_URI`: Your MongoDB Atlas string.
    *   `FRONTEND_URL`: Your **Vercel URL**.
    *   `ADMIN_URL`: Your **Vercel URL**.
    *   `JWT_SECRET`: A long random string.
7.  **Click "Create Web Service".**

---

## 🔗 Step 3: Linking Them Together

1.  **Get your Render URL** (e.g., `https://dine-backend.onrender.com`).
2.  **Update Vercel**: Add this URL to `VITE_API_URL` in Vercel settings and redeploy.
3.  **Update Render**: Add your Vercel URL to `FRONTEND_URL` and `ADMIN_URL` in Render settings.

> [!TIP]
> **Free Tier Sleep**: Render servers go to sleep after 15 minutes of inactivity. The first time someone visits your app after a break, it may take 30 seconds to start. This is normal for the free plan!
