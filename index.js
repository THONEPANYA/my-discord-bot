import 'dotenv/config';
import express from 'express';
import path from 'path';
import { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';

// ✅ ตรวจสอบว่า Token โหลดถูกต้องหรือไม่
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
    
    client.user.setPresence({
        activities: [{ name: 'เพลงใหม่ของ Sweet The Kid 🎵', type: 1 }], // Listening
        status: 'idle' // Online (ปกติ), Idle (ว่าง), DND (ห้ามรบกวน)
    });
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

// ✅ ระบบ !setup สร้างช่องยืนยันตัวตน
client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content === "!setup") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้!");
        }

        const category = await message.guild.channels.create({
            name: "📌 ระบบยืนยันตัวตน",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel]
                }
            ]
        });

        const verifyChannel = await message.guild.channels.create({
            name: "🔰 ยืนยันตัวตน",
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
                .setCustomId("start_verification")
                .setLabel("🔍 ยืนยันตัวตน")
                .setStyle(ButtonStyle.Primary)
        );

        await verifyChannel.send({
            content: "**👋 กรุณากดยืนยันตัวตนก่อนรับยศ**",
            components: [verifyRow]
        });

        message.reply("✅ ตั้งค่าระบบยืนยันตัวตนเรียบร้อย!");
    }
});

// ✅ ระบบปุ่มยืนยันตัวตน
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "start_verification") {
        const roleRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_role_${interaction.user.id}`)
                .setLabel("✅ รับยศ")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            content: "**✅ ยืนยันตัวตนสำเร็จ! กรุณากดปุ่มด้านล่างเพื่อรับยศ**",
            components: [roleRow],
            ephemeral: true
        });
    }

    if (interaction.customId.startsWith("accept_role_")) {
        const roleName = "สมาชิก";
        let role = interaction.guild.roles.cache.find(r => r.name === roleName);

        if (!role) {
            role = await interaction.guild.roles.create({
                name: roleName,
                color: "#00FF00"
            });
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

// ✅ ระบบแจ้งเตือนสมาชิกเข้า-ออก
client.on("guildMemberAdd", async (member) => {
    const welcomeChannel = member.guild.channels.cache.find(ch => ch.name === "📢 แจ้งเตือนเข้าออก");
    if (welcomeChannel) {
        welcomeChannel.send(`👋 **ยินดีต้อนรับ** <@${member.id}> สู่เซิร์ฟเวอร์! 🎉 กรุณายืนยันตัวตนที่ห้อง **🔰 ยืนยันตัวตน**`);
    }
});

client.on("guildMemberRemove", async (member) => {
    const leaveChannel = member.guild.channels.cache.find(ch => ch.name === "📢 แจ้งเตือนเข้าออก");
    if (leaveChannel) {
        leaveChannel.send(`❌ **${member.user.tag}** ได้ออกจากเซิร์ฟเวอร์แล้ว... 😢`);
    }
});

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

// ✅ คำสั่ง !help
client.on("messageCreate", async (message) => {
    if (message.content === "!help") {
        const helpMessage = `
        **📌 คำสั่งทั้งหมดของบอท**
        🔹 **!setup** - ตั้งค่าระบบรับยศ (เฉพาะ Admin)
        🔹 **!setupstats** - สร้างห้องแสดงจำนวนสมาชิก (เฉพาะ Admin)
        🔹 **!antispam** - เปิดใช่งานป้องกันการ Spam (เฉพาะ Admin)
        🔹 **!antiraid** - เปิดใช่งานป้องกันการ Raid หรือ โดนโจมตี (เฉพาะ Admin)
        
        **✅ ระบบยืนยันตัวตน & รับยศ**
        - เข้าไปที่ห้อง **"🔰 ยืนยันตัวตน"** 
        - กดปุ่ม **🔍 ยืนยันตัวตน** แล้วกด **✅ รับยศ** เพื่อรับยศ "สมาชิก"

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

// ✅ ฟังก์ชันสร้างห้อง Server Stats
async function setupServerStats(guild) {
    if (!guild) return;

    // เช็คว่ามี Category อยู่แล้วหรือไม่
    let statsCategory = guild.channels.cache.find(ch => ch.name === "📊 Server Stats" && ch.type === ChannelType.GuildCategory);

    if (!statsCategory) {
        statsCategory = await guild.channels.create({
            name: "📊 Server Stats",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [{ id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel] }]
        });
    }

    // สร้างห้องแสดงข้อมูล
    await guild.channels.create({ name: `👥 สมาชิก: ${guild.memberCount}`, type: ChannelType.GuildVoice, parent: statsCategory.id, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }] });
    await guild.channels.create({ name: `💬 ข้อความ: ${guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size}`, type: ChannelType.GuildVoice, parent: statsCategory.id, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }] });
    await guild.channels.create({ name: `🔊 เสียง: ${guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size}`, type: ChannelType.GuildVoice, parent: statsCategory.id, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }] });
    await guild.channels.create({ name: `🎭 บทบาท: ${guild.roles.cache.size}`, type: ChannelType.GuildVoice, parent: statsCategory.id, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }] });

    console.log(`✅ สร้างห้อง Server Stats สำเร็จในเซิร์ฟเวอร์: ${guild.name}`);
}

// ✅ ฟังก์ชันอัปเดตข้อมูล Server Stats แบบเรียลไทม์
async function updateServerStats(guild) {
    if (!guild) return;

    let memberChannel = guild.channels.cache.find(ch => ch.name.startsWith("👥 สมาชิก:"));
    let textChannelCount = guild.channels.cache.find(ch => ch.name.startsWith("💬 ข้อความ:"));
    let voiceChannelCount = guild.channels.cache.find(ch => ch.name.startsWith("🔊 เสียง:"));
    let roleCount = guild.channels.cache.find(ch => ch.name.startsWith("🎭 บทบาท:"));

    try {
        if (memberChannel) await memberChannel.setName(`👥 สมาชิก: ${guild.memberCount}`);
        if (textChannelCount) await textChannelCount.setName(`💬 ข้อความ: ${guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size}`);
        if (voiceChannelCount) await voiceChannelCount.setName(`🔊 เสียง: ${guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size}`);
        if (roleCount) await roleCount.setName(`🎭 บทบาท: ${guild.roles.cache.size}`);

        console.log(`🔄 อัปเดต Server Stats สำเร็จในเซิร์ฟเวอร์: ${guild.name}`);
    } catch (error) {
        console.error("❌ ไม่สามารถอัปเดตช่องสถิติได้:", error);
    }
}

// 📢 อัปเดต Stats เมื่อมีสมาชิกเข้า / ออก
client.on("guildMemberAdd", async (member) => {
    await updateServerStats(member.guild);
});

client.on("guildMemberRemove", async (member) => {
    await updateServerStats(member.guild);
});

// 📢 อัปเดต Stats เมื่อมีการสร้าง / ลบห้องแชท
client.on("channelCreate", async (channel) => {
    await updateServerStats(channel.guild);
});

client.on("channelDelete", async (channel) => {
    await updateServerStats(channel.guild);
});

// ✅ คำสั่ง !setupstats (สร้างห้อง Server Stats)
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content === "!setupstats") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้!");
        }

        await setupServerStats(message.guild);
        message.reply("✅ สร้างห้อง Server Stats เรียบร้อย!");
    }
});


// ✅ ระบบป้องกัน Raid & Spam (Anti-Raid & Anti-Spam)
let antiSpamEnabled = true; // เปิดเป็น true หรือปิดเป็น false
let antiRaidEnabled = true; // เปิดเป็น true หรือปิดเป็น false
let spamLitmit = 5; // จำนวนข้อความที่ส่งต่อกัน 5 ครั้ง

const userMessageMap = new Map(); // เก็บข้อมูลจำนวนข้อความที่แต่ละคนส่ง

// ✅ ระบบป้องกัน Spam
client.on("messageCreate", async (message) => {
    if (!antiSpamEnabled || message.author.bot || !message.guild) return;

    const now = Date.now();
    const userId = message.author.id;

    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }

    const timestamps = userMessages.get(userId);
    timestamps.push(now);

    // ลบข้อมูลเก่าที่เกิน 5 วินาที
    while (timestamps.length > 0 && timestamps[0] < now - 5000) {
        timestamps.shift();
    }

    if (timestamps.length > spamLimit) {
        await message.delete();
        message.channel.send(`🚨 <@${userId}> หยุดสแปมข้อความ!`);
    }
});

// ✅ ระบบป้องกัน Raid (ป้องกันการเข้าร่วมเยอะเกินไป)
const joinTimestamps = [];
const joinLimit = 5; // จำนวนคนที่เข้ามาในเวลา 10 วินาที

client.on("guildMemberAdd", async (member) => {
    if (!antiRaidEnabled) return;

    const now = Date.now();
    joinTimestamps.push(now);

    // ลบข้อมูลเก่าที่เกิน 10 วินาที
    while (joinTimestamps.length > 0 && joinTimestamps[0] < now - 10000) {
        joinTimestamps.shift();
    }

    if (joinTimestamps.length > joinLimit) {
        await member.kick("🚨 ระบบป้องกัน Raid ตรวจพบการเข้าร่วมผิดปกติ!");
        const logChannel = member.guild.channels.cache.find(ch => ch.name === "📜 log-บอท");
        if (logChannel) {
            logChannel.send(`🚨 ระบบป้องกัน Raid: เตะ ${member.user.tag} ออกจากเซิร์ฟเวอร์!`);
        }
    }
});

// ✅ คำสั่งเปิด/ปิดระบบป้องกัน
client.on("messageCreate", async (message) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.split(" ");
    const command = args.shift().toLowerCase();

    if (command === "!antispam") {
        if (args[0] === "on") {
            antiSpamEnabled = true;
            message.reply("✅ เปิดระบบป้องกันสแปมแล้ว!");
        } else if (args[0] === "off") {
            antiSpamEnabled = false;
            message.reply("❌ ปิดระบบป้องกันสแปมแล้ว!");
        } else if (args[0] === "setlimit") {
            const newLimit = parseInt(args[1]);
            if (!isNaN(newLimit) && newLimit > 0) {
                spamLimit = newLimit;
                message.reply(`🔧 ตั้งค่าขีดจำกัดข้อความเป็น ${newLimit} ข้อความ/5 วินาที`);
            } else {
                message.reply("⚠️ โปรดใส่ค่าที่ถูกต้อง!");
            }
        }
    }

    if (command === "!antiraid") {
        if (args[0] === "on") {
            antiRaidEnabled = true;
            message.reply("✅ เปิดระบบป้องกัน Raid แล้ว!");
        } else if (args[0] === "off") {
            antiRaidEnabled = false;
            message.reply("❌ ปิดระบบป้องกัน Raid แล้ว!");
        }
    }
});

// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);
