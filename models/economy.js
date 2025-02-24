import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastWork: { type: Date, default: null }  // ✅ ต้องมีการเพิ่ม lastWork ใน Schema
});

export default mongoose.model('Economy', economySchema);
