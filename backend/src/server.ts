import 'dotenv/config';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import compression from 'compression';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import bookingRoutes from './routes/bookingRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import eventRoutes from './routes/eventRoutes';
import adminLoginRoute from './routes/admin-login';
import notificationsRoute from './routes/notifications';
import sendEmailRouter from './routes/sendEmail';
import reservationEmailRouter from './routes/reservationEmail';
import profileRouter from './routes/profile';
import favoriteRoutes from './routes/favoriteRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import businessRoutes from './routes/businessRoutes';
import achievementRoutes from './routes/achievementRoutes';
import passwordResetRoutes from './routes/passwordReset';
import reportRoutes from './routes/reportRoutes';
import issueReportRoutes from './routes/issueReportRoutes';
import geocodingRoutes from './routes/geocodingRoutes';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setIO } from './utils/socket';
import { TableBooking } from './models/TableBooking';
import { SlotWorker } from './services/SlotWorker';
import slotRoutes from './routes/slotRoutes';
import { setSocketIO } from './services/SlotService';
import dayjs from 'dayjs';
import menuRoutes from './routes/menuRoutes';
import waitlistRoutes from './routes/waitlistRoutes';
import preOrderRoutes from './routes/preOrderRoutes';
import userPreferenceRoutes from './routes/userPreferenceRoutes';
import userOtpRoutes from './routes/userOtpRoutes';
import earlyAccessRoutes from './routes/earlyAccessRoutes';
import foodScanRoutes from './routes/foodScanRoutes';
import translationRoutes from './routes/translationRoutes';
import {
  checkAndEnforceTwoFactorDeadlines,
  scheduleAndSendPendingReminders
} from './services/twoFactorEnforcementService';

// SECURITY: Import security middleware and utilities
import { secretManager } from './utils/secretManager';
import { securityHeaders, customSecurityHeaders, corsConfig } from './middleware/securityHeaders';
import { apiLimiter, authLimiter, passwordResetLimiter, otpLimiter, reviewLimiter, bookingLimiter } from './middleware/rateLimiter';
import { handleValidationErrors } from './middleware/inputValidation';
import securityConfig from './config/security';
import { botFingerprintGuard, dataHarvestGuard, promptInjectionGuard } from './middleware/aiThreatGuard';

// ADVANCED SECURITY: Import comprehensive security layers
import {
  fullSecurityStack,
  sanitizeXSS,
  preventPathTraversal,
  preventCommandInjection,
  preventSSRF,
  bruteForceProtection,
  sessionSecurityCheck
} from './middleware/advancedSecurityMiddleware';

import {
  sanitizePortalParameters,
  blockCrossPortalRequests
} from './middleware/portalIsolationMiddleware';

// REDIS CACHING: Import cache service
import { cacheService } from './services/cacheService';

// Load environment variables
dotenv.config();

// SECURITY: Initialize secret manager on startup
secretManager.initialize();

const app = express();
const PORT = process.env.PORT || 5001;

// SECURITY: Trust proxy (required for Render/Vercel and rate-limiting)
app.set('trust proxy', 1);

// SECURITY: Apply security headers middleware
app.use(securityHeaders);
app.use(customSecurityHeaders);

// SECURITY: Configure CORS with security settings
app.use(cors(corsConfig));

// Serve static files AFTER security headers to ensure CORS applies to them
app.use('/uploads', cors(corsConfig), express.static('uploads'));

// PERFORMANCE: Enable response compression (60% smaller payloads)
app.use(compression({
  threshold: 1024, // Only compress responses above 1kb
  level: 6, // Compression level (0-9)
  filter: (req: express.Request, res: express.Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// AI THREAT GUARD: Block bot scrapers and data harvesters globally
app.use(botFingerprintGuard);
app.use(dataHarvestGuard);

// ADVANCED SECURITY STACK: Apply comprehensive protection
// This protects against: SQL/NoSQL injection, XSS, Path Traversal, Command Injection,
// SSRF, Prototype Pollution, HPP, and more
app.use(sanitizeXSS);
app.use(preventPathTraversal);
app.use(preventCommandInjection);
app.use(preventSSRF);
app.use(sessionSecurityCheck);

// PORTAL ISOLATION: Prevent cross-portal contamination
app.use(sanitizePortalParameters);
app.use(blockCrossPortalRequests);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// SECURITY: Sanitize user-supplied data to prevent NoSQL operator injection
app.use(mongoSanitize());

// SECURITY: Prevent HTTP Parameter Pollution
app.use(hpp());

// Initialize HTTP server
const httpServer = createServer(app);

// Start the server immediately so Render doesn't give a 502
httpServer.listen(Number(PORT), () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Attempting to connect to MongoDB Atlas...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('=== UNHANDLED PROMISE REJECTION ===');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  // Don't exit the process, just log the error
});

// Configure Socket.io with optimized settings for Render
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || true,
    credentials: true,
    methods: ['GET', 'POST']
  },
  path: '/socket.io/',
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6, // 1MB max message size
  perMessageDeflate: false // Disable compression for better performance
});

setIO(io);
setSocketIO(io);

// Make io accessible to routes
app.set('io', io);

// Request logging for production debugging
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - Origin: ${req.headers.origin || 'none'}`);
  });
  next();
});

// MongoDB Atlas connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined. Please set it in your .env file.');
}

const mongooseOptions = {
  // Connection pool settings for high concurrency (500+ users)
  maxPoolSize: 50, // Max connections (increased from default 10)
  minPoolSize: 10, // Min connections to keep alive
  maxIdleTimeMS: 30000, // Close idle connections after 30s
  socketTimeoutMS: 60000, // Increased to 60s for slow queries
  serverSelectionTimeoutMS: 30000, // Increased to 30s for server selection
  connectTimeoutMS: 30000, // Added connection timeout
  heartbeatFrequencyMS: 10000, // Check connection health every 10s
  retryWrites: true, // Enable automatic retry of failed writes
  retryReads: true, // Enable automatic retry of failed reads
  
  // Server API version
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
} as const;

// Connect to MongoDB asynchronously without blocking server startup
mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(async () => {
    console.log('Connected to MongoDB Atlas successfully');

    // Verify connection
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      console.log('MongoDB connection verified - Database is responsive');
    }
    
    // Start background workers
    SlotWorker.start();
    
    // Initialize Redis cache
    console.log('\n🔌 Initializing Redis cache...');
    await cacheService.connect();
    if (cacheService.isReady()) {
      console.log('✅ Redis cache ready for use\n');
    } else {
      console.log('⚠️  Redis cache not available - continuing without cache\n');
    }

    // Initialize 2FA Enforcement Scheduler
    console.log('🔐 Initializing 2FA Enforcement Scheduler...');
    
    // Schedule daily deadline enforcement check at midnight (00:00 UTC)
    const scheduleDeadlineCheck = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        console.log('⏰ Running 2FA deadline enforcement check...');
        checkAndEnforceTwoFactorDeadlines().catch(err =>
          console.error('Error in 2FA deadline enforcement:', err)
        );
        // Reschedule for next day
        setInterval(() => {
          console.log('⏰ Running 2FA deadline enforcement check...');
          checkAndEnforceTwoFactorDeadlines().catch(err =>
            console.error('Error in 2FA deadline enforcement:', err)
          );
        }, 24 * 60 * 60 * 1000); // Every 24 hours
      }, msUntilMidnight);
    };
    scheduleDeadlineCheck();

    // Schedule pending reminders check every 6 hours
    setInterval(() => {
      console.log('📧 Checking for pending 2FA reminders to send...');
      scheduleAndSendPendingReminders().catch(err =>
        console.error('Error scheduling 2FA reminders:', err)
      );
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    console.log('✅ 2FA Enforcement Scheduler initialized\n');
  })
  .catch((error) => {
    console.error('CRITICAL: MongoDB Atlas connection error:');
    if (error.name === 'MongoServerError' && error.code === 8000) {
      console.error('Authentication failed - Please verify your username/password and IP whitelist');
    } else {
      console.error('Connection Error:', error);
    }
    // We don't exit(1) here anymore to keep the server alive for heartbeats/maintenance-status
  });

import aiRecommendationRoutes from './routes/aiRecommendationRoutes';

// API v1 Routes
const apiV1Router = express.Router();

apiV1Router.use('/food-scans', foodScanRoutes);
apiV1Router.use('/admin', adminRoutes);
apiV1Router.use('/users', userRoutes);
apiV1Router.use('/bookings', bookingRoutes);
apiV1Router.use('/restaurants', restaurantRoutes);
apiV1Router.use('/events', eventRoutes);
apiV1Router.use('/admin-login', adminLoginRoute);
apiV1Router.use('/notifications', notificationsRoute);
apiV1Router.use('/send-email', sendEmailRouter);
apiV1Router.use('/reservation-email', reservationEmailRouter);
apiV1Router.use('/profile', profileRouter);
apiV1Router.use('/favorites', favoriteRoutes);
apiV1Router.use('/chatbot', chatbotRoutes);
apiV1Router.use('/business/forgot-password', passwordResetRoutes);
apiV1Router.use('/translations', translationRoutes);
apiV1Router.use('/business', businessRoutes);
apiV1Router.use('/achievements', achievementRoutes);
apiV1Router.use('/reports', reportRoutes);
apiV1Router.use('/issue-reports', issueReportRoutes);
apiV1Router.use('/geocoding', geocodingRoutes);
apiV1Router.use('/', slotRoutes); // Handles /api/v1/slots etc
apiV1Router.use('/menu', menuRoutes);
apiV1Router.use('/waitlist', waitlistRoutes);
apiV1Router.use('/preorder', preOrderRoutes);
apiV1Router.use('/user-preferences', userPreferenceRoutes);
apiV1Router.use('/auth/otp', userOtpRoutes);
apiV1Router.use('/early-access', earlyAccessRoutes);
apiV1Router.use('/recommendations', aiRecommendationRoutes);

// Mount v1 API
app.use('/api/v1', apiV1Router);

// Default route
app.get('/', (req: express.Request, res: express.Response) => {
  res.send('DineInGo API is running');
});

// Health check endpoint (required by Render)
app.get('/health', (req: express.Request, res: express.Response) => {
  const mongoDBReady = mongoose.connection.readyState === 1;
  const status = {
    status: mongoDBReady ? 'ok' : 'initializing',
    mongodb: mongoDBReady ? 'connected' : 'connecting',
    timestamp: new Date().toISOString()
  };
  
  if (mongoDBReady) {
    res.status(200).json(status);
  } else {
    res.status(503).json(status);
  }
});

// Error handling middleware - must be after all routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('=== GLOBAL ERROR HANDLER ===');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('Request:', req.method, req.originalUrl);
  console.error('Body:', req.body);
  
  // Ensure we haven't already sent a response
  if (res.headersSent) {
    console.error('Headers already sent, delegating to default error handler');
    return next(err);
  }
  
  res.status(err.status || 500).json({ 
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Handle 404 routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Socket initialization moved to top

// Auto-confirm job: runs every minute (only after MongoDB is connected)
setInterval(async () => {
  // Check if MongoDB is connected before running
  if (mongoose.connection.readyState !== 1) {
    console.log('Skipping auto-confirm job: MongoDB not connected');
    return;
  }
  
  try {
    const now = new Date();
    // Find all bookings that are blocked and should be auto-confirmed
    const toAutoConfirm = await TableBooking.find({
      status: 'blocked',
      autoConfirmAt: { $lte: now }
    });
    for (const booking of toAutoConfirm) {
      booking.status = 'confirmed';
      booking.confirmedAt = now;
      booking.blockedUntil = undefined; // Fix: use undefined instead of null
      await booking.save();
      io.to(booking.restaurantId).emit('tableAutoConfirmed', {
        tableId: booking.tableId,
        date: booking.date,
        time: booking.time,
        userId: booking.userId
      });
      console.log(`Auto-confirmed booking for table ${booking.tableId} at ${booking.date} ${booking.time}`);
    }
  } catch (err) {
    console.error('Error in auto-confirm job:', err);
  }
}, 60 * 1000); // every minute

// Real-time user activity tracking
const userSockets = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join restaurant room for real-time table updates
  socket.on('joinRestaurant', (restaurantId: string) => {
    socket.join(restaurantId);
    console.log(`Socket ${socket.id} joined restaurant room: ${restaurantId}`);
  });

  // Leave restaurant room
  socket.on('leaveRestaurant', (restaurantId: string) => {
    socket.leave(restaurantId);
    console.log(`Socket ${socket.id} left restaurant room: ${restaurantId}`);
  });

  // Join event room for real-time seat updates
  socket.on('joinEvent', (eventId: string) => {
    socket.join(`event-${eventId}`);
    console.log(`Socket ${socket.id} joined event room: event-${eventId}`);
  });

  // Leave event room
  socket.on('leaveEvent', (eventId: string) => {
    socket.leave(`event-${eventId}`);
    console.log(`Socket ${socket.id} left event room: event-${eventId}`);
  });

  // Join slot room for real-time capacity updates
  socket.on('joinSlot', (slotId: string) => {
    socket.join(`slot:${slotId}`);
    console.log(`Socket ${socket.id} joined slot room: slot:${slotId}`);
  });

  // Leave slot room
  socket.on('leaveSlot', (slotId: string) => {
    socket.leave(`slot:${slotId}`);
    console.log(`Socket ${socket.id} left slot room: slot:${slotId}`);
  });

  // Business specific rooms
  socket.on('join-business-room', (businessId: string) => {
    socket.join(`business-${businessId}`);
    console.log(`Socket ${socket.id} joined business room: business-${businessId}`);
  });

  socket.on('leave-business-room', (businessId: string) => {
    socket.leave(`business-${businessId}`);
    console.log(`Socket ${socket.id} left business room: business-${businessId}`);
  });

  socket.on('user_login', (userData) => {
    if (userData.uid) {
      userSockets.set(userData.uid, socket.id);
      socket.join(`customer-${userData.uid}`);
      console.log(`Socket ${socket.id} joined customer room: customer-${userData.uid}`);
      io.emit('user_activity', {
        type: 'login',
        user: userData,
        timestamp: new Date()
      });
    }
  });

  socket.on('joinCustomerRoom', (customerId: string) => {
    socket.join(`customer-${customerId}`);
    console.log(`Socket ${socket.id} joined customer room: customer-${customerId}`);
  });

  socket.on('user_logout', (userData) => {
    if (userData.uid) {
      userSockets.delete(userData.uid);
      io.emit('user_activity', {
        type: 'logout',
        user: userData,
        timestamp: new Date()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [uid, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(uid);
        break;
      }
    }
  });
});