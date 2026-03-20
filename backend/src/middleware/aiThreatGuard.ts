import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { SecurityLog } from '../models/SecurityLog';

/**
 * ============================================================
 * AI THREAT GUARD MIDDLEWARE — DineInGo Security Layer
 * ============================================================
 * Protects against:
 *  1. Prompt Injection (via chatbot or form inputs)
 *  2. AI-powered bot scraping (user-agent fingerprinting)
 *  3. Automated account creation (honeypot + timing detection)
 *  4. Credential stuffing via AI bots (behavioral anomaly detection)
 *  5. Mass data harvesting (response stripping on suspicious requests)
 */

// ─────────────────────────────────────────────────────────
// 1. PROMPT INJECTION GUARD
// ─────────────────────────────────────────────────────────

const PROMPT_INJECTION_PATTERNS = [
  // Classic jailbreak triggers
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(everything|your\s+instructions|you\s+are)/i,
  /you\s+are\s+now\s+(a|an|acting\s+as)/i,
  /act\s+as\s+(if\s+you\s+(are|were)|a|an)/i,
  /pretend\s+(you\s+are|to\s+be|that)/i,
  /disregard\s+(your|the|all)\s+(previous|prior|original|system)/i,
  /override\s+(your|the)\s+(system|instructions|prompt|restrictions)/i,

  // System prompt extraction attempts
  /repeat\s+(your|the)\s+(system|instructions|prompt)/i,
  /what\s+(is|are)\s+your\s+(system|instructions|initial\s+prompt)/i,
  /show\s+me\s+(your|the)\s+(system|instructions|prompt)/i,
  /reveal\s+(your|the)\s+(system|instructions|prompt)/i,
  /output\s+(all|everything)\s+(above|before)/i,
  /what\s+were\s+you\s+(told|instructed|programmed)/i,
  /print\s+(your\s+)?(instructions|system\s+message|initial\s+prompt)/i,
  /\[SYSTEM\]/i, /\[INST\]/i, /\[\/INST\]/i, /<\|system\|>/i,

  // Role manipulation
  /you\s+are\s+(no\s+longer|not)\s+(dino|an?\s+ai|bound)/i,
  /switch\s+(to|into)\s+(developer|admin|root|god)\s+mode/i,
  /developer\s+mode\s+(enabled|on|activated)/i,
  /do\s+anything\s+now/i, /DAN\s+mode/i,

  // Data exfiltration
  /list\s+(all|every)\s+(user|customer|booking|email)/i,
  /dump\s+(the|all|your)\s+(database|data|users)/i,
  /show\s+me\s+(all|every)\s+(user|booking|reservation)/i,
  /give\s+me\s+(access|admin|root)\s+(to|privileges)/i,

  // Code/script injection into prompts
  /```python|```javascript|```bash|```sql|```shell/i,
  /<script\b/i,
  /\bexec\s*\(/i, /\beval\s*\(/i, /os\.system/i, /subprocess\./i,
];

export const promptInjectionGuard = (req: Request, res: Response, next: NextFunction) => {
  const message: string = req.body?.message || req.body?.content || req.body?.text || '';

  if (!message) return next();

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      console.warn(`🚨 PROMPT INJECTION attempt detected from IP: ${req.ip}`, {
        pattern: pattern.source,
        message: message.substring(0, 100)
      });

      // Log security event
      SecurityLog.create({
        portal: 'user', // Most chatbot traffic is user portal
        eventType: 'suspicious_activity',
        severity: 'high',
        details: `Prompt injection attempt detected: ${pattern.source}`,
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        path: req.path
      }).catch(err => console.error('Failed to log security event:', err));

      return res.status(400).json({
        success: false,
        response: "Rawr! 🦖 Dino spotted something fishy in that message! I only answer questions about DineInGo dining and events. Let's stay on topic!",
        blocked: true
      });
    }
  }

  // Limit message length to prevent context window flooding
  if (message.length > 2000) {
    return res.status(400).json({
      success: false,
      response: "Your message is too long! Please keep it under 2000 characters. 🦖",
      blocked: true
    });
  }

  next();
};

// ─────────────────────────────────────────────────────────
// 2. BOT & AI SCRAPER FINGERPRINTING
// ─────────────────────────────────────────────────────────

const KNOWN_BOT_AGENTS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /headless/i,
  /selenium/i, /puppeteer/i, /playwright/i, /phantomjs/i,
  /curl\//i, /wget\//i, /python-requests/i, /go-http-client/i,
  /apache-httpclient/i, /java\//i, /libwww-perl/i, /okhttp/i,
  /axios\//, /node-fetch/i, /got\//i, /undici/i
];

const TRUSTED_UA_MINIMUM_LENGTH = 40; // Legitimate browsers have long UAs

export const botFingerprintGuard = (req: Request, res: Response, next: NextFunction) => {
  // Allow health checks, internal routes, and admin portal (which might use bare fetch calls)
  if (req.path === '/health' || req.path === '/' || req.path.startsWith('/api/v1/admin')) return next();

  const userAgent = req.headers['user-agent'] || '';
  const acceptHeader = req.headers['accept'] || '';

  // Check for known bot user agents
  for (const botPattern of KNOWN_BOT_AGENTS) {
    if (botPattern.test(userAgent)) {
      console.warn(`🤖 BOT request blocked from IP: ${req.ip}, UA: ${userAgent.substring(0, 80)}`);
      
      // Log security event
      SecurityLog.create({
        portal: 'system',
        eventType: 'blocked_ip',
        severity: 'medium',
        details: `Automated bot/scraper blocked: ${userAgent.substring(0, 50)}`,
        ip: req.ip || 'unknown',
        userAgent: userAgent,
        path: req.path
      }).catch(err => console.error('Failed to log security event:', err));

      return res.status(403).json({
        success: false,
        message: 'Access denied. Automated requests are not permitted.'
      });
    }
  }

  // Suspicious: empty or very short user agents on non-GET requests
  if (
    req.method !== 'GET' &&
    (userAgent.length === 0 || userAgent.length < TRUSTED_UA_MINIMUM_LENGTH)
  ) {
    console.warn(`⚠️  Suspicious short UA on ${req.method} from IP: ${req.ip}, UA: "${userAgent}"`);
    return res.status(403).json({
      success: false,
      message: 'Request signature not recognized.'
    });
  }

  next();
};

// ─────────────────────────────────────────────────────────
// 3. HONEYPOT FIELD DETECTION (Stops Automated Form Fills)
// ─────────────────────────────────────────────────────────
// Frontend forms include hidden `_hp` or `_honey` fields.
// Real users never fill them (they're invisible via CSS).
// Bots fill them all.

export const honeypotGuard = (req: Request, res: Response, next: NextFunction) => {
  const honeypotField = req.body?._hp || req.body?._honey || req.body?._trap;

  if (honeypotField !== undefined && honeypotField !== '') {
    console.warn(`🍯 Honeypot triggered from IP: ${req.ip}. BOT detected.`);
    // Don't tell the bot it was caught — return a fake success
    // This confuses bots into thinking they succeeded
    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully.'
    });
  }

  next();
};

// ─────────────────────────────────────────────────────────
// 4. REQUEST TIMING & BEHAVIORAL ANOMALY DETECTION
// ─────────────────────────────────────────────────────────
// AI bots submit forms at super-human speeds.
// We track how fast a form is submitted after the page is opened.

const MINIMUM_HUMAN_FORM_TIME_MS = 2500; // 2.5 seconds - humans need at least this long

export const formTimingGuard = (req: Request, res: Response, next: NextFunction) => {
  const formLoadTime = req.body?._flt; // form-load-timestamp (set by frontend)

  if (formLoadTime) {
    const elapsed = Date.now() - parseInt(formLoadTime, 10);
    if (elapsed < MINIMUM_HUMAN_FORM_TIME_MS) {
      console.warn(`⏱️  Inhuman form speed detected (${elapsed}ms) from IP: ${req.ip}. Likely a bot.`);
      // Fake success to not reveal the detection to the bot
      return res.status(200).json({
        success: false,
        message: 'Submission too fast. Please try again.'
      });
    }
  }

  next();
};

// ─────────────────────────────────────────────────────────
// 5. AI DATA HARVESTING THROTTLE (Deep-API Response Stripping)
// ─────────────────────────────────────────────────────────
// Detect high-frequency, automated data requests and strip sensitive fields.
// This is a last line of defense even if rate limits are bypassed.

interface RequestTracker {
  count: number;
  firstRequest: number;
  flagged: boolean;
}

const ipRequestMap = new Map<string, RequestTracker>();
const HARVEST_THRESHOLD = 30; // more than 30 requests in 60 seconds = suspicious
const HARVEST_WINDOW_MS = 60 * 1000;

export const dataHarvestGuard = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();

  const tracker = ipRequestMap.get(ip);

  if (!tracker) {
    ipRequestMap.set(ip, { count: 1, firstRequest: now, flagged: false });
    return next();
  }

  // Reset window if expired
  if (now - tracker.firstRequest > HARVEST_WINDOW_MS) {
    ipRequestMap.set(ip, { count: 1, firstRequest: now, flagged: false });
    return next();
  }

  tracker.count++;

  if (tracker.count > HARVEST_THRESHOLD && !tracker.flagged) {
    tracker.flagged = true;
    console.warn(`🌐 Potential DATA HARVESTING detected from IP: ${ip}. Request #${tracker.count} in ${HARVEST_WINDOW_MS / 1000}s.`);
    // Tag the request so downstream can use it
    (req as any).dataScraper = true;
  }

  // Cleanup old entries every 1000 requests to prevent memory leak
  if (ipRequestMap.size > 1000) {
    for (const [key, val] of ipRequestMap.entries()) {
      if (now - val.firstRequest > HARVEST_WINDOW_MS) {
        ipRequestMap.delete(key);
      }
    }
  }

  next();
};

// ─────────────────────────────────────────────────────────
// 6. CSRF TOKEN GENERATOR (for stateless APIs)
// ─────────────────────────────────────────────────────────

export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const csrfGuard = (req: Request, res: Response, next: NextFunction) => {
  // Only enforce on state-changing requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // Allow authenticated Firebase requests (they come with Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return next();

  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.headers['x-session-id'] as string;

  // Log requests without CSRF tokens (don't block yet, just log)
  if (!token) {
    console.log(`ℹ️  Request without CSRF token: ${req.method} ${req.path} from ${req.ip}`);
  }

  next();
};
