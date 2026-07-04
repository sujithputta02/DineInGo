# 🚀 DineInGo Deployment Guide

This guide explains how to host your **Frontend on Vercel** and your **Backend on Koyeb** for free.

---

## 🎨 Frontend: Vercel (Truly Free)

1.  **Push your code to GitHub.**
2.  **Go to [Vercel](https://vercel.com/)** and click **"Add New" > "Project"**.
3.  **Import your repository.**
4.  **Configure Project:**
    *   **Framework Preset:** Vite (Auto-detected).
    *   **Root Directory:** `./` (Default).
5.  **Environment Variables:**
    *   `VITE_API_URL`: Your **Koyeb Backend URL** (e.g., `https://your-app.koyeb.app`).
6.  **Click Deploy.**
    *   *Note: I already added `vercel.json` to handle your app's routing.*

---

## ⚙️ Backend: Koyeb (Truly Free)

1.  **Go to [Koyeb](https://app.koyeb.com/)** and click **"Create Service"**.
2.  **Select GitHub** and choose your repository.
3.  **Service Configuration:**
    *   **App Root:** `/backend` (CRITICAL: Set this to the backend folder).
    *   **Instance Type:** Nano ($0/mo).
    *   **Builder:** Buildpack (Auto-detected).
4.  **Environment Variables:**
    *   `PORT`: `8080` (Standard).
    *   `NODE_ENV`: `production`
    *   `MONGODB_URI`: Your MongoDB Atlas connection string.
    *   `FRONTEND_URL`: Your **Vercel URL** (e.g., `https://your-app.vercel.app`).
    *   `ADMIN_URL`: Your **Vercel URL** (same as above).
    *   `JWT_SECRET`: Any strong random string.
    *   `BREVO_API_KEY`: Your Brevo key.
    *   `BREVO_SMTP_USER`: Your Brevo SMTP user.
    *   `EMAIL_USER`: Your Gmail (fallback).
    *   `EMAIL_PASS`: Your Gmail App Password.
5.  **Click Deploy.**

---

## ✅ Post-Deployment Check
1.  Ensure you add your **Vercel URL** to the `FRONTEND_URL` in Koyeb.
2.  Ensure you add your **Koyeb URL** to the `VITE_API_URL` in Vercel.
3.  **CORS**: I have already updated the backend to allow your Vercel URL automatically.

---
**Need help? Just ask!**
