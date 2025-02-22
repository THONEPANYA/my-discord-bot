import { Client, GatewayIntentBits, PermissionsBitField, SlashCommandBuilder, REST, Routes } from 'discord.js';
import 'dotenv/config';

// ตรวจสอบ Token
if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    console.error("❌ กรุณาใส่ TOKEN และ CLIENT_ID ใน .env");
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

// 🔹 ลงทะเบียน Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('📌 ตั้งค่าระบบยืนยันตัวตน')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
        .setName('setupstats')
        .setDescription('📊 สร้างห้อง Server Stats')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
        .setName('antispam')
        .setDescription('🚨 เปิด/ปิดระบบป้องกัน Spam')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('เลือกเปิด/ปิด')
                .setRequired(true)
                .addChoices(
                    { name: 'เปิด', value: 'on' },
                    { name: 'ปิด', value: 'off' }
                ))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('🎉 ตั้งค่าห้องแจ้งเตือนต้อนรับ')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('เลือกห้องสำหรับแจ้งเตือนต้อนรับ')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
        .setName('setgoodbye')
        .setDescription('👋 ตั้งค่าห้องแจ้งเตือนลา')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('เลือกห้องสำหรับแจ้งเตือนลา')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📜 แสดงรายการคำสั่งทั้งหมดของบอท')
];

// ✅ ฟังก์ชันลงทะเบียน Slash Commands
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log("📌 กำลังลงทะเบียน Slash Commands...");
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log("✅ ลงทะเบียน Slash Commands สำเร็จ!");
    } catch (error) {
        console.error("❌ ลงทะเบียน Slash Commands ล้มเหลว:", error);
    }
}

// ✅ เรียกใช้ registerCommands() ตอนบอทออนไลน์
client.once('ready', async () => {
    console.log(`✅ บอท ${client.user.tag} พร้อมใช้งานแล้ว!`);
    await registerCommands();
});

// ✅ ฟังก์ชันจัดการ Slash Commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'setup') {
        await interaction.reply("✅ ตั้งค่าระบบยืนยันตัวตนเรียบร้อย!");
    }

    if (commandName === 'setupstats') {
        await interaction.reply("✅ สร้างห้อง Server Stats สำเร็จ!");
    }

    if (commandName === 'antispam') {
        const status = interaction.options.getString('status');
        if (status === 'on') {
            antiSpamEnabled = true;
            await interaction.reply("✅ เปิดระบบป้องกันสแปมแล้ว!");
        } else {
            antiSpamEnabled = false;
            await interaction.reply("❌ ปิดระบบป้องกันสแปมแล้ว!");
        }
    }

    if (commandName === 'setwelcome') {
        const channel = interaction.options.getChannel('channel');
        guildSettings.set(interaction.guild.id, { welcomeChannel: channel.id });
        await interaction.reply(`✅ ตั้งค่าห้องต้อนรับเป็น **${channel.name}** เรียบร้อย!`);
    }

    if (commandName === 'setgoodbye') {
        const channel = interaction.options.getChannel('channel');
        const settings = guildSettings.get(interaction.guild.id) || {};
        settings.goodbyeChannel = channel.id;
        guildSettings.set(interaction.guild.id, settings);
        await interaction.reply(`✅ ตั้งค่าห้องลาเป็น **${channel.name}** เรียบร้อย!`);
    }

    if (commandName === 'help') {
        const helpMessage = `
        **📌 คำสั่งทั้งหมดของบอท**
        🔹 **/setup** - ตั้งค่าระบบรับยศ (เฉพาะ Admin)
        🔹 **/setupstats** - สร้างห้องแสดงจำนวนสมาชิก (เฉพาะ Admin)
        🔹 **/antispam on/off** - เปิดใช้งานป้องกันการ Spam (เฉพาะ Admin)
        🔹 **/setwelcome #channel** - ตั้งค่าห้องต้อนรับ (เฉพาะ Admin)
        🔹 **/setgoodbye #channel** - ตั้งค่าห้องลา (เฉพาะ Admin)
        
        **✅ ระบบยืนยันตัวตน & รับยศ**
        - เข้าไปที่ห้อง **"🔰 ยืนยันตัวตน"** 
        - กดปุ่ม **🔍 ยืนยันตัวตน** แล้วกด **✅ รับยศ** เพื่อรับยศ "สมาชิก"

        **📢 ระบบแจ้งเตือนเข้า-ออก**
        - สมาชิกใหม่เข้าเซิร์ฟเวอร์ จะแสดงข้อความในห้องที่ตั้งค่าไว้
        - สมาชิกออกจากเซิร์ฟเวอร์ จะแสดงข้อความในห้องที่ตั้งค่าไว้
        `;
        await interaction.reply(helpMessage);
    }
});

const guildSettings = new Map(); // เก็บค่าห้อง Welcome ของแต่ละเซิร์ฟเวอร์

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'setwelcome') {
        // ตรวจสอบว่ามีห้องชื่อ "📢︱welcome" อยู่แล้วหรือไม่
        let welcomeChannel = interaction.guild.channels.cache.find(ch => ch.name === "📢︱welcome");

        if (!welcomeChannel) {
            // สร้างห้องใหม่ ถ้าไม่มี
            welcomeChannel = await interaction.guild.channels.create({
                name: "📢︱welcome",
                type: 0, // Text Channel
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
        }

        // บันทึกค่าห้องต้อนรับใน guildSettings
        guildSettings.set(interaction.guild.id, { welcomeChannel: welcomeChannel.id });

        await interaction.reply(`✅ **สร้างห้องต้อนรับใหม่สำเร็จ!** ห้อง: ${welcomeChannel}`);
    }
});

// /setup
if (commandName === 'setup') {
    // สร้างหมวดหมู่ "📌 ระบบยืนยันตัวตน"
    let category = interaction.guild.channels.cache.find(ch => ch.name === "📌 ระบบยืนยันตัวตน" && ch.type === 4);
    if (!category) {
        category = await interaction.guild.channels.create({
            name: "📌 ระบบยืนยันตัวตน",
            type: 4, // Category
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel]
                }
            ]
        });
    }

    // สร้างห้อง "🔰︱ยืนยันตัวตน" ในหมวดหมู่
    let verifyChannel = interaction.guild.channels.cache.find(ch => ch.name === "🔰︱ยืนยันตัวตน");
    if (!verifyChannel) {
        verifyChannel = await interaction.guild.channels.create({
            name: "🔰︱ยืนยันตัวตน",
            type: 0, // Text Channel
            parent: category.id
        });
    }

    // สร้างปุ่มให้กดยืนยันตัวตน
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

    await interaction.reply("✅ ตั้งค่าระบบยืนยันตัวตนเรียบร้อย!");
}

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

// /setupstats
if (commandName === 'setupstats') {
    await interaction.reply("⏳ กำลังตั้งค่าห้องสถิติ...");

    // ตรวจสอบว่ามีหมวดหมู่ "📊 Server Stats" หรือไม่
    let statsCategory = interaction.guild.channels.cache.find(ch => ch.name === "📊 Server Stats" && ch.type === 4);
    if (!statsCategory) {
        statsCategory = await interaction.guild.channels.create({
            name: "📊 Server Stats",
            type: 4, // Category
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionsBitField.Flags.ViewChannel]
                }
            ]
        });
    }

    // สร้างห้องแสดงสถิติ
    await interaction.guild.channels.create({
        name: `👥 สมาชิก: ${interaction.guild.memberCount}`,
        type: 2, // Voice Channel
        parent: statsCategory.id,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.Connect]
            }
        ]
    });

    await interaction.guild.channels.create({
        name: `💬 ข้อความ: ${interaction.guild.channels.cache.filter(ch => ch.type === 0).size}`,
        type: 2,
        parent: statsCategory.id,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.Connect]
            }
        ]
    });

    await interaction.guild.channels.create({
        name: `🔊 ห้องเสียง: ${interaction.guild.channels.cache.filter(ch => ch.type === 2).size}`,
        type: 2,
        parent: statsCategory.id,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.Connect]
            }
        ]
    });

    await interaction.guild.channels.create({
        name: `🎭 บทบาท: ${interaction.guild.roles.cache.size}`,
        type: 2,
        parent: statsCategory.id,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.Connect]
            }
        ]
    });

    await interaction.editReply("✅ **ตั้งค่าห้อง Server Stats สำเร็จ!**");
}

async function updateServerStats(guild) {
    if (!guild) return;

    let memberChannel = guild.channels.cache.find(ch => ch.name.startsWith("👥 สมาชิก:"));
    let textChannelCount = guild.channels.cache.find(ch => ch.name.startsWith("💬 ข้อความ:"));
    let voiceChannelCount = guild.channels.cache.find(ch => ch.name.startsWith("🔊 ห้องเสียง:"));
    let roleCount = guild.channels.cache.find(ch => ch.name.startsWith("🎭 บทบาท:"));

    try {
        if (memberChannel) await memberChannel.setName(`👥 สมาชิก: ${guild.memberCount}`);
        if (textChannelCount) await textChannelCount.setName(`💬 ข้อความ: ${guild.channels.cache.filter(ch => ch.type === 0).size}`);
        if (voiceChannelCount) await voiceChannelCount.setName(`🔊 ห้องเสียง: ${guild.channels.cache.filter(ch => ch.type === 2).size}`);
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

// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);