const PDFDocument = require('pdfkit');
const db = require('../database/db');

async function generatePrivacyReport(userId) {
  // Fetch all data needed for report
  const [userRes, consentsRes, dataRes, auditRes] = await Promise.all([
    db.query('SELECT name, email, role, created_at FROM users WHERE id=$1', [userId]),
    db.query(`SELECT app_name, data_type, purpose, duration, risk_level, status, created_at, expires_at
              FROM consents WHERE user_id=$1 ORDER BY created_at DESC`, [userId]),
    db.query(`SELECT data_type, created_at FROM user_data WHERE user_id=$1 ORDER BY created_at DESC`, [userId]),
    db.query(`SELECT event_type, app_name, timestamp FROM audit_logs WHERE user_id=$1 ORDER BY timestamp DESC LIMIT 20`, [userId]),
  ]);

  const user = userRes.rows[0];
  const consents = consentsRes.rows;
  const dataRecords = dataRes.rows;
  const auditLogs = auditRes.rows;

  // Calculate privacy risk score
  const highRisk = consents.filter(c => c.status === 'GRANTED' && c.risk_level === 'high').length;
  const medRisk  = consents.filter(c => c.status === 'GRANTED' && c.risk_level === 'medium').length;
  const sensitiveTypes = ['medical', 'id', 'passport', 'financial'];
  const sensitiveRecords = dataRecords.filter(d => sensitiveTypes.some(t => d.data_type.toLowerCase().includes(t))).length;
  const score = Math.max(0, Math.min(100, 100 - highRisk * 15 - medRisk * 8 - sensitiveRecords * 5));
  const grade = score >= 85 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'At Risk';

  // Build PDF
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  const purple = '#a855f7';
  const gray   = '#71717a';
  const dark   = '#18181b';
  const white  = '#ffffff';

  // Header
  doc.rect(0, 0, doc.page.width, 100).fill(dark);
  doc.fontSize(24).fillColor(purple).text('ZeroShare', 50, 32);
  doc.fontSize(10).fillColor(gray).text('Privacy Report', 50, 60);
  doc.fontSize(9).fillColor(gray).text(`Generated: ${new Date().toLocaleString()}`, 50, 74);

  doc.moveDown(4);

  // User Info
  doc.fontSize(14).fillColor(dark).text('Account Information', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#3f3f46').text(`Name:    ${user.name}`);
  doc.text(`Email:   ${user.email}`);
  doc.text(`Role:    ${user.role}`);
  doc.text(`Member since: ${new Date(user.created_at).toLocaleDateString()}`);

  doc.moveDown(1.5);

  // Privacy Risk Score
  doc.fontSize(14).fillColor(dark).text('Privacy Risk Score', { underline: true });
  doc.moveDown(0.5);
  const gradeColor = grade === 'Excellent' ? '#22c55e' : grade === 'Good' ? '#3b82f6' : grade === 'Fair' ? '#f59e0b' : '#ef4444';
  doc.fontSize(32).fillColor(gradeColor).text(`${score}/100  ${grade}`, { continued: false });
  doc.fontSize(10).fillColor(gray).text(`High-risk active consents: ${highRisk}`);
  doc.text(`Medium-risk active consents: ${medRisk}`);
  doc.text(`Sensitive data records: ${sensitiveRecords}`);

  doc.moveDown(1.5);

  // Consents
  doc.fontSize(14).fillColor(dark).text('Consent Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor(gray).text(`Total: ${consents.length}  |  Active: ${consents.filter(c=>c.status==='GRANTED').length}  |  Revoked: ${consents.filter(c=>c.status==='REVOKED').length}`);
  doc.moveDown(0.5);

  consents.slice(0, 15).forEach(c => {
    const statusColor = c.status === 'GRANTED' ? '#22c55e' : c.status === 'DENIED' ? '#ef4444' : c.status === 'REVOKED' ? '#f59e0b' : '#71717a';
    doc.fontSize(9)
       .fillColor(dark).text(`• ${c.app_name}`, { continued: true })
       .fillColor(gray).text(`  ${c.data_type}  |  ${c.duration}  |  `, { continued: true })
       .fillColor(statusColor).text(c.status);
  });

  doc.moveDown(1.5);

  // Data Records
  doc.fontSize(14).fillColor(dark).text('Stored Data Types', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor(gray).text(`Total records in vault: ${dataRecords.length}`);
  doc.moveDown(0.3);
  const typeCount = {};
  dataRecords.forEach(d => { typeCount[d.data_type] = (typeCount[d.data_type] || 0) + 1; });
  Object.entries(typeCount).forEach(([type, count]) => {
    doc.fontSize(9).fillColor(dark).text(`• ${type}: ${count} record${count > 1 ? 's' : ''}`);
  });

  doc.moveDown(1.5);

  // Audit Log
  doc.fontSize(14).fillColor(dark).text('Recent Audit Activity (last 20)', { underline: true });
  doc.moveDown(0.5);
  auditLogs.forEach(log => {
    doc.fontSize(9).fillColor(gray)
       .text(`${new Date(log.timestamp).toLocaleString()}  `, { continued: true })
       .fillColor(dark).text(`${log.event_type}`, { continued: !!log.app_name })
       .fillColor(gray).text(log.app_name ? `  via ${log.app_name}` : '');
  });

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).fillColor(gray).text('This report is confidential. ZeroShare — Your data, your rules.', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
}

module.exports = { generatePrivacyReport };
