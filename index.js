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


// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);