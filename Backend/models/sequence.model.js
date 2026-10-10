const mongoose = require('mongoose');

/**
 * Atomic counters used for bill numbers (per financial year)
 * and token numbers (per business day)
 */
const sequenceSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

sequenceSchema.statics.next = async function (key) {
    const doc = await this.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return doc.seq;
};

const Sequence = mongoose.model('Sequence', sequenceSchema);

module.exports = Sequence;
