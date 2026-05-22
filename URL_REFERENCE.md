# DineInGo - URL Reference Guide

**Last Updated:** May 22, 2026  
**Status:** Active

---

## 🌐 Production URLs

### Main Platform
- **Main URL:** https://dine-in-go.vercel.app
- **Early Access URL:** https://dine-in-go-early-access.vercel.app
- **Backend API:** https://dineingo-backend.onrender.com

### User Portal
- **Main:** https://dine-in-go.vercel.app
- **Early Access:** https://dine-in-go-early-access.vercel.app
- **Auth Callback:** https://dine-in-go.vercel.app/auth/callback
- **Early Access Auth:** https://dine-in-go-early-access.vercel.app/auth/callback

### Business Portal
- **Main:** https://dine-in-go.vercel.app/business
- **Early Access:** https://dine-in-go-early-access.vercel.app/business
- **Auth Callback:** https://dine-in-go.vercel.app/business/auth/callback
- **Early Access Auth:** https://dine-in-go-early-access.vercel.app/business/auth/callback

### Admin Portal
- **Main:** https://dine-in-go.vercel.app/admin
- **Early Access:** https://dine-in-go-early-access.vercel.app/admin
- **Auth Callback:** https://dine-in-go.vercel.app/admin/auth/callback
- **Early Access Auth:** https://dine-in-go-early-access.vercel.app/admin/auth/callback

---

## 🔗 API Endpoints

### Base URL
```
https://dineingo-backend.onrender.com/api/v1
```

### Authentication Endpoints
- `POST /auth/swiggy/authorize` - Swiggy OAuth authorization
- `POST /auth/swiggy/refresh` - Token refresh
- `POST /auth/swiggy/logout` - Logout

### Webhook Endpoints
- `POST /webhooks/swiggy/orders` - Order events
- `POST /webhooks/swiggy/payments` - Payment events
- `POST /webhooks/swiggy/restaurants` - Restaurant events
- `POST /webhooks/swiggy/delivery` - Delivery events

### Restaurant Endpoints
- `GET /restaurants/:restaurantId` - Get restaurant details
- `GET /restaurants` - List restaurants
- `POST /restaurants` - Create restaurant

### Order Endpoints
- `GET /orders/:orderId` - Get order details
- `GET /orders` - List orders
- `POST /orders` - Create order
- `PATCH /orders/:orderId/status` - Update order status

### Delivery Endpoints
- `GET /deliveries/:deliveryId` - Get delivery status
- `GET /deliveries` - List deliveries
- `PATCH /deliveries/:deliveryId/status` - Update delivery status

---

## 🔐 OAuth 2.0 Redirect URIs

### Production Environment

**User Portal:**
```
https://dine-in-go.vercel.app/auth/callback
```

**Business Portal:**
```
https://dine-in-go.vercel.app/business/auth/callback
```

**Admin Portal:**
```
https://dine-in-go.vercel.app/admin/auth/callback
```

### Early Access Environment

**User Portal:**
```
https://dine-in-go-early-access.vercel.app/auth/callback
```

**Business Portal:**
```
https://dine-in-go-early-access.vercel.app/business/auth/callback
```

**Admin Portal:**
```
https://dine-in-go-early-access.vercel.app/admin/auth/callback
```

### Development Environment

**User Portal:**
```
http://localhost:3000/auth/callback
```

**Business Portal:**
```
http://localhost:3000/business/auth/callback
```

**Admin Portal:**
```
http://localhost:3000/admin/auth/callback
```

---

## 🔔 Webhook Endpoints

### Production Webhooks

**Orders Webhook:**
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/orders
```

**Payments Webhook:**
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/payments
```

**Restaurants Webhook:**
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/restaurants
```

**Delivery Webhook:**
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/delivery
```

### Webhook Authentication
- **Header:** `X-Signature: HMAC-SHA256`
- **Header:** `X-Timestamp: Unix timestamp`
- **Header:** `Authorization: Bearer <JWT_TOKEN>`

---

## 📱 Portal Access

### User Portal (Customer)
- **Main:** https://dine-in-go.vercel.app
- **Early Access:** https://dine-in-go-early-access.vercel.app
- **Features:** Restaurant discovery, booking, reviews, events
- **Authentication:** Firebase Auth, Google OAuth, Email/Password

### Business Portal (Restaurant Owner)
- **Main:** https://dine-in-go.vercel.app/business
- **Early Access:** https://dine-in-go-early-access.vercel.app/business
- **Features:** Restaurant management, analytics, bookings
- **Authentication:** Firebase Auth, Google OAuth, Email/Password

### Admin Portal (Platform Admin)
- **Main:** https://dine-in-go.vercel.app/admin
- **Early Access:** https://dine-in-go-early-access.vercel.app/admin
- **Features:** User management, security monitoring, analytics
- **Authentication:** OTP-based (6-digit codes), JWT tokens

---

## 🔄 Environment Variables

### Frontend Environment Variables
```bash
VITE_API_URL=https://dineingo-backend.onrender.com
VITE_FRONTEND_URL=https://dine-in-go.vercel.app
VITE_EARLY_ACCESS_URL=https://dine-in-go-early-access.vercel.app
VITE_FIREBASE_API_KEY=***
VITE_FIREBASE_AUTH_DOMAIN=***
VITE_FIREBASE_PROJECT_ID=***
```

### Backend Environment Variables
```bash
FRONTEND_URL=https://dine-in-go.vercel.app
EARLY_ACCESS_URL=https://dine-in-go-early-access.vercel.app
ADMIN_URL=https://dine-in-go.vercel.app/admin
BUSINESS_URL=https://dine-in-go.vercel.app/business
SWIGGY_API_KEY=***
SWIGGY_API_SECRET=***
SWIGGY_WEBHOOK_SECRET=***
JWT_SECRET=***
MONGODB_URI=***
```

---

## 🧪 Testing URLs

### Sandbox Environment (Optional)
- **Frontend:** https://sandbox.dine-in-go.vercel.app
- **Backend:** https://sandbox-backend.onrender.com

### Test Webhook Endpoint
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/test
```

---

## 📊 Monitoring & Analytics

### Vercel Analytics
- **Dashboard:** https://vercel.com/dashboard
- **Project:** DineInGo (dine-in-go)
- **Early Access:** DineInGo Early Access (dine-in-go-early-access)

### Backend Monitoring
- **Render Dashboard:** https://render.com/dashboard
- **Project:** dineingo-backend

### Database Monitoring
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Cluster:** DineInGo Production

---

## 🔗 External Integrations

### Firebase Console
- **URL:** https://console.firebase.google.com
- **Project:** DineInGo

### MongoDB Atlas
- **URL:** https://cloud.mongodb.com
- **Cluster:** DineInGo Production

### Cloudinary
- **URL:** https://cloudinary.com/console
- **Account:** DineInGo

### Render Dashboard
- **URL:** https://render.com/dashboard
- **Services:** Backend API, Database

---

## 📞 Support URLs

### Documentation
- **Main Docs:** https://dine-in-go.vercel.app/docs
- **API Docs:** https://dineingo-backend.onrender.com/api/docs
- **GitHub:** https://github.com/dineingo/dineingo-app

### Support Channels
- **Email:** support@dineingo.com
- **Security:** security@dineingo.com
- **Integration:** integration@dineingo.com

---

## 🔐 CORS Configuration

### Allowed Origins (Production)
```
https://dine-in-go.vercel.app
https://dine-in-go-early-access.vercel.app
```

### Allowed Origins (Development)
```
http://localhost:3000
http://localhost:5000
```

### Allowed Methods
```
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### Allowed Headers
```
Content-Type, Authorization, X-Request-ID, X-Timestamp, X-Signature
```

---

## 📋 URL Checklist

### Production URLs
- ✅ Main Platform: https://dine-in-go.vercel.app
- ✅ Early Access: https://dine-in-go-early-access.vercel.app
- ✅ Backend API: https://dineingo-backend.onrender.com
- ✅ User Portal: https://dine-in-go.vercel.app
- ✅ Business Portal: https://dine-in-go.vercel.app/business
- ✅ Admin Portal: https://dine-in-go.vercel.app/admin

### OAuth Redirect URIs
- ✅ User Portal: https://dine-in-go.vercel.app/auth/callback
- ✅ Business Portal: https://dine-in-go.vercel.app/business/auth/callback
- ✅ Admin Portal: https://dine-in-go.vercel.app/admin/auth/callback

### Webhook Endpoints
- ✅ Orders: https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/orders
- ✅ Payments: https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/payments
- ✅ Restaurants: https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/restaurants
- ✅ Delivery: https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/delivery

---

## 📝 Document Control

| Field | Value |
|---|---|
| **Document Name** | URL Reference Guide |
| **Version** | 1.0 |
| **Created Date** | May 22, 2026 |
| **Last Updated** | May 22, 2026 |
| **Status** | Active |

---

**For URL-related inquiries, contact:** integration@dineingo.com

