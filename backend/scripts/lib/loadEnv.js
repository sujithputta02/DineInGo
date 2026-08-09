/**
 * Load backend/.env reliably regardless of cwd.
 * Scripts should require this before reading process.env.
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const candidates = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];

for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

function requireMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set.');
    console.error('Set it in backend/.env (never hardcode credentials in source files).');
    process.exit(1);
  }
  if (/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/.test(uri) === false && !uri.startsWith('mongodb://')) {
    console.error('❌ MONGODB_URI looks invalid.');
    process.exit(1);
  }
  return uri;
}

module.exports = { requireMongoUri };
