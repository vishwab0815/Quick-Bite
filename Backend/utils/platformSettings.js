/**
 * Keeps the running server in step with the platform settings saved in the console:
 * loaded once the database is up, re-read every minute (so every server instance picks up a
 * change) and at once after the console saves.
 */

const PlatformSettings = require('../models/platformSettings.model');
const whatsapp = require('../config/whatsapp');
const { open } = require('./secretBox');

const REFRESH_MS = 60 * 1000;

const loadSettings = () => PlatformSettings.findOne({ key: 'platform' }).select(PlatformSettings.SECRET_FIELDS);

/** Read the saved WhatsApp settings and hand them to the WhatsApp module */
const refreshPlatformSettings = async () => {
    const doc = await loadSettings();
    const saved = doc?.whatsapp;
    whatsapp.useStoredSettings(saved?.enabled ? {
        enabled: true,
        phoneNumberId: saved.phoneNumberId,
        accessToken: open(saved.accessToken) || '',
        appSecret: open(saved.appSecret) || '',
        verifyToken: saved.verifyToken,
        receiptTemplate: saved.receiptTemplate,
        readyTemplate: saved.readyTemplate,
        language: saved.language
    } : null);
    return doc;
};

let timer = null;

const startPlatformSettings = (ready) => {
    if (timer) return;
    const refresh = () => refreshPlatformSettings().catch((error) => console.error('❌ Could not load platform settings:', error.message));
    Promise.resolve(ready).then(refresh);
    timer = setInterval(refresh, REFRESH_MS);
    timer.unref?.();
};

module.exports = { loadSettings, refreshPlatformSettings, startPlatformSettings };
