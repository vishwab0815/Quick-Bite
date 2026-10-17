/**
 * Encrypts secrets kept in the database (each hotel's Razorpay key secret and webhook secret),
 * so a database copy or backup alone never reveals them. AES-256-GCM, a fresh IV per value.
 *
 * Key: SECRETS_KEY (32 bytes as 64 hex characters) if set, otherwise derived from JWT_SECRET.
 * Changing that key makes the stored secrets unreadable - the hotels then show as "keys need
 * to be entered again" in the console, and nothing else breaks.
 */

const crypto = require('crypto');

const VERSION = 'v1';

const encryptionKey = () => {
    const raw = process.env.SECRETS_KEY;
    if (raw) {
        const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
        if (key.length !== 32) throw new Error('SECRETS_KEY must be 32 bytes (64 hex characters)');
        return key;
    }
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
    return Buffer.from(crypto.hkdfSync('sha256', process.env.JWT_SECRET, 'quickbite', 'stored-secrets', 32));
};

/** Encrypt a secret for storage */
const seal = (text) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
    return `${VERSION}.${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')}`;
};

/** Decrypt a stored secret; null if it is missing or can no longer be read */
const open = (sealed) => {
    if (typeof sealed !== 'string' || !sealed.startsWith(`${VERSION}.`)) return null;
    try {
        const data = Buffer.from(sealed.slice(VERSION.length + 1), 'base64url');
        const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
        decipher.setAuthTag(data.subarray(12, 28));
        return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
    } catch {
        return null;
    }
};

module.exports = { seal, open };
