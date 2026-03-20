const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  const db = mongoose.connection.db;
  const col = db.collection('earlyaccesses');
  
  // Get unique documents to see fields
  const sample = await col.findOne({});
  console.log("Sample Document:", JSON.stringify(sample, null, 2));

  // Check if referralCode exists anywhere
  const withReferral = await col.findOne({ referralCode: { $exists: true } });
  console.log("Document with referral code:", JSON.stringify(withReferral, null, 2));
  
  process.exit(0);
}
check();
