![DineInGo Logo](public/images/DineInGo%20Logo.png)

# 🍽️ DineInGo - Smart Restaurant & Event Booking Platform

> **Version 1.0 Beta** | Revolutionizing the dining experience with intelligent reservations, real-time management, and innovative features for the modern Indian food lover.

DineInGo is a comprehensive full-stack restaurant and event booking platform that connects food enthusiasts with their favorite dining destinations while empowering restaurant owners with powerful management tools. Built with cutting-edge technology and enterprise-grade security, it offers seamless table reservations, event bookings, and an engaging user experience.

---

# 🚀 Early Access & Testing (Beta V-1.0)

Join our exclusive **Beta V-1.0** testing phase! Experience the future of dining before everyone else.

### 🔗 Quick Links
- **Early Access Portal**: [https://dine-in-go-early-access.vercel.app](https://dine-in-go-early-access.vercel.app)
- **Main Application**: [https://dine-in-go.vercel.app](https://dine-in-go.vercel.app)
- **Business Portal**: [https://dine-in-go.vercel.app/business](https://dine-in-go.vercel.app/business)

### 📝 Access Steps
To test the application, you must be on our early access list. Follow these steps:

1. **Join the Early Access List**:
   - Go to the [Early Access Portal](https://dine-in-go-early-access.vercel.app).
   - **Foodies**: Select the "Foodie" option if you are a user.
   - **Businesses**: Select the "Venue" option to register as a business.
2. **Receive Stomp Code**: After selection, you will receive a unique **Stomp Code**. Keep this safe as it is required for access.
3. **Sign Up / Login**:
   - Open the [DineInGo App](https://dine-in-go.vercel.app) (or [Business Portal](https://dine-in-go.vercel.app/business) for venues).
   - If you are a new user, sign up with **Google** or manually verify your **Email**.
4. **Verify Early Access**:
   - Enter your **Stomp Code** when prompted to verify your early access status.
5. **Explore the Dashboard**:
   - Once verified, you will gain access to the dashboard to test all features.

---


## 💎 What's New in V1.0 Beta

### 🔐 Enterprise-Grade Security
- **Identity Bonding**: Intelligent account linking that preserves your preferences when switching between Email and Google login.
- **Rate Limiting**: Multi-tier protection (IP, User, and Route-based) to prevent platform abuse.
- **Secure Secret Management**: Military-grade encryption for all sensitive platform configurations.
- **Security Headers**: Full HSTS, CSP, and X-Frame-Options implementation for zero-trust browsing.
- See [SECURITY.md](backend/SECURITY.md) for detailed security documentation

### 🎪 Enhanced Event System
- **Event Seating Charts**: Interactive visual seating with draggable seats
- **Concert Area Support**: Manage standing room and general admission areas
- **Real-Time Capacity Tracking**: Live "X/Y booked" display for areas
- **Guest Count Selection**: Choose number of guests per booking
- **Dynamic Pricing**: Price multiplied by guest count
- **Event Reviews & Ratings**: Full review system with emoji support and owner replies

### 🏢 Advanced Restaurant Features
- **3D AR Menu Engine**: Revolutionary augmented reality previews of dishes directly on your table.
- **Multi-Floor Management**: Support for up to 4 floors with an independent table layouts
- **Real-Time Table Status**: Live updates across all connected users
- **Interactive Floor Plans**: Drag-and-drop table designer
- **Booking Management**: Confirm, modify, or cancel reservations
- **Automatic Table Unblocking**: Smart handling of blocked tables on cancellation
- **Area Capacity Tracking**: Monitor booked vs total capacity

### 👥 Enhanced User Experience
- **Review System**: Rate restaurants and events with half-star precision (1.0, 1.5, 2.0, etc.)
- **Emoji Support**: Express yourself with emoji reactions in reviews
- **Like/Dislike Reviews**: Community engagement on reviews
- **Business Responses**: Restaurant owners can reply to reviews
- **Achievement System**: Earn badges for a dining activities
- **Personalized Profiles**: Custom avatars and dietary preferences

### 📱 Real-Time Features
- **Socket.IO Integration**: Instant updates for bookings, reviews, and capacity
- **Live Notifications**: Real-time alerts for booking changes
- **Waitlist System**: Join and track waitlist positions
- **Event Reminders**: Automatic reminders for upcoming events
- **Platform Communication Suite**: Real-time platform-wide announcements and targeted updates.

---

## ✨ Core Features

### 🎯 Smart Restaurant Discovery
- **Intelligent Search**: Find restaurants by cuisine, location, price range, and dietary preferences
- **AR Menu Preview**: View 3D models of dishes before you even order.
- **Real-Time Availability**: See live table availability and book instantly
- **Interactive Maps**: Visualize restaurant locations with integrated mapping
- **Favorites System**: Save your favorite restaurants for quick access
- **Personalized Recommendations**: Get restaurant suggestions based on your preferences
- **Advanced Filters**: Filter by ratings, distance, cuisine type, and more

### 📅 Seamless Booking Experience
- **Visual Table Selection**: Choose your exact table with interactive 2D floor plans
- **Multi-Floor Support**: Navigate through different floors (Ground, 1st, 2nd, 3rd)
- **Real-Time Status**: See table availability updated in real-time via Socket.IO
- **Flexible Scheduling**: Book for any date and time with dynamic slot management
- **Guest Management**: Specify party size and special requirements
- **Instant Confirmation**: Receive booking confirmations via email with detailed invoices
- **Booking History**: Track all past and upcoming reservations
- **Cancellation Support**: Easy cancellation with automatic table unblocking

### 🎉 Event Booking & Management
- **Food Events**: Discover and register for food festivals, tasting events, and culinary experiences
- **Interactive Seating**: Choose your seats with visual seating charts (individual seats or concert areas)
- **Capacity Tracking**: Real-time attendee count and availability with "X/Y booked" display
- **Waitlist System**: Join waitlists for sold-out events with position tracking
- **Digital Tickets**: Get QR code tickets for easy event check-in
- **Event Reviews**: Full review system with ratings, emoji support, and owner replies
- **Multi-Day Events**: Support for events spanning multiple days
- **Guest Count Selection**: Book multiple tickets per event

### 👤 Personalized User Experience
- **Custom Profiles**: Create your profile with dietary preferences and favorite cuisines
- **Onboarding Journey**: Guided setup to personalize your experience
- **Avatar System**: Choose from multiple avatar styles with custom initials
- **Booking History**: Track all your past and upcoming reservations
- **Achievement System**: Earn badges and rewards for your dining activities
- **Review & Rating**: Share your experiences with half-star precision
- **Preferences Management**: Save dietary restrictions and cuisine preferences
- **Identity Protection**: Secure account linking and activity tracking for peace of mind.

### 💬 Social & Engagement Features
- **Restaurant Reviews**: Rate and review restaurants with emoji support
- **Event Reviews**: Full review system for food events
- **Half-Star Ratings**: Precise rating system with 0.5 increments (1.0, 1.5, 2.0, etc.)
- **Review Management**: Edit or delete your reviews anytime
- **Photo Sharing**: Add photos to your reviews
- **Business Responses**: See how restaurants respond to feedback
- **Like/Dislike System**: Community engagement on reviews
- **Review Sorting**: Sort by rating, date, or helpfulness

### 🔔 Real-Time Notifications
- **Booking Updates**: Get instant notifications for booking confirmations and changes
- **Event Reminders**: Receive reminders for upcoming events
- **Promotional Offers**: Stay updated with special deals and promotions
- **Waitlist Alerts**: Know when a spot opens up in your waitlist
- **Review Notifications**: Get notified when someone replies to your review
- **Socket.IO Powered**: Real-time delivery of all notifications

### 🎨 Innovative Features
- **AR Menu Preview**: View dishes in augmented reality before ordering
- **Nutritional Information**: See detailed nutrition facts and sustainability scores
- **Voice Search**: Search restaurants using voice commands
- **Sustainability Badges**: Discover eco-friendly restaurants
- **Dietary Assistant**: Get personalized recommendations based on dietary restrictions
- **AI Chatbot**: Get instant help and recommendations
- **Dark Mode**: Comfortable viewing in low-light environments

### 🏢 Business Owner Dashboard
- **Comprehensive Analytics**: Track bookings, revenue, and customer trends
- **Booking Management**: View, confirm, modify, or cancel reservations
- **Floor Plan Designer**: Create and manage table layouts with drag-and-drop
- **Menu Management**: Update your menu items and categories
- **Review Management**: Respond to customer reviews with emoji support
- **Staff Management**: Manage staff schedules and shifts
- **Promotion Tools**: Create and manage special offers
- **Real-Time Updates**: See bookings and updates as they happen via Socket.IO
- **Customer Insights**: Understand your customers better with detailed analytics
- **Event Management**: Create and manage food events with seating arrangements
- **Capacity Monitoring**: Track real-time capacity for areas and events

### 🎪 Event Hosting Tools
- **Event Creation**: Set up food events with custom details
- **Seating Designer**: Create custom seating arrangements (individual seats or concert areas)
- **Ticket Management**: Track registrations and capacity
- **Attendee Management**: Manage event participants
- **Event Analytics**: Monitor event performance
- **Multi-Day Support**: Create events spanning multiple days
- **Area Capacity Tracking**: Monitor booked vs total capacity for each area

---

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast development and optimized builds
- **Tailwind CSS** for beautiful, responsive design
- **Framer Motion** for smooth animations and transitions
- **Socket.IO Client** for real-time updates
- **Firebase Authentication** for secure user management
- **Recharts** for data visualization
- **Lucide React** for modern icons
- **PWA Support** for offline functionality

### Backend
- **Node.js** with Express.js framework
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM for data management
- **Socket.IO** for real-time bidirectional communication
- **JWT** for secure authentication
- **Nodemailer** for email notifications
- **PDFKit** for invoice generation
- **Firebase Admin SDK** for authentication
- **Express Rate Limit** for API rate limiting
- **Express Validator** for input validation
- **Helmet** for security headers
- **Bcryptjs** for password encryption

### Security Features
- **Rate Limiting**: IP-based (100 req/15min) and user-based limiting
- **Input Validation**: Schema-based validation on all endpoints
- **Secret Management**: Centralized environment variable management
- **Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **CORS Protection**: Restricted cross-origin requests
- **Password Encryption**: Bcrypt hashing for all passwords

### Key Features Implementation
- **Real-Time Updates**: Socket.IO for live booking status and notifications
- **Email System**: Professional HTML emails with Nodemailer
- **File Uploads**: Multer for image handling with security validation
- **PDF Generation**: Automated invoice and ticket creation
- **QR Codes**: Digital tickets with QR code generation
- **Geolocation**: Location-based restaurant discovery
- **Responsive Design**: Mobile-first approach with Tailwind CSS

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- MongoDB database (local or Atlas)
- Firebase project for authentication

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/sujithputta02/DineInGo.git
   cd DineInGo
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Configure Environment Variables**

   Create `.env` in the root directory:
   ```env
   VITE_API_URL=http://localhost:5001
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

   Create `backend/.env`:
   ```env
   # Server Configuration
   PORT=5001
   NODE_ENV=development
   
   # Database
   MONGODB_URI=your_mongodb_connection_string
   
   # Security Secrets (REQUIRED)
   JWT_SECRET=your_jwt_secret_key_min_32_characters
   SESSION_SECRET=your_session_secret_key_min_32_characters
   
   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   
   # Email Configuration (Optional)
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_specific_password
   
   # AI Services (Optional)
   SARVAM_API_KEY=your_sarvam_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   
   # Frontend URLs
   FRONTEND_URL=http://localhost:5173
   ```

   See [backend/.env.example](backend/.env.example) for all available options.

5. **Start Development Servers**

   Option 1 - Run both servers together:
   ```bash
   npm run start:all
   ```

   Option 2 - Run separately:
   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - Backend
   cd backend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001

---

## 📖 User Journey

### For Customers

1. **Sign Up / Login**
   - Create account with email or Google
   - Complete personalized onboarding
   - Set dietary preferences and favorite cuisines
   - Choose avatar style

2. **Discover Restaurants**
   - Browse restaurants by location, cuisine, or price
   - View detailed restaurant profiles with photos and reviews
   - Check real-time availability
   - Read reviews with half-star ratings and emoji reactions

3. **Make a Reservation**
   - Select date, time, and number of guests
   - Choose your table from interactive floor plan
   - Add special requests or notes
   - Receive instant confirmation email with invoice

4. **Attend & Review**
   - Get reminder notifications
   - Show digital ticket at venue
   - Leave review with half-star rating and emoji support
   - Like/dislike other reviews

5. **Explore Events**
   - Browse food events and festivals
   - Register for events with seat selection
   - Join waitlists for popular events
   - Leave event reviews and ratings

### For Restaurant Owners

1. **Business Registration**
   - Create business account
   - Complete restaurant profile
   - Set up operating hours and capacity
   - Configure booking settings

2. **Setup Restaurant**
   - Design floor plan with table layout (up to 4 floors)
   - Add menu items and categories
   - Configure booking settings
   - Set pricing and availability

3. **Manage Operations**
   - View and manage incoming bookings in real-time
   - Confirm, modify, or cancel reservations
   - Respond to customer reviews with emoji support
   - Track analytics and performance
   - Monitor real-time table status

4. **Host Events**
   - Create food events with custom details
   - Design seating arrangements (individual seats or concert areas)
   - Manage registrations and capacity
   - Track event performance
   - Respond to event reviews

---

## 🎨 Key Highlights

### User-Centric Design
- Clean, modern interface with smooth animations
- Dark mode support for comfortable viewing
- Mobile-responsive design for all devices
- Intuitive navigation and user flows
- Accessibility-focused design

### Real-Time Experience
- Live table availability updates via Socket.IO
- Instant booking confirmations
- Real-time notification system
- Socket-based communication for all updates
- Live capacity tracking for events

### Smart Features
- AI-powered chatbot assistance
- Voice search capability
- AR menu visualization
- Personalized recommendations
- Intelligent search and filtering

### Business Intelligence
- Comprehensive analytics dashboard
- Customer behavior insights
- Revenue tracking
- Performance metrics
- Real-time monitoring

### Enterprise Security
- Rate limiting on all endpoints
- Input validation and sanitization
- Secure secret management
- Security headers (CSP, HSTS, etc.)
- CORS protection
- Password encryption with bcrypt

---

## 🔐 Security & Privacy

DineInGo implements **enterprise-grade security** following OWASP best practices and industry standards. Your data and privacy are our top priorities.

### 🛡️ Security Features

#### Authentication & Authorization
- **Firebase Authentication**: Industry-leading managed authentication service
- **JWT Tokens**: Secure API authentication with token expiration
- **Bcrypt Password Hashing**: Military-grade password encryption with salt rounds
- **OTP Verification**: Two-factor authentication for sensitive operations
- **Session Management**: Secure session handling with automatic expiration

#### API Protection
- **Rate Limiting**: Multi-tier protection against abuse
  - Public endpoints: 100 requests per 15 minutes per IP
  - Authentication: 5 requests per 15 minutes per IP
  - Password reset: 3 requests per hour per IP
  - OTP requests: 5 requests per hour per IP
  - Reviews: 10 requests per hour per user
  - Bookings: 20 requests per hour per user
- **Input Validation**: Comprehensive schema-based validation on all endpoints
  - Type checking and sanitization
  - Length limits enforcement
  - Rejection of unexpected fields
  - Protection against XSS and SQL injection
- **CORS Protection**: Restricted cross-origin requests to allowed domains only

#### Data Security
- **Secret Management**: Centralized management of all API keys and secrets
  - All secrets stored in environment variables
  - Validation on startup
  - Key rotation support
  - Secure masking for logging
- **Database Security**: MongoDB with authentication and encryption
  - Parameterized queries (no SQL injection)
  - Schema validation
  - Indexed fields for performance
- **File Upload Security**: Strict validation and sanitization
  - MIME type validation (images only)
  - File size limits (5MB maximum)
  - Memory storage (non-executable)
  - Filename sanitization

#### Network Security
- **Security Headers**: Comprehensive HTTP security headers
  - Content-Security-Policy (CSP)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options (clickjacking protection)
  - X-Content-Type-Options (MIME sniffing protection)
  - X-XSS-Protection (XSS protection)
  - Referrer-Policy
- **HTTPS Enforcement**: All traffic encrypted in transit
- **Static File Protection**: Secure serving of user-generated content

### 🔒 Privacy & Compliance

#### Data Privacy
- **Privacy-First Design**: Minimal data collection, maximum protection
- **User Data Encryption**: All sensitive data encrypted at rest and in transit
- **Secure Session Handling**: Automatic session expiration and cleanup
- **Data Anonymization**: Personal data anonymized in analytics

#### Compliance
- **GDPR Compliant**: Full compliance with EU data protection regulations
- **OWASP Top 10**: Protection against all OWASP Top 10 vulnerabilities
  - ✅ Broken Access Control
  - ✅ Cryptographic Failures
  - ✅ Injection Attacks
  - ✅ Insecure Design
  - ✅ Security Misconfiguration
  - ✅ Vulnerable Components
  - ✅ Authentication Failures
  - ✅ Data Integrity Failures
  - ✅ Logging Failures
  - ✅ Server-Side Request Forgery

### 📋 Security Documentation

- **[Security Guide](backend/SECURITY.md)** - Comprehensive security documentation
- **[Security Checklist](backend/SECURITY_CHECKLIST.md)** - Implementation checklist
- **[Security Audit Report](SECURITY_AUDIT_REPORT.md)** - Complete security audit
- **[Deployment Guide](SECURITY_DEPLOYMENT_READY.md)** - Secure deployment instructions

### 🚨 Security Contact

Found a security vulnerability? Please report it responsibly:
- **Email**: security@dineingo.com
- **Response Time**: Within 24 hours for critical issues
- **Bug Bounty**: Coming soon

**Please do not disclose security issues publicly until they have been addressed.**

### 🏆 Security Certifications

- ✅ OWASP Top 10 Compliant
- ✅ Industry Best Practices
- ✅ Regular Security Audits
- ✅ Penetration Testing Ready

---

## 📊 Platform Statistics

- **Multi-Floor Support**: Up to 4 floors per restaurant
- **Real-Time Updates**: Instant synchronization across all users
- **Scalable Architecture**: Built to handle growing user base
- **Email Notifications**: Professional HTML email templates
- **Digital Tickets**: QR code generation for events
- **Review System**: Half-star precision rating with emoji support
- **Event Support**: Multi-day events with capacity tracking
- **Rate Limiting**: 100 req/15min for public endpoints
- **Input Validation**: Comprehensive schema-based validation

---

## 🧪 Beta Testing

To participate in the Beta V-1.0 testing phase, please follow the [Access Steps](#-access-steps) at the top of this document.

### What to Test
- AR menu preview and dish visualization.
- Table booking and real-time floor plan updates.
- Event registration and seating chart selection.
- Activity tracking and account preference synchronization.

---

## 📝 Version History

### V1.0 Beta (Current)
- ✅ 3D AR Menu Engine
- ✅ Interactive Seating Charts
- ✅ Real-Time Communication Suite
- ✅ Identity Bonding & Account Linking
- ✅ Multi-Floor Venue Management
- ✅ Professional PDF Invoice System

### Upcoming Features
- Advanced analytics and reporting
- Payment integration (Stripe)
- Mobile app (iOS/Android)
- Advanced AI recommendations
- Loyalty program
- Subscription management

---

## 🤝 Contributing

We welcome contributions! Whether it's bug fixes, feature additions, or documentation improvements, your help makes DineInGo better.

### Development Guidelines
- Follow TypeScript best practices
- Write clean, readable code
- Add comments for complex logic
- Test your changes thoroughly
- Follow the existing code style

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## 📧 Support & Feedback

For questions, issues, or feedback:
- **Email**: sec.dineingo.team@gmail.com
- **GitHub Issues**: [Report a bug](https://github.com/sujithputta02/DineInGo/issues)
- **Documentation**: [SECURITY.md](backend/SECURITY.md) | [SECURITY_CHECKLIST.md](backend/SECURITY_CHECKLIST.md)

---

## 🙏 Acknowledgments

Built with modern technologies and best practices to deliver an exceptional dining experience platform. Special thanks to all beta testers and contributors.

---

## 📚 Documentation

- [Security Documentation](backend/SECURITY.md)
- [Security Checklist](backend/SECURITY_CHECKLIST.md)
- [Deployment Guide](SECURITY_DEPLOYMENT_READY.md)
- [Environment Variables](backend/.env.example)

---

**Made with ❤️ for food lovers and restaurant owners**

© DineInGo 2026. All rights reserved. | **Version 1.0 Beta** 🚀

**Status**: Ready for Beta Testing | **Last Updated**: May 2026
