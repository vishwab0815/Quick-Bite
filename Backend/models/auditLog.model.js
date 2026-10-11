const mongoose = require('mongoose');

/**
 * Every change made from the platform console (and every console sign-in),
 * so the platform owner can always see who did what, when and from where
 */
const auditLogSchema = new mongoose.Schema({
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    actorEmail: String,
    action: { type: String, required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
    hotelName: String,
    details: { type: mongoose.Schema.Types.Mixed },
    ip: String
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ hotel: 1, createdAt: -1 });

/**
 * Record an action - never blocks or fails the request that caused it
 */
auditLogSchema.statics.record = function (req, action, { hotel, details } = {}) {
    return this.create({
        actor: req.user?.id,
        actorEmail: req.user?.email,
        action,
        hotel: hotel?._id,
        hotelName: hotel?.name,
        details,
        ip: req.ip
    }).catch((error) => console.error('❌ Audit log write failed:', error.message));
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
