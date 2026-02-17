# System Health Monitoring

## Overview
The System Health page provides real-time monitoring of the DineInGo platform's infrastructure, performance metrics, and operational status.

## Features

### 1. Real-Time Monitoring
- Auto-refresh every 30 seconds (can be toggled on/off)
- Manual refresh button for immediate updates
- Live status indicators for all services

### 2. System Status Dashboard
- **Overall System Status**: Operational, Degraded, or Unhealthy
- **System Uptime**: Total time the system has been running
- **Last Updated**: Timestamp of the most recent health check

### 3. Service Status Monitoring
Four critical services are monitored:

#### API Service
- Status: Operational/Degraded/Unhealthy
- Uptime: Time since API started
- Response Time: Average API response time in milliseconds

#### Database Service
- Status: Connected/Disconnected
- Connection State: Real-time MongoDB connection status
- Collections Count: Number of database collections

#### Storage Service
- Status: Operational/Unavailable
- Availability: File storage system status

#### Email Service
- Status: Operational/Unavailable
- Configuration: Email service availability

### 4. Performance Metrics

#### Memory Usage
- Total Memory: Total system RAM
- Used Memory: Currently used RAM
- Free Memory: Available RAM
- Usage Percentage: Visual progress bar with color coding:
  - Green: < 60% (Healthy)
  - Yellow: 60-80% (Warning)
  - Red: > 80% (Critical)

#### CPU Usage
- CPU Cores: Number of available CPU cores
- Load Average: System load average
- Usage Percentage: CPU utilization with color coding
- Response Time: API response time in milliseconds

### 5. Database Collections
Real-time count of documents in each collection:
- Users
- Businesses
- Bookings
- Restaurants
- Events

### 6. Activity Monitoring (Last 24 Hours)
- New Users: Users registered in the last 24 hours
- New Bookings: Bookings created in the last 24 hours
- New Businesses: Businesses registered in the last 24 hours
- Active Bookings: Currently active confirmed/pending bookings

### 7. System Information
- Node.js Version
- Platform (OS)
- Architecture (CPU architecture)
- Process Uptime

## API Endpoints

### GET /api/admin/system-health
Returns comprehensive system health metrics including:
- System status and uptime
- Database connection status and collection counts
- Performance metrics (memory, CPU)
- Recent activity statistics

**Response Example:**
```json
{
  "success": true,
  "timestamp": "2024-02-17T10:30:00.000Z",
  "system": {
    "status": "operational",
    "uptime": 86400,
    "systemUptime": 259200,
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "arch": "x64"
  },
  "database": {
    "status": "healthy",
    "connected": true,
    "collections": {
      "users": 1250,
      "businesses": 45,
      "bookings": 3420,
      "restaurants": 38,
      "events": 12
    }
  },
  "performance": {
    "memory": {
      "total": 8589934592,
      "free": 4294967296,
      "used": 4294967296,
      "usagePercent": 50.0
    },
    "cpu": {
      "count": 4,
      "loadAverage": [1.5, 1.3, 1.2],
      "usagePercent": 37.5
    },
    "responseTime": 45
  },
  "activity": {
    "last24Hours": {
      "newUsers": 23,
      "newBookings": 156,
      "newBusinesses": 2
    },
    "activeBookings": 89
  }
}
```

### GET /api/admin/service-status
Returns status of individual services:
```json
{
  "success": true,
  "services": {
    "api": {
      "status": "operational",
      "uptime": 86400,
      "responseTime": 45
    },
    "database": {
      "status": "operational",
      "connected": true
    },
    "storage": {
      "status": "operational",
      "available": true
    },
    "email": {
      "status": "operational",
      "available": true
    }
  },
  "timestamp": "2024-02-17T10:30:00.000Z"
}
```

### GET /api/admin/database-stats
Returns detailed database statistics:
```json
{
  "success": true,
  "stats": {
    "collections": 15,
    "dataSize": 52428800,
    "storageSize": 104857600,
    "indexes": 45,
    "indexSize": 10485760,
    "avgObjSize": 2048
  }
}
```

### GET /api/admin/api-health
Health check endpoint for monitoring tools:
```json
{
  "success": true,
  "status": "healthy",
  "checks": {
    "database": true,
    "memory": true,
    "uptime": true
  },
  "timestamp": "2024-02-17T10:30:00.000Z"
}
```

## Access Control
- Only accessible to authenticated admin users
- Protected by ProtectedAdminRoute component
- Requires valid admin session

## Usage

### Accessing the System Health Page
1. Log in to the Admin Portal
2. Navigate to "System Health" from the sidebar
3. View real-time metrics and status

### Interpreting Status Colors
- **Green (Operational)**: System is functioning normally
- **Yellow (Degraded)**: System is experiencing issues but still operational
- **Red (Unhealthy)**: System is experiencing critical issues

### Using Auto-Refresh
- Toggle the "Auto-refresh" checkbox to enable/disable automatic updates
- When enabled, data refreshes every 30 seconds
- Manual refresh is always available via the "Refresh" button

### Monitoring Performance
- Watch memory usage to ensure it stays below 80%
- Monitor CPU usage for performance bottlenecks
- Check response times to identify latency issues
- Review database connection status for connectivity problems

## Troubleshooting

### High Memory Usage (>80%)
- Check for memory leaks in the application
- Review active connections and processes
- Consider scaling up server resources

### High CPU Usage (>80%)
- Identify CPU-intensive operations
- Review database query performance
- Check for infinite loops or blocking operations

### Database Connection Issues
- Verify MongoDB Atlas connection string
- Check network connectivity
- Review IP whitelist settings
- Verify database credentials

### Slow Response Times (>1000ms)
- Review database query performance
- Check network latency
- Analyze API endpoint performance
- Consider implementing caching

## Best Practices
1. Monitor the System Health page regularly
2. Set up alerts for critical thresholds
3. Review activity trends to identify patterns
4. Keep the page open during deployments
5. Use auto-refresh during critical operations
6. Document any anomalies or incidents

## Future Enhancements
- Historical data and trend charts
- Configurable alert thresholds
- Email/SMS notifications for critical issues
- Integration with external monitoring tools
- Custom dashboard widgets
- Performance benchmarking
- Automated health reports
