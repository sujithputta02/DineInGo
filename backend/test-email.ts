import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const logoPath = path.join(__dirname, 'src/assets/logo.png');
const cidLogo = 'dineingo-logo';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function testSend() {
    console.log('Sending test email to sujithputta02@gmail.com...');
    const start = Date.now();
    try {
        await transporter.sendMail({
            from: `"DineInGo Test" <${process.env.EMAIL_USER}>`,
            to: 'sujithputta02@gmail.com',
            subject: 'Test Email - Large Attachment',
            html: '<h1>Testing SMTP Delay</h1><img src="cid:' + cidLogo + '">',
            attachments: [{
                filename: 'logo.svg',
                path: logoPath,
                cid: cidLogo
            }]
        });
        const end = Date.now();
        console.log(`Email sent successfully in ${(end - start) / 1000}s`);
    } catch (error) {
        console.error('Email send failed:', error);
    }
}

testSend();
