const mongoose = require('mongoose');

/**
 * Settings for the whole platform (one document, key "platform"), edited by the platform owner
 * in the console. Secrets are encrypted (utils/secretBox) and only read where they are needed.
 */
const platformSettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'platform' },

    // The WhatsApp Business number that messages customers for every restaurant
    whatsapp: {
        enabled: { type: Boolean, default: false },
        phoneNumberId: { type: String, trim: true, maxlength: 40, default: '' },
        accessToken: { type: String, select: false },
        appSecret: { type: String, select: false },
        verifyToken: { type: String, trim: true, maxlength: 128, default: '' },
        receiptTemplate: { type: String, trim: true, maxlength: 512, default: 'order_receipt' },
        readyTemplate: { type: String, trim: true, maxlength: 512, default: 'order_ready' },
        language: { type: String, trim: true, maxlength: 10, default: 'en' },
        // What Meta reported when the settings were last checked
        displayNumber: { type: String, default: '' },
        verifiedName: { type: String, default: '' },
        checkedAt: Date
    }
}, { timestamps: true });

platformSettingsSchema.statics.SECRET_FIELDS = '+whatsapp.accessToken +whatsapp.appSecret';

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
