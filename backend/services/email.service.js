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
    // In dev, log the preview URL
    console.log(`[Email] Preview: ${nodemailer.getTestMessageUrl(info)}`);
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
  resetPassword: (name, resetUrl) => ({
    subject: '🔑 Reset your ZeroShare password',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f0f12;color:#e4e4e7;padding:32px;border-radius:12px;">
        <h2 style="color:#a855f7">ZeroShare</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#a855f7;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
        <p style="font-size:13px;color:#71717a">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border-color:#27272a;margin:24px 0"/>
        <p style="font-size:12px;color:#52525b">ZeroShare — Your data, your rules.</p>
      </div>`
  }),
};

module.exports = { sendEmail, templates };
