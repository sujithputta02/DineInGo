# Render Deployment Fix

## Issue
Render is looking for `/opt/render/project/src/backend/dist/server.js` but the actual path is `/opt/render/project/backend/dist/server.js`

## Solution

### Step 1: Update Service Configuration in Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your `dineingo-backend` service
3. Click **Settings**
4. Scroll to **Build & Deploy**
5. Update the following:

   **Build Command:**
   ```
   cd backend && npm ci && npm run build
   ```

   **Start Command:**
   ```
   cd backend && npm start
   ```

   **Root Directory:** Leave EMPTY (important!)

6. Click **Save Changes**

### Step 2: Trigger a Manual Deploy
1. In the service page, click **Manual Deploy**
2. Select **main** branch
3. Click **Deploy**

## Why This Works
- `cd backend` changes to the correct directory where package.json and dist/ are located
- `npm ci` (clean install) ensures consistent dependencies
- `npm run build` compiles TypeScript → JavaScript in dist/
- `npm start` runs the compiled server from dist/server.js
- Empty Root Directory tells Render to use the project root, not src/backend

## Files Updated
- `render.yaml` - Configuration for Infrastructure as Code (if Render picks it up)
- `Procfile` - Backup for Procfile-based deployments
- `backend/Procfile` - Additional backup

## Alternative: If Render Dashboard Settings Don't Work
If the dashboard won't save the settings, use the Render CLI:
```bash
render services:env:set dineingo-backend BUILD_COMMAND="cd backend && npm ci && npm run build"
render services:env:set dineingo-backend START_COMMAND="cd backend && npm start"
```
