# Language Preference Persistence

## Overview
Language preference is now saved to MongoDB and persists across sessions. When a user selects a language, it's saved to their profile and automatically loaded when they log in again.

## Changes Made

### 1. Backend - User Model (`backend/src/models/User.ts`)

**Added language field:**
```typescript
export interface IUser extends Document {
  // ... other fields
  language?: string;
  // ... other fields
}

const userSchema = new Schema<IUser>({
  // ... other fields
  language: { type: String, default: 'english' },
  // ... other fields
});
```

### 2. Frontend - User Type (`src/types/user.ts`)

**Added language field:**
```typescript
interface BaseUser {
  // ... other fields
  language?: string;
  // ... other fields
}
```

### 3. DashboardPage (`src/DashboardPage.tsx`)

**Load language from MongoDB:**
```typescript
// In auth useEffect, after loading profile
if (profile.language && ['english', 'hindi', 'tamil', 'kannada', 'telugu', 'malayalam'].includes(profile.language)) {
  setLanguage(profile.language as Language);
}
```

**Save language to MongoDB:**
```typescript
const handleLanguageChange = async (newLanguage: Language) => {
  setLanguage(newLanguage);
  
  // Save to MongoDB
  await fetch(`${API_CONFIG.BASE_URL}/api/users/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userData.uid,
      updates: { language: newLanguage }
    })
  });
  
  toast.success(`Language changed to ${newLanguage}`);
};
```

**Removed localStorage:**
- No longer using `localStorage.getItem('dineInGoLanguage')`
- Language is now stored in MongoDB only

## How It Works

### 1. User Selects Language
```
User clicks language button
    ↓
handleLanguageChange() is called
    ↓
setLanguage() updates UI immediately
    ↓
API call to /api/users/update
    ↓
MongoDB User.language field is updated
    ↓
Success toast notification
```

### 2. User Logs In
```
User logs in with Firebase
    ↓
Frontend fetches profile from MongoDB
    ↓
Profile includes language field
    ↓
setLanguage() is called with saved preference
    ↓
UI displays in user's preferred language
```

### 3. User Logs Out and Back In
```
User logs out
    ↓
User logs in again (even on different device)
    ↓
Profile is loaded from MongoDB
    ↓
Language preference is restored
    ↓
UI displays in saved language
```

## Supported Languages

1. **English** (default)
2. **Hindi** (हिंदी)
3. **Tamil** (தமிழ்)
4. **Kannada** (ಕನ್ನಡ)
5. **Telugu** (తెలుగు)
6. **Malayalam** (മലയാളം)

## Data Storage

### MongoDB Document
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "displayName": "John Doe",
  "language": "hindi",
  // ... other fields
}
```

### Default Value
- New users: `"english"`
- Existing users without language field: `"english"`

## Benefits

### 1. Cross-Device Sync
- User selects Hindi on desktop
- Logs in on mobile
- ✅ Mobile also shows Hindi

### 2. Persistent Preference
- User selects Tamil
- Logs out
- Logs in next week
- ✅ Still shows Tamil

### 3. No Local Storage Issues
- Works across browsers
- No cookie/localStorage limitations
- Survives browser cache clear

### 4. Centralized Data
- All user preferences in one place (MongoDB)
- Easy to backup and restore
- Can be synced with other services

## API Endpoint

### Update Language
```http
POST /api/users/update
Content-Type: application/json

{
  "userId": "firebase-uid",
  "updates": {
    "language": "hindi"
  }
}
```

### Response
```json
{
  "success": true,
  "message": "Profile updated successfully in MongoDB",
  "user": {
    "uid": "firebase-uid",
    "language": "hindi",
    // ... other fields
  }
}
```

## User Experience

### Language Selection Flow
1. User opens Settings
2. Scrolls to "Language Settings" section
3. Sees 6 language options with flags/names
4. Clicks desired language
5. ✅ UI immediately changes to selected language
6. ✅ Toast notification confirms change
7. ✅ Language is saved to MongoDB
8. ✅ Preference persists across sessions

### Visual Feedback
```
User clicks "हिंदी"
    ↓
UI instantly switches to Hindi
    ↓
Toast: "Language changed to Hindi"
    ↓
All text in app is now in Hindi
```

## Testing

### Test 1: Change Language
1. Log in to the app
2. Go to Settings
3. Click on a different language (e.g., Hindi)
4. ✅ UI should change immediately
5. ✅ Toast notification should appear
6. Check MongoDB: `db.users.findOne({ uid: "your-uid" })`
7. ✅ Should see `language: "hindi"`

### Test 2: Persistence After Logout
1. Select a language (e.g., Tamil)
2. Log out
3. Log in again
4. ✅ App should load in Tamil
5. ✅ No need to select language again

### Test 3: Cross-Device
1. Select language on Device A (e.g., Kannada)
2. Log in on Device B
3. ✅ Device B should show Kannada
4. Change to Telugu on Device B
5. Go back to Device A and refresh
6. ✅ Device A should now show Telugu

### Test 4: New User
1. Create a new account
2. ✅ Should default to English
3. Select a language
4. ✅ Should save and persist

## Migration

### Existing Users
- Users who already have a language in localStorage will need to select it once
- After selection, it will be saved to MongoDB
- Future logins will use MongoDB value

### Database Migration (Optional)
If you want to migrate existing localStorage data:

```javascript
// Run this once for existing users
const migrateLanguagePreference = async () => {
  const savedLanguage = localStorage.getItem('dineInGoLanguage');
  if (savedLanguage && userData?.uid) {
    await fetch('/api/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userData.uid,
        updates: { language: savedLanguage }
      })
    });
    localStorage.removeItem('dineInGoLanguage');
  }
};
```

## Troubleshooting

### Language Not Persisting

**Check 1: MongoDB Connection**
```bash
# Verify MongoDB is running
# Check backend logs for connection errors
```

**Check 2: API Call Success**
```javascript
// In browser console, check Network tab
// Should see POST to /api/users/update with 200 status
```

**Check 3: Profile Loading**
```javascript
// In browser console
console.log(userData);
// Should include language field
```

### Language Resets to English

**Possible Causes:**
1. MongoDB update failed (check backend logs)
2. Profile not loading correctly (check API response)
3. Invalid language value (must be one of 6 supported languages)

**Solution:**
1. Check browser console for errors
2. Verify backend is running
3. Check MongoDB document has correct language value

### Different Language on Different Devices

**This should NOT happen** - language is synced via MongoDB

**If it does:**
1. Check both devices are logged in with same account
2. Verify MongoDB has correct language value
3. Try logging out and back in on both devices

## Future Enhancements

1. **Auto-detect Language**
   - Use browser language as initial default
   - `navigator.language` → map to supported language

2. **More Languages**
   - Add more Indian languages
   - Add international languages

3. **Language Fallback**
   - If translation missing, show English
   - Partial translations supported

4. **RTL Support**
   - Add right-to-left languages (Arabic, Hebrew)
   - Adjust UI layout accordingly

5. **Language Analytics**
   - Track which languages are most popular
   - Prioritize translation efforts
