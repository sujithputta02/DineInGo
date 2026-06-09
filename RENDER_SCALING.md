# Render Auto-Scaling Configuration for 500+ Users

## 🎯 Goal
Configure Render to automatically scale from 1 to 4 instances based on traffic, handling 500+ concurrent users seamlessly.

---

## 📊 Scaling Strategy

### Traffic Patterns
- **Low traffic** (0-100 users): 1 instance
- **Medium traffic** (100-300 users): 2 instances
- **High traffic** (300-500 users): 3-4 instances
- **Peak traffic** (500+ users): 4 instances max

### Cost Optimization
- Start with 1 instance ($7/month)
- Scale up automatically when needed
- Scale down when traffic drops
- Max cost: $28/month (4 instances)

---

## 🚀 Step-by-Step Configuration

### Step 1: Upgrade to Standard Plan

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your DineInGo backend service
3. Click "Settings"
4. Under "Instance Type", select **"Standard"** ($7/month per instance)
   - **Don't use Starter** - no auto-scaling support
5. Click "Save Changes"

---

### Step 2: Configure Auto-Scaling

1. In service settings, scroll to **"Auto-Scaling"** section
2. Enable "Auto Deploy"
3. Configure scaling rules:

```
Min Instances: 1
Max Instances: 4

Scaling Criteria:
- CPU Usage > 70% for 3 minutes → Scale up
- CPU Usage < 30% for 5 minutes → Scale down
- Memory Usage > 80% → Scale up
- Request Queue > 50 → Scale up
```

**Render Dashboard Configuration:**
```
Auto-Scaling: Enabled
Min Instances: 1
Max Instances: 4
Target CPU: 70%
Target Memory: 80%
Scale Up Cooldown: 3 minutes
Scale Down Cooldown: 10 minutes
```

---

### Step 3: Configure Health Checks

Add health check endpoints (already created in BACKEND_OPTIMIZATIONS.md):

**In Render Dashboard:**
1. Go to "Settings" → "Health Check"
2. Configure:
   ```
   Health Check Path: /health/ready
   Health Check Port: 5001
   Health Check Interval: 30 seconds
   Health Check Timeout: 10 seconds
   Unhealthy Threshold: 3 failed checks
   ```

3. Save changes

---

### Step 4: Configure Environment Variables for Scaling

Add these to Render environment variables:

```env
# Instance Configuration
NODE_ENV=production
PORT=5001

# MongoDB Connection Pool (IMPORTANT!)
MONGODB_MAX_POOL_SIZE=50
MONGODB_MIN_POOL_SIZE=10

# Redis (for session sharing across instances)
REDIS_URL=your-redis-url
REDIS_ENABLED=true

# Session Configuration
SESSION_SECRET=your-secret-here
SESSION_STORE=redis

# Rate Limiting (shared across instances)
RATE_LIMIT_STORE=redis

# Cluster Mode
NODE_OPTIONS=--max-old-space-size=460
```

**Why these matter:**
- `MONGODB_MAX_POOL_SIZE`: Each instance needs its own connections
- `REDIS_URL`: Shares cache and sessions across multiple instances
- `NODE_OPTIONS`: Prevents memory leaks on Render's 512MB limit

---

### Step 5: Configure Load Balancing

Render automatically provides load balancing when you have multiple instances.

**Load Balancer Settings** (automatic):
- Algorithm: Round Robin
- Sticky Sessions: Disabled (use Redis for session sharing)
- Health Checks: Enabled
- Timeout: 30 seconds

**No additional configuration needed!**

---

### Step 6: Configure Resource Limits

```yaml
# render.yaml (optional, but recommended)
services:
  - type: web
    name: dineingo-backend
    env: node
    plan: standard
    buildCommand: npm install && npm run build
    startCommand: npm start
    
    # Auto-scaling configuration
    autoscaling:
      enabled: true
      minInstances: 1
      maxInstances: 4
      targetCPUPercent: 70
      targetMemoryPercent: 80
    
    # Health check
    healthCheckPath: /health/ready
    
    # Environment
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5001
      - key: MONGODB_MAX_POOL_SIZE
        value: 50
```

---

## 📈 Monitoring Auto-Scaling

### Render Metrics Dashboard

1. Go to your service in Render
2. Click "Metrics" tab
3. Monitor:
   - **CPU Usage**: Should stay 40-70% normally
   - **Memory Usage**: Should stay <80%
   - **Active Instances**: Watch it scale up/down
   - **Request Rate**: Requests per second
   - **Response Time**: Should stay <500ms

### Key Metrics to Watch

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| CPU Usage | 40-60% | 70-85% | >85% |
| Memory Usage | 50-70% | 75-85% | >90% |
| Response Time | <300ms | 500-800ms | >1000ms |
| Error Rate | <0.1% | 0.5-1% | >1% |
| Active Instances | 1-2 | 3 | 4 |

---

## 🔧 Optimization for Multi-Instance

### Issue 1: Session Sharing

**Problem**: User logged in on Instance 1, next request goes to Instance 2, user appears logged out.

**Solution**: Use Redis for session storage

```typescript
// backend/src/server.ts
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL
});
redisClient.connect();

// Use Redis for sessions
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));
```

**Install dependencies:**
```bash
npm install express-session connect-redis
npm install --save-dev @types/express-session
```

---

### Issue 2: WebSocket Sticky Sessions

**Problem**: Socket.IO connections break when scaling.

**Solution**: Enable sticky sessions for WebSocket routes

Render automatically handles this, but ensure your Socket.IO config allows:

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true
  },
  // Use WebSocket transport primarily
  transports: ['websocket', 'polling'],
  // Enable sticky session support
  path: '/socket.io/',
  // Add adapter for multi-instance
  adapter: require('socket.io-redis')({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  })
});
```

---

### Issue 3: Rate Limiting Across Instances

**Problem**: Rate limits are per-instance, not global.

**Solution**: Use Redis-backed rate limiter

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:', // rate limit prefix
  }),
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## 💰 Cost Calculator

### Scenario 1: Low Traffic (Average Day)
```
Active Instances: 1-2
Instance Type: Standard ($7 each)
Monthly Cost: $7-14
Best for: 0-200 concurrent users
```

### Scenario 2: Medium Traffic (Busy Hours)
```
Active Instances: 2-3
Instance Type: Standard ($7 each)
Monthly Cost: $14-21
Best for: 200-400 concurrent users
```

### Scenario 3: High Traffic (Peak Hours)
```
Active Instances: 4
Instance Type: Standard ($7 each)
Monthly Cost: $28
Best for: 500+ concurrent users
```

### Scenario 4: Black Friday / Major Event
```
Active Instances: 4 (max)
Instance Type: Standard Plus ($25 each) - if needed
Monthly Cost: $28-100
Best for: 1000+ concurrent users
```

**Average Monthly Cost**: $16-20 (assuming 2 instances average)

---

## 🚨 Scaling Triggers

### When Render Will Scale Up

1. **CPU Usage > 70%** for 3 minutes
2. **Memory Usage > 80%**
3. **Request Queue > 50** waiting requests
4. **Health Check Fails** on an instance

### When Render Will Scale Down

1. **CPU Usage < 30%** for 10 minutes
2. **Memory Usage < 50%**
3. **Request Queue < 10**
4. **Traffic drops** significantly

### Manual Scaling

You can also manually scale:
1. Go to Render Dashboard
2. Click "Manual Deploy"
3. Set "Number of Instances" to desired count
4. Click "Deploy"

---

## ✅ Post-Configuration Checklist

- [ ] Upgraded to Standard plan ($7/month)
- [ ] Auto-scaling enabled (1-4 instances)
- [ ] Health check endpoint configured
- [ ] MongoDB connection pool increased (50 connections)
- [ ] Redis configured for session sharing
- [ ] Redis configured for rate limiting
- [ ] Socket.IO adapter configured (if using WebSockets)
- [ ] Environment variables updated
- [ ] Monitoring metrics reviewed
- [ ] Test scaling with load testing tool

---

## 🧪 Test Auto-Scaling

### Method 1: Load Testing (Recommended)

Use Apache Bench to simulate traffic:

```bash
# Simulate 500 concurrent users
ab -n 10000 -c 500 -t 60 https://your-app.onrender.com/api/v1/restaurants

# Watch Render metrics to see instances scale up
```

### Method 2: Manual CPU Load

```bash
# SSH into Render (if available) or add test endpoint
# POST /api/test/cpu-load
router.post('/test/cpu-load', (req, res) => {
  const start = Date.now();
  while (Date.now() - start < 10000) {
    // Burn CPU for 10 seconds
    Math.random() * Math.random();
  }
  res.send('Load test complete');
});
```

---

## 📞 Troubleshooting

### Instances Not Scaling Up

**Symptoms**: CPU/Memory high, but stuck at 1 instance

**Solutions**:
1. Check auto-scaling is enabled
2. Verify you're on Standard plan (not Starter)
3. Check cooldown period hasn't been reached
4. Manually trigger deploy to refresh config

### Instances Not Scaling Down

**Symptoms**: Traffic low, but all 4 instances still running

**Solutions**:
1. Wait for cooldown period (10 minutes)
2. Check if health checks are passing
3. Verify CPU/Memory metrics are actually low
4. Check if there are long-running connections

### High Costs

**Symptoms**: Bill higher than expected

**Solutions**:
1. Reduce `maxInstances` to 2-3
2. Increase scale-up threshold (CPU from 70% to 80%)
3. Decrease scale-down cooldown (10min to 5min)
4. Monitor peak traffic times and scale manually

---

## 📊 Expected Performance

### With Auto-Scaling Configured

| Users | Instances | Response Time | CPU Usage | Status |
|-------|-----------|---------------|-----------|---------|
| 0-100 | 1 | <200ms | 40-60% | ✅ Optimal |
| 100-250 | 2 | <300ms | 50-70% | ✅ Good |
| 250-400 | 3 | <400ms | 60-75% | ✅ Good |
| 400-500 | 3-4 | <500ms | 65-80% | ✅ Good |
| 500+ | 4 | <600ms | 75-85% | ⚠️ Consider upgrade |

---

## 📞 Next Steps

After configuring Render auto-scaling:
1. ✅ Set up monitoring (MONITORING.md)
2. ✅ Configure frontend optimization (VERCEL_SCALING.md)
3. ✅ Run load tests (LOAD_TESTING.md)
4. ✅ Monitor costs and adjust thresholds
