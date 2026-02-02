# Security Guide

## Overview
This document outlines security best practices and configurations for the DineInGo application.

## Environment Variables

### ⚠️ CRITICAL: Never Commit Secrets to Git

**What NOT to commit:**
- `.env` files
- API keys
- Database credentials
- JWT secrets
- Firebase service account keys
- SSL certificates
- Private keys

### Setup Instructions

1. **Copy the example files:**
   ```bash
   # Frontend
   cp .env.example .env
   
   # Backend
   cp backend/.env.example backend/.env
   ```

2. **Fill in your actual values** in the `.env` files

3. **Verify .gitignore** includes:
   ```
   .env
   .env.local
   backend/.env
   *-firebase-adminsdk-*.json
   ```

## Sensitive Information Checklist

### ✅ Backend (.env)
- [x] `MONGODB_URI` - Database connection string
- [x] `EMAIL_USER` - Gmail account
- [x] `EMAIL_PASS` - Gmail app password
- [x] `JWT_SECRET` - Token signing key
- [x] `ADMIN_CODE` - Admin access code
- [x] `FIREBASE_PRIVATE_KEY` - Firebase admin SDK key

### ✅ Frontend (.env)
- [x] `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API
- [x] `VITE_MAPBOX_API_KEY` - Mapbox API
- [x] `VITE_FIREBASE_API_KEY` - Firebase client config
- [x] `VITE_FIREBASE_*` - Other Firebase configs

## Security Best Practices

### 1. API Keys

**DO:**
- ✅ Store in environment variables
- ✅ Use different keys for dev/staging/production
- ✅ Rotate keys regularly
- ✅ Set up API key restrictions (IP, domain, API)
- ✅ Monitor API usage

**DON'T:**
- ❌ Hardcode in source code
- ❌ Commit to version control
- ❌ Share in public channels
- ❌ Use production keys in development

### 2. Database Security

**MongoDB Atlas:**
- Enable IP whitelist
- Use strong passwords (20+ characters)
- Enable database encryption
- Regular backups
- Monitor access logs

**Connection String:**
```env
# ❌ BAD - Exposed credentials
MONGODB_URI=mongodb+srv://admin:password123@cluster.mongodb.net/

# ✅ GOOD - Use environment variables
MONGODB_URI=mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}
```

### 3. Authentication

**JWT Secrets:**
- Use strong, random strings (32+ characters)
- Never reuse across environments
- Rotate periodically

**Generate secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Admin Code:**
- Change default admin code immediately
- Use 6+ digit codes
- Store in environment variable
- Consider implementing rate limiting

### 4. Email Security

**Gmail App Passwords:**
- Enable 2-Factor Authentication
- Generate app-specific passwords
- Don't use your main Gmail password
- Revoke unused app passwords

**Setup:**
1. Go to Google Account → Security
2. Enable 2FA
3. Generate App Password
4. Use in `EMAIL_PASS` environment variable

### 5. Firebase Security

**Client-Side (Frontend):**
- Firebase API keys are safe to expose (they're restricted by domain)
- Set up Firebase Security Rules
- Enable App Check for production

**Server-Side (Backend):**
- Keep service account JSON files private
- Never commit to Git
- Use environment variables for credentials

**Firebase Security Rules Example:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. CORS Configuration

**Backend CORS Setup:**
```typescript
// ❌ BAD - Allows all origins
app.use(cors({ origin: '*' }));

// ✅ GOOD - Whitelist specific origins
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

### 7. File Uploads

**Security Measures:**
- Validate file types
- Limit file sizes
- Scan for malware
- Store outside web root
- Use unique filenames
- Implement access controls

**Current Implementation:**
```typescript
// backend/uploads/ is gitignored
// Files are validated by type and size
// Unique filenames prevent overwrites
```

## Production Deployment

### Environment-Specific Configs

**Development:**
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dineingo-dev
CORS_ORIGINS=http://localhost:5173
```

**Production:**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://prod-user:strong-password@prod-cluster.mongodb.net/dineingo
CORS_ORIGINS=https://dineingo.com,https://www.dineingo.com
```

### Deployment Checklist

- [ ] Change all default passwords
- [ ] Use production database
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable logging and monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Implement backup strategy

## API Key Restrictions

### Google Maps API
1. Go to Google Cloud Console
2. Select your project
3. Navigate to APIs & Services → Credentials
4. Click on your API key
5. Set restrictions:
   - **Application restrictions:** HTTP referrers
   - **Website restrictions:** Add your domain
   - **API restrictions:** Only enable required APIs

### Firebase
1. Go to Firebase Console
2. Project Settings → General
3. Add authorized domains
4. Set up App Check
5. Configure Security Rules

## Monitoring & Alerts

### Set Up Alerts For:
- Failed login attempts
- Unusual API usage
- Database connection failures
- High error rates
- Suspicious file uploads
- Rate limit violations

### Logging Best Practices:
```typescript
// ❌ DON'T log sensitive data
console.log('User login:', { email, password }); // BAD!

// ✅ DO log safely
console.log('User login attempt:', { email, timestamp }); // GOOD
```

## Incident Response

### If API Keys Are Compromised:

1. **Immediately:**
   - Revoke compromised keys
   - Generate new keys
   - Update environment variables
   - Deploy updated configuration

2. **Investigate:**
   - Check access logs
   - Identify unauthorized usage
   - Assess damage

3. **Prevent:**
   - Review security practices
   - Update documentation
   - Train team members

## Security Audit Checklist

- [ ] All secrets in environment variables
- [ ] .env files in .gitignore
- [ ] No hardcoded credentials in code
- [ ] API keys have restrictions
- [ ] Database has IP whitelist
- [ ] HTTPS enabled in production
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] File upload security measures
- [ ] Regular dependency updates
- [ ] Security headers configured
- [ ] Error messages don't leak info
- [ ] Logging doesn't expose secrets

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Support

For security concerns or to report vulnerabilities:
- Email: security@dineingo.com
- Do NOT post security issues publicly
- Use responsible disclosure practices
