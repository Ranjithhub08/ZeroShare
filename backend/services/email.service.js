const nodemailer = require('nodemailer');

let transporter = null;
let testAccount = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Real SMTP (Gmail etc.)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[Email] Using real SMTP:', process.env.SMTP_USER);
  } else {
    // Ethereal test account (dev — no real emails sent, but you can preview them)
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('[Email] Using Ethereal test account:', testAccount.user);
  }

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: process.env.SMTP_FROM || '"ZeroShare" <noreply@zeroshare.io>',
    to,
    subject,
    html,
  });

  if (testAccount) {
    console.log(`[Email] Ethereal preview: ${nodemailer.getTestMessageUrl(info)}`);
  } else {
    console.log(`[Email] Sent to ${to} — subject: "${subject}"`);
  }
  return info;
}

// Email templates
const templates = {
  consentGranted: (name, appName, dataType) => ({
    subject: `✅ Consent Approved — ${appName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f0f12;color:#e4e4e7;padding:32px;border-radius:12px;">
        <h2 style="color:#a855f7">ZeroShare</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your consent request from <strong>${appName}</strong> for <strong>${dataType}</strong> has been <span style="color:#34d399">approved</span>.</p>
        <p style="font-size:13px;color:#71717a">If you did not expect this, please log in and revoke access immediately.</p>
        <hr style="border-color:#27272a;margin:24px 0"/>
        <p style="font-size:12px;color:#52525b">ZeroShare — Your data, your rules.</p>
      </div>`
  }),
  consentDenied: (name, appName, dataType) => ({
    subject: `❌ Consent Denied — ${appName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f0f12;color:#e4e4e7;padding:32px;border-radius:12px;">
        <h2 style="color:#a855f7">ZeroShare</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>The consent request from <strong>${appName}</strong> for <strong>${dataType}</strong> was <span style="color:#f87171">denied</span>.</p>
        <hr style="border-color:#27272a;margin:24px 0"/>
        <p style="font-size:12px;color:#52525b">ZeroShare — Your data, your rules.</p>
      </div>`
  }),
  consentRevoked: (name, appName, dataType) => ({
    subject: `🚫 Access Revoked — ${appName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f0f12;color:#e4e4e7;padding:32px;border-radius:12px;">
        <h2 style="color:#a855f7">ZeroShare</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Access for <strong>${appName}</strong> to your <strong>${dataType}</strong> has been <span style="color:#fbbf24">revoked</span>.</p>
        <hr style="border-color:#27272a;margin:24px 0"/>
        <p style="font-size:12px;color:#52525b">ZeroShare — Your data, your rules.</p>
      </div>`
  }),
  consentExpired: (name, appName, dataType) => ({
    subject: `⏰ Consent Expired — ${appName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f0f12;color:#e4e4e7;padding:32px;border-radius:12px;">
        <h2 style="color:#a855f7">ZeroShare</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your consent for <strong>${appName}</strong> (${dataType}) has <span style="color:#f87171">expired</span> and been automatically revoked.</p>
        <hr style="border-color:#27272a;margin:24px 0"/>
        <p style="font-size:12px;color:#52525b">ZeroShare — Your data, your rules.</p>
      </div>`
  }),
  otpVerification: (name, otp) => ({
    subject: '🔐 Your ZeroShare verification code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#7c3aed;margin-top:0;">ZeroShare</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Use the code below to complete your login. This code expires in <strong>10 minutes</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <div style="display:inline-block;background:#f5f3ff;border:2px solid #7c3aed;border-radius:12px;padding:20px 40px;">
            <span style="font-size:40px;font-weight:bold;color:#7c3aed;letter-spacing:10px;">${otp}</span>
          </div>
        </div>
        <p style="font-size:13px;color:#6b7280;">Never share this code with anyone. ZeroShare will never ask for your verification code.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="font-size:12px;color:#9ca3af;">ZeroShare — Your data, your rules.</p>
      </div>`
  }),
  resetPassword: (name, resetUrl) => ({
    subject: 'Reset your ZeroShare password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#7c3aed;margin-top:0;">ZeroShare</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
            Reset Password
          </a>
        </p>
        <p style="font-size:13px;color:#6b7280;">If the button above does not work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;font-size:13px;">
          <a href="${resetUrl}" style="color:#7c3aed;">${resetUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="font-size:12px;color:#9ca3af;">If you did not request a password reset, you can safely ignore this email.</p>
        <p style="font-size:12px;color:#9ca3af;">ZeroShare — Your data, your rules.</p>
      </div>`
  }),
};

module.exports = { sendEmail, templates };
