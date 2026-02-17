# Admin Portal JWT Authentication - Implementation Guide

## ✅ What Was Implemented

JWT (JSON Web Token) based authentication for the admin portal with the following security features:

### Backend Security
1. **JWT Middleware** (`backend/src/middleware/adminAuth.ts`)
   - Verifies JWT tokens on every admin API request
   - Checks token expiration (24 hours)
   - Validates admin role (admin or super_admin)
   - Protects against unauthorized access

2. **Protected Routes** (`backend/src/routes/adminRoutes.ts`)
   - All admin routes now require JWT authentication
   - Super admin routes have additional role verification
   - Public routes: `/request-otp`, `/verify-otp`, `/maintenance-status`

3. **Token Generation** (`backend/src/controllers/adminController.ts`)
   - JWT token generated on successful OTP verification
   - Token includes: email, role, expiration (24h)
   - Replaces old session token approach

### Frontend Security
1. **Admin API Utility** (`src/utils/adminApi.ts`)
   - Centralized API calls with automatic JWT token injection
   - Automatic token expiration handling
   - Redirects to login on expired/invalid tokens
   - All admin API methods included

2. **Login Flow** (`src/pages/AdminLoginPage.tsx`)
   - Stores JWT token (not session token)
   - Stores admin email, role, and login time

3. **Route Protection** (`src/components/ProtectedAdminRoute.tsx`)
   - Already checks for adminToken
   - Validates 24-hour expiration
   - Redirects unauthorized users to login

## 🔐 How It Works

### Login Flow:
```
1. Admin enters email → Backend sends OTP
2. Admin enters OTP → Backend verifies
3. Backend generates JWT token with role
4. Frontend stores token in localStorage
5. All subsequent requests include token in Authorization header
```

### API Request Flow:
```
1. Frontend calls adminApi.getStats()
2. adminApiRequest adds "Authorization: Bearer <token>"
3. Backend middleware verifies token
4. If valid → Process request
5. If invalid/expired → Return 401, frontend redirects to login
```

## 📝 How to Access Admin Portal

### Step 1: Start the Application
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

### Step 2: Access Admin Login
Navigate to: `http://localhost:5173/admin-login`

### Step 3: Login as Super Admin
1. Enter email: `sujithputta02@gmail.com` (super admin)
2. Click "Send OTP"
3. Check console logs for OTP (if email not configured)
4. Enter the 6-digit OTP
5. Click "Verify & Login"

### Step 4: Access Admin Dashboard
You'll be redirected to: `http://localhost:5173/admin/dashboard`

## 🔑 Super Admin Credentials
- **Email**: `sujithputta02@gmail.com`
- **Role**: `super_admin`
- **OTP**: Check backend console logs (if email not configured)

## 🛡️ Security Features

### What's Protected:
✅ All admin API endpoints (except login)
✅ JWT token verification on every request
✅ Role-based access (admin vs super_admin)
✅ Token expiration (24 hours)
✅ Automatic logout on token expiry
✅ Frontend route protection

### What Users/Businesses CAN'T Do:
❌ Access admin routes without valid JWT token
❌ Forge JWT tokens (cryptographically signed)
❌ Access admin dashboard via URL manipulation
❌ Call admin APIs directly (401 Unauthorized)
❌ Bypass token expiration

## 🧪 Testing the Security

### Test 1: Try accessing admin dashboard without login
```
1. Clear localStorage
2. Navigate to http://localhost:5173/admin/dashboard
3. Should redirect to /admin-login
```

### Test 2: Try calling admin API without token
```javascript
// Open browser console
fetch('http://localhost:5001/api/admin/stats')
  .then(r => r.json())
  .then(console.log)
// Should return: 401 Unauthorized
```

### Test 3: Try with invalid token
```javascript
// Open browser console
fetch('http://localhost:5001/api/admin/stats', {
  headers: { 'Authorization': 'Bearer fake-token' }
})
  .then(r => r.json())
  .then(console.log)
// Should return: 401 Invalid token
```

### Test 4: Login and access dashboard
```
1. Go to /admin-login
2. Enter: sujithputta02@gmail.com
3. Get OTP from console
4. Verify OTP
5. Should access dashboard successfully
```

## 📦 Files Modified/Created

### Backend:
- ✅ `backend/src/middleware/adminAuth.ts` (NEW)
- ✅ `backend/src/routes/adminRoutes.ts` (UPDATED)
- ✅ `backend/src/controllers/adminController.ts` (UPDATED)

### Frontend:
- ✅ `src/utils/adminApi.ts` (NEW)
- ✅ `src/pages/AdminLoginPage.tsx` (UPDATED)
- ✅ `src/components/ProtectedAdminRoute.tsx` (ALREADY EXISTED)

## 🔄 Migration from Old System

### Old System (Insecure):
```javascript
// Passed email in every request
fetch('/api/admin/stats?adminEmail=admin@example.com')
```

### New System (Secure):
```javascript
// Token automatically added by adminApi utility
adminApi.getStats() // Token in Authorization header
```

## 🚀 Next Steps (Optional Enhancements)

1. **Refresh Tokens**: Implement refresh tokens for seamless re-authentication
2. **Rate Limiting**: Add rate limiting on login attempts
3. **Audit Logging**: Log all admin actions for compliance
4. **2FA**: Add two-factor authentication for super admins
5. **IP Whitelisting**: Restrict admin access to specific IPs

## ⚠️ Important Notes

1. **JWT_SECRET**: Currently using default secret. In production, set `JWT_SECRET` in `.env`
2. **Token Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
3. **Email Configuration**: Configure SMTP for OTP emails (currently logs to console)
4. **Session Duration**: 24 hours (configurable in middleware)

## 🎯 Summary

Your admin portal is now secured with industry-standard JWT authentication. Users and business owners cannot access admin routes even if they know the URLs. All admin API calls require a valid, non-expired JWT token with admin role.

**To test**: Go to `http://localhost:5173/admin-login` and login with `sujithputta02@gmail.com`
