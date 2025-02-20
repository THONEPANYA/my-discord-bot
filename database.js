import Database from "better-sqlite3";

const db = new Database("economy.db");

// สร้างตารางผู้ใช้ถ้ายังไม่มี
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 0
    )
`).run();

export function getUserBalance(userId) {
    const user = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId);
    return user ? user.balance : 0;
}

export function addUserBalance(userId, amount) {
    db.prepare(`
        INSERT INTO users (id, balance) VALUES (?, ?) 
        ON CONFLICT(id) DO UPDATE SET balance = balance + ?
    `).run(userId, amount, amount);
}

export function setUserBalance(userId, amount) {
    db.prepare("UPDATE users SET balance = ? WHERE id = ?").run(amount, userId);
}
