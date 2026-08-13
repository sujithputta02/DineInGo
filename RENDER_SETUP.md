# Render Deployment Fix - Final Steps

## Status: CLI Logged In ✓
Service found: `dineingo-backend` (ID: `srv-d6ukh6f5gffc73cq779g`)

## Current Configuration Issues
- **Build Command:** `npm install; npm run build` (wrong syntax, runs from root)
- **Start Command:** `npm run start` (runs from root, can't find dist/server.js)
- **Root Directory:** `backend` (correct, but start command doesn't respect it)

## Solution: Update Service in Render Dashboard

Since Render CLI doesn't expose build/start command updates, you MUST manually update in the dashboard:

### Quick Fix (2 minutes):
1. Go: https://dashboard.render.com/web/srv-d6ukh6f5gffc73cq779g
2. Click **Settings** tab
3. Under **Build & Deploy** section, update:
   - **Build Command:** `curl -fsSL https://bun.sh/install | bash && cd backend && ~/.bun/bin/bun install && ~/.bun/bin/bun run build`
   - **Start Command:** `cd backend && ~/.bun/bin/bun start`
   - Keep **Root Directory:** `backend`
4. Click **Save**
5. Click **Manual Deploy** → Deploy main branch

## Why This Works
- `curl -fsSL https://bun.sh/install | bash` installs bun in the container
- `~/.bun/bin/bun` uses the full path to bun binary (since it may not be in PATH)
- `cd backend` ensures commands run in correct directory
- `bun install` for fast, reliable builds
- `bun run build` compiles TypeScript → dist/
- `bun start` runs the compiled server

## Files Prepared (Committed to main):
- ✅ `render.yaml` - Infrastructure as Code (if Render picks it up in future)
- ✅ `Procfile` - Backup deployment config
- ✅ `backend/Procfile` - Per-service config
- ✅ `RENDER_SETUP.md` - Setup guide

## Alternative: If Dashboard Update Fails
Try recreating the service with correct settings or contact Render support with these configs.

## Done After Manual Dashboard Update:
Once you update the dashboard settings and deploy, the backend will:
1. Compile TypeScript successfully
2. Find dist/server.js in the correct path
3. Start the server without MODULE_NOT_FOUND errors

