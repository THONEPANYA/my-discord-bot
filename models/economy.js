import mongoose from 'mongoose';

const economySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 100 },
    bank: { type: Number, default: 0 }
});

export default mongoose.model('Economy', economySchema);