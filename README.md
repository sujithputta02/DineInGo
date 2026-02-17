![DineInGo Logo](public/images/DineInGo%20Logo.png)

# 🍽️ DineInGo - Smart Restaurant & Event Booking Platform

> **Revolutionizing the dining experience with intelligent reservations, real-time management, and innovative features for the modern Indian food lover.**

DineInGo is a comprehensive full-stack restaurant and event booking platform that connects food enthusiasts with their favorite dining destinations while empowering restaurant owners with powerful management tools. Built with cutting-edge technology, it offers seamless table reservations, event bookings, and an engaging user experience.

---

## 🌟 What is DineInGo?

DineInGo transforms how people discover, book, and experience restaurants and food events. Whether you're a food lover looking for your next dining adventure or a restaurant owner managing reservations, DineInGo provides an intuitive, feature-rich platform that makes every interaction delightful.

### For Food Lovers 🍕
Discover restaurants, make instant reservations, join exciting food events, and build your culinary journey with personalized recommendations and achievements.

### For Restaurant Owners �
Manage your restaurant operations, handle bookings, engage with customers, and grow your business with comprehensive analytics and tools.

---

## ✨ Core Features

### 🎯 Smart Restaurant Discovery
- **Intelligent Search**: Find restaurants by cuisine, location, price range, and dietary preferences
- **Real-Time Availability**: See live table availability and book instantly
- **Interactive Maps**: Visualize restaurant locations with integrated mapping
- **Favorites System**: Save your favorite restaurants for quick access
- **Personalized Recommendations**: Get restaurant suggestions based on your preferences

### 📅 Seamless Booking Experience
- **Visual Table Selection**: Choose your exact table with interactive 2D floor plans
- **Multi-Floor Support**: Navigate through different floors (Ground, 1st, 2nd, 3rd)
- **Real-Time Status**: See table availability updated in real-time
- **Flexible Scheduling**: Book for any date and time with dynamic slot management
- **Guest Management**: Specify party size and special requirements
- **Instant Confirmation**: Receive booking confirmations via email with detailed invoices

### 🎉 Event Booking & Management
- **Food Events**: Discover and register for food festivals, tasting events, and culinary experiences
- **Interactive Seating**: Choose your seats with visual seating charts
- **Capacity Tracking**: Real-time attendee count and availability
- **Waitlist System**: Join waitlists for sold-out events with position tracking
- **Digital Tickets**: Get QR code tickets for easy event check-in

### 👤 Personalized User Experience
- **Custom Profiles**: Create your profile with dietary preferences and favorite cuisines
- **Onboarding Journey**: Guided setup to personalize your experience
- **Avatar System**: Choose from multiple avatar styles with custom initials
- **Booking History**: Track all your past and upcoming reservations
- **Achievement System**: Earn badges and rewards for your dining activities
- **Review & Rating**: Share your experiences and help others discover great places

### 💬 Social & Engagement Features
- **Restaurant Reviews**: Rate and review restaurants with emoji support
- **Half-Star Ratings**: Precise rating system with 0.5 increments (1.0, 1.5, 2.0, etc.)
- **Review Management**: Edit or delete your reviews anytime
- **Photo Sharing**: Add photos to your reviews
- **Business Responses**: See how restaurants respond to feedback

### 🔔 Real-Time Notifications
- **Booking Updates**: Get instant notifications for booking confirmations and changes
- **Event Reminders**: Receive reminders for upcoming events
- **Promotional Offers**: Stay updated with special deals and promotions
- **Waitlist Alerts**: Know when a spot opens up in your waitlist

### 🎨 Innovative Features
- **AR Menu Preview**: View dishes in augmented reality before ordering
- **Nutritional Information**: See detailed nutrition facts and sustainability scores
- **Voice Search**: Search restaurants using voice commands
- **Sustainability Badges**: Discover eco-friendly restaurants
- **Dietary Assistant**: Get personalized recommendations based on dietary restrictions
- **AI Chatbot**: Get instant help and recommendations

### 🏢 Business Owner Dashboard
- **Comprehensive Analytics**: Track bookings, revenue, and customer trends
- **Booking Management**: View, confirm, modify, or cancel reservations
- **Floor Plan Designer**: Create and manage table layouts with drag-and-drop
- **Menu Management**: Update your menu items and categories
- **Review Management**: Respond to customer reviews with emoji support
- **Staff Management**: Manage staff schedules and shifts
- **Promotion Tools**: Create and manage special offers
- **Real-Time Updates**: See bookings and updates as they happen
- **Customer Insights**: Understand your customers better with detailed analytics

### 🎪 Event Hosting Tools
- **Event Creation**: Set up food events with custom details
- **Seating Designer**: Create custom seating arrangements
- **Ticket Management**: Track registrations and capacity
- **Attendee Management**: Manage event participants
- **Event Analytics**: Monitor event performance

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

### Backend
- **Node.js** with Express.js framework
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM for data management
- **Socket.IO** for real-time bidirectional communication
- **JWT** for secure authentication
- **Nodemailer** for email notifications
- **PDFKit** for invoice generation
- **Firebase Admin SDK** for authentication

### Key Features Implementation
- **Real-Time Updates**: Socket.IO for live booking status
- **Email System**: Professional HTML emails with Nodemailer
- **File Uploads**: Multer for image handling
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
- Gmail account for email notifications (optional)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd dineingo
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
   PORT=5001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key_here
   
   # Firebase Admin SDK
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY="your_private_key"
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   
   # Email Configuration (Optional)
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_specific_password
   ```

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

## � User Journey

### For Customers

1. **Sign Up / Login**
   - Create account with email or Google
   - Complete personalized onboarding
   - Set dietary preferences and favorite cuisines

2. **Discover Restaurants**
   - Browse restaurants by location, cuisine, or price
   - View detailed restaurant profiles with photos and reviews
   - Check real-time availability

3. **Make a Reservation**
   - Select date, time, and number of guests
   - Choose your table from interactive floor plan
   - Add special requests or notes
   - Receive instant confirmation email

4. **Attend & Review**
   - Get reminder notifications
   - Show digital ticket at venue
   - Leave review and rating after dining

5. **Explore Events**
   - Browse food events and festivals
   - Register for events with seat selection
   - Join waitlists for popular events

### For Restaurant Owners

1. **Business Registration**
   - Create business account
   - Complete restaurant profile
   - Set up operating hours and capacity

2. **Setup Restaurant**
   - Design floor plan with table layout
   - Add menu items and categories
   - Configure booking settings

3. **Manage Operations**
   - View and manage incoming bookings
   - Respond to customer reviews
   - Track analytics and performance

4. **Host Events**
   - Create food events
   - Design seating arrangements
   - Manage registrations

---

## 🎨 Key Highlights

### User-Centric Design
- Clean, modern interface with smooth animations
- Dark mode support for comfortable viewing
- Mobile-responsive design for all devices
- Intuitive navigation and user flows

### Real-Time Experience
- Live table availability updates
- Instant booking confirmations
- Real-time notification system
- Socket-based communication

### Smart Features
- AI-powered chatbot assistance
- Voice search capability
- AR menu visualization
- Personalized recommendations

### Business Intelligence
- Comprehensive analytics dashboard
- Customer behavior insights
- Revenue tracking
- Performance metrics

---

## � Security & Privacy

- Secure authentication with Firebase
- JWT-based API authentication
- Password encryption with bcrypt
- Input validation and sanitization
- CORS protection
- Secure file upload handling
- Privacy-focused data management

---

## 📊 Platform Statistics

- **Multi-Floor Support**: Up to 4 floors per restaurant
- **Real-Time Updates**: Instant synchronization across all users
- **Scalable Architecture**: Built to handle growing user base
- **Email Notifications**: Professional HTML email templates
- **Digital Tickets**: QR code generation for events
- **Review System**: Half-star precision rating

---

## 🤝 Contributing

We welcome contributions! Whether it's bug fixes, feature additions, or documentation improvements, your help makes DineInGo better.

---

## 📄 License

This project is licensed under the MIT License.

---

## 📧 Support

For questions, issues, or feedback:
- Email: support@dineingo.com
- GitHub Issues: [Report a bug](https://github.com/yourusername/dineingo/issues)

---

## 🙏 Acknowledgments

Built with modern technologies and best practices to deliver an exceptional dining experience platform.

---

**Made with ❤️ for food lovers and restaurant owners**

© DineInGo 2025. All rights reserved. | Version 1.0.0 🚀
