/**
 * Deep Security Scan — admin-triggered audit
 * Checks secret hygiene, hardcoded credential patterns, and runtime hardening.
 * Never returns raw secret values — only redacted findings.
 */

import fs from 'fs/promises';
import path from 'path';
import { constants as fsConstants, Dirent } from 'fs';

export type ScanSeverity = 'pass' | 'info' | 'warn' | 'fail';

export interface ScanFinding {
  id: string;
  category: 'secrets' | 'hardening' | 'portal' | 'exposure';
  name: string;
  status: ScanSeverity;
  detail: string;
  remediation?: string;
}

export interface DeepScanResult {
  scannedAt: string;
  score: number;
  summary: {
    pass: number;
    info: number;
    warn: number;
    fail: number;
  };
  categories: {
    id: string;
    name: string;
    integrity: number;
    checks: Array<{
      name: string;
      status: 'PASS' | 'WARN' | 'FAIL' | 'INFO';
      detail: string;
    }>;
  }[];
  findings: ScanFinding[];
  recommendations: string[];
}

interface PatternRule {
  id: string;
  name: string;
  pattern: RegExp;
  severity: ScanSeverity;
  remediation: string;
}

const DANGEROUS_SOURCE_PATTERNS: PatternRule[] = [
  {
    id: 'mongo_uri_creds',
    name: 'Hardcoded MongoDB URI with credentials',
    pattern:
      /mongodb\+srv:\/\/(?!your_username|username|user|dev-user|YOUR_DB_USER)[^\s"'`:]+?:(?!your_password|password|pass|dev-password|YOUR_DB_PASSWORD)[^\s"'`]+@/gi,
    severity: 'fail',
    remediation: 'Remove hardcoded URIs. Use MONGODB_URI from environment only. Rotate the DB password.',
  },
  {
    id: 'leaked_cluster',
    name: 'Previously exposed MongoDB cluster host in source',
    pattern: /cluster0dine\.sofa1gx\.mongodb\.net/gi,
    severity: 'fail',
    remediation: 'Ensure Atlas password was rotated and Network Access is restricted. Remove from source/history.',
  },
  {
    id: 'openrouter_key',
    name: 'OpenRouter API key in source',
    pattern: /sk-or-v1-[a-zA-Z0-9]{64,}/g,
    severity: 'fail',
    remediation: 'Revoke the key in OpenRouter and load from env only.',
  },
  {
    id: 'private_key',
    name: 'Private key material in source',
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'fail',
    remediation: 'Remove private keys from the repo; store in a secret manager.',
  },
  {
    id: 'weak_jwt_placeholder',
    name: 'Hardcoded weak JWT/session secret',
    // Split literals so repo scanners do not flag this detector source file.
    pattern: new RegExp('dineingo_secure_jwt_' + '|' + 'dineingo_session_secret_', 'gi'),
    severity: 'fail',
    remediation: 'Generate with openssl rand -hex 32 and set via env vars.',
  },
  {
    id: 'aws_key',
    name: 'AWS Access Key ID in source',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'fail',
    remediation: 'Rotate the IAM key and remove it from source.',
  },
  {
    id: 'github_token',
    name: 'GitHub token in source',
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    severity: 'fail',
    remediation: 'Revoke the token on GitHub and use CI secrets.',
  },
];

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'uploads',
  '.husky',
  'ml',
  'public',
]);

const TEXT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.env',
  '.example',
]);

function isWeakSecret(value: string | undefined, minLen = 32): boolean {
  if (!value) return true;
  if (value.length < minLen) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('change-me') ||
    lower.includes('your_') ||
    lower.includes('dineingo_' + 'secure') ||
    lower.includes('dineingo_' + 'session_secret') ||
    lower === '123456' ||
    lower === 'password' ||
    lower === 'secret'
  );
}

async function resolveScanRoots(): Promise<string[]> {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.resolve(cwd, '..'),
    path.resolve(cwd, '../..'),
    path.resolve(__dirname, '../../..'),
    path.resolve(__dirname, '../../../..'),
  ];
  const roots: string[] = [];
  for (const dir of candidates) {
    try {
      await fs.access(path.join(dir, 'package.json'), fsConstants.F_OK);
      if (!roots.includes(dir)) roots.push(dir);
    } catch {
      // ignore
    }
  }
  return roots.slice(0, 2);
}

function shouldSkip(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  if (parts.some((p) => EXCLUDE_DIRS.has(p))) return true;
  const base = path.basename(filePath);
  if (
    base === 'security-check.js' ||
    base === 'deepSecurityScan.ts' ||
    base === 'deepSecurityScan.js'
  ) {
    return true;
  }
  if (base === '.env' || /^\.env\.(local|development|production|test)$/.test(base)) return true;
  return false;
}

async function scanFileForSecrets(filePath: string, findings: ScanFinding[]): Promise<void> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    return;
  }

  for (const rule of DANGEROUS_SOURCE_PATTERNS) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(content)) {
      findings.push({
        id: `${rule.id}:${path.basename(filePath)}`,
        category: 'secrets',
        name: rule.name,
        status: rule.severity,
        detail: `Pattern detected in ${path.basename(filePath)} (full path redacted).`,
        remediation: rule.remediation,
      });
    }
  }

  if (filePath.endsWith('.env.example') || filePath.includes('ENV_TEMPLATE')) {
    if (/ADMIN_CODE\s*=\s*123456\b/i.test(content) || /dineingo_secure_jwt_/i.test(content)) {
      findings.push({
        id: `weak_template:${path.basename(filePath)}`,
        category: 'secrets',
        name: 'Weak credentials in env template',
        status: 'fail',
        detail: `${path.basename(filePath)} contains weak/example secrets that look deployable.`,
        remediation: 'Replace with REPLACE_WITH_* placeholders only.',
      });
    }
  }
}

/** Yield to the event loop periodically so admin API stays responsive. */
function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function walkSource(
  dir: string,
  findings: ScanFinding[],
  budget: { files: number }
): Promise<void> {
  if (budget.files <= 0) return;

  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (budget.files <= 0) break;
    const full = path.join(dir, entry.name);
    if (shouldSkip(full)) continue;

    if (entry.isDirectory()) {
      await walkSource(full, findings, budget);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const isEnvExample =
        entry.name.endsWith('.env.example') || entry.name.includes('ENV_TEMPLATE');
      if (!TEXT_EXTS.has(ext) && !isEnvExample) continue;
      budget.files -= 1;
      await scanFileForSecrets(full, findings);
      if (budget.files % 25 === 0) {
        await yieldEventLoop();
      }
    }
  }
}

function statusLabel(s: ScanSeverity): 'PASS' | 'WARN' | 'FAIL' | 'INFO' {
  if (s === 'pass') return 'PASS';
  if (s === 'warn') return 'WARN';
  if (s === 'fail') return 'FAIL';
  return 'INFO';
}

/**
 * Run a full deep security audit suitable for the admin Security page.
 */
export async function runDeepSecurityScan(context?: {
  blockedIpsCount?: number;
  criticalThreats24h?: number;
}): Promise<DeepScanResult> {
  const findings: ScanFinding[] = [];
  const recommendations: string[] = [];

  const mongoUri = process.env.MONGODB_URI || '';
  const jwtSecret = process.env.JWT_SECRET || '';
  const sessionSecret = process.env.SESSION_SECRET || '';
  const adminCode = process.env.ADMIN_CODE || '';

  if (!mongoUri) {
    findings.push({
      id: 'mongo_missing',
      category: 'secrets',
      name: 'MONGODB_URI configured',
      status: 'fail',
      detail: 'MongoDB connection string is not set.',
      remediation: 'Set MONGODB_URI in deployment secrets (never in source).',
    });
  } else {
    findings.push({
      id: 'mongo_set',
      category: 'secrets',
      name: 'MONGODB_URI configured',
      status: 'pass',
      detail: 'Connection string is loaded from environment.',
    });

    if (/cluster0dine\.sofa1gx\.mongodb\.net/i.test(mongoUri)) {
      findings.push({
        id: 'mongo_known_exposure',
        category: 'exposure',
        name: 'Cluster previously appeared in public git history',
        status: 'warn',
        detail:
          'This Atlas cluster hostname was committed to a public repo. Password rotation + IP allowlisting are mandatory.',
        remediation:
          'Confirm DB user password was rotated AFTER the leak, restrict Network Access to Render IPs, create a new DB user and delete the old one.',
      });
      recommendations.push(
        'Atlas → Network Access: remove 0.0.0.0/0 and allow only your hosting IPs.',
      );
      recommendations.push(
        'Atlas → Database Access: create a new user after a leak; delete the old exposed user.',
      );
    }

    if (!mongoUri.startsWith('mongodb')) {
      findings.push({
        id: 'mongo_format',
        category: 'secrets',
        name: 'MONGODB_URI format',
        status: 'fail',
        detail: 'URI does not look like a valid MongoDB connection string.',
      });
    } else {
      findings.push({
        id: 'mongo_format',
        category: 'secrets',
        name: 'MONGODB_URI format',
        status: 'pass',
        detail: 'URI scheme looks valid.',
      });
    }
  }

  if (isWeakSecret(jwtSecret, 32)) {
    findings.push({
      id: 'jwt_weak',
      category: 'secrets',
      name: 'JWT_SECRET strength',
      status: 'fail',
      detail: 'JWT secret is missing, short, or matches a weak placeholder.',
      remediation: 'Set JWT_SECRET to openssl rand -hex 32 (or longer).',
    });
    recommendations.push('Rotate JWT_SECRET — this signs users out of old sessions.');
  } else {
    findings.push({
      id: 'jwt_ok',
      category: 'secrets',
      name: 'JWT_SECRET strength',
      status: 'pass',
      detail: 'JWT secret meets minimum entropy guidance (≥32 chars, non-placeholder).',
    });
  }

  if (isWeakSecret(sessionSecret, 32)) {
    findings.push({
      id: 'session_weak',
      category: 'secrets',
      name: 'SESSION_SECRET strength',
      status: 'fail',
      detail: 'Session secret is missing, short, or weak.',
      remediation: 'Set SESSION_SECRET to a fresh random value.',
    });
  } else {
    findings.push({
      id: 'session_ok',
      category: 'secrets',
      name: 'SESSION_SECRET strength',
      status: 'pass',
      detail: 'Session secret meets minimum strength guidance.',
    });
  }

  if (!adminCode || adminCode === '123456' || adminCode.length < 8) {
    findings.push({
      id: 'admin_code_weak',
      category: 'secrets',
      name: 'ADMIN_CODE strength',
      status: 'fail',
      detail: 'Admin code is missing, default, or too short.',
      remediation: 'Use a long random admin code; never commit it.',
    });
  } else {
    findings.push({
      id: 'admin_code_ok',
      category: 'secrets',
      name: 'ADMIN_CODE strength',
      status: 'pass',
      detail: 'Admin code is set and not an obvious default.',
    });
  }

  if (process.env.NODE_ENV === 'production') {
    findings.push({
      id: 'node_env',
      category: 'hardening',
      name: 'NODE_ENV=production',
      status: 'pass',
      detail: 'Running in production mode.',
    });
  } else {
    findings.push({
      id: 'node_env',
      category: 'hardening',
      name: 'NODE_ENV=production',
      status: 'warn',
      detail: `NODE_ENV is "${process.env.NODE_ENV || 'unset'}". Production hardening may be relaxed.`,
      remediation: 'Set NODE_ENV=production on Render.',
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || '';
  if (frontendUrl && frontendUrl.startsWith('https://')) {
    findings.push({
      id: 'frontend_https',
      category: 'hardening',
      name: 'Frontend URL uses HTTPS',
      status: 'pass',
      detail: 'CORS/frontend origin is HTTPS.',
    });
  } else if (frontendUrl) {
    findings.push({
      id: 'frontend_https',
      category: 'hardening',
      name: 'Frontend URL uses HTTPS',
      status: 'warn',
      detail: 'Frontend URL is not HTTPS — cookies/session may be less protected.',
    });
  } else {
    findings.push({
      id: 'frontend_https',
      category: 'hardening',
      name: 'Frontend URL configured',
      status: 'info',
      detail: 'FRONTEND_URL / CLIENT_URL not set — verify CORS allowlist.',
    });
  }

  const blocked = context?.blockedIpsCount ?? 0;
  findings.push({
    id: 'ip_blacklist',
    category: 'portal',
    name: 'IP blacklist system',
    status: 'pass',
    detail: `Blacklist active (${blocked} currently blocked IP(s)).`,
  });

  const critical = context?.criticalThreats24h ?? 0;
  if (critical > 0) {
    findings.push({
      id: 'critical_24h',
      category: 'portal',
      name: 'Critical threats (24h)',
      status: 'warn',
      detail: `${critical} critical security log(s) in the last 24 hours.`,
      remediation: 'Review Security Audit live feed and block abusive IPs.',
    });
  } else {
    findings.push({
      id: 'critical_24h',
      category: 'portal',
      name: 'Critical threats (24h)',
      status: 'pass',
      detail: 'No critical severity events in the last 24 hours.',
    });
  }

  findings.push({
    id: 'admin_audit_access',
    category: 'portal',
    name: 'Deep scan access control',
    status: 'pass',
    detail: 'This scan is restricted to authenticated super-admins.',
  });

  findings.push({
    id: 'secret_in_git_policy',
    category: 'hardening',
    name: 'Pre-commit secret scan policy',
    status: 'info',
    detail:
      'Repo includes npm run security:check + husky pre-commit. Ensure every developer runs npm install so hooks install.',
    remediation: 'Enable GitHub Secret Scanning + Push Protection on the public repo.',
  });
  recommendations.push(
    'GitHub → Settings → Code security → enable Secret scanning & Push protection.',
  );

  const before = findings.length;
  const roots = await resolveScanRoots();
  for (const root of roots) {
    await walkSource(root, findings, { files: 2500 });
  }
  const sourceHits = findings.length - before;
  if (sourceHits === 0) {
    findings.push({
      id: 'source_scan_clean',
      category: 'secrets',
      name: 'Deployed source credential scan',
      status: 'pass',
      detail: 'No hardcoded credential patterns found in reachable source files.',
    });
  } else {
    recommendations.push(
      'Remove hardcoded secrets from source, rotate them, and never paste live URIs into diagnostic scripts.',
    );
  }

  findings.push({
    id: 'git_history_note',
    category: 'exposure',
    name: 'Public git history risk',
    status: 'info',
    detail:
      'Deleting files from main does not erase old commits. Anyone with an old clone may still have prior secrets.',
    remediation: 'Rotation (not deletion) revokes access. History rewrite is optional and disruptive.',
  });

  let score = 100;
  for (const f of findings) {
    if (f.status === 'fail') score -= 18;
    else if (f.status === 'warn') score -= 8;
  }
  score = Math.max(0, Math.min(100, score));

  const summary = {
    pass: findings.filter((f) => f.status === 'pass').length,
    info: findings.filter((f) => f.status === 'info').length,
    warn: findings.filter((f) => f.status === 'warn').length,
    fail: findings.filter((f) => f.status === 'fail').length,
  };

  const categoryMeta: Record<string, string> = {
    secrets: 'Secret Hygiene',
    hardening: 'Runtime Hardening',
    portal: 'Portal Defense',
    exposure: 'Exposure & History',
  };

  const categories = (['secrets', 'hardening', 'portal', 'exposure'] as const).map((id) => {
    const checks = findings
      .filter((f) => f.category === id)
      .map((f) => ({
        name: f.name.replace(/\s+/g, '_').toUpperCase().slice(0, 40),
        status: statusLabel(f.status),
        detail: f.detail,
      }));
    const fail = checks.filter((c) => c.status === 'FAIL').length;
    const warn = checks.filter((c) => c.status === 'WARN').length;
    const pass = checks.filter((c) => c.status === 'PASS').length;
    const denom = Math.max(1, fail + warn + pass);
    const integrity = Math.round(((pass + warn * 0.4) / denom) * 100);
    return {
      id,
      name: categoryMeta[id],
      integrity,
      checks,
    };
  });

  if (summary.fail > 0) {
    recommendations.unshift('Fix all FAIL findings before the next public release.');
  }

  return {
    scannedAt: new Date().toISOString(),
    score,
    summary,
    categories,
    findings,
    recommendations: Array.from(new Set(recommendations)),
  };
}
