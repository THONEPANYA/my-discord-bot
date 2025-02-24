import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null } // ⬅️ เพิ่มฟิลด์นี้
});

export default mongoose.model('Economy', economySchema);
