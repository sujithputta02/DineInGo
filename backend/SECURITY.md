# DineInGo Security Hardening Guide

## Overview
This document outlines all security measures implemented in the DineInGo application following OWASP best practices and industry standards.

---

## 1. RATE LIMITING

### Implementation
Rate limiting is implemented using Redis-backed `express-rate-limit` middleware to prevent abuse and brute force attacks.

### Configured Limits

| Endpoint Type | Window | Max Requests | Purpose |
|---|---|---|---|
| General API | 15 min | 100 | Prevent general API abuse |
| Authentication | 15 min | 5 | Prevent brute force login attempts |
| Password Reset | 1 hour | 3 | Prevent password reset abuse |
| OTP Requests | 1 hour | 5 | Prevent OTP enumeration |
| Review Submission | 1 hour | 10 | Prevent review spam |
| Booking Submission | 1 hour | 20 | Prevent booking spam |

### Usage in Routes

```typescript
import { authLimiter, apiLimiter, reviewLimiter } from '../middleware/rateLimiter';

// Apply to authentication endpoints
router.post('/login', authLimiter, loginController);

// Apply to review endpoints
router.post('/:businessId/reviews', reviewLimiter, addReviewController);

// Apply to general API endpoints
router.get('/data', apiLimiter, getDataController);
```

### Response Format (429 Too Many Requests)

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 1234567890
}
```

### Configuration
Edit `backend/src/config/security.ts` to adjust rate limiting parameters:

```typescript
rateLimiting: {
  api: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 100,
  },
  // ... other limits
}
```

---

## 2. INPUT VALIDATION & SANITIZATION

### Implementation
Strict schema-based validation using `express-validator` with:
- Type checking
- Length limits
- Format validation
- Rejection of unexpected fields
- Automatic sanitization

### Validation Schemas

#### User Registration
```typescript
import { validateUserRegistration, handleValidationErrors } from '../middleware/inputValidation';

router.post('/register', validateUserRegistration, handleValidationErrors, controller);
```

**Validated Fields:**
- `email`: Valid email format, normalized
- `password`: 8-128 chars, must contain uppercase, lowercase, number, special char
- `displayName`: 2-100 chars, alphanumeric + spaces/hyphens/apostrophes
- `phone`: Valid mobile phone number

#### Business Creation
```typescript
import { validateBusinessCreation } from '../middleware/inputValidation';

router.post('/business', validateBusinessCreation, handleValidationErrors, controller);
```

**Validated Fields:**
- `name`: 2-200 characters
- `description`: 10-5000 characters
- `email`: Valid email format
- `phone`: Valid phone number
- `location`: 5-500 characters
- `capacity`: 1-10000
- `basePrice`: 0-1000000

#### Review Submission
```typescript
import { validateReviewSubmission } from '../middleware/inputValidation';

router.post('/:id/reviews', validateReviewSubmission, handleValidationErrors, controller);
```

**Validated Fields:**
- `rating`: 0.5-5.0
- `comment`: 10-5000 characters
- `userId`: 1-500 characters
- `userName`: 1-100 characters

### Rejecting Unexpected Fields

```typescript
import { rejectUnexpectedFields } from '../middleware/inputValidation';

const allowedFields = ['email', 'password', 'displayName'];
router.post('/register', rejectUnexpectedFields(allowedFields), controller);
```

### Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must contain uppercase, lowercase, number, and special character"
    }
  ]
}
```

### Adding New Validations

1. Define validation schema in `backend/src/middleware/inputValidation.ts`
2. Apply to routes:

```typescript
router.post('/endpoint', validateNewSchema, handleValidationErrors, controller);
```

---

## 3. SECURE API KEY MANAGEMENT

### Implementation
Centralized secret management using `SecretManager` class with:
- All keys loaded from environment variables
- No hardcoded secrets
- Validation on startup
- Key rotation support
- Secure masking for logging

### Environment Variables Required

```bash
# Core Secrets (REQUIRED)
MONGODB_URI=mongodb://...
JWT_SECRET=your-secret-key-min-32-chars
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
SESSION_SECRET=your-session-secret-min-32-chars
ADMIN_CODE=your-admin-code

# Optional Secrets
SARVAM_API_KEY=...
OPENROUTER_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
EMAIL_SERVICE_API_KEY=...
REDIS_PASSWORD=...
```

### Usage in Code

```typescript
import { secretManager, getJWTSecret, getMongoDBUri } from '../utils/secretManager';

// Initialize on startup (done in server.ts)
secretManager.initialize();

// Get secrets
const jwtSecret = getJWTSecret();
const mongoUri = getMongoDBUri();

// Or use generic getter
const apiKey = secretManager.getSecret('SARVAM_API_KEY');

// Check if secret exists
if (secretManager.hasSecret('STRIPE_SECRET_KEY')) {
  // Use Stripe
}

// Mask secret for logging
const masked = secretManager.maskSecret('JWT_SECRET'); // Returns: ***abc123
```

### Key Rotation

```typescript
// Rotate a secret
secretManager.rotateSecret('JWT_SECRET', newSecretValue);

// In production, this should trigger:
// 1. Update in external services
// 2. Invalidate old tokens
// 3. Audit logging
```

### Startup Validation

The application will fail to start if required secrets are missing:

```
❌ CRITICAL: Missing required secrets:
   - JWT_SECRET (JWT signing secret)
   - MONGODB_URI (MongoDB connection string)

Please set these environment variables before starting the application.
```

### Security Best Practices

✅ **DO:**
- Store all secrets in `.env` file (never commit to git)
- Use strong, random values (min 32 characters)
- Rotate keys regularly (every 90 days)
- Use different keys for different environments
- Log secret access for audit trails
- Mask secrets in logs

❌ **DON'T:**
- Hardcode secrets in source code
- Commit `.env` file to version control
- Share secrets via email or chat
- Use weak or predictable values
- Expose secrets in error messages
- Log full secret values

---

## 4. SECURITY HEADERS

### Implemented Headers

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS protection |
| `Strict-Transport-Security` | `max-age=31536000` | Enforce HTTPS |
| `Content-Security-Policy` | Restrictive | Prevent XSS and injection attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information |
| `Permissions-Policy` | Restrictive | Disable unnecessary features |

### Configuration

Edit `backend/src/middleware/securityHeaders.ts` to customize headers.

---

## 5. CORS CONFIGURATION

### Allowed Origins

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5001',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
];
```

### Allowed Methods
- GET, POST, PUT, DELETE, PATCH, OPTIONS

### Allowed Headers
- Content-Type
- Authorization
- X-Requested-With

### Configuration

Edit `backend/src/middleware/securityHeaders.ts` to add/remove origins.

---

## 6. PASSWORD POLICY

### Requirements

- **Length**: 8-128 characters
- **Uppercase**: At least one uppercase letter
- **Lowercase**: At least one lowercase letter
- **Numbers**: At least one digit
- **Special Characters**: At least one of `@$!%*?&`
- **Expiry**: 90 days (force password change)
- **History**: Remember last 5 passwords (prevent reuse)

### Configuration

Edit `backend/src/config/security.ts`:

```typescript
passwordPolicy: {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  expiryDays: 90,
  historyCount: 5,
}
```

---

## 7. SESSION SECURITY

### Configuration

```typescript
session: {
  maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  secure: true,                  // HTTPS only in production
  httpOnly: true,                // No JavaScript access
  sameSite: 'strict',            // CSRF protection
  regenerateOnLogin: true,       // Prevent session fixation
}
```

### Best Practices

- Sessions expire after 24 hours
- Regenerate session ID on login
- Use secure, httpOnly cookies
- Implement CSRF tokens for state-changing operations

---

## 8. AUDIT LOGGING

### Logged Events

- User authentication attempts (success/failure)
- Sensitive data access
- Administrative actions
- API key usage
- Failed validation attempts
- Rate limit violations

### Configuration

Edit `backend/src/config/security.ts`:

```typescript
auditLogging: {
  enabled: true,
  logSensitiveOperations: true,
  logAuthAttempts: true,
  logDataAccess: true,
  retentionDays: 90,
}
```

### Sensitive Fields (Masked in Logs)

- password
- apiKey
- apiSecret
- token
- refreshToken
- creditCard
- ssn

---

## 9. OWASP TOP 10 COVERAGE

### A01:2021 – Broken Access Control
✅ Role-based access control (RBAC)
✅ JWT token validation
✅ User ownership verification

### A02:2021 – Cryptographic Failures
✅ HTTPS enforcement
✅ Secure password hashing (bcrypt)
✅ Encrypted sensitive data

### A03:2021 – Injection
✅ Input validation & sanitization
✅ Parameterized queries (MongoDB)
✅ No dynamic SQL construction

### A04:2021 – Insecure Design
✅ Security by design principles
✅ Threat modeling
✅ Secure defaults

### A05:2021 – Security Misconfiguration
✅ Centralized security config
✅ Environment-based secrets
✅ Security headers

### A06:2021 – Vulnerable and Outdated Components
✅ Regular dependency updates
✅ Security vulnerability scanning
✅ Dependency pinning

### A07:2021 – Authentication Failures
✅ Rate limiting on auth endpoints
✅ Strong password policy
✅ Session management

### A08:2021 – Software and Data Integrity Failures
✅ Dependency verification
✅ Secure update mechanisms
✅ Integrity checks

### A09:2021 – Logging and Monitoring Failures
✅ Comprehensive audit logging
✅ Error tracking
✅ Security event monitoring

### A10:2021 – Server-Side Request Forgery (SSRF)
✅ Input validation
✅ URL whitelist validation
✅ Network segmentation

---

## 10. DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All required environment variables set
- [ ] `secretManager.initialize()` called on startup
- [ ] Rate limiting enabled and configured
- [ ] HTTPS enforced
- [ ] Security headers enabled
- [ ] CORS origins configured correctly
- [ ] Database backups configured
- [ ] Monitoring and alerting enabled
- [ ] Audit logging enabled
- [ ] API keys rotated
- [ ] Dependencies updated
- [ ] Security tests passing
- [ ] Penetration testing completed

---

## 11. INCIDENT RESPONSE

### If API Key is Compromised

1. Immediately rotate the key using `secretManager.rotateSecret()`
2. Invalidate all existing tokens
3. Audit logs for unauthorized access
4. Notify affected users
5. Update external services

### If Database is Breached

1. Immediately rotate all secrets
2. Force password reset for all users
3. Audit logs for unauthorized access
4. Notify users and authorities
5. Review and strengthen security measures

### If Rate Limiting is Bypassed

1. Investigate attack pattern
2. Increase rate limits if needed
3. Implement additional protections (IP blocking, CAPTCHA)
4. Review and update security rules

---

## 12. MONITORING & ALERTS

### Key Metrics to Monitor

- Failed authentication attempts
- Rate limit violations
- Unusual API access patterns
- Database query performance
- Error rates
- Security header compliance

### Recommended Tools

- Sentry (error tracking)
- DataDog (monitoring)
- Splunk (log analysis)
- New Relic (APM)

---

## 13. SECURITY UPDATES

### Regular Tasks

- **Weekly**: Review security logs
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Penetration testing

### Staying Updated

- Subscribe to security advisories
- Monitor CVE databases
- Follow OWASP updates
- Participate in security communities

---

## 14. SUPPORT & REPORTING

### Security Issues

If you discover a security vulnerability, please email: `security@dineingoapp.com`

**Do NOT** create public GitHub issues for security vulnerabilities.

### Security Policy

See `SECURITY_POLICY.md` for responsible disclosure guidelines.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Last Updated**: March 2026
**Version**: 1.0.0
