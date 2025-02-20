import 'dotenv/config';
import express from 'express';
import path from 'path';
import { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';

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

// ระบบแจ้งเตือนหากบอทล่ม
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

const verifiedUsers = new Set();
let memberCountChannelId = null; // เก็บ ID ของช่องแสดงจำนวนสมาชิก

client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content === "!setup") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้!");
        }

        const category = await message.guild.channels.create({
            name: "📌 รับยศ",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel]
                }
            ]
        });

        const roleChannel = await message.guild.channels.create({
            name: "🔰 รับยศที่นี่",
            type: ChannelType.GuildText,
            parent: category.id
        });

        await message.guild.channels.create({
            name: "📜 log-รับยศ",
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: [PermissionsBitField.Flags.SendMessages]
                }
            ]
        });

        const verifyRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify_user")
                .setLabel("🔍 ยืนยันตัวตน")
                .setStyle(ButtonStyle.Primary)
        );

        await roleChannel.send({
            content: "**👋 ยินดีต้อนรับ! กรุณากดยืนยันตัวตนก่อนรับยศ**",
            components: [verifyRow]
        });

        message.reply("✅ ตั้งค่าห้องรับยศและล็อกแจ้งเตือนเรียบร้อย!");
    }
    
    // 🔹 ระบบอัปเดตจำนวนสมาชิกแบบเรียลไทม์
    if (message.content === "!members") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้!");
        }

        let existingChannel = message.guild.channels.cache.find(ch => ch.name.startsWith("👥 สมาชิกทั้งหมด:"));
        
        if (existingChannel) {
            memberCountChannelId = existingChannel.id; // บันทึก ID ของช่องที่มีอยู่
            return message.reply("⚠️ มีช่องสมาชิกอยู่แล้ว!");
        }

        // สร้างช่อง Voice Channel สำหรับแสดงจำนวนสมาชิก
        const memberChannel = await message.guild.channels.create({
            name: `👥 สมาชิกทั้งหมด: ${message.guild.memberCount}`,
            type: ChannelType.GuildVoice,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: [PermissionsBitField.Flags.Connect] // ป้องกันคนเข้า
                }
            ]
        });

        memberCountChannelId = memberChannel.id; // บันทึก ID ช่องใหม่
        message.reply(`✅ สร้างช่อง **${memberChannel.name}** แล้ว!`);
    }
});

// ฟังก์ชันอัปเดตจำนวนสมาชิกแบบเรียลไทม์
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

// 📢 เมื่อมีสมาชิกเข้า
client.on("guildMemberAdd", async (member) => {
    await updateMemberCount(member.guild);
});

// ❌ เมื่อมีสมาชิกออก
client.on("guildMemberRemove", async (member) => {
    await updateMemberCount(member.guild);
});

// ✅ ระบบ Web Dashboard
const app = express();
const PORT = process.env.PORT || 8080; // ✅ แก้ไขตัวแปรให้แน่ใจว่ากำหนดค่าไว้

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("✅ Web Dashboard พร้อมใช้งาน!");
});

app.listen(PORT, () => {
    console.log(`🌐 Web Dashboard เปิดใช้งานที่ http://localhost:${PORT}`);
});

// ✅ คำสั่ง !help
client.on("messageCreate", async (message) => {
    if (message.content === "!help") {
        const helpMessage = `
        **📌 คำสั่งทั้งหมดของบอท**
        🔹 **!setup** - ตั้งค่าระบบรับยศ (เฉพาะ Admin)
        🔹 **!members** - สร้างห้องแสดงจำนวนสมาชิก (เฉพาะ Admin)
        
        **✅ ระบบยืนยันตัวตน & รับยศ**
        - เข้าไปที่ห้อง **"🔰 รับยศที่นี่"** 
        - กดปุ่ม **🔍 ยืนยันตัวตน** แล้วกด **✅ รับยศ** เพื่อรับยศ "สมาชิก"

        **👥 ระบบอัปเดตจำนวนสมาชิก**
        - คำสั่ง **!members** สร้างห้องแสดงจำนวนสมาชิก
        - เมื่อมีคนเข้า/ออกเซิร์ฟเวอร์ ห้องจะอัปเดตอัตโนมัติ

        **🚨 ระบบแจ้งเตือน**
        - หากบอทล่ม จะแจ้งเตือนในห้อง **"📜 log-บอท"**
        - เมื่อมีคนได้รับยศ จะแจ้งเตือนในห้อง **"📜 log-รับยศ"**
        `;
        message.channel.send(helpMessage);
    }
});

// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);
