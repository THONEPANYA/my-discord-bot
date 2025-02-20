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
        🔹 **!members** - สร้างห้องแสดงจำนวนสมาชิก (เฉพาะ Admin)
        
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

// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);
