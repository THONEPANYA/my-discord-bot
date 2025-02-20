import 'dotenv/config';
import express from 'express';
import path from 'path';
import { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';

// ✅ เชื่อมต่อฐานข้อมูล
import mongoose from 'mongoose';

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("✅ เชื่อมต่อ MongoDB สำเร็จ!");
}).catch(err => {
    console.error("❌ ไม่สามารถเชื่อมต่อ MongoDB:", err);
});

// ตรวจสอบว่า Token โหลดถูกต้องหรือไม่
if (!process.env.TOKEN) {
    console.error("❌ ไม่พบ TOKEN ในไฟล์ .env");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`✅ บอท ${client.user.tag} พร้อมทำงานแล้ว!`);
});

// ✅ ระบบแจ้งเตือนหากบอทล่ม
process.on("uncaughtException", async (error) => {
    console.error("❌ เกิดข้อผิดพลาดที่ไม่ได้จัดการ:", error);
    const guild = client.guilds.cache.first();
    if (guild) {
        const logChannel = guild.channels.cache.find(ch => ch.name === "📜 log-บอท");
        if (logChannel) {
            logChannel.send(`🚨 **แจ้งเตือน:** บอทเกิดข้อผิดพลาดและอาจล่ม!\n\`\`\`${error.message}\`\`\``);
        }
    }
});

// ✅ ระบบแจ้งเตือนเมื่อมีสมาชิกเข้า / ออก
client.on("guildMemberAdd", async (member) => {
    const welcomeChannel = member.guild.channels.cache.find(ch => ch.name === "📢 แจ้งเตือนเข้าออก");

    if (welcomeChannel) {
        welcomeChannel.send(`👋 **ยินดีต้อนรับ** <@${member.id}> สู่เซิร์ฟเวอร์! 🎉`);
    }

    await updateMemberCount(member.guild);
});

client.on("guildMemberRemove", async (member) => {
    const leaveChannel = member.guild.channels.cache.find(ch => ch.name === "📢 แจ้งเตือนเข้าออก");

    if (leaveChannel) {
        leaveChannel.send(`❌ **${member.user.tag}** ได้ออกจากเซิร์ฟเวอร์แล้ว... 😢`);
    }

    await updateMemberCount(member.guild);
});

// ✅ ฟังก์ชันอัปเดตจำนวนสมาชิกแบบเรียลไทม์
async function updateMemberCount(guild) {
    let memberChannel = guild.channels.cache.find(ch => ch.name.startsWith("👥 สมาชิกทั้งหมด:"));
    if (!memberChannel) return;

    try {
        await memberChannel.setName(`👥 สมาชิกทั้งหมด: ${guild.memberCount}`);
        console.log(`🔄 อัปเดตจำนวนสมาชิกเป็น: ${guild.memberCount}`);
    } catch (error) {
        console.error("❌ ไม่สามารถอัปเดตช่องสมาชิกได้:", error);
    }
}

// ✅ ระบบ Web Dashboard
const app = express();
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("dashboard", { botStatus: "✅ บอทกำลังทำงาน!" });
});

app.listen(PORT, () => {
    console.log(`🌐 Web Dashboard เปิดใช้งานที่ https://my-discord-bot-osbe.onrender.com`);
});

// ✅ ระบบเศรษฐกิจ (Economy System)
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(" ");
    const command = args.shift().toLowerCase();

    if (command === "!balance") {
        db.get("SELECT balance FROM users WHERE id = ?", [message.author.id], (err, row) => {
            if (err) return console.error(err);
            const balance = row ? row.balance : 0;
            message.reply(`💰 คุณมีเงิน: ${balance} 💵`);
        });
    }

    if (command === "!daily") {
        db.run("UPDATE users SET balance = balance + 100 WHERE id = ?", [message.author.id], function (err) {
            if (err) return console.error(err);
            message.reply("🎁 คุณได้รับเงินรายวัน 100 💵!");
        });
    }

    if (command === "!work") {
        const amount = Math.floor(Math.random() * 500) + 100;
        db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, message.author.id], function (err) {
            if (err) return console.error(err);
            message.reply(`💼 คุณทำงานและได้รับ ${amount} 💵!`);
        });
    }
});

// ✅ คำสั่ง !help
client.on("messageCreate", async (message) => {
    if (message.content === "!help") {
        const helpMessage = `
        **📌 คำสั่งทั้งหมดของบอท**
        🔹 **!setup** - ตั้งค่าระบบรับยศ (เฉพาะ Admin)
        🔹 **!members** - สร้างห้องแสดงจำนวนสมาชิก (เฉพาะ Admin)
        🔹 **!balance** - เช็คยอดเงินของคุณ
        🔹 **!daily** - รับเงินรายวัน (100💵)
        🔹 **!work** - ทำงานเพื่อรับเงิน (100 - 500💵)
        
        **✅ ระบบยืนยันตัวตน & รับยศ**
        - เข้าไปที่ห้อง **"🔰 รับยศที่นี่"** 
        - กดปุ่ม **🔍 ยืนยันตัวตน** แล้วกด **✅ รับยศ** เพื่อรับยศ "สมาชิก"

        **👥 ระบบอัปเดตจำนวนสมาชิก**
        - คำสั่ง **!members** สร้างห้องแสดงจำนวนสมาชิก
        - เมื่อมีคนเข้า/ออกเซิร์ฟเวอร์ ห้องจะอัปเดตอัตโนมัติ

        **📢 ระบบแจ้งเตือนเข้า-ออก**
        - สมาชิกใหม่เข้าเซิร์ฟเวอร์ จะแสดงข้อความในห้อง **"📢 แจ้งเตือนเข้าออก"**
        - สมาชิกออกจากเซิร์ฟเวอร์ จะแสดงข้อความในห้อง **"📢 แจ้งเตือนเข้าออก"**

        **🚨 ระบบแจ้งเตือน**
        - หากบอทล่ม จะแจ้งเตือนในห้อง **"📜 log-บอท"**
        - เมื่อมีคนได้รับยศ จะแจ้งเตือนในห้อง **"📜 log-รับยศ"**
        `;
        message.channel.send(helpMessage);
    }
});

// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);
