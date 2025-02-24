import { 
    Client, GatewayIntentBits, PermissionsBitField, 
    SlashCommandBuilder, REST, Routes, ChannelType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle 
} from 'discord.js';
import 'dotenv/config';

import Economy from './models/economy.js';
import mongoose from 'mongoose';

console.log("🔍 MONGO_URI:", process.env.MONGO_URI);

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
        .setDescription('📖 ดูคำสั่งที่สามารถใช้ได้'),

    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('💰 เช็คยอดเงินของคุณ'),
    
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('💵 รับเงินประจำวัน'),

    new SlashCommandBuilder()
        .setName('work')
        .setDescription('👷 ทำงานเพื่อรับเงิน'),

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
        const roleName = "สมาชิก";
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);

        if (!role) {
            return await interaction.reply({ content: "❌ ไม่พบยศ 'สมาชิก' ในเซิร์ฟเวอร์! โปรดสร้างยศนี้ก่อน.", ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!member) {
            return await interaction.reply({ content: "❌ ไม่พบข้อมูลของคุณในเซิร์ฟเวอร์!", ephemeral: true });
        }

        if (member.roles.cache.has(role.id)) {
            return await interaction.reply({ content: "✅ คุณมียศ 'สมาชิก' อยู่แล้ว!", ephemeral: true });
        }

        await member.roles.add(role).catch(err => {
            console.error("❌ ไม่สามารถให้ยศได้:", err);
            return interaction.reply({ content: "❌ บอทไม่มีสิทธิ์ให้ยศ! โปรดตรวจสอบสิทธิ์ของบอท.", ephemeral: true });
        });

        await interaction.reply({ content: `✅ คุณได้รับยศ **${role.name}** เรียบร้อยแล้ว!`, ephemeral: true });
    }

    if (interaction.commandName === 'setupstats') {
        await interaction.reply("⏳ กำลังตั้งค่าห้องสถิติ...");

        let statsCategory = interaction.guild.channels.cache.find(
            ch => ch.name === "📊 Server Stats" && ch.type === ChannelType.GuildCategory
        );

        if (!statsCategory) {
            statsCategory = await interaction.guild.channels.create({
                name: "📊 Server Stats",
                type: ChannelType.GuildCategory,
                position: 0
            });
        }

        const stats = {
            members: `👥 สมาชิก: ${interaction.guild.memberCount}`,
            textChannels: `💬 ข้อความ: ${interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size}`,
            voiceChannels: `🔊 ห้องเสียง: ${interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size}`
        };

        for (const [key, name] of Object.entries(stats)) {
            let channel = interaction.guild.channels.cache.find(
                ch => ch.name.startsWith(name.split(":")[0]) && ch.type === ChannelType.GuildVoice
            );

            if (!channel) {
                channel = await interaction.guild.channels.create({
                    name,
                    type: ChannelType.GuildVoice,
                    parent: statsCategory.id,
                    permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
                });
            }
        }

        await interaction.editReply("✅ **ตั้งค่าห้อง Server Stats สำเร็จ!**");
        updateStats(interaction.guild);
    }

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
    
    // ✅ อัปเดตข้อมูลอัตโนมัติเมื่อสมาชิกเข้า/ออก
    client.on("guildMemberAdd", async (member) => updateStats(member.guild));
    client.on("guildMemberRemove", async (member) => updateStats(member.guild));



        // ✅ เช็คยอดเงิน
        if (interaction.commandName === 'balance') {
            await interaction.deferReply();  // ✅ ป้องกัน Unknown interaction
            
            let user = await Economy.findOne({ userId: interaction.user.id });
            if (!user) {
                user = new Economy({ userId: interaction.user.id });
                await user.save();
            }
        
            await interaction.editReply(`💰 **${interaction.user.username}**\n🪙 Wallet: **${user.wallet}**\n🏦 Bank: **${user.bank}**`);
        }
    
        // ✅ รับเงินประจำวัน
        if (interaction.commandName === 'daily') {
            let user = await Economy.findOne({ userId: interaction.user.id });
        
            if (!user) {
                user = new Economy({ userId: interaction.user.id });
            }
        
            const now = new Date();
            const cooldown = 24 * 60 * 60 * 1000; // 24 ชั่วโมง (มิลลิวินาที)
        
            if (user.lastDaily && now - user.lastDaily < cooldown) {
                const remainingTime = cooldown - (now - user.lastDaily);
                const hours = Math.floor(remainingTime / (1000 * 60 * 60));
                const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        
                return interaction.reply(`⏳ คุณสามารถรับเงินประจำวันได้อีกครั้งใน **${hours} ชั่วโมง ${minutes} นาที**`, { flags: 64 });
            }
        
            // ✅ ถ้าผ่าน Cooldown สามารถรับเงินได้
            user.wallet += 500;
            user.lastDaily = now;
            await user.save();
        
            await interaction.reply(`✅ **${interaction.user.username}** คุณได้รับ **500** 🪙 จากเงินประจำวัน!`);
        }

        // ✅ ทำงานเพื่อรับเงิน
        if (interaction.commandName === 'work') {
            await interaction.deferReply();  // ✅ ป้องกัน "Unknown interaction"
        
            let user = await Economy.findOne({ userId: interaction.user.id });
            if (!user) {
                user = new Economy({ userId: interaction.user.id });
            }
        
            const now = new Date();
            const cooldown = 60 * 60 * 1000; // 1 ชั่วโมง (มิลลิวินาที)
        
            if (user.lastWork && now - user.lastWork < cooldown) {
                const remainingTime = cooldown - (now - user.lastWork);
                const minutes = Math.floor(remainingTime / (1000 * 60));
                const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        
                return interaction.editReply(`⏳ คุณสามารถทำงานได้อีกครั้งใน **${minutes} นาที ${seconds} วินาที**`);
            }
        
            // ✅ สุ่มเงินที่จะได้รับจากการทำงาน
            const earnings = Math.floor(Math.random() * (500 - 100 + 1)) + 100; // รับเงิน 100 - 500 🪙
            user.wallet += earnings;
            user.lastWork = now;
            await user.save();
        
            await interaction.editReply(`💼 **${interaction.user.username}** ทำงานและได้รับ **${earnings}** 🪙!`);
        }
        
    
        // ✅ โอนเงินให้สมาชิก
        if (interaction.commandName === 'transfer') {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
    
            if (!targetUser || targetUser.id === interaction.user.id) {
                return interaction.reply("❌ ไม่สามารถโอนเงินให้ตัวเองได้!", { flags: 64 });
            }
    
            let sender = await Economy.findOne({ userId: interaction.user.id });
            let receiver = await Economy.findOne({ userId: targetUser.id });
    
            if (!sender || sender.wallet < amount) {
                return interaction.reply("❌ คุณมีเงินไม่เพียงพอ!", { flags: 64 });
            }
    
            if (!receiver) {
                receiver = new Economy({ userId: targetUser.id });
            }
    
            sender.wallet -= amount;
            receiver.wallet += amount;
    
            await sender.save();
            await receiver.save();
    
            await interaction.reply(`✅ **${interaction.user.username}** ได้โอน **${amount}** 🪙 ให้ **${targetUser.username}**`);
        }
    
        // ✅ ฝากเงินเข้าธนาคาร
        if (interaction.commandName === 'deposit') {
            const amount = interaction.options.getInteger('amount');
            let user = await Economy.findOne({ userId: interaction.user.id });
    
            if (!user || user.wallet < amount) {
                return interaction.reply("❌ คุณมีเงินไม่พอในกระเป๋า!", { flags: 64 });
            }
    
            user.wallet -= amount;
            user.bank += amount;
            await user.save();
    
            await interaction.reply(`✅ คุณฝากเงิน **${amount}** 🪙 เข้าไปในธนาคารแล้ว!`);
        }
    
        // ✅ ถอนเงินจากธนาคาร
        if (interaction.commandName === 'withdraw') {
            const amount = interaction.options.getInteger('amount');
            let user = await Economy.findOne({ userId: interaction.user.id });
    
            if (!user || user.bank < amount) {
                return interaction.reply("❌ คุณมีเงินไม่พอในธนาคาร!", { flags: 64 });
            }
    
            user.bank -= amount;
            user.wallet += amount;
            await user.save();
    
            await interaction.reply(`✅ คุณถอนเงิน **${amount}** 🪙 ออกจากธนาคารแล้ว!`);
        }
});

client.login(process.env.TOKEN);
