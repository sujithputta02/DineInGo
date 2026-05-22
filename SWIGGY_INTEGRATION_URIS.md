# Swiggy MCP Integration - Redirect URIs & Webhooks

**Last Updated:** May 22, 2026  
**Status:** Ready for Integration

---

## 🌐 Environment Configuration

### Production Environment
| Component | URL |
|---|---|
| **Main Platform URL** | https://dine-in-go.vercel.app |
| **Early Access URL** | https://dine-in-go-early-access.vercel.app |
| **Backend Base URL** | https://dineingo-backend.onrender.com |
| **API Version** | v1 |
| **Protocol** | HTTPS (TLS 1.2+) |

### Development Environment
| Component | URL |
|---|---|
| **Frontend Base URL** | http://localhost:3000 |
| **Backend Base URL** | http://localhost:5000 |
| **API Version** | v1 |
| **Protocol** | HTTP (Development only) |

---

## 🔐 OAuth 2.0 Redirect URIs

### User Portal (Customer App)
```
Production:  https://dine-in-go.vercel.app/auth/callback
Early Access: https://dine-in-go-early-access.vercel.app/auth/callback
Development: http://localhost:3000/auth/callback
```

**Purpose:** User authentication and login flow  
**Supported Methods:** Firebase Auth, Google OAuth, Email/Password  
**Session Duration:** 24 hours

### Business Portal (Restaurant Owner App)
```
Production:  https://dine-in-go.vercel.app/business/auth/callback
Early Access: https://dine-in-go-early-access.vercel.app/business/auth/callback
Development: http://localhost:3000/business/auth/callback
```

**Purpose:** Business owner authentication  
**Supported Methods:** Firebase Auth, Google OAuth, Email/Password  
**Session Duration:** 24 hours

### Admin Portal (Platform Admin)
```
Production:  https://dine-in-go.vercel.app/admin/auth/callback
Early Access: https://dine-in-go-early-access.vercel.app/admin/auth/callback
Development: http://localhost:3000/admin/auth/callback
```

**Purpose:** Admin authentication and authorization  
**Supported Methods:** OTP-based (6-digit codes), JWT tokens  
**Session Duration:** 4 hours (JWT expiration)

---

## 🔗 Swiggy Integration Endpoints

### Authentication Endpoints

#### 1. Swiggy OAuth Authorization
```
POST https://dineingo-backend.onrender.com/api/v1/auth/swiggy/authorize
```

**Request Body:**
```json
{
  "code": "authorization_code_from_swiggy",
  "state": "random_state_string",
  "redirect_uri": "https://dineingo.vercel.app/auth/callback"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### 2. Swiggy Token Refresh
```
POST https://dineingo-backend.onrender.com/api/v1/auth/swiggy/refresh
```

**Request Body:**
```json
{
  "refresh_token": "refresh_token_from_swiggy"
}
```

**Response:**
```json
{
  "success": true,
  "token": "new_jwt_token",
  "expires_in": 3600
}
```

#### 3. Swiggy Logout
```
POST https://dineingo-backend.onrender.com/api/v1/auth/swiggy/logout
```

**Request Body:**
```json
{
  "token": "jwt_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🔔 Webhook Endpoints

### Order Events Webhook
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/orders
```

**Purpose:** Receive order events from Swiggy  
**Events:** order.created, order.confirmed, order.cancelled, order.completed  
**Authentication:** HMAC-SHA256 signature verification

**Request Body Example:**
```json
{
  "event": "order.created",
  "timestamp": "2026-05-22T10:30:00Z",
  "data": {
    "order_id": "ORD123456",
    "restaurant_id": "REST789",
    "customer_id": "CUST456",
    "amount": 500,
    "items": [
      {
        "item_id": "ITEM001",
        "quantity": 2,
        "price": 250
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order event processed",
  "order_id": "ORD123456"
}
```

### Payment Events Webhook
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/payments
```

**Purpose:** Receive payment events from Swiggy  
**Events:** payment.initiated, payment.success, payment.failed, payment.refunded  
**Authentication:** HMAC-SHA256 signature verification

**Request Body Example:**
```json
{
  "event": "payment.success",
  "timestamp": "2026-05-22T10:31:00Z",
  "data": {
    "payment_id": "PAY123456",
    "order_id": "ORD123456",
    "amount": 500,
    "currency": "INR",
    "method": "card",
    "status": "success"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment event processed",
  "payment_id": "PAY123456"
}
```

### Restaurant Events Webhook
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/restaurants
```

**Purpose:** Receive restaurant status updates from Swiggy  
**Events:** restaurant.online, restaurant.offline, restaurant.menu_updated, restaurant.rating_updated  
**Authentication:** HMAC-SHA256 signature verification

**Request Body Example:**
```json
{
  "event": "restaurant.online",
  "timestamp": "2026-05-22T10:32:00Z",
  "data": {
    "restaurant_id": "REST789",
    "status": "online",
    "delivery_time": 30,
    "rating": 4.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurant event processed",
  "restaurant_id": "REST789"
}
```

### Delivery Events Webhook
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/delivery
```

**Purpose:** Receive delivery tracking updates  
**Events:** delivery.assigned, delivery.picked_up, delivery.in_transit, delivery.delivered  
**Authentication:** HMAC-SHA256 signature verification

**Request Body Example:**
```json
{
  "event": "delivery.in_transit",
  "timestamp": "2026-05-22T10:45:00Z",
  "data": {
    "delivery_id": "DEL123456",
    "order_id": "ORD123456",
    "driver_id": "DRV789",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "eta_minutes": 15
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delivery event processed",
  "delivery_id": "DEL123456"
}
```

---

## 🔐 API Authentication

### Header Requirements
All API requests must include:

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Request-ID: <unique_request_id>
X-Timestamp: <unix_timestamp>
X-Signature: <HMAC_SHA256_signature>
```

### Signature Generation
```
HMAC_SHA256(
  message = X-Timestamp + "." + request_body,
  secret = SWIGGY_API_SECRET
)
```

### Example Request
```bash
curl -X POST https://dineingo-backend.onrender.com/api/v1/webhooks/swiggy/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: req_123456" \
  -H "X-Timestamp: 1653206400" \
  -H "X-Signature: abc123def456..." \
  -d '{
    "event": "order.created",
    "timestamp": "2026-05-22T10:30:00Z",
    "data": {...}
  }'
```

---

## 🔄 API Endpoints for Swiggy Integration

### Get Restaurant Details
```
GET https://dineingo-backend.onrender.com/api/v1/restaurants/:restaurantId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "REST789",
    "name": "Restaurant Name",
    "address": "Address",
    "phone": "Phone",
    "rating": 4.5,
    "menu": [...],
    "delivery_time": 30,
    "min_order": 100
  }
}
```

### Get Order Details
```
GET https://dineingo-backend.onrender.com/api/v1/orders/:orderId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ORD123456",
    "restaurant_id": "REST789",
    "customer_id": "CUST456",
    "items": [...],
    "total": 500,
    "status": "confirmed",
    "created_at": "2026-05-22T10:30:00Z"
  }
}
```

### Update Order Status
```
PATCH https://dineingo-backend.onrender.com/api/v1/orders/:orderId/status
```

**Request Body:**
```json
{
  "status": "preparing",
  "notes": "Order is being prepared"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ORD123456",
    "status": "preparing",
    "updated_at": "2026-05-22T10:35:00Z"
  }
}
```

### Get Delivery Status
```
GET https://dineingo-backend.onrender.com/api/v1/deliveries/:deliveryId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "DEL123456",
    "order_id": "ORD123456",
    "driver_id": "DRV789",
    "status": "in_transit",
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946
    },
    "eta_minutes": 15
  }
}
```

---

## 🔑 API Keys & Credentials

### Environment Variables Required
```bash
# Swiggy Integration
SWIGGY_API_KEY=your_swiggy_api_key
SWIGGY_API_SECRET=your_swiggy_api_secret
SWIGGY_WEBHOOK_SECRET=your_webhook_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=4h

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_key
FIREBASE_AUTH_DOMAIN=your_firebase_domain
FIREBASE_PROJECT_ID=your_firebase_project_id

# Database
MONGODB_URI=your_mongodb_connection_string

# Frontend URLs
FRONTEND_URL=https://dineingo.vercel.app
ADMIN_URL=https://dineingo.vercel.app/admin
BUSINESS_URL=https://dineingo.vercel.app/business
```

### Secure Storage
- All credentials stored in environment variables
- Never commit secrets to version control
- Use `.env.local` for development
- Use platform secrets manager for production (Vercel, Render)

---

## 🧪 Testing Endpoints

### Sandbox Environment (Optional)
```
Frontend: https://sandbox.dineingo.vercel.app
Backend: https://sandbox-backend.onrender.com
```

### Test Webhook Delivery
```
POST https://dineingo-backend.onrender.com/api/v1/webhooks/test
```

**Request Body:**
```json
{
  "event": "order.created",
  "test": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test webhook delivered successfully"
}
```

---

## 📊 Rate Limiting

### API Rate Limits
| Endpoint | Limit | Window |
|---|---|---|
| Authentication | 5 requests | 15 minutes |
| Webhooks | 1000 requests | 1 minute |
| Orders API | 100 requests | 1 minute |
| Restaurants API | 50 requests | 1 minute |
| Delivery API | 100 requests | 1 minute |

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1653206460
```

---

## ✅ Webhook Verification

### Verify Webhook Signature
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return hash === signature;
}
```

### Webhook Retry Policy
- **Initial Attempt:** Immediate
- **Retry 1:** 5 minutes
- **Retry 2:** 30 minutes
- **Retry 3:** 2 hours
- **Max Retries:** 3 attempts
- **Timeout:** 30 seconds per attempt

---

## 🔍 Monitoring & Logging

### Webhook Logging
All webhook events are logged with:
- Event type and timestamp
- Request headers and body
- Response status and body
- Processing time
- Any errors or exceptions

### Access Logs
```
GET https://dineingo-backend.onrender.com/api/v1/admin/webhooks/logs
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "LOG123",
      "event": "order.created",
      "timestamp": "2026-05-22T10:30:00Z",
      "status": "success",
      "response_time": 245
    }
  ]
}
```

---

## 📞 Support & Troubleshooting

### Common Issues

#### 1. Webhook Not Received
- Check firewall rules allow Swiggy IPs
- Verify webhook URL is correct
- Check API secret is correct
- Review server logs for errors

#### 2. Authentication Failed
- Verify JWT token is valid
- Check token expiration
- Verify API key and secret
- Check CORS configuration

#### 3. Rate Limit Exceeded
- Implement exponential backoff
- Batch requests where possible
- Contact support for higher limits

### Support Contacts
- **Technical Support:** support@dineingo.com
- **Integration Support:** integration@dineingo.com
- **Security Issues:** security@dineingo.com

---

## 📋 Integration Checklist

- ✅ OAuth 2.0 redirect URIs configured
- ✅ Webhook endpoints implemented
- ✅ API authentication configured
- ✅ Rate limiting implemented
- ✅ Error handling implemented
- ✅ Logging and monitoring setup
- ✅ Testing completed
- ✅ Documentation prepared

---

## 📝 Document Control

| Field | Value |
|---|---|
| **Document Name** | Swiggy Integration URIs & Webhooks |
| **Version** | 1.0 |
| **Created Date** | May 22, 2026 |
| **Last Updated** | May 22, 2026 |
| **Next Review** | June 22, 2026 |
| **Status** | Ready for Integration |

---

**For integration support, contact:** integration@dineingo.com  
**For technical issues, contact:** support@dineingo.com

