/**
 * SECURITY: Centralized Security Configuration
 * All security settings in one place for easy management
 * Follows OWASP Top 10 and security best practices
 */

export const securityConfig = {
  // ============================================
  // RATE LIMITING CONFIGURATION
  // ============================================
  rateLimiting: {
    // General API rate limiting
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests from this IP, please try again later.',
    },
    
    // Authentication endpoints (login, signup)
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      message: 'Too many authentication attempts, please try again later.',
    },
    
    // Password reset
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      message: 'Too many password reset attempts, please try again later.',
    },
    
    // OTP requests
    otp: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
      message: 'Too many OTP requests, please try again later.',
    },
    
    // Review submissions
    review: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      message: 'Too many reviews submitted, please try again later.',
    },
    
    // Booking submissions
    booking: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
      message: 'Too many bookings, please try again later.',
    },
  },

  // ============================================
  // PASSWORD POLICY
  // ============================================
  passwordPolicy: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '@$!%*?&',
    expiryDays: 90, // Force password change every 90 days
    historyCount: 5, // Remember last 5 passwords
  },

  // ============================================
  // SESSION CONFIGURATION
  // ============================================
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    regenerateOnLogin: true,
  },

  // ============================================
  // JWT CONFIGURATION
  // ============================================
  jwt: {
    expiresIn: '24h',
    refreshTokenExpiresIn: '7d',
    algorithm: 'HS256',
  },

  // ============================================
  // INPUT VALIDATION LIMITS
  // ============================================
  inputLimits: {
    // String fields
    email: { min: 5, max: 255 },
    password: { min: 8, max: 128 },
    displayName: { min: 2, max: 100 },
    businessName: { min: 2, max: 200 },
    description: { min: 10, max: 5000 },
    comment: { min: 10, max: 5000 },
    location: { min: 5, max: 500 },
    
    // Numeric fields
    capacity: { min: 1, max: 10000 },
    price: { min: 0, max: 1000000 },
    rating: { min: 0.5, max: 5 },
    guests: { min: 1, max: 100 },
    
    // Array fields
    maxArrayItems: 100,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },

  // ============================================
  // CORS CONFIGURATION
  // ============================================
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5001',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
  },

  // ============================================
  // SECURITY HEADERS
  // ============================================
  headers: {
    contentSecurityPolicy: true,
    frameGuard: 'deny',
    noSniff: true,
    xssFilter: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  },

  // ============================================
  // ENCRYPTION CONFIGURATION
  // ============================================
  encryption: {
    algorithm: 'aes-256-gcm',
    saltRounds: 12, // bcrypt salt rounds
  },

  // ============================================
  // AUDIT LOGGING
  // ============================================
  auditLogging: {
    enabled: true,
    logSensitiveOperations: true,
    logAuthAttempts: true,
    logDataAccess: true,
    retentionDays: 90,
  },

  // ============================================
  // SECURITY FEATURES
  // ============================================
  features: {
    twoFactorAuth: true,
    emailVerification: true,
    phoneVerification: false,
    ipWhitelisting: false,
    deviceFingerprinting: false,
    anomalyDetection: true,
  },

  // ============================================
  // API KEY MANAGEMENT
  // ============================================
  apiKeys: {
    rotationIntervalDays: 90,
    maxKeysPerUser: 5,
    keyExpiryDays: 365,
    requireKeyRotation: true,
  },

  // ============================================
  // SENSITIVE ENDPOINTS
  // ============================================
  sensitiveEndpoints: [
    '/api/admin',
    '/api/users/profile',
    '/api/business/settings',
    '/api/payouts',
    '/api/analytics',
  ],

  // ============================================
  // BLOCKED PATTERNS
  // ============================================
  blockedPatterns: {
    // SQL injection patterns
    sqlInjection: /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    
    // XSS patterns
    xss: /<script[^>]*>.*?<\/script>/gi,
    
    // Path traversal
    pathTraversal: /\.\.\//g,
  },

  // ============================================
  // LOGGING CONFIGURATION
  // ============================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    maskSensitiveData: true,
    sensitiveFields: [
      'password',
      'apiKey',
      'apiSecret',
      'token',
      'refreshToken',
      'creditCard',
      'ssn',
    ],
  },
  
  // ============================================
  // RELEASE CONFIGURATION
  // ============================================
  betaOnly: true, // Set to false for official release to remove waitlist restriction
};

export default securityConfig;
