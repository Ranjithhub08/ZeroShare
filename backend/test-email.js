const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false }
});

console.log('Testing SMTP connection...');
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('TEST_EMAIL:', process.env.TEST_EMAIL);

transporter.verify((err) => {
  if (err) {
    console.log('SMTP FAILED:', err.message);
  } else {
    console.log('SMTP Connected successfully');
    transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.TEST_EMAIL,
      subject: 'ZeroShare Test Email',
      html: '<p>This is a test email from ZeroShare.</p>'
    }, (sendErr, info) => {
      if (sendErr) {
        console.log('Send failed:', sendErr.message);
      } else {
        console.log('Email sent successfully. Check your inbox.');
        console.log('Message ID:', info.messageId);
      }
    });
  }
});
