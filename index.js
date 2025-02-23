import { 
    Client, GatewayIntentBits, PermissionsBitField, 
    SlashCommandBuilder, REST, Routes, ChannelType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle 
} from 'discord.js';
import 'dotenv/config';
import mongoose from 'mongoose';
import Economy from './models/economy.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const economyCommandsPath = path.join(__dirname, 'commands/economy');
const economyCommandFiles = fs.readdirSync(economyCommandsPath).filter(file => file.endsWith('.js'));

for (const file of economyCommandFiles) {
    import(`./commands/economy/${file}`).then(command => {
        client.commands.set(command.data.name, command);
    }).catch(err => console.error(`❌ ไม่สามารถโหลดคำสั่ง ${file}:`, err));
}

console.log("🔍 MONGO_URI:", process.env.MONGO_URI);

// ✅ เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ เชื่อมต่อ MongoDB สำเร็จ!'))
    .catch(err => console.error('❌ ไม่สามารถเชื่อมต่อ MongoDB:', err));

// ✅ ตรวจสอบ Token
if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    console.error("❌ กรุณาใส่ TOKEN และ CLIENT_ID ใน .env");
    process.exit(1);
}

// ✅ ตั้งค่าคลาส Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ✅ ลงทะเบียน Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('📌 ตั้งค่าระบบยืนยันตัวตน')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📊 ตั้งค่าห้อง Server Stats')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📖 ดูคำสั่งที่สามารถใช้ได้'),
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('💰 เช็คยอดเงินของคุณ'),
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('💵 รับเงินประจำวัน'),
    new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('💸 โอนเงินให้สมาชิก')
        .addUserOption(option => option.setName('user').setDescription('ผู้รับเงิน').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงิน').setRequired(true)),
    new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('🏦 ฝากเงินเข้าธนาคาร')
        .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงิน').setRequired(true)),
    new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('🏦 ถอนเงินจากธนาคาร')
        .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงิน').setRequired(true)),
];

await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
console.log("✅ ลงทะเบียน Slash Commands สำเร็จ!");

// ✅ เมื่อบอทพร้อมทำงาน
client.once('ready', async () => {
    console.log(`✅ บอท ${client.user.tag} พร้อมใช้งานแล้ว!`);
    await registerCommands();
});

// ✅ ระบบยืนยันตัวตนพร้อมให้ยศ
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() && !interaction.isButton()) return;

    if (interaction.commandName === 'setup') {
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
            content: "**👋 กรุณากดยืนยันตัวตนเพื่อรับยศ**",
            components: [verifyRow]
        });
        await interaction.reply({ content: "✅ ตั้งค่าห้องยืนยันตัวตนสำเร็จ!", ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === "start_verification") {
        let role = interaction.guild.roles.cache.find(r => r.name === "สมาชิก");
        if (!role) {
            role = await interaction.guild.roles.create({
                name: "สมาชิก",
                color: "BLUE",
                reason: "สร้างยศสำหรับระบบยืนยันตัวตน"
            });
        }
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (member.roles.cache.has(role.id)) {
            return await interaction.reply({ content: "✅ คุณมียศ 'สมาชิก' อยู่แล้ว!", ephemeral: true });
        }
        await member.roles.add(role);
        await interaction.reply({ content: `✅ คุณได้รับยศ **${role.name}** เรียบร้อยแล้ว!`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
