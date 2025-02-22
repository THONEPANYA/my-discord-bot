import { Client, GatewayIntentBits, PermissionsBitField, SlashCommandBuilder, REST, Routes, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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

// ลงทะเบียน Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('📌 ตั้งค่าระบบยืนยันตัวตน')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
        .setName('setupstats')
        .setDescription('📊 สร้างห้อง Server Stats')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
];

// ✅ ลงทะเบียน Slash Commands
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

// ✅ บอทพร้อมทำงาน
client.once('ready', async () => {
    console.log(`✅ บอท ${client.user.tag} พร้อมใช้งานแล้ว!`);
    await registerCommands();
});

// ✅ จัดการ Slash Commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;

    if (commandName === 'setup') {
        let category = interaction.guild.channels.cache.find(ch => ch.name === "📌 ระบบยืนยันตัวตน" && ch.type === ChannelType.GuildCategory);
        if (!category) {
            category = await interaction.guild.channels.create({
                name: "📌 ระบบยืนยันตัวตน",
                type: ChannelType.GuildCategory,
                permissionOverwrites: [{ id: interaction.guild.id, allow: [PermissionsBitField.Flags.ViewChannel] }]
            });
        }

        let verifyChannel = interaction.guild.channels.cache.find(ch => ch.name === "🔰︱ยืนยันตัวตน");
        if (!verifyChannel) {
            verifyChannel = await interaction.guild.channels.create({
                name: "🔰︱ยืนยันตัวตน",
                type: ChannelType.GuildText,
                parent: category.id
            });
        }

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
    
        console.log(`🔹 ปุ่มกดทำงาน: ${interaction.customId}`); // เช็คว่าปุ่มทำงานหรือไม่
    
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
    });

    if (commandName === 'setupstats') {
        await interaction.reply("⏳ กำลังตั้งค่าห้องสถิติ...");

        let statsCategory = interaction.guild.channels.cache.find(ch => ch.name === "📊 Server Stats" && ch.type === ChannelType.GuildCategory);
        if (!statsCategory) {
            statsCategory = await interaction.guild.channels.create({
                name: "📊 Server Stats",
                type: ChannelType.GuildCategory,
                permissionOverwrites: [{ id: interaction.guild.id, allow: [PermissionsBitField.Flags.ViewChannel] }]
            });
        }

        await interaction.guild.channels.create({
            name: `👥 สมาชิก: ${interaction.guild.memberCount}`,
            type: ChannelType.GuildVoice,
            parent: statsCategory.id,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
        });

        await interaction.guild.channels.create({
            name: `💬 ข้อความ: ${interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size}`,
            type: ChannelType.GuildVoice,
            parent: statsCategory.id,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
        });

        await interaction.guild.channels.create({
            name: `🔊 ห้องเสียง: ${interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size}`,
            type: ChannelType.GuildVoice,
            parent: statsCategory.id,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
        });

        await interaction.guild.channels.create({
            name: `🎭 บทบาท: ${interaction.guild.roles.cache.size}`,
            type: ChannelType.GuildVoice,
            parent: statsCategory.id,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
        });

        await interaction.editReply("✅ **ตั้งค่าห้อง Server Stats สำเร็จ!**");
    }
});

const antiSpamEnabled = true;
const antiRaidEnabled = true;
const spamLimit = 5;
const userMessages = new Map();
const joinTimestamps = [];
const joinLimit = 5; 

client.on("messageCreate", async (message) => {
    if (!antiSpamEnabled || message.author.bot || !message.guild) return;
    const now = Date.now();
    const userId = message.author.id;

    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }

    const timestamps = userMessages.get(userId);
    timestamps.push(now);
    while (timestamps.length > 0 && timestamps[0] < now - 5000) {
        timestamps.shift();
    }
    if (timestamps.length > spamLimit) {
        await message.delete();
        message.channel.send(`🚨 <@${userId}> หยุดสแปมข้อความ!`);
    }
});

client.on("guildMemberAdd", async (member) => {
    if (!antiRaidEnabled) return;
    const now = Date.now();
    joinTimestamps.push(now);
    while (joinTimestamps.length > 0 && joinTimestamps[0] < now - 10000) {
        joinTimestamps.shift();
    }
    if (joinTimestamps.length > joinLimit) {
        await member.kick("🚨 ระบบป้องกัน Raid ตรวจพบการเข้าร่วมผิดปกติ!");
    }
});

client.on("guildMemberAdd", async (member) => {
    const settings = guildSettings.get(member.guild.id);
    if (!settings || !settings.welcomeChannel) return;
    const welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannel);
    if (!welcomeChannel) return;
    const welcomeEmbed = {
        color: 0x00FF00,
        title: "🎉 ยินดีต้อนรับ!",
        description: `👋 **ยินดีต้อนรับ** <@${member.id}> สู่เซิร์ฟเวอร์ **${member.guild.name}**!`,
        thumbnail: { url: member.user.displayAvatarURL() },
        footer: { text: `เรามีสมาชิกทั้งหมด ${member.guild.memberCount} คนแล้ว!` }
    };
    welcomeChannel.send({ embeds: [welcomeEmbed] });
});

client.on("guildMemberRemove", async (member) => {
    const settings = guildSettings.get(member.guild.id);
    if (!settings || !settings.goodbyeChannel) return;
    const goodbyeChannel = member.guild.channels.cache.get(settings.goodbyeChannel);
    if (!goodbyeChannel) return;
    const goodbyeEmbed = {
        color: 0xFF0000,
        title: "👋 ลาก่อน...",
        description: `❌ **${member.user.tag}** ได้ออกจากเซิร์ฟเวอร์...`,
        thumbnail: { url: member.user.displayAvatarURL() },
        footer: { text: `ตอนนี้เหลือสมาชิก ${member.guild.memberCount} คน` }
    };
    goodbyeChannel.send({ embeds: [goodbyeEmbed] });
});

// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);
