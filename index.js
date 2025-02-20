import 'dotenv/config';
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

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const roleName = "สมาชิก";
    let role = interaction.guild.roles.cache.find(r => r.name === roleName);

    if (!role) {
        role = await interaction.guild.roles.create({
            name: roleName,
            color: "#00FF00"
        });
    }

    if (interaction.customId === "verify_user") {
        verifiedUsers.add(interaction.user.id);

        const roleRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_role_${interaction.user.id}`)
                .setLabel("✅ รับยศ")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            content: "**✅ ยืนยันตัวตนเรียบร้อย! สามารถกดรับยศได้แล้ว**",
            components: [roleRow],
            ephemeral: true
        });
        return;
    }

    if (interaction.customId.startsWith("accept_role_")) {
        const userId = interaction.user.id;
        if (!verifiedUsers.has(userId)) {
            return interaction.reply({ content: "❌ คุณต้องยืนยันตัวตนก่อน!", ephemeral: true });
        }

        if (interaction.member.roles.cache.has(role.id)) {
            return interaction.reply({ content: "❌ คุณมียศนี้อยู่แล้ว!", ephemeral: true });
        }

        await interaction.member.roles.add(role);
        await interaction.reply({ content: "✅ คุณได้รับยศเรียบร้อย!", ephemeral: true });

        const logChannel = interaction.guild.channels.cache.find(ch => ch.name === "📜 log-รับยศ");
        if (logChannel) {
            logChannel.send(`📢 **${interaction.user.tag}** ได้รับยศ **${role.name}** แล้ว!`);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

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

        **💡 คำสั่งเพิ่มเติมในอนาคต**
        - หากต้องการเพิ่มคำสั่งใหม่ แจ้งให้แอดมินเพิ่มได้เลย!
        `;

        message.channel.send(helpMessage);
    }
});

// ระบบหลังบ้าน (Backend) ของเว็บเซิร์ฟเวอร์
import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// ตั้งค่าให้ Express ใช้ EJS เป็น Template Engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

app.use(express.static("public"));

// สร้าง Route สำหรับหน้า Dashboard
app.get("/", (req, res) => {
    res.render("dashboard", { bot: client });
});

// ให้เว็บเซิร์ฟเวอร์เริ่มทำงาน
app.listen(PORT, () => {
    console.log(`🌐 Web Dashboard เปิดใช้งานที่ http://localhost:${PORT}`);
});

// ระบบเศรษฐกิจ (Economy System)
import { getUserBalance, addUserBalance, setUserBalance } from "./database.js";

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(" ");
    const command = args.shift().toLowerCase();

    if (command === "!balance") {
        const balance = getUserBalance(message.author.id);
        message.reply(`💰 คุณมีเงิน: ${balance} 💵`);
    }

    if (command === "!daily") {
        addUserBalance(message.author.id, 100);
        message.reply("🎁 คุณได้รับเงินรายวัน 100 💵!");
    }

    if (command === "!work") {
        const amount = Math.floor(Math.random() * 500) + 100;
        addUserBalance(message.author.id, amount);
        message.reply(`💼 คุณทำงานและได้รับ ${amount} 💵!`);
    }

    if (command === "!leaderboard") {
        const rows = db.prepare("SELECT id, balance FROM users ORDER BY balance DESC LIMIT 5").all();
        let leaderboard = "🏆 **อันดับเศรษฐีของเซิร์ฟเวอร์** 🏆\n";
        rows.forEach((row, index) => {
            leaderboard += `${index + 1}. <@${row.id}> - 💵 ${row.balance}\n`;
        });
        message.channel.send(leaderboard);
    }
});



client.login(process.env.TOKEN);
 