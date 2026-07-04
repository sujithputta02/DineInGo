# DineInGo — Beta V-1.0 Release Notes

Welcome to the **Beta V-1.0** release of **DineInGo**! 🚀

DineInGo is India's first truly interactive restaurant reservation, event ticketing, and digital menu ecosystem. It empowers customers to view interactive floor plans, reserve exact tables in real-time, pre-order meals, and discover curated local events. Simultaneously, it provides business owners with POS-compatible dashboards, waitlist automation, floor plan managers, and invoice metrics.

---

## 🌟 Key Release Highlights (Beta V-1.0)

### 1. Guest Browsing & Authentication Gate
Customers can now explore restaurant listings, menus, and event schedules without being forced to log in up-front.
- **Protected Actions**: Reservation checkouts, favorite toggles, and seat bookings remain strictly gated under secure routing.
- **Locked Explorer Reviews**: Review panels are obscured with a beautiful glassmorphism backdrop calling guests to log in/sign up.
- **Session Restoration**: Selecting tickets or booking slots as a guest caches selections in `sessionStorage` and automatically restores them upon post-login redirection.

### 2. High-Fidelity Themed Social sharing
A custom share panel is integrated into all restaurant and event profiles to enable direct sharing.
- **Social Integrations**: Dynamic sharing templates for **WhatsApp**, **Facebook**, **Instagram**, and **Messages (SMS)** with standard fallback "Copy Link" actions.
- **Dynamic SEO Link Previews**: Integrated a dynamic Helmet SEO tag injection engine mapping title, description, and hero images to `og:*` OpenGraph headers for messaging clients.
- **Unified Brand Identity**: Social buttons are styled in custom DineInGo emerald presets with premium scaling and color-inverting hover transitions.
- **Theme Reactivity**: Social panels automatically adapt to light/dark themes and system device appearance updates.

---

## 🛠 Feature Tour & Architecture

### 📱 Customer Suite
- **Interactive Seating Charts** ([SeatingChart.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/components/SeatingChart.tsx)): Displays real-time exact table locations, layout orientations, and occupancy statuses.
- **Pre-Order Food Menus** ([FoodMenu.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/FoodMenu.tsx)): Customers can select items and customize quantities before checking in.
- **Curated Events Listing** ([EventsPage.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/EventsPage.tsx)): Dynamic ticket ranges, date selectors, and seat bookings for local performances and events.
- **AR Menu Experience** ([ARMenuPage.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/ARMenuPage.tsx)): Visualizes dining menus using augmented reality graphics.

### 🏢 Business Owner Suite
- **Live Floor Plan Manager** ([FloorPlanManagement.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/business/FloorPlanManagement.tsx)): Drag-and-drop table layouts, adjust seating capacities, and save blueprints.
- **Digital Menu Editor** ([DigitalMenuEditor.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/business/DigitalMenuEditor.tsx)): Manage categories, dish prices, dietary labels, and availability status.
- **Waitlist & Booking Managers** ([WaitlistManagement.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/business/WaitlistManagement.tsx)): Live check-ins, automated text waitlists, and reservation timelines.
- **Invoice & Payouts Dashboard** ([PayoutDashboard.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/business/PayoutDashboard.tsx)): Manage Stripe/bank connections, view historic transaction grids, and track outstanding invoices.

### 👑 Admin Control Panel
- **Analytics Hub** ([AdminAnalyticsPage.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/AdminAnalyticsPage.tsx)): Tracks daily reservation volumes, user acquisition curves, and hot culinary trends.
- **System Health Monitor** ([AdminSystemHealthPage.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/AdminSystemHealthPage.tsx)): CPU loads, active socket logs, database metrics, and performance indexes.
- **Audit Logs & Security** ([AdminSecurityPage.tsx](file:///Users/sujithputta/Projects/DineInGo-App%20V1.0%20Beta/src/pages/AdminSecurityPage.tsx)): User role permissions, impersonation handlers, and access control records.

---

## 💻 Tech Stack Summary
- **Frontend Core**: React 18 with TypeScript.
- **Styling**: Tailwind CSS configuration utilizing root attribute selectors for light/dark theme shifts.
- **State & Router**: React Router DOM (v6), React Context providers.
- **Metadata**: React Helmet Async.
- **Bundler**: Vite.
- **Backend & Real-Time**: Socket.io real-time tables syncing, Firebase auth wrappers, node/express services.

---

*Thank you for exploring DineInGo. Enjoy booking your next culinary adventure!* 🍽
