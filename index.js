import { 
    Client, GatewayIntentBits, PermissionsBitField, 
    SlashCommandBuilder, REST, Routes, ChannelType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle 
} from 'discord.js';
import 'dotenv/config';

import mongoose from 'mongoose';

console.log("🔍 MONGO_URI:", process.env.MONGO_URI); // ตรวจสอบค่าที่โหลดมา


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ เชื่อมต่อ MongoDB สำเร็จ!'))
    .catch(err => console.error('❌ ไม่สามารถเชื่อมต่อ MongoDB:', err));

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
        .setDescription('📊 ตั้งค่าห้อง Server Stats')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📖 ดูคำสั่งที่สามารถใช้ได้')
];

const statsChannels = {};

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

// ✅ ระบบยืนยันตัวตน
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        if (commandName === 'setup') {
            let verifyChannel = interaction.guild.channels.cache.find(ch => ch.name === "🔰︱ยืนยันตัวตน");
            if (!verifyChannel) {
                verifyChannel = await interaction.guild.channels.create({
                    name: "🔰︱ยืนยันตัวตน",
                    type: ChannelType.GuildText
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

            await interaction.reply({ content: "✅ ตั้งค่าระบบยืนยันตัวตนเรียบร้อย!", ephemeral: true });
        }
        
        if (commandName === 'help') {
            await interaction.reply({
                content: "**📖 คำสั่งที่สามารถใช้ได้:**\n\n"
                    + "`/setup` - ตั้งค่าระบบยืนยันตัวตน\n"
                    + "`/setupstats` - ตั้งค่าห้องแสดงสถิติสมาชิก\n"
                    + "`/help` - ดูคำสั่งที่สามารถใช้ได้",
                ephemeral: true
            });
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === "start_verification") {
            await interaction.reply({ content: "✅ ยืนยันตัวตนสำเร็จ!", ephemeral: true });
        }
    }
});

// ✅ อัปเดตสถิติแบบเรียลไทม์
async function updateStats(guild) {
    const members = `👥 สมาชิก: ${guild.memberCount}`;
    const textChannels = `💬 ข้อความ: ${guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size}`;
    const voiceChannels = `🔊 ห้องเสียง: ${guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size}`;
    
    const stats = { members, textChannels, voiceChannels };

    for (const [key, name] of Object.entries(stats)) {
        let channel = guild.channels.cache.find(ch => ch.name.startsWith(name.split(":")[0]) && ch.type === ChannelType.GuildVoice);
        if (channel) {
            await channel.setName(name).catch(console.error);
        }
    }
}

client.on("guildMemberAdd", async (member) => updateStats(member.guild));
client.on("guildMemberRemove", async (member) => updateStats(member.guild));

client.login(process.env.TOKEN);
