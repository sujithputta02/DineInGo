#!/usr/bin/env node

/**
 * Security Check Script
 * Scans for potential credential leaks before committing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 Running security check...\n');

let issues = 0;
const warnings = [];
const errors = [];

// Patterns to check for
const dangerousPatterns = [
  {
    pattern: /mongodb\+srv:\/\/[^:]+:[^@]+@/g,
    name: 'MongoDB URI with credentials',
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
    pattern: /ADMIN_CODE\s*=\s*\d{6}/gi,
    name: 'Admin code',
    severity: 'warning'
  }
];

// Files to exclude from checks
const excludePatterns = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.env',
  '.env.local',
  'SECURITY_AUDIT.md',
  'SECURITY.md',
  'SETUP.md',
  'QUICK_SETUP.md',
  'EMAIL_SETUP.md',
  'CHATBOT_SETUP.md',
  'TEAM_SETUP.md',
  '.env.development.shared'
];

// Check if .env files are tracked by Git
console.log('📁 Checking for .env files in Git...');
try {
  const trackedEnvFiles = execSync('git ls-files | grep "\\.env$"', { encoding: 'utf-8' }).trim();
  if (trackedEnvFiles) {
    errors.push('❌ .env files found in Git:');
    errors.push(trackedEnvFiles);
    issues++;
  } else {
    console.log('✅ No .env files tracked by Git\n');
  }
} catch (e) {
  // No .env files found (grep returns non-zero when no matches)
  console.log('✅ No .env files tracked by Git\n');
}

// Check source files for dangerous patterns
console.log('🔍 Scanning source files for credentials...');

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    dangerousPatterns.forEach(({ pattern, name, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        const message = `${severity === 'error' ? '❌' : '⚠️'} Found ${name} in ${relativePath}`;
        if (severity === 'error') {
          errors.push(message);
          issues++;
        } else {
          warnings.push(message);
        }
      }
    });
  } catch (e) {
    // Ignore files that can't be read
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip excluded patterns
    if (excludePatterns.some(pattern => filePath.includes(pattern))) {
      return;
    }
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (stat.isFile()) {
      // Only scan text files
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.env'].includes(ext)) {
        scanFile(filePath);
      }
    }
  });
}

// Scan the project
scanDirectory(process.cwd());

// Check .env.example files
console.log('\n📋 Checking .env.example files...');
const envExampleFiles = ['.env.example', 'backend/.env.example'];
envExampleFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check for real credentials in example files (not placeholder patterns)
    const hasRealApiKey = content.match(/sk-or-v1-[a-zA-Z0-9]{64,}/);
    const hasRealMongoUri = content.match(/mongodb\+srv:\/\/(?!your_username|username|user|dev-user)[^:]+:(?!your_password|password|pass|dev-password)[^@]+@/);
    const hasRealEmailPass = content.match(/EMAIL_PASS\s*=\s*[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}/i);
    
    if (hasRealApiKey || hasRealMongoUri || hasRealEmailPass) {
      errors.push(`❌ Real credentials found in ${file}`);
      issues++;
    } else {
      console.log(`✅ ${file} is safe`);
    }
  }
});

// Print results
console.log('\n' + '='.repeat(50));
console.log('📊 Security Check Results');
console.log('='.repeat(50) + '\n');

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  warnings.forEach(w => console.log('  ' + w));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS:\n');
  errors.forEach(e => console.log('  ' + e));
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
  console.log('📖 See SECURITY_AUDIT.md for guidance.\n');
  process.exit(1);
}
