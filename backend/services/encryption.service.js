const crypto = require('crypto');

const ALGO = 'aes-256-cbc';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'a'.repeat(64), 'hex'); // 32 bytes
const IV_LENGTH = 16;

// Returns "iv:encrypted" base64 string
function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Accepts "iv:encrypted" string, returns plain text
function decrypt(encoded) {
  if (!encoded || !encoded.includes(':')) return encoded; // plain text fallback
  try {
    const [ivHex, encHex] = encoded.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedBuf = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return encoded; // return raw if decryption fails (old unencrypted data)
  }
}

module.exports = { encrypt, decrypt };
