#!/usr/bin/env node

/**
 * Security Check Script
 * Scans for potential credential leaks before committing
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('🔒 Running security check...\n');

let issues = 0;
const warnings = [];
const errors = [];

// Patterns to check for
const dangerousPatterns = [
  {
    pattern: /mongodb\+srv:\/\/(?!your_username|username|user|dev-user|YOUR_DB_USER)[^\s"'`]+:(?!your_password|password|pass|dev-password|YOUR_DB_PASSWORD)[^\s"'`]+@/gi,
    name: 'MongoDB URI with credentials',
    severity: 'error'
  },
  {
    pattern: /cluster0dine\.sofa1gx\.mongodb\.net/gi,
    name: 'Known leaked MongoDB cluster host (rotate + remove)',
    severity: 'error'
  },
  {
    pattern: /sk-or-v1-[a-zA-Z0-9]{64,}/g,
    name: 'OpenRouter API key',
    severity: 'error'
  },
  {
    pattern: /EMAIL_PASS\s*=\s*[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}/gi,
    name: 'Gmail app password',
    severity: 'error'
  },
  {
    pattern: /dineingo_secure_jwt_|dineingo_session_secret_/gi,
    name: 'Hardcoded JWT/session secret placeholder that looks real',
    severity: 'error'
  },
  {
    pattern: /ADMIN_CODE\s*=\s*\d{4,8}\b/gi,
    name: 'Hardcoded numeric ADMIN_CODE',
    severity: 'warning'
  },
  {
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    name: 'Private key material',
    severity: 'error'
  }
];

// Files/dirs to exclude from checks
const excludePatterns = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'ml/venv',
  'ml/.venv',
  'SECURITY_AUDIT.md',
  'SECURITY.md',
  'SECURITY_IMPLEMENTATION_GUIDE.md',
  'PRE_COMMIT_SECURITY.md',
  'scripts/security-check.js',
  'deepSecurityScan.ts',
  'deepSecurityScan.js'
];

function isExcluded(filePath) {
  const relative = path.relative(root, filePath);
  if (relative.startsWith('..')) return true;
  // Allow scanning *.example templates, but skip real env files
  if (/(^|[\\/])\.env($|\.(?!example))/i.test(relative) && !relative.endsWith('.example')) {
    return true;
  }
  return excludePatterns.some((pattern) => relative.includes(pattern));
}

// Check if .env files are tracked by Git
console.log('📁 Checking for .env files in Git...');
try {
  const trackedEnvFiles = execSync('git ls-files "*.env" "**/.env" ".env*"', {
    encoding: 'utf-8',
    cwd: root
  })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((f) => !f.endsWith('.example') && !f.includes('.env.example'));

  if (trackedEnvFiles.length) {
    errors.push('❌ .env files found in Git:');
    trackedEnvFiles.forEach((f) => errors.push(`   ${f}`));
    issues++;
  } else {
    console.log('✅ No .env files tracked by Git\n');
  }
} catch (e) {
  console.log('✅ No .env files tracked by Git\n');
}

function scanContent(content, relativePath) {
  dangerousPatterns.forEach(({ pattern, name, severity }) => {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      const message = `${severity === 'error' ? '❌' : '⚠️'} Found ${name} in ${relativePath}`;
      if (severity === 'error') {
        errors.push(message);
        issues++;
      } else {
        warnings.push(message);
      }
    }
  });
}

function isScannablePath(file) {
  const ext = path.extname(file);
  const base = path.basename(file);
  return (
    ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.env', '.yml', '.yaml'].includes(ext) ||
    base.endsWith('.env.example') ||
    base.includes('ENV_TEMPLATE')
  );
}

function getStagedPaths() {
  const result = spawnSync(
    'git',
    ['diff', '--cached', '-z', '--name-only', '--diff-filter=ACM'],
    { cwd: root, encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }
  );
  if (result.status !== 0 || !result.stdout) return [];
  return result.stdout.toString('utf8').split('\0').filter(Boolean);
}

function readStagedBlob(relativePath) {
  const result = spawnSync('git', ['show', `:${relativePath}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) return null;
  return result.stdout;
}

// Also fail if staged files look like secret dumps (names + staged blob content)
console.log('📦 Checking staged changes...');
try {
  const staged = getStagedPaths();

  const bannedNames = ['diag.js', 'test-endpoint.ts', 'test-endpoint.js', 'seedRestaurantsAndEvents.js'];
  staged.forEach((file) => {
    const base = path.basename(file);
    if (bannedNames.includes(base)) {
      errors.push(`❌ Refusing to commit risky file: ${file}`);
      issues++;
    }
    if (/(^|[\\/])\.env($|\.)/.test(file) && !file.endsWith('.example')) {
      errors.push(`❌ Refusing to commit env file: ${file}`);
      issues++;
    }

    // Pattern-scan the staged blob (what will actually be committed), not the working tree
    if (isExcluded(path.join(root, file)) || !isScannablePath(file)) return;
    const blob = readStagedBlob(file);
    if (blob != null) {
      scanContent(blob, `${file} (staged)`);
    }
  });

  if (staged.length === 0) {
    console.log('ℹ️  No staged files (still scanning working tree)\n');
  } else {
    console.log(`✅ Staged file checks completed (${staged.length} files)\n`);
  }
} catch (e) {
  // not in a git repo / nothing staged
}

// Check source files for dangerous patterns
console.log('🔍 Scanning source files for credentials...');

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    scanContent(content, path.relative(root, filePath));
  } catch (e) {
    // Ignore files that can't be read
  }
}

function scanDirectory(dir) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return;
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (isExcluded(filePath)) return;

    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return;
    }

    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.env', '.yml', '.yaml'].includes(ext) || file.endsWith('.env.example')) {
        scanFile(filePath);
      }
    }
  });
}

scanDirectory(root);

// Check .env.example / Render templates
console.log('\n📋 Checking env example templates...');
const envExampleFiles = ['.env.example', 'backend/.env.example', 'RENDER_ENV_TEMPLATE.env.example'];
envExampleFiles.forEach((file) => {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  const content = fs.readFileSync(full, 'utf-8');

  const hasRealApiKey = content.match(/sk-or-v1-[a-zA-Z0-9]{64,}/);
  const hasRealMongoUri = content.match(
    /mongodb\+srv:\/\/(?!your_username|username|user|dev-user|YOUR_DB_USER)[^:]+:(?!your_password|password|pass|dev-password|YOUR_DB_PASSWORD)[^@]+@/
  );
  const hasRealEmailPass = content.match(/EMAIL_PASS\s*=\s*[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}/i);
  const hasWeakSecrets = content.match(/dineingo_secure_jwt_|dineingo_session_secret_|ADMIN_CODE\s*=\s*123456/i);

  if (hasRealApiKey || hasRealMongoUri || hasRealEmailPass || hasWeakSecrets) {
    errors.push(`❌ Real/weak credentials found in ${file}`);
    issues++;
  } else {
    console.log(`✅ ${file} is safe`);
  }
});

// Print results
console.log('\n' + '='.repeat(50));
console.log('📊 Security Check Results');
console.log('='.repeat(50) + '\n');

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  warnings.forEach((w) => console.log('  ' + w));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS:\n');
  errors.forEach((e) => console.log('  ' + e));
  console.log('');
}

if (issues === 0 && warnings.length === 0) {
  console.log('✅ All security checks passed!');
  console.log('✅ Safe to commit.\n');
  process.exit(0);
} else if (issues === 0) {
  console.log(`⚠️  Found ${warnings.length} warning(s).`);
  console.log('⚠️  Review warnings before committing.\n');
  process.exit(0);
} else {
  console.log(`❌ Found ${issues} security issue(s)!`);
  console.log('❌ DO NOT COMMIT until these are fixed!\n');
  process.exit(1);
}
