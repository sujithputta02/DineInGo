# 🔒 Security Audit - Pre-Commit Checklist

## ⚠️ CRITICAL: Before Committing to Git

Run this checklist EVERY TIME before committing code to ensure no sensitive data is leaked.

---

## 🔍 Automated Security Check

Run this command to check for potential leaks:

```bash
# Check for hardcoded credentials
git grep -E "(sk-or-v1|mongodb\+srv://[^:]+:[^@]+@|EMAIL_PASS.*=.*[a-z]{4}\s[a-z]{4})" -- ':!*.md' ':!SECURITY*.md'

# Check for API keys in staged files
git diff --cached | grep -E "(sk-or-v1|mongodb\+srv://[^:]+:[^@]+@|password|secret|api[_-]?key)" -i

# List all .env files (should not be in Git)
git ls-files | grep "\.env$"
```

If any of these commands return results, **DO NOT COMMIT** until fixed!

---

## ✅ Manual Checklist

### 1. Environment Files
- [ ] `.env` is in `.gitignore`
- [ ] `backend/.env` is in `.gitignore`
- [ ] No `.env` files are tracked by Git
- [ ] `.env.example` files contain NO real credentials
- [ ] All example values are clearly placeholders

### 2. Source Code
- [ ] No hardcoded MongoDB URIs with credentials
- [ ] No hardcoded API keys (OpenRouter, Firebase, etc.)
- [ ] No hardcoded passwords or secrets
- [ ] No email passwords in code
- [ ] All credentials loaded from `process.env`

### 3. Documentation
- [ ] README.md contains no real credentials
- [ ] CHATBOT_SETUP.md contains no real credentials
- [ ] All .md files use placeholder values
- [ ] Setup guides reference .env files, not actual values

### 4. Scripts
- [ ] Seed scripts use `process.env` only
- [ ] No fallback hardcoded credentials
- [ ] Scripts fail gracefully if env vars missing
- [ ] Test scripts don't expose credentials

### 5. Configuration Files
- [ ] No credentials in package.json
- [ ] No credentials in tsconfig.json
- [ ] No credentials in vite.config.ts
- [ ] No credentials in any config files

---

## 🚨 Common Leak Patterns to Avoid

### ❌ BAD Examples:

```typescript
// DON'T DO THIS!
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:pass@cluster.mongodb.net/';
const API_KEY = 'sk-or-v1-abc123...';
const EMAIL_PASS = 'mypassword123';
```

### ✅ GOOD Examples:

```typescript
// DO THIS INSTEAD!
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.warn('AI features disabled: OPENROUTER_API_KEY not set');
}
```

---

## 🔐 Files That Should NEVER Be Committed

### Environment Files:
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `backend/.env`
- `backend/.env.*`

### Credential Files:
- `*-firebase-adminsdk-*.json`
- `firebase-service-account.json`
- `secrets/`
- `*.pem`
- `*.key`
- `*.cert`

### User Data:
- `backend/uploads/`
- `uploads/`
- `*.db`
- `*.sqlite`

---

## 🛡️ Security Best Practices

### 1. Environment Variables
```bash
# Use strong, unique values
ADMIN_CODE=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
```

### 2. API Key Restrictions
- Enable Firebase API key restrictions
- Set OpenRouter API key usage limits
- Restrict MongoDB Atlas IP addresses
- Use read-only keys where possible

### 3. Credential Rotation
- Rotate API keys every 90 days
- Change passwords every 90 days
- Update admin codes regularly
- Revoke unused credentials

### 4. Access Control
- Use principle of least privilege
- Separate dev/prod credentials
- Don't share credentials via chat/email
- Use secret management tools

---

## 🔍 Pre-Commit Commands

Run these before EVERY commit:

```bash
# 1. Check for sensitive patterns
npm run security:check

# 2. Verify .gitignore is working
git status --ignored

# 3. Review staged changes
git diff --cached

# 4. Check for large files (might be credentials)
git diff --cached --stat

# 5. Verify no .env files
git ls-files | grep "\.env$" | wc -l  # Should be 0
```

---

## 🚨 If You Accidentally Commit Credentials

### Immediate Actions:

1. **DO NOT PUSH** if you haven't already
2. **Remove from Git history**:
   ```bash
   git reset HEAD~1  # Undo last commit
   # OR
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Rotate ALL exposed credentials immediately**:
   - Change MongoDB password
   - Regenerate API keys
   - Update email app password
   - Change admin codes

4. **If already pushed**:
   - Contact GitHub support to purge from cache
   - Force push after cleaning history
   - Assume credentials are compromised
   - Rotate everything immediately

---

## 📊 Security Audit Report

### Last Audit: [Date]
### Audited By: [Name]
### Status: [ ] PASS / [ ] FAIL

### Findings:
- [ ] No credentials in source code
- [ ] No credentials in documentation
- [ ] .gitignore properly configured
- [ ] .env.example files are safe
- [ ] All scripts use environment variables
- [ ] No sensitive files tracked by Git

### Actions Required:
1. 
2. 
3. 

---

## 🎯 Quick Security Score

Run this to get a security score:

```bash
# Count potential issues
echo "Checking for security issues..."
ISSUES=0

# Check for hardcoded MongoDB URIs
if git grep -q "mongodb+srv://[^:]*:[^@]*@" -- ':!*.md' ':!SECURITY*.md'; then
  echo "❌ Found hardcoded MongoDB URIs"
  ((ISSUES++))
fi

# Check for API keys
if git grep -q "sk-or-v1-" -- ':!*.md' ':!SECURITY*.md'; then
  echo "❌ Found hardcoded API keys"
  ((ISSUES++))
fi

# Check for .env files in Git
if git ls-files | grep -q "\.env$"; then
  echo "❌ Found .env files in Git"
  ((ISSUES++))
fi

if [ $ISSUES -eq 0 ]; then
  echo "✅ Security check passed! Safe to commit."
  exit 0
else
  echo "❌ Found $ISSUES security issues. DO NOT COMMIT!"
  exit 1
fi
```

---

## 📞 Security Contacts

### Report Security Issues:
- **Email**: security@dineingo.com
- **Emergency**: Contact team lead immediately

### Never Discuss Security Issues:
- ❌ Public GitHub issues
- ❌ Public chat channels
- ❌ Social media
- ❌ Email to non-security addresses

---

## ✅ Final Pre-Commit Checklist

Before running `git commit`:

- [ ] Ran security check script
- [ ] Reviewed all staged files
- [ ] No .env files in commit
- [ ] No credentials in code
- [ ] No credentials in docs
- [ ] All tests pass
- [ ] Code reviewed by peer
- [ ] Ready to commit safely

---

**Remember: It's easier to prevent leaks than to fix them after they're public!**

**When in doubt, DON'T COMMIT. Ask for a security review first.**

---

© DineInGo 2025 - Security First 🔒
