# Profile System Architecture

## Overview
The DineInGo app uses a hybrid authentication and profile storage system:
- **Firebase Authentication**: Handles user account creation, login, and authentication
- **MongoDB**: Stores all user profile data and activity tracking

## Data Flow

### 1. User Signup/Login
```
User → Firebase Auth (creates account) → Frontend → Backend API → MongoDB (stores profile)
```

**What happens:**
- User signs up/logs in via Firebase (Google, Email, etc.)
- Firebase creates/authenticates the user account
- Frontend receives Firebase user with `uid`, `email`, `displayName`
- Frontend calls backend API to create/update user in MongoDB
- MongoDB stores complete profile with all fields

### 2. Profile Updates
```
User edits profile → Frontend → Backend API → MongoDB (updates) → Socket.IO → All clients (real-time update)
```

**What happens:**
- User updates profile in ProfileSettings component
- Frontend calls `/api/users/update` with changes
- Backend updates MongoDB User document
- Backend emits Socket.IO event for real-time sync
- All connected clients receive the update instantly

## MongoDB User Schema

The User model in MongoDB stores:

### Basic Info (from Firebase)
- `uid` - Firebase user ID (unique)
- `email` - User email
- `displayName` - Display name
- `emailVerified` - Email verification status

### Extended Profile Data
- `name` - Full name
- `phoneNumber` - Phone number
- `photoURL` - Current profile picture URL
- `currentAvatar` - Currently selected avatar
- `avatars[]` - Array of uploaded avatar URLs

### Address Information
```typescript
address: {
  street: string
  city: string
  state: string
  country: string
  zipCode: string
}
```

### Location Settings
```typescript
locationSettings: {
  type: 'auto' | 'manual'
  coordinates: { lat: number, lng: number }
  address: string
  city: string
  state: string
  country: string
  zipCode: string
  searchRadius: number
}
```

### Activity Tracking
- `activities[]` - Array of user activities (login, logout, signup)
- `lastLogin` - Last login timestamp
- `createdAt` - Account creation date
- `updatedAt` - Last profile update

### Admin Fields
- `isAdmin` - Admin flag
- `password` - Optional password field

## API Endpoints

### User Routes (`/api/users`)

#### POST `/api/users/update`
Updates user profile in MongoDB
```json
Request:
{
  "userId": "firebase-uid",
  "updates": {
    "displayName": "John Doe",
    "name": "John Doe",
    "phoneNumber": "1234567890",
    "photoURL": "https://...",
    "address": { ... },
    "locationSettings": { ... }
  }
}

Response:
{
  "success": true,
  "message": "Profile updated successfully in MongoDB",
  "user": { ... }
}
```

#### POST `/api/users/login`
Tracks user login activity
```json
Request:
{
  "uid": "firebase-uid",
  "loginSource": "google" | "email"
}
```

#### GET `/api/users/:id`
Gets user profile by Firebase UID

#### PUT `/api/users/:id`
Updates user (alternative endpoint)

### Profile Routes (`/api/profile`)

#### GET `/api/profile/:uid`
Gets complete profile data for a user

#### POST `/api/profile/:uid`
Creates or updates profile (upsert)

#### POST `/api/profile/:uid/avatar`
Uploads new avatar image
- Accepts multipart/form-data
- Stores in `/uploads/avatars/`
- Adds to user's avatars array
- Sets as currentAvatar

#### POST `/api/profile/:uid/set-avatar`
Sets an existing avatar as current
```json
Request:
{
  "avatarUrl": "/uploads/avatars/..."
}
```

## Real-time Updates (Socket.IO)

### Event: `profile_updated`
Emitted when any profile data changes

```javascript
socket.on('profile_updated', (data) => {
  // data.uid - User ID
  // data.profile - Updated profile data
});
```

**Frontend listeners:**
- DashboardPage: Updates navbar profile picture and name
- ProfileSettings: Updates form data and preview

## Frontend Components

### ProfileSettings Component
- Loads profile from `/api/profile/:uid`
- Updates profile via `/api/users/update`
- Uploads avatars via `/api/profile/:uid/avatar`
- Listens for Socket.IO `profile_updated` events
- Polls for updates every 10 seconds (fallback)

### DashboardPage Component
- Displays profile in navbar
- Listens for Socket.IO `profile_updated` events
- Updates local state when profile changes
- Syncs with Firebase Auth for displayName/photoURL

## Key Features

### 1. Dual Storage
- Firebase: Authentication only
- MongoDB: All profile data

### 2. Real-time Sync
- Socket.IO broadcasts profile changes
- All clients update instantly
- No page refresh needed

### 3. Avatar Management
- Multiple avatars per user
- Upload new avatars
- Switch between avatars
- Initials-based fallback avatars

### 4. Activity Tracking
- Login/logout events
- Device and IP information
- Login source tracking (Google, email, etc.)

### 5. Location Features
- Auto-detect location
- Manual location entry
- Search radius settings
- City/state/country storage

## Security

### Authentication
- Firebase handles all authentication
- Backend validates Firebase ID tokens
- Protected routes require valid token

### Data Access
- Users can only update their own profile
- UID from Firebase token must match profile UID
- MongoDB validates all updates

## Error Handling

### Frontend
- Toast notifications for success/error
- Fallback to initials avatar on image load failure
- Graceful degradation if Socket.IO fails

### Backend
- Comprehensive error logging
- Validation of required fields
- Proper HTTP status codes
- Error messages in responses

## Future Enhancements

1. **Profile Privacy Settings**
   - Control what data is visible
   - Public/private profile toggle

2. **Profile Completion Tracking**
   - Track which fields are filled
   - Encourage complete profiles

3. **Profile Picture Cropping**
   - Already implemented in frontend
   - Filters and zoom support

4. **Profile History**
   - Track profile changes over time
   - Audit log for updates

5. **Social Features**
   - Follow other users
   - Share profile
   - Profile badges/achievements
