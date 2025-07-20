# Backend Setup Guide

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/?retryWrites=true&w=majority

# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Server Configuration
PORT=5000

# JWT Secret (for authentication)
JWT_SECRET=your_jwt_secret_key_here

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Installation & Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. Seed the database with restaurant data:
```bash
npm run seed
```

4. Start the server:
```bash
npm start
```

## Email Setup

For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password as EMAIL_PASS

## MongoDB Setup

1. Create a MongoDB Atlas account
2. Create a cluster
3. Get your connection string
4. Replace the placeholder in MONGODB_URI

## Database Seeding

The application includes a seed script that populates the database with sample restaurant data. This ensures that the frontend can find restaurants with IDs like "1", "2", "3", etc.

To re-seed the database:
```bash
npm run seed
```

## Troubleshooting

### Email Errors
- Ensure EMAIL_USER and EMAIL_PASS are set
- Use Gmail App Password, not regular password
- Check if 2FA is enabled on Gmail

### MongoDB Errors
- Verify connection string format
- Check if IP is whitelisted in MongoDB Atlas
- Ensure database user has proper permissions
- Run `npm run seed` to populate the database

### CORS Errors
- Verify frontend URLs are in CORS_ORIGINS
- Check if frontend is running on correct port

### Restaurant API Errors
- Ensure the database is seeded with restaurant data
- Check that restaurant IDs in the database match frontend expectations
- Verify MongoDB connection is working 