# SECURITY: DineInGo Platinum Tier Certification 💎🛡️

This document outlines the security architecture and defensive measures implemented for the DineInGo platform. As of **April 2026**, the system is certified as **Platinum Tier** and follows Industry-Standard best practices for data integrity and identity protection.

## 🏆 Security Pillars

### 👮‍♂️ 1. Identity Guard (Auth Integrity)
Every request to the Customer, Business, and Admin APIs is cryptographically verified.
- **Firebase Identity Verification**: Backend uses `firebase-admin` to proof every request's digital signature via `userAuth.ts`.
- **Isolated Admin Auth**: Administrative portal uses a decoupled JWT + OTP (One-Time Password) system with a **15-minute brute-force lockout**.
- **Ghost Login Protection**: Impersonation is strictly restricted to Super Admins or delegated trusted admins, with immediate automated session termination (20 mins).

### 🔒 2. Data Integrity (Logic Isolation)
- **Mass Assignment Prevention**: All controllers (`userController`, `restaurantController`) use strict **Field Whitelisting**. Prohibited fields like `isAdmin` or `rating` are ignored if sent from the client.
- **Ownership Guard**: User-to-User isolation is enforced. A user can **only** interact with data matching their verified `uid`.
- **NoSQL Injection Guard**: Global `mongoSanitize` middleware prevents operator injection attacks.

### 🛰️ 3. Infrastructure Shield (Perimeter Defense)
- **Strict CSP**: Content Security Policy blocks XSS and unauthorized data injection.
- **HSTS Enforcement**: Forces HTTPS connection for all users, including subdomains.
- **Permissions-Policy**: Disables sensitive browser features (Camera, Microphone) unless explicitly required for business logic.

### ⚡ 4. Resource Protection (Anti-Abuse)
- **Strict AI Limiter**: Prevents Gemini-powered routes from resource exhaustion attacks (3 req/min).
- **Security Audit Logs**: Real-time logging of all security events (`impersonation_start`, `failed_login`, `rate_limit_exceeded`) into the `SecurityLog` collection.

---

## 🛡️ Responsible Disclosure
If you discover a security vulnerability in this project, please report it immediately via the official security contact.

**DineInGo: Secure by Design. Battle-Ready.** 🚀🛡️💎
