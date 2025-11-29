# Quick Setup Guide

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Gmail account (for email features)
- Firebase project

### 1. Clone the Repository
```bash
git clone https://github.com/sujithputta02/DineInGo.git
cd DineInGo
```

### 2. Set Up Environment Variables

#### Option A: Automated Setup (Recommended)
```bash
node scripts/setup-env.js
```

#### Option B: Manual Setup
```bash
# Frontend
cp .env.example .env
# Edit .env and fill in your values

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your values
```

### 3. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### 4. Start Development Servers

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend
```bash
npm run dev
```

### 5. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 🔑 Required Credentials

### MongoDB
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Add to `backend/.env` as `MONGODB_URI`

### Gmail (for emails)
1. Enable 2-Factor Authentication
2. Go to Security → App Passwords
3. Generate app password
4. Add to `backend/.env`:
   - `EMAIL_USER`: your-email@gmail.com
   - `EMAIL_PASS`: your-app-password

### Firebase
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password & Google)
3. Get config from Project Settings
4. Add to `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - etc.

### Google Maps (Optional)
1. Create project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API
3. Create API key
4. Add to `.env` as `VITE_GOOGLE_MAPS_API_KEY`

### Mapbox (Optional)
1. Create account at [Mapbox](https://www.mapbox.com/)
2. Get access token
3. Add to `.env` as `VITE_MAPBOX_API_KEY`

---

## 📁 Project Structure

```
DineInGo/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   └── contexts/          # React contexts
├── backend/               # Backend source
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   └── utils/         # Utility functions
│   └── uploads/           # User uploads (gitignored)
├── public/                # Static assets
├── scripts/               # Utility scripts
└── .env.example          # Environment template
```

---

## 🔧 Common Issues

### "Cannot connect to MongoDB"
- Check `MONGODB_URI` in `backend/.env`
- Verify IP whitelist in MongoDB Atlas
- Ensure network connectivity

### "Email not sending"
- Verify `EMAIL_USER` and `EMAIL_PASS`
- Check Gmail App Password is correct
- Ensure 2FA is enabled on Gmail

### "Firebase authentication failed"
- Check Firebase config in `.env`
- Verify Firebase project is active
- Enable Authentication methods in Firebase Console

### "Port already in use"
- Change `PORT` in `backend/.env`
- Kill process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:5000 | xargs kill -9
  ```

---

## 🧪 Testing

### Run Tests
```bash
# Frontend
npm test

# Backend
cd backend
npm test
```

### Test Email Functionality
1. Create a booking
2. Check email inbox
3. Verify PDF invoice and wallet passes

### Test Wallet Passes
1. Create booking
2. Click "Apple" or "Google" button
3. Verify pass downloads/opens

---

## 📦 Building for Production

### Frontend
```bash
npm run build
# Output in dist/
```

### Backend
```bash
cd backend
npm run build
# Output in dist/
```

### Environment Variables for Production
- Use production MongoDB cluster
- Use production Firebase project
- Enable HTTPS
- Set `NODE_ENV=production`
- Use strong JWT secret
- Change admin code

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] All `.env` files are gitignored
- [ ] Production credentials are different from development
- [ ] API keys have restrictions enabled
- [ ] MongoDB has IP whitelist configured
- [ ] Strong passwords (20+ characters)
- [ ] JWT secret is randomly generated
- [ ] Admin code is changed from default
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented

**📖 See [SECURITY.md](SECURITY.md) for detailed security guidelines**

---

## 📚 Additional Documentation

- [SECURITY.md](SECURITY.md) - Security best practices
- [WALLET_INTEGRATION.md](WALLET_INTEGRATION.md) - Wallet pass documentation
- [EMAIL_SETUP.md](EMAIL_SETUP.md) - Email configuration guide
- [REAL_TIME_TABLE_BOOKING.md](REAL_TIME_TABLE_BOOKING.md) - Real-time features

---

## 🆘 Getting Help

- Check documentation files
- Review error messages in console
- Check browser developer tools
- Verify environment variables
- Ensure all services are running

---

## 🎉 You're All Set!

Your DineInGo application should now be running. Happy coding! 🚀
