![DineInGo Logo](public/images/DineInGo%20Logo.png)

# 🍽️ DineInGo - Reserve Dining and Events

> **Revolutionizing dining experiences across India** 🇮🇳

DineInGo is a next-generation restaurant and event reservation platform designed for the Indian market, offering seamless booking, discovery, and management experiences for both diners and businesses. Built with a focus on transparency, user experience, and operational efficiency, DineInGo empowers restaurants and event organizers to connect with their customers in innovative ways.

[![Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)](https://github.com/dineingo/app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production--ready-success.svg)](RELEASE_CHECKLIST.md)

---

## ✨ Key Features

### 🍽️ Restaurant Booking
- **Interactive Table Selection**: Visual 2D floor plans with 4 floors (Ground, 1st, 2nd, 3rd)
- **Table Categories**: Standard, Premium, and VIP seating options
- **Real-Time Availability**: Live table status updates via Socket.IO
- **Smart Booking Flow**: Date, time, guests, and table selection in one seamless experience
- **Instant Confirmations**: Email notifications with booking details and invoices

### 🎉 Event Management
- **Event Discovery**: Browse events by category (Music, Food, Sports, Arts, Networking)
- **Seat Selection**: Choose specific seats for seated events
- **General Admission**: Quick booking for standing events
- **Event Tickets**: Digital tickets with QR codes
- **Capacity Management**: Real-time seat availability tracking
- **Event Preview**: Detailed event information with booking preview

### 🏆 Achievement System
- **Gamified Experience**: Earn points and unlock achievements
- **Cuisine Explorer**: Badges for trying different cuisines
- **Local Hero**: Rewards for supporting local restaurants
- **Sustainable Diner**: Points for eco-friendly dining choices
- **Social Foodie**: Achievements for bringing friends
- **Real-Time Tracking**: Live progress updates from your bookings
- **Leaderboards**: Compete with other food enthusiasts

### � AR Menu Experience
- **3D Visualization**: See dishes in augmented reality before ordering
- **Nutrition Information**: Detailed calorie and macro breakdown
- **Interactive Ingredients**: Explore dish components and allergens
- **Sustainability Scoring**: Environmental impact ratings
- **Cooking Methods**: Preparation techniques and time estimates
- **Dietary Filters**: Vegetarian, vegan, and gluten-free indicators

### 🏢 Business Management
- **Owner Dashboard**: Complete restaurant management portal
- **Floor Plan Designer**: Visual table layout management
- **Real-Time Analytics**: Booking trends and revenue tracking
- **Customer Insights**: Feedback and rating management
- **Staff Coordination**: Team access and role management
- **Inventory Integration**: Menu and availability updates

### 🦖 AI Assistant (Dino)
- **24/7 Support**: Chat with Dino, your friendly AI assistant
- **Comprehensive Knowledge**: Knows everything about DineInGo features
- **Context-Aware**: Remembers your preferences and booking history
- **MongoDB Memory**: Persistent chat sessions and user context
- **Smart Responses**: Powered by OpenRouter and Google Gemma 2 models
- **Helpful Guidance**: Step-by-step instructions for bookings and features

### 📧 Communication System
- **Professional Emails**: Beautifully designed HTML email templates
- **Booking Confirmations**: Instant confirmation emails with all details
- **Digital Invoices**: PDF invoices with itemized breakdown
- **Wallet Passes**: Apple Wallet and Google Wallet passes
- **Cancellation Notices**: Automatic cancellation confirmation emails
- **Event Notifications**: Specialized event confirmation and reminder emails

### 👤 User Management
- **Firebase Authentication**: Secure email/password and Google sign-in
- **User Profiles**: Manage personal information and preferences
- **Booking History**: View all past, current, and upcoming bookings
- **Favorites System**: Save favorite restaurants for quick access
- **Dashboard**: Centralized hub for all user activities
- **Achievement Progress**: Track your dining milestones and rewards

### 🔔 Real-Time Features
- **Live Updates**: Socket.IO powered real-time notifications
- **Table Availability**: Instant updates when tables become available
- **Booking Status**: Real-time booking confirmations and updates
- **Event Seats**: Live seat availability for events
- **Toast Notifications**: Non-intrusive in-app notifications
- **Achievement Unlocks**: Instant achievement notifications

### 🎨 User Experience
- **Modern UI**: Clean, intuitive interface with Tailwind CSS
- **Brand Colors**: Emerald green (#10b981) theme throughout
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Smooth Animations**: Framer Motion for delightful interactions
- **Accessibility**: WCAG compliant design
- **Fast Performance**: Optimized loading and rendering

---

## 🌍 Supported Languages

- 🇬🇧 English
- 🇮🇳 Hindi (हिंदी)
- 🇮🇳 Tamil (தமிழ்)
- 🇮🇳 Kannada (ಕನ್ನಡ)
- 🇮🇳 Telugu (తెలుగు)
- 🇮🇳 Malayalam (മലയാളം)

---

## 🚀 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context API + Hooks
- **Authentication**: Firebase Authentication
- **Real-Time**: Socket.IO Client
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Toastify
- **Forms**: React Hook Form
- **Date Handling**: Day.js

### Backend
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **Database**: MongoDB Atlas
- **ODM**: Mongoose
- **Authentication**: Firebase Admin SDK
- **Real-Time**: Socket.IO
- **Email**: Nodemailer (Gmail SMTP)
- **PDF Generation**: PDFKit
- **QR Codes**: qrcode library
- **AI**: OpenRouter API (Google Gemma 2)

### Infrastructure
- **Database**: MongoDB Atlas (Cloud)
- **Authentication**: Firebase
- **Email Service**: Gmail SMTP
- **AI Service**: OpenRouter
- **File Storage**: MongoDB GridFS
- **Real-Time**: Socket.IO Server

### Development Tools
- **Build Tool**: Vite
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Version Control**: Git

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **MongoDB**: Atlas account or local installation
- **Firebase**: Project with Authentication enabled
- **Gmail**: Account with App Password for emails
- **OpenRouter**: API key for AI chatbot (optional)

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/dineingo/app.git
cd DineInGo-App
```

### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
cd ..
```

### 3. Environment Configuration

**Option A: Quick Setup (Recommended)**
```bash
# For team members with shared dev credentials
node scripts/setup-team-env.js
```

**Option B: Manual Setup**
```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env

# Edit the files with your credentials
```

**Backend Environment Variables** (`backend/.env`):
```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Email Service
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Server
PORT=5000

# Admin
ADMIN_CODE=your_secure_admin_code

# AI Chatbot (Optional)
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=google/gemma-2-9b-it:free
```

**Frontend Environment Variables** (`.env`):
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Configuration
VITE_API_URL=http://localhost:5000
```

### 4. Initialize AI Chatbot (One-Time)
```bash
cd backend
npm run init:chatbot
```

This will:
- Create the `chatsessions` MongoDB collection
- Add necessary indexes
- Test the AI service
- Verify everything works

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **MongoDB**: Check your Atlas dashboard

---

## 📁 Project Structure

```
DineInGo-App/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── models/           # MongoDB schemas
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   └── server.ts         # Entry point
│   ├── uploads/              # File uploads
│   ├── .env                  # Environment variables
│   └── package.json
├── src/
│   ├── components/           # React components
│   ├── pages/                # Page components
│   ├── contexts/             # React contexts
│   ├── services/             # API services
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript types
│   └── App.tsx               # Main app component
├── public/
│   ├── images/               # Static images
│   └── index.html
├── .env                      # Frontend environment
├── package.json
└── README.md
```

---

## 🎯 Key User Flows

### Restaurant Booking Flow
1. **Browse** → Search/filter restaurants
2. **Select** → Choose restaurant and view details
3. **Pick Date/Time** → Select reservation details
4. **Choose Table** → Interactive floor plan selection
5. **Fill Details** → Guest information and special requests
6. **Confirm** → Instant booking confirmation
7. **Receive** → Email with invoice and wallet pass

### Event Booking Flow
1. **Discover** → Browse events by category
2. **View Details** → Event information and venue
3. **Select Seats** → Choose specific seats (if applicable)
4. **Book Tickets** → Enter attendee information
5. **Confirm** → Instant ticket confirmation
6. **Receive** → Email with tickets and wallet pass

### Cancellation Flow
1. **Dashboard** → View your bookings
2. **Select Booking** → Choose booking to cancel
3. **Cancel** → Confirm cancellation (2-hour policy)
4. **Confirmation** → Receive cancellation email

---

## 🔐 Security & Privacy

### Security Features
- ✅ Firebase Authentication (secure user management)
- ✅ Environment variables for sensitive data
- ✅ CORS configuration for API security
- ✅ Input validation and sanitization
- ✅ Secure password hashing
- ✅ Protected API endpoints
- ✅ MongoDB connection encryption

### Privacy Protection
- ✅ User data encryption
- ✅ Secure session management
- ✅ No sensitive data in logs
- ✅ GDPR-compliant data handling
- ✅ User consent for communications
- ✅ Data retention policies

### Best Practices
- 🔒 Never commit `.env` files
- 🔒 Use different credentials for dev/prod
- 🔒 Rotate API keys regularly
- 🔒 Enable API restrictions
- 🔒 Use strong passwords (20+ characters)
- 🔒 Regular security audits

**📖 Read [SECURITY.md](SECURITY.md) for detailed guidelines**

---

## 📚 Documentation

### User Guides
- **Setup Guide**: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Quick Setup**: [QUICK_SETUP.md](QUICK_SETUP.md)
- **Team Setup**: [TEAM_SETUP.md](TEAM_SETUP.md)

### Feature Documentation
- **AI Chatbot**: [AI_CHATBOT_ENHANCED.md](AI_CHATBOT_ENHANCED.md)
- **Chatbot Setup**: [CHATBOT_SETUP.md](CHATBOT_SETUP.md)
- **Quick Chatbot Init**: [QUICK_CHATBOT_INIT.md](QUICK_CHATBOT_INIT.md)
- **Dino Icon Design**: [DINO_ICON_DESIGN.md](DINO_ICON_DESIGN.md)

### Technical Documentation
- **Email Setup**: [EMAIL_SETUP.md](EMAIL_SETUP.md)
- **Event Preview**: [EVENT_PREVIEW_FEATURE.md](EVENT_PREVIEW_FEATURE.md)
- **Seating System**: [EVENT_SEATING_SYSTEM.md](EVENT_SEATING_SYSTEM.md)
- **Real-Time Booking**: [REAL_TIME_EVENT_BOOKING.md](REAL_TIME_EVENT_BOOKING.md)
- **Profile Architecture**: [PROFILE_SYSTEM_ARCHITECTURE.md](PROFILE_SYSTEM_ARCHITECTURE.md)

### Launch Documentation
- **Release Checklist**: [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
- **Launch Summary**: [LAUNCH_READY_SUMMARY.md](LAUNCH_READY_SUMMARY.md)

---

## 🧪 Testing

### Run Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend
npm test
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Restaurant browsing and search
- [ ] Table selection and booking
- [ ] Event discovery and booking
- [ ] Email notifications
- [ ] Wallet pass generation
- [ ] Booking cancellation
- [ ] AI chatbot responses
- [ ] Real-time updates
- [ ] Mobile responsiveness

---

## 🚀 Deployment

### Production Build

**Frontend:**
```bash
npm run build
npm run preview
```

**Backend:**
```bash
cd backend
npm run build
npm start
```

### Deployment Platforms

**Recommended Hosting:**
- **Frontend**: Vercel, Netlify, Firebase Hosting
- **Backend**: Heroku, Railway, DigitalOcean, AWS
- **Database**: MongoDB Atlas (already cloud-based)

### Environment Variables (Production)
- Update all URLs to production domains
- Use production MongoDB cluster
- Enable production Firebase project
- Configure production email service
- Set secure admin codes

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines
- Follow TypeScript best practices
- Write clean, documented code
- Test your changes thoroughly
- Update documentation as needed
- Follow the existing code style

---

## 📞 Support & Contact

### User Support
- **Email**: support@dineingo.com
- **Phone**: +91-9876543210
- **Chat**: Dino AI Assistant (in-app)
- **Hours**: 24/7 (AI), 9 AM - 9 PM IST (Human)

### Business Inquiries
- **Partnerships**: sec.dinelngo.team@gmail.com
- **Restaurant Onboarding**: Contact our team
- **Event Organizers**: Contact our team
- **Media**: Contact our team

### Technical Support
- **GitHub Issues**: [Report a bug](https://github.com/dineingo/app/issues)
- **Documentation**: Check our guides above
- **Community**: Join our Discord (coming soon)

---

## 🎉 What's New in v1.0.0

### Major Features
- ✨ **Enhanced AI Chatbot**: Dino now has comprehensive DineInGo knowledge
- ✨ **MongoDB Memory Bank**: Persistent chat sessions and user context
- ✨ **Interactive Floor Plans**: 2D table selection with visual layouts
- ✨ **Brand Refresh**: Updated to emerald green theme
- ✨ **Email System**: Professional HTML templates for all notifications
- ✨ **Real-Time Updates**: Socket.IO for live table availability
- ✨ **Digital Wallets**: Apple and Google Wallet pass generation
- ✨ **Achievement System**: Gamified user experience with points and badges
- ✨ **AR Menu Preview**: Augmented reality dish visualization with nutrition info
- ✨ **Business Portal**: Complete restaurant owner dashboard and management
- ✨ **Event Preview System**: Enhanced event booking with seat selection
- ✨ **Advanced Analytics**: Real-time tracking of user achievements and stats

### New Features Added
- 🏆 **Achievements & Gamification**: 
  - Cuisine Explorer badges for trying different cuisines
  - Local Hero achievements for supporting local restaurants
  - Sustainable Diner rewards for eco-friendly choices
  - Social Foodie points for bringing friends
  - Real-time progress tracking from actual bookings
  - Points system with leaderboards

- 📱 **AR Menu Experience**:
  - 3D dish visualization through camera
  - Detailed nutrition information display
  - Interactive ingredient breakdown
  - Allergen and dietary information
  - Sustainability scoring for dishes
  - Cooking method and prep time details

- 🏢 **Business Management Portal**:
  - Restaurant owner authentication system
  - Complete business dashboard
  - Floor plan management tools
  - Real-time booking analytics
  - Revenue tracking and reporting
  - Customer feedback management

- 🎫 **Enhanced Event System**:
  - Interactive seat selection for events
  - Event preview with detailed information
  - Real-time seat availability updates
  - Event-specific email confirmations
  - Digital event tickets with QR codes
  - Capacity management and waitlists

### Improvements
- 🔧 Fixed booking cancellation errors
- 🔧 Enhanced table selection UI
- 🔧 Improved email service reliability
- 🔧 Better error handling
- 🔧 Performance optimizations
- 🔧 Mobile responsiveness improvements
- 🔧 Real-time achievement updates
- 🔧 Enhanced user statistics tracking
- 🔧 Improved business onboarding flow

### Bug Fixes
- 🐛 Fixed ObjectId casting errors
- 🐛 Resolved socket null checks
- 🐛 Fixed email service configuration
- 🐛 Corrected TypeScript errors
- 🐛 Fixed real-time update issues
- 🐛 Resolved achievement calculation bugs
- 🐛 Fixed event seat booking conflicts
- 🐛 Corrected business authentication flow

---

## 🗺️ Roadmap

### Q1 2025
- [ ] Multi-language UI implementation
- [ ] Payment gateway integration
- [ ] Advanced search filters
- [ ] Mobile app (React Native)
- [ ] Enhanced AR menu features

### Q2 2025
- [ ] Loyalty program expansion
- [ ] Referral system enhancements
- [ ] Push notifications
- [ ] Voice search integration
- [ ] Advanced achievement tiers

### Q3 2025
- [ ] AI-powered table recommendations
- [ ] Social features and sharing
- [ ] Group bookings with split payments
- [ ] Waitlist management system
- [ ] Business analytics dashboard v2

### Q4 2025
- [ ] International expansion
- [ ] Multi-currency support
- [ ] Advanced business intelligence
- [ ] White-label solution
- [ ] API for third-party integrations

---

## 📊 Statistics

- **Version**: 1.0.0
- **Status**: Production Ready 🚀
- **Last Updated**: February 2025
- **License**: MIT
- **Languages**: 6 (English + 5 Indian languages)
- **Tech Stack**: React + Node.js + MongoDB
- **AI Model**: Google Gemma 2
- **New Features**: 15+ major additions in v1.0.0
- **Achievement System**: 8 categories with 20+ achievements
- **AR Capabilities**: Full dish visualization and nutrition analysis
- **Business Tools**: Complete restaurant management suite

---

## 🏆 Acknowledgments

### Technologies
- React Team for the amazing framework
- MongoDB for the robust database
- Firebase for authentication services
- OpenRouter for AI capabilities
- Tailwind CSS for styling utilities

### Contributors
- DineInGo Development Team
- Beta testers and early adopters
- Open source community

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💚 Made with Love in India

**DineInGo** - Revolutionizing dining experiences across India, one booking at a time.

**Let's make every meal memorable!** 🍽️✨

---

© DineInGo 2025. All rights reserved.

**Version 1.0.0** | **Production Ready** 🚀
