![DineInGo Logo](public/images/DineInGo%20Logo.png)

# 🍽️ DineInGo - The Future of Indian Dining (Version 1.0) 🚀

> **Revolutionizing dining experiences across India with AI, AR, and Personality.** 🇮🇳

DineInGo is a next-generation restaurant and event reservation platform specifically designed for the vibrant Indian market. Built for both food enthusiasts and business owners, it combines cutting-edge technology like Augmented Reality and Multilingual AI with a playful, interactive mascot to make every meal memorable.

[![Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)](package.json)
[![Status](https://img.shields.io/badge/status-production--ready-success.svg)](RELEASE_CHECKLIST.md)
[![AI Powered](https://img.shields.io/badge/AI-Sarvam%20AI-orange.svg)](https://www.sarvam.ai/)

---

## 🦖 Meet Dino: Your Interactive Dining Companion
DineInGo is no longer just a booking app; it has a personality. **Dino**, our friendly mascot, is integrated into every flow:
- **Interactive Onboarding**: Dino reacts to your preferences in real-time as you set up your profile.
- **Smart Waitlist Guard**: Dino watches your spot in the queue and keeps you updated.
- **Dino's Picks**: High-confidence personalized recommendations highlighted on your dashboard.
- **"Stomp" Stepper**: A custom booking progress tracker that makes every reservation feel like an adventure.

---

## 👤 For Diners (User App)
The user experience is built around discovery, personalization, and gamification.

### 🌟 Personalized Discovery
- **Hyper-Personalization**: A unique onboarding journey that learns your favorite cuisines, spice levels, and dietary requirements.
- **Dino's Smart Recommendations**: Get a "Match Score" for every restaurant based on your personal profile.
- **Premium Identity**: Custom `InitialsAvatar` system with dynamic gradients and a glassmorphic identity selector.

### 🍽️ Booking & Reservations
- **Visual 2D Floor Plans**: Navigate through multiple floors (Ground to 3rd) and choose your exact table.
- **Real-Time Status**: Instant table availability updates powered by Socket.IO.
- **Special Requests**: Add notes for celebrations, seating preferences, or allergies.
- **Instant Confirmation**: Receive professional HTML invoices and digital tickets directly in your inbox.

### � Events & Lifestyle
- **Interactive Seat Mapping**: Choose your specific seat for concerts, food festivals, or networking events.
- **Digital Ticketing**: Every booking generates a unique QR code for seamless venue entry.
- **Waitlist Control**: If an event is full, Dino helps you join the waitlist with real-time position tracking.

### 👓 Cutting-Edge Experience
- **AR Menu Preview**: View dishes in 1:1 scale 3D using your camera before ordering.
- **Nutritional Analytics**: Swipe on an AR dish to see calories, macros, and sustainability scores.
- **Achievement System**: Earn points and badges like "Cuisine Explorer" or "Sustainable Diner" for your activities.

### 💬 Content Management
- **My Reviews Dashboard**: A dedicated hub to manage all your feedback.
- **Edit/Delete Controls**: Update your ratings or comments at any time to reflect your latest experience.

---

## 🏢 For Businesses (Owner/Admin App)
A robust management suite designed to empower restaurant and event owners.

### 📊 Real-Time Command Center
- **Performance Analytics**: Track revenue, booking counts, and peak hours at a glance.
- **Customer Insights**: Monitor average ratings and sentiment trends.
- **Live Feed**: See incoming bookings, waitlist additions, and check-ins in real-time.

### �️ Operation Management
- **Visual Floor Plan Designer**: Drag-and-drop tool to create and manage table layouts across multiple levels.
- **Booking Control**: Confirm, cancel, or modify reservations with instant customer notifications.
- **Waitlist Management**: Prioritize VIP guests or manage walk-ins during rush hours.

### 🤝 Customer Engagement
- **Review Reply Portal**: Respond directly to customer feedback with a professional business voice.
- **Content Moderation**: Edit or delete owner responses to maintain a high-quality public profile.
- **Sustainability Dashboard**: Update and showcase your restaurant's eco-friendly practices and local sourcing scores.

---

## 🌍 Multilingual Support
DineInGo is build for the diverse Indian landscape, supporting 6 major languages with AI-powered context awareness:
- 🇬🇧 English | 🇮🇳 Hindi (हिंदी) | 🇮🇳 Tamil (தமிழ்)
- 🇮🇳 Kannada (ಕನ್ನಡ) | 🇮🇳 Telugu (తెలుగు) | 🇮🇳 Malayalam (മലയാളം)

---

## 🚀 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion (Animations) + Lucide Icons
- **Real-Time**: Socket.IO Client
- **Auth**: Firebase Authentication (Google & Email/OTP flow)

### Backend
- **Core**: Node.js + Express + TypeScript
- **Database**: MongoDB Atlas + Mongoose ODM
- **AI Engine**: **Sarvam AI** (Primary Multilingual LLM) with **OpenRouter** (Fallback)
- **Infrastructure**: Nodemailer (SMTP), PDFKit (Invoices), QRCode, GridFS (Media)

---

## 🛠️ Installation & Setup

1. **Clone & Install**:
   ```bash
   git clone https://github.com/dineingo/app.git
   npm install
   cd backend && npm install
   ```

2. **Environment Configuration**:
   Run our automated setup script:
   ```bash
   node scripts/setup-team-env.js
   ```

3. **Database Initialization**:
   ```bash
   cd backend
   npm run init:chatbot
   ```

4. **Launch Development Environment**:
   ```bash
   # From root
   npm run start:all
   ```

---

## 🎯 Our Mission
DineInGo's mission is to make every meal memorable. By combining AI-driven personalization with a playful mascot and professional business tools, we are shaping the future of dining in India—one booking at a time.

**Let's make every meal an adventure!** 🍽️🦖✨

---
© DineInGo 2025. All rights reserved. **Version 1.0.0** | **Production Ready** 🚀
