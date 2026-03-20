# 🚀 DineInGo Deployment Guide

This guide provides step-by-step instructions for hosting your **Frontend on Vercel** and your **Backend on Koyeb**.

---

## 🎨 Step 1: Frontend Deployment (Vercel)

Vercel is the best place to host your Vite/React frontend.

1.  **Push your code to GitHub.**
2.  **Go to [Vercel](https://vercel.com/)** and click **"Add New" > "Project"**.
3.  **Import your GitHub repository.**
4.  **Configure Project:**
    *   **Framework Preset:** Vite (should be auto-detected).
    *   **Root Directory:** Keep as `./` (the root of your repo).
    *   **Build Command:** `npm run build` (default).
    *   **Output Directory:** `dist` (default).
5.  **Environment Variables:**
    *   Add `VITE_API_URL`: Your **Koyeb Backend URL** (e.g., `https://your-backend-app.koyeb.app`).
    *   *Note: You can add this later after you deploy the backend.*
6.  **Click Deploy.**

> [!NOTE]
> I have already included a `vercel.json` file in your project root to handle client-side routing, so your pages (like `/dashboard`) will work correctly when refreshed.

---

## ⚙️ Step 2: Backend Deployment (Koyeb)

Koyeb is excellent for hosting Node.js APIs with high performance and a generous free tier.

1.  **Go to [Koyeb](https://app.koyeb.com/)** and click **"Create Service"**.
2.  **Select GitHub** and choose your repository.
3.  **Service Configuration:**
    *   **App Root:** `/backend` ( ⚠️ **CRITICAL:** You must set this so Koyeb looks inside the backend folder).
    *   **Instance Type:** Nano ($0/mo).
    *   **Builder:** Buildpack (Auto-detected).
4.  **Environment Variables:**
    *   Click **"Add Variable"** for each of these:
    *   `PORT`: `8080` (Standard for Koyeb).
    *   `NODE_ENV`: `production`
    *   `MONGODB_URI`: Your MongoDB Atlas connection string (ensure you whitelist `0.0.0.0/0` in Atlas or use a VPC).
    *   `FRONTEND_URL`: Your **Vercel URL** (e.g., `https://dineingo.vercel.app`).
    *   `ADMIN_URL`: Your **Vercel URL** (same as above).
    *   `JWT_SECRET`: A long random string (e.g., `your_super_secret_key_123`).
    *   `BREVO_API_KEY`: Your Brevo API key for emails.
    *   `EMAIL_USER`: Your Gmail address.
    *   `EMAIL_PASS`: Your Gmail App Password.
5.  **Click Deploy.**

---

## 🔗 Step 3: Linking Them Together

Once both are deployed, you need to ensure they can talk to each other:

1.  **Get your Koyeb URL** (e.g., `https://dine-backend-sujith.koyeb.app`).
2.  **Go to Vercel Settings > Environment Variables** and update `VITE_API_URL` with this Koyeb URL.
3.  **Redeploy Vercel** (or trigger a new build) to apply the change.
4.  **Get your Vercel URL** (e.g., `https://dineingo.vercel.app`).
5.  **Go to Koyeb Service Settings > Environment Variables** and update `FRONTEND_URL` and `ADMIN_URL` with this Vercel URL.
6.  **Koyeb will automatically redeploy** when you save environment variables.

---

## ✅ Final Checklist

- [ ] **CORS**: The backend is configured to allow requests from your `FRONTEND_URL`.
- [ ] **Routing**: `vercel.json` handles SPA routing for React.
- [ ] **Port**: Koyeb uses the `PORT` variable (8080) to route traffic to your Express app.
- [ ] **Database**: MongoDB Atlas IP Whitelisting is set to `0.0.0.0/0` (Allow access from anywhere) so Koyeb can connect.

**Congratulations! Your app should now be live!** 🥂
