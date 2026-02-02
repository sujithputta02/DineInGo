# Team Setup Guide

## For New Team Members

Welcome to the DineInGo team! This guide will help you set up your development environment quickly and securely.

## Quick Start (5 minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/sujithputta02/DineInGo.git
cd DineInGo
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Set Up Environment Variables
```bash
# Automated setup with shared dev credentials
node scripts/setup-team-env.js
```

This will create `.env` files with shared development credentials that are safe for team collaboration.

### 4. Get Your Personal API Keys (Optional but Recommended)

Some services require personal API keys for the free tier:

#### Google Maps API (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Maps JavaScript API"
4. Create credentials → API Key
5. Add to `.env`: `VITE_GOOGLE_MAPS_API_KEY=your_key_here`

#### Mapbox API (Optional)
1. Sign up at [Mapbox](https://www.mapbox.com/)
2. Get your access token from the dashboard
3. Add to `.env`: `VITE_MAPBOX_API_KEY=your_token_here`

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
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## Understanding Environment Files

### Files You'll See:

1. **`.env.example`** - Template with all required variables (empty values)
2. **`.env.development.shared`** - Shared dev credentials (safe to commit)
3. **`.env`** - Your local environment (NEVER commit this)

### Why We Don't Commit .env Files:

- ❌ Security risk if repo becomes public
- ❌ Credentials stay in Git history forever
- ❌ Can lead to unauthorized access and costs
- ✅ Each developer can use their own credentials
- ✅ Production secrets stay separate

---

## Shared Development Credentials

The `.env.development.shared` files contain:

### ✅ Safe to Share:
- Development database connection (separate from production)
- Test email credentials
- Development Firebase project
- Non-sensitive configuration

### ❌ NOT Included (Get Your Own):
- Personal API keys (Google Maps, Mapbox)
- Production credentials
- Your own test accounts

---

## Working with the Team

### Daily Development:

1. **Pull latest changes:**
   ```bash
   git pull
   ```

2. **Your .env files are gitignored** - they won't be affected by pulls

3. **If shared credentials change:**
   - Team lead will update `.env.development.shared`
   - You'll see it in git pull
   - Run: `node scripts/setup-team-env.js` to update

### Making Changes:

1. **Never commit .env files:**
   ```bash
   # These are automatically ignored
   .env
   backend/.env
   ```

2. **If you add new environment variables:**
   - Update `.env.example` with the new variable (empty value)
   - Update `.env.development.shared` if it's a shared dev credential
   - Document it in this guide
   - Notify the team

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Your message"
   git push
   ```

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Check if backend server is running
- Verify `MONGODB_URI` in `backend/.env`
- Ask team lead for updated credentials

### "Firebase authentication failed"
- Check Firebase config in `.env`
- Ensure you're using the development Firebase project
- Ask team lead for updated credentials

### "API key invalid"
- Get your own API keys (see step 4 above)
- Or ask team lead for shared development keys

### "Port already in use"
- Kill the process:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:5000 | xargs kill -9
  ```

### ".env file missing"
- Run: `node scripts/setup-team-env.js`
- Or manually copy: `cp .env.development.shared .env`

---

## Best Practices

### DO:
- ✅ Use shared development credentials for testing
- ✅ Get your own API keys when possible
- ✅ Keep your .env files up to date
- ✅ Ask questions if something doesn't work
- ✅ Report issues with shared credentials to team lead

### DON'T:
- ❌ Commit .env files to Git
- ❌ Share credentials in public channels
- ❌ Use production credentials in development
- ❌ Hardcode secrets in source code
- ❌ Share your personal API keys

---

## Getting Help

### Resources:
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup instructions
- [SECURITY.md](SECURITY.md) - Security best practices
- [README.md](README.md) - Project overview

### Contact:
- Team Lead: [Your Name]
- Slack Channel: #dineingo-dev
- Email: dev@dineingo.com

---

## Production Deployment

**Note:** Production deployment uses completely different credentials:
- Separate MongoDB cluster
- Production Firebase project
- Production API keys with restrictions
- Strong JWT secrets
- Different admin codes

Never use development credentials in production!

---

## Quick Reference

### Setup Commands:
```bash
# Initial setup
node scripts/setup-team-env.js

# Install dependencies
npm install
cd backend && npm install && cd ..

# Start servers
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
npm run dev
```

### Useful Scripts:
```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Backend
npm run dev          # Start dev server with nodemon
npm run build        # Compile TypeScript
npm start            # Start production server
```

---

## Welcome Aboard! 🚀

You're all set! If you have any questions, don't hesitate to ask the team.

Happy coding! 🎉
