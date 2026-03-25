
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkBrevo() {
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  const brevoUser = process.env.BREVO_SMTP_USER?.trim();

  console.log(`Checking Brevo for User: ${brevoUser}`);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525,
    auth: {
      user: brevoUser,
      pass: brevoKey,
    },
  });

  try {
    await transporter.verify();
    console.log('✓ Brevo SMTP Authentication SUCCESSFUL');
    console.log('The system will now use Brevo as the primary provider.');
  } catch (err) {
    console.error('✗ Brevo SMTP Authentication FAILED:', err.message);
  } finally {
    process.exit(0);
  }
}

checkBrevo();
