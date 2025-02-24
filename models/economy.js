import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },  // ✅ ใช้ `Date`
    lastWork: { type: Date, default: null }  // ✅ ใช้ `Date`
});

export default mongoose.model('Economy', economySchema);
