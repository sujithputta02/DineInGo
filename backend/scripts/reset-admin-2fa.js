const mongoose = require('mongoose');
const { requireMongoUri } = require('./lib/loadEnv');

const emailArg = process.argv[2];

if (!emailArg) {
  console.error('Usage: node scripts/reset-admin-2fa.js <admin-email>');
  process.exit(1);
}

const targetEmail = emailArg.trim().toLowerCase();

async function resetAdmin2FA() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUri = requireMongoUri();
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    const db = mongoose.connection.db;
    const adminCollection = db.collection('admins');

    const admin = await adminCollection.findOne({ email: targetEmail });

    if (!admin) {
      console.error(`❌ Admin not found with email: ${targetEmail}`);
      process.exit(1);
    }

    console.log(`Found admin: ${admin.email}`);
    console.log(`Current 2FA Status: Enabled = ${!!admin.twoFactorEnabled}`);

    console.log('Resetting 2FA fields...');
    const result = await adminCollection.updateOne(
      { _id: admin._id },
      {
        $set: {
          twoFactorEnabled: false,
          twoFactorBackupCodes: [],
          tokenVersion: (admin.tokenVersion || 0) + 1
        },
        $unset: {
          twoFactorSecret: "",
          twoFactorPendingSecret: ""
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✓ 2FA fields reset successfully.');
    } else {
      console.log('No fields were modified (already reset).');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error resetting 2FA:', error);
    process.exit(1);
  }
}

resetAdmin2FA();
