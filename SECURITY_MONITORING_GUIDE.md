# Security Monitoring Dashboard - Admin Portal Guide

## Overview

The Security Monitoring Dashboard provides real-time visibility into security threats, audit logs, and system health across all three portals (User, Business, Admin).

## Access

**URL:** `/admin/{sessionToken}/security`

**Requirements:**
- Admin authentication (JWT token)
- Rate limited: 50 requests / 15 minutes
- All actions are audit logged

---

## Features

### 1. Security Overview Dashboard

**Endpoint:** `GET /api/admin/security/dashboard`

**Real-time Metrics (Last 24 Hours):**
- Failed login attempts
- Rate limit violations
- Suspicious IP addresses
- Active admin sessions
- Business security events
- Locked user accounts

**Security Events by Type (Last 7 Days):**
- Action breakdown with success/failure counts
- Top 10 most frequent security events

**Active Admin Sessions:**
- Currently active administrators
- Last activity timestamp
- Action count per session

**Color-Coded Risk Indicators:**
- 🟢 Green: Normal (safe)
- 🟡 Yellow: Warning (monitor)
- 🔴 Red: Critical (action required)

---

### 2. Audit Logs Viewer

**Endpoint:** `GET /api/admin/security/audit-logs`

**Features:**
- Real-time security event timeline
- Last 50 events across all portals
- Filterable by:
  - Portal (admin, business, user, all)
  - Action type
  - Admin email / Owner ID
  - Date range
  - Success/failure status
  - IP address
- Pagination support

**Log Details:**
- Timestamp
- Portal (admin/business)
- Action performed
- User identifier
- IP address
- Success/failure status
- Response status code
- Request duration

---

### 3. Threat Detection

**Endpoint:** `GET /api/admin/security/suspicious-activity`

**Detects:**
- Multiple failed login attempts (5+ in 24 hours)
- Rapid action patterns (100+ actions/hour)
- Unusual IP behavior
- Account lockouts

**Suspicious IP Tracking:**
- IP address
- Failed attempt count
- Action types attempted
- Risk level assessment

**Actions Available:**
- View detailed IP activity report
- Block/unblock IP addresses (Super Admin only)
- Export threat report

---

### 4. Rate Limit Statistics

**Endpoint:** `GET /api/admin/security/rate-limits`

**Metrics:**
- Total rate limit violations (24 hours)
- Violations by endpoint
- Violations by IP address
- Admin vs Business portal breakdown

**Use Cases:**
- Identify bot attacks
- Detect API abuse
- Monitor traffic patterns
- Adjust rate limits if needed

---

### 5. Authentication Security Metrics

**Endpoint:** `GET /api/admin/security/auth-metrics`

**Tracks:**
- OTP request/verification success rates
- Failed authentication attempts by IP
- Account lockout statistics
- Recent lockout events

**Admin Authentication:**
- OTP generation metrics
- OTP verification success/failure
- Failed attempts by IP address

**User Account Security:**
- Total locked accounts
- Recent lockouts (24 hours)
- Lockout reasons

---

### 6. IP Activity Report

**Endpoint:** `GET /api/admin/security/ip/:ipAddress`

**Provides:**
- Complete activity history for specific IP
- Admin portal actions
- Business portal actions
- Risk score calculation
- Failure rate analysis

**Risk Levels:**
- Low: < 20% failure rate, < 5 failed actions
- Medium: 20-50% failure rate, 5-10 failed actions
- High: > 50% failure rate, > 10 failed actions

---

### 7. Security Timeline

**Endpoint:** `GET /api/admin/security/timeline`

**Shows:**
- Chronological security events
- Failed actions highlighted
- Critical admin actions (add/remove admin, status changes)
- Last 50 events by default

---

### 8. Security Health Check

**Endpoint:** `GET /api/admin/security/health`

**Health Score (0-100):**
- 80-100: Healthy (green)
- 60-79: Warning (yellow)
- 0-59: Critical (red)

**Factors:**
- Failed login count
- Rate limit violations
- Locked account count

**Recommendations:**
- Automated alerts for anomalies
- Suggested actions for security issues

---

### 9. Export Security Report

**Endpoint:** `GET /api/admin/security/export`

**Format:** CSV

**Includes:**
- All audit logs for date range
- Portal, action, user, IP, success status
- Timestamp and duration
- Filterable by portal

**Use Cases:**
- Compliance reporting
- Security audits
- Incident investigation
- Historical analysis

---

### 10. IP Blocking (Super Admin Only)

**Endpoint:** `POST /api/admin/security/block-ip`

**Parameters:**
```json
{
  "ipAddress": "192.168.1.100",
  "blocked": true,
  "reason": "Multiple failed login attempts"
}
```

**Features:**
- Block suspicious IP addresses
- Unblock false positives
- Reason tracking
- Blocked by admin tracking
- Optional expiration time

---

## Auto-Refresh

The dashboard automatically refreshes every 30 seconds when enabled. Toggle with the "Auto-Refresh" button.

---

## Security Alerts

Real-time alerts for:
- Failed login attempts (3+ from same IP)
- Rate limit violations (100+ in 24 hours)
- Account lockouts
- Suspicious activity patterns

---

## Best Practices

1. **Monitor Daily:**
   - Check dashboard at start of day
   - Review suspicious IPs
   - Verify no critical alerts

2. **Investigate Anomalies:**
   - High failed login counts
   - Unusual IP activity
   - Rapid action patterns

3. **Export Reports:**
   - Weekly security reports
   - Monthly compliance reports
   - Incident documentation

4. **Block Threats:**
   - Block IPs with 10+ failed attempts
   - Review blocked IPs weekly
   - Document blocking reasons

5. **Review Audit Logs:**
   - Check admin actions daily
   - Verify business owner activity
   - Monitor for unauthorized access

---

## Security Incident Response

### If Suspicious Activity Detected:

1. **Immediate Actions:**
   - Review IP activity report
   - Check audit logs for pattern
   - Block IP if confirmed threat
   - Notify affected users/businesses

2. **Investigation:**
   - Export security report
   - Analyze timeline of events
   - Identify attack vector
   - Document findings

3. **Mitigation:**
   - Update rate limits if needed
   - Add additional validation
   - Notify security team
   - Update security policies

4. **Follow-up:**
   - Monitor for repeat attempts
   - Review blocked IPs weekly
   - Update security documentation
   - Train admin team

---

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/security/dashboard` | GET | Admin | Security overview |
| `/api/admin/security/audit-logs` | GET | Admin | Filtered audit logs |
| `/api/admin/security/suspicious-activity` | GET | Admin | Threat detection |
| `/api/admin/security/rate-limits` | GET | Admin | Rate limit stats |
| `/api/admin/security/auth-metrics` | GET | Admin | Auth security |
| `/api/admin/security/ip/:ipAddress` | GET | Admin | IP activity |
| `/api/admin/security/timeline` | GET | Admin | Event timeline |
| `/api/admin/security/health` | GET | Admin | Health check |
| `/api/admin/security/block-ip` | POST | Super Admin | Block/unblock IP |
| `/api/admin/security/export` | GET | Admin | Export CSV report |

---

## Technical Implementation

**Backend:**
- `backend/src/controllers/securityMonitoringController.ts` - All security monitoring logic
- `backend/src/models/BlockedIP.ts` - Blocked IP storage
- `backend/src/routes/adminRoutes.ts` - Security endpoints

**Frontend:**
- `src/pages/AdminSecurityMonitoringPage.tsx` - Security dashboard UI
- `src/layouts/AdminLayout.tsx` - Navigation with Security link
- `src/App.tsx` - Route configuration

**Security:**
- All endpoints require admin JWT authentication
- Rate limited to prevent abuse
- All actions audit logged
- Super Admin required for IP blocking

---

## Support

For security incidents or questions:
- Email: security@dineingo.com
- Emergency: Contact super admin immediately
- Documentation: See COMPREHENSIVE_SECURITY_AUDIT.md

---

**Last Updated:** March 17, 2026  
**Version:** 1.0.0
