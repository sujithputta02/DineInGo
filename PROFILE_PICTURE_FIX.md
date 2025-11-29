# Profile Picture Persistence Fix

## Issues Fixed

### 1. Profile Picture Not Persisting After Refresh
**Problem:** After uploading a profile picture and refreshing the browser, the picture disappeared and showed initials instead.

**Root Cause:** DashboardPage was loading user data from Firestore instead of MongoDB, where the profile pictures are actually stored.

**Solution:**
- Changed DashboardPage to load profile data from MongoDB (`/api/profile/:uid`)
- MongoDB is now the primary source of truth for all profile data
- Firestore is only used as a backup/sync mechanism

### 2. Profile Picture Not Displaying (Showing Alt Text)
**Problem:** Uploaded images weren't displaying - only the alt text was shown.

**Root Cause:** Avatar URLs were stored as relative paths (`/uploads/avatars/...`) but the frontend couldn't resolve them without the backend URL.

**Solution:**
- Created `src/config/api.ts` with centralized API configuration
- Added `getAssetUrl()` helper to convert relative paths to full URLs
- All avatar URLs now include the full backend URL (`http://localhost:5000/uploads/...`)

### 3. Save Button Not Working
**Problem:** Clicking "Save Changes" didn't properly save the profile picture.

**Root Cause:** 
- Avatar upload wasn't using the correct backend URL
- `currentAvatar` field wasn't being set in updates
- Avatar URLs weren't being converted to full URLs

**Solution:**
- Updated avatar upload to use `API_CONFIG.BASE_URL`
- Added `currentAvatar` field to profile updates
- Ensured all avatar URLs are converted to full URLs before saving

## Changes Made

### 1. Created API Configuration (`src/config/api.ts`)
```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  
  // Helper to get full URL for assets
  getAssetUrl: (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path; // Base64
    return `${API_CONFIG.BASE_URL}${path}`;
  }
};
```

### 2. Updated DashboardPage.tsx
**Before:**
```typescript
// Loaded from Firestore
const userDoc = await getDoc(doc(db, 'users', user.uid));
const parsedData = userDoc.data();
photoURL: parsedData.photoURL
```

**After:**
```typescript
// Load from MongoDB
const profileRes = await fetch(`/api/profile/${user.uid}`);
const profile = await profileRes.json();
const avatarUrl = profile.currentAvatar || profile.photoURL;
const fullAvatarUrl = API_CONFIG.getAssetUrl(avatarUrl);
photoURL: fullAvatarUrl
```

### 3. Updated ProfileSettings.tsx

**Avatar Upload:**
```typescript
// Upload to backend
const res = await fetch(`${API_CONFIG.BASE_URL}/api/profile/${uid}/avatar`, {
  method: 'POST',
  body: formDataUpload,
});

// Convert to full URL
avatarUrl = API_CONFIG.getAssetUrl(data.profile.currentAvatar);
```

**Profile Updates:**
```typescript
const updates = {
  photoURL: avatarUrl,
  currentAvatar: avatarUrl, // Added this field
  avatars: avatarsArr,
  // ... other fields
};
```

**Load Profile:**
```typescript
const profile = await res.json();
const avatarUrl = profile.currentAvatar || profile.avatarUrl;
const fullAvatarUrl = API_CONFIG.getAssetUrl(avatarUrl);
setPreviewUrl(fullAvatarUrl);
```

## Data Flow

### Upload Flow
```
1. User selects image
   ↓
2. Image is cropped in browser
   ↓
3. Cropped blob is stored in formData._pendingAvatarBlob
   ↓
4. User clicks "Save Changes"
   ↓
5. Avatar is uploaded to backend: POST /api/profile/:uid/avatar
   ↓
6. Backend saves to: /uploads/avatars/:uid_timestamp.jpg
   ↓
7. Backend returns: { avatarUrl: "/uploads/avatars/..." }
   ↓
8. Frontend converts to full URL: http://localhost:5000/uploads/avatars/...
   ↓
9. Full URL is saved to MongoDB in User.photoURL and User.currentAvatar
   ↓
10. Socket.IO broadcasts update to all clients
```

### Load Flow
```
1. User logs in / refreshes page
   ↓
2. Firebase Auth provides uid
   ↓
3. Frontend fetches: GET /api/profile/:uid
   ↓
4. Backend returns profile from MongoDB
   ↓
5. Frontend converts relative URLs to full URLs
   ↓
6. Profile picture is displayed in navbar and settings
```

## MongoDB User Schema

```typescript
{
  uid: string,
  email: string,
  displayName: string,
  name: string,
  photoURL: string,           // Full URL: http://localhost:5000/uploads/...
  currentAvatar: string,      // Full URL: http://localhost:5000/uploads/...
  avatars: string[],          // Array of full URLs
  phoneNumber: string,
  address: {...},
  locationSettings: {...},
  createdAt: Date,
  updatedAt: Date
}
```

## File Storage

### Backend
- Uploaded files are stored in: `backend/uploads/avatars/`
- File naming: `{uid}_{timestamp}.{ext}`
- Example: `cT87VYgv1hgukQT7ehEt7x9Eh6h2_1234567890.jpg`

### Serving Files
```typescript
// backend/src/server.ts
app.use('/uploads', express.static('uploads'));
```

This makes files accessible at: `http://localhost:5000/uploads/avatars/...`

## Testing

### 1. Upload Profile Picture
1. Go to Settings
2. Click on profile picture
3. Select an image
4. Crop and apply filters
5. Click "Save Changes"
6. ✅ Picture should appear in navbar immediately

### 2. Refresh Browser
1. After uploading, refresh the page (F5)
2. ✅ Profile picture should still be visible
3. ✅ Should not revert to initials

### 3. Check MongoDB
```javascript
// In MongoDB Compass or shell
db.users.findOne({ uid: "your-uid" })

// Should see:
{
  photoURL: "http://localhost:5000/uploads/avatars/...",
  currentAvatar: "http://localhost:5000/uploads/avatars/...",
  avatars: ["http://localhost:5000/uploads/avatars/..."]
}
```

### 4. Check Network Tab
1. Open DevTools → Network
2. Upload a picture
3. Should see:
   - POST request to `/api/profile/:uid/avatar` (200 OK)
   - POST request to `/api/users/update` (200 OK)
   - Image loads from `http://localhost:5000/uploads/...`

## Troubleshooting

### Picture Still Not Showing After Refresh

**Check 1: Backend is running**
```bash
cd backend
npm run dev
```

**Check 2: MongoDB has the data**
```javascript
db.users.findOne({ uid: "your-uid" })
// Check photoURL and currentAvatar fields
```

**Check 3: File exists on disk**
```bash
ls backend/uploads/avatars/
# Should see your uploaded files
```

**Check 4: Console logs**
```javascript
// In browser console, should see:
"Loaded profile from MongoDB: { photoURL: '...', currentAvatar: '...' }"
"Avatar URL: http://localhost:5000/uploads/..."
```

### Image Shows Broken Icon

**Check 1: Full URL is being used**
```javascript
// In browser console
console.log(userData.photoURL)
// Should be: http://localhost:5000/uploads/...
// NOT: /uploads/... (relative path)
```

**Check 2: CORS is configured**
```typescript
// backend/src/server.ts
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
```

**Check 3: File permissions**
```bash
# Make sure backend can read the uploads folder
chmod -R 755 backend/uploads
```

### Save Button Not Working

**Check 1: Console errors**
- Open DevTools → Console
- Look for errors during save

**Check 2: Network requests**
- Open DevTools → Network
- Click "Save Changes"
- Should see POST requests to:
  - `/api/profile/:uid/avatar` (if new image)
  - `/api/users/update`

**Check 3: Backend logs**
```bash
# In backend terminal, should see:
"Avatar upload response: { avatarUrl: '...' }"
"User profile updated successfully in MongoDB"
```

## Environment Variables

For production, create `.env` file:

```env
# Frontend (.env)
VITE_API_URL=https://your-backend-domain.com

# Backend (.env)
PORT=5000
MONGODB_URI=your-mongodb-connection-string
```

Then update `src/config/api.ts`:
```typescript
BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
```

## Security Considerations

### 1. File Upload Validation
- ✅ File type validation (images only)
- ✅ File size limit (5MB)
- ✅ Unique filenames (uid + timestamp)

### 2. Access Control
- ✅ Users can only upload to their own profile
- ✅ Firebase Auth token validation
- ✅ UID verification

### 3. Storage
- ✅ Files stored outside web root
- ✅ Served through Express static middleware
- ✅ No directory traversal vulnerabilities

## Future Improvements

1. **Image Optimization**
   - Compress images on upload
   - Generate thumbnails
   - Use WebP format

2. **CDN Integration**
   - Upload to AWS S3 / Cloudinary
   - Serve through CDN
   - Better performance

3. **Multiple Avatars**
   - Allow users to upload multiple avatars
   - Switch between them
   - Delete old avatars

4. **Avatar Gallery**
   - Show all uploaded avatars
   - Select from gallery
   - Manage avatar collection

5. **Default Avatars**
   - Provide preset avatar options
   - Avatar generator (like Gravatar)
   - Themed avatars
