import { 
    Client, GatewayIntentBits, PermissionsBitField, 
    SlashCommandBuilder, REST, Routes, ChannelType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle 
} from 'discord.js';
import 'dotenv/config';

import Economy from './models/economy.js';
import mongoose from 'mongoose';

    // ✅ เก็บสถานะเกม
    const activeGames = new Map();

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
        .addStringOption(option => option.setName('role').setDescription('ชื่อยศสำหรับผู้ที่ยืนยันตัวตน').setRequired(false)),

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

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 ดูอันดับผู้ที่มีเงินมากที่สุดในเซิร์ฟเวอร์'),
    
    // new SlashCommandBuilder()
    //     .setName('setmoney')
    //     .setDescription('💰 ตั้งค่าจำนวนเงินของผู้ใช้')
    //     .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ✅ ให้เฉพาะแอดมินใช้ได้
    //     .addUserOption(option => option.setName('user').setDescription('เลือกผู้ใช้').setRequired(true))
    //     .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงินที่ต้องการตั้ง').setRequired(true)),
    
    // new SlashCommandBuilder()
    //     .setName('addmoney')
    //     .setDescription('💰 เพิ่มจำนวนเงินให้ผู้ใช้')
    //     .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ✅ ให้เฉพาะแอดมินใช้ได้
    //     .addUserOption(option => option.setName('user').setDescription('เลือกผู้ใช้').setRequired(true))
    //     .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงินที่ต้องการเพิ่ม').setRequired(true)),

    // new SlashCommandBuilder()
    //     .setName('removemoney')
    //     .setDescription('💰 หักเงินจากผู้ใช้')
    //     .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ✅ ให้เฉพาะแอดมินใช้ได้
    //     .addUserOption(option => option.setName('user').setDescription('เลือกผู้ใช้').setRequired(true))
    //     .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงินที่ต้องการหัก').setRequired(true)),

    new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('🎰 เดิมพันเงินของคุณ')
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('จำนวนเงินที่ต้องการเดิมพัน')
            .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('slot')
        .setDescription('🎰 หมุนสล็อตแมชชีนเพื่อลุ้นรับเงินรางวัล')
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('จำนวนเงินที่ต้องการเดิมพัน')
            .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('🃏 เล่นเกมแบล็กแจ็กเพื่อเดิมพันเงิน')
        .addIntegerOption(option => 
            option.setName('amount')
            .setDescription('จำนวนเงินเดิมพัน')
            .setRequired(true)
        ),
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


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() && !interaction.isButton()) return;

    // ✅ คำสั่ง /help
    if (interaction.commandName === 'help') {
        await interaction.deferReply({ ephemeral: true });

        const helpMessage = `
        📖 **คำสั่งที่สามารถใช้ได้** 📖
        
        🔰 **ระบบทั่วไป**
        - \`/setup\` 📌 ตั้งค่าระบบยืนยันตัวตน
        - \`/setupstats\` 📊 ตั้งค่าห้อง Server Stats
        
        💰 **ระบบเงิน Economy**
        - \`/balance\` 💰 เช็คยอดเงินของคุณ
        - \`/daily\` 💵 รับเงินประจำวัน
        - \`/work\` 👷 ทำงานเพื่อรับเงิน (โอกาสพิเศษ & โบนัส!)
        - \`/transfer <user> <amount>\` 💸 โอนเงินให้สมาชิก
        - \`/deposit <amount>\` 🏦 ฝากเงินเข้าธนาคาร
        - \`/withdraw <amount>\` 🏦 ถอนเงินจากธนาคาร
        - \`/leaderboard\` 🏆 ดูอันดับผู้ที่มีเงินมากที่สุด

        🎰 **เกมพนัน**
        - \`/gamble <amount>\` 🎲 เดิมพันเงินของคุณ
        - \`/slot <amount>\` 🎰 หมุนสล็อตแมชชีน (Mega Jackpot & Free Spin!)

        ⚙️ **ระบบแอดมิน (สำหรับแอดมินเท่านั้น)**
        - \`/setmoney <user> <amount>\` 💰 ตั้งค่าจำนวนเงินของผู้ใช้
        - \`/addmoney <user> <amount>\` 💰 เพิ่มจำนวนเงินให้ผู้ใช้
        - \`/removemoney <user> <amount>\` 💰 หักเงินจากผู้ใช้

        ⚡ **หมายเหตุ**  
        - คำสั่งที่มี 🏦 ใช้กับระบบธนาคาร  
        - คำสั่งที่มี 🎰 ใช้กับเกม  
        - คำสั่งที่มี 🔰 ใช้กับระบบเซิร์ฟเวอร์  
        - **บอทนี้ใช้ MongoDB ในการเก็บข้อมูล Economy**  

        หากมีปัญหาการใช้งาน ติดต่อแอดมินเซิร์ฟเวอร์! 📩
        `;

        await interaction.editReply({ content: helpMessage, ephemeral: true });
    }

    // ✅ ป้องกันข้อผิดพลาด: ตรวจสอบว่า interaction มาจากเซิร์ฟเวอร์เท่านั้น
    if (!interaction.guild) {
        return interaction.reply({ content: "❌ คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น!", ephemeral: true });
    }

    // ✅ คำสั่ง /setup - ตั้งค่าระบบยืนยันตัวตน
    if (interaction.commandName === 'setup') {

        await interaction.deferReply({ ephemeral: true }); // ป้องกัน Timeout

        const subcommand = interaction.options.getSubcommand(false);
        
        if (subcommand === 'remove') {
            let verifyChannel = interaction.guild.channels.cache.find(ch => ch.name === "🔰︱ยืนยันตัวตน");
            if (!verifyChannel) {
                return interaction.reply({ content: "❌ ไม่พบห้องยืนยันตัวตน!", ephemeral: true });
            }
            await verifyChannel.delete();
            return interaction.reply({ content: "✅ ห้องยืนยันตัวตนถูกลบเรียบร้อย!", ephemeral: true });
        }

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
        let role = interaction.guild.roles.cache.find(r => r.name === roleName);
        
        if (!role) {
            try {
                role = await interaction.guild.roles.create({
                    name: roleName,
                    color: "BLUE",
                    permissions: []
                });
            } catch (error) {
                console.error("❌ ไม่สามารถสร้างยศได้:", error);
                return interaction.reply({ content: "❌ บอทไม่มีสิทธิ์สร้างยศ! โปรดตรวจสอบสิทธิ์ของบอท.", ephemeral: true });
            }
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!member) {
            return interaction.reply({ content: "❌ ไม่พบข้อมูลของคุณในเซิร์ฟเวอร์!", ephemeral: true });
        }

        if (member.roles.cache.has(role.id)) {
            return interaction.reply({ content: "✅ คุณมียศ 'สมาชิก' อยู่แล้ว!", ephemeral: true });
        }

        await member.roles.add(role).catch(err => {
            console.error("❌ ไม่สามารถให้ยศได้:", err);
            return interaction.reply({ content: "❌ บอทไม่มีสิทธิ์ให้ยศ! โปรดตรวจสอบสิทธิ์ของบอท.", ephemeral: true });
        });

        await interaction.reply({ content: `✅ คุณได้รับยศ **${role.name}** เรียบร้อยแล้ว!`, ephemeral: true });
    }

    // ✅ คำสั่ง /setupstats - ตั้งค่าห้อง Server Stats
    if (interaction.commandName === 'setupstats') {

        await interaction.deferReply(); // ป้องกัน Timeout

        const subcommand = interaction.options.getSubcommand(false);
        
        if (subcommand === 'remove') {
            let statsCategory = interaction.guild.channels.cache.find(ch => ch.name === "📊 Server Stats" && ch.type === ChannelType.GuildCategory);
            if (!statsCategory) {
                return interaction.reply({ content: "❌ ไม่พบห้องสถิติ!", ephemeral: true });
            }
            await statsCategory.delete();
            return interaction.reply({ content: "✅ ห้องสถิติถูกลบเรียบร้อย!", ephemeral: true });
        }

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


    // ✅ เช็คยอดเงิน
        if (interaction.commandName === 'balance') {
            await interaction.deferReply({ ephemeral: true });  // ✅ บอทแจ้งว่าแสดงให้เฉพาะคนใช้คำสั่ง
        
            let user = await Economy.findOne({ userId: interaction.user.id });
            if (!user) {
                user = new Economy({ userId: interaction.user.id });
                await user.save();
            }
        
            await interaction.editReply({ content: `💰 **${interaction.user.username}**\n🪙 Wallet: **${user.wallet}**\n🏦 Bank: **${user.bank}**`, ephemeral: true });
        }
    
        // ✅ รับเงินประจำวัน
        if (interaction.commandName === 'daily') {
            await interaction.deferReply({ ephemeral: true });
        
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
        
                return interaction.editReply({ content: `⏳ คุณสามารถรับเงินประจำวันได้อีกครั้งใน **${hours} ชั่วโมง ${minutes} นาที**`, ephemeral: true });
            }
        
            user.wallet += 500;
            user.lastDaily = now;
            await user.save();
        
            await interaction.editReply({ content: `✅ **${interaction.user.username}** คุณได้รับ **500** 🪙 จากเงินประจำวัน!`, ephemeral: true });
        }
        

    
        // ✅ โอนเงินให้สมาชิก
        if (interaction.commandName === 'transfer') {
            await interaction.deferReply({ ephemeral: true });
        
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
        
            if (!targetUser || targetUser.id === interaction.user.id) {
                return interaction.editReply({ content: "❌ ไม่สามารถโอนเงินให้ตัวเองได้!", ephemeral: true });
            }
        
            let sender = await Economy.findOne({ userId: interaction.user.id });
            let receiver = await Economy.findOne({ userId: targetUser.id });
        
            if (!sender || sender.wallet < amount) {
                return interaction.editReply({ content: "❌ คุณมีเงินไม่เพียงพอ!", ephemeral: true });
            }
        
            if (!receiver) {
                receiver = new Economy({ userId: targetUser.id });
            }
        
            sender.wallet -= amount;
            receiver.wallet += amount;
        
            await sender.save();
            await receiver.save();
        
            await interaction.editReply({ content: `✅ **${interaction.user.username}** ได้โอน **${amount}** 🪙 ให้ **${targetUser.username}**`, ephemeral: true });
        }
        
    
        // ✅ ฝากเงินเข้าธนาคาร
        if (interaction.commandName === 'deposit') {
            await interaction.deferReply({ ephemeral: true });
        
            const amount = interaction.options.getInteger('amount');
            let user = await Economy.findOne({ userId: interaction.user.id });
        
            if (!user || user.wallet < amount) {
                return interaction.editReply({ content: "❌ คุณมีเงินไม่พอในกระเป๋า!", ephemeral: true });
            }
        
            user.wallet -= amount;
            user.bank += amount;
            await user.save();
        
            await interaction.editReply({ content: `✅ คุณฝากเงิน **${amount}** 🪙 เข้าไปในธนาคารแล้ว!`, ephemeral: true });
        }
        
    
        // ✅ ถอนเงินจากธนาคาร
        if (interaction.commandName === 'withdraw') {
            await interaction.deferReply({ ephemeral: true });
        
            const amount = interaction.options.getInteger('amount');
            let user = await Economy.findOne({ userId: interaction.user.id });
        
            if (!user || user.bank < amount) {
                return interaction.editReply({ content: "❌ คุณมีเงินไม่พอในธนาคาร!", ephemeral: true });
            }
        
            user.bank -= amount;
            user.wallet += amount;
            await user.save();
        
            await interaction.editReply({ content: `✅ คุณถอนเงิน **${amount}** 🪙 ออกจากธนาคารแล้ว!`, ephemeral: true });
        }

        // ✅ ดูอันดับผู้ที่มีเงินมากที่สุดในเซิร์ฟเวอร์
        if (interaction.commandName === 'leaderboard') {
            try {
                await interaction.deferReply( {ephemeral: true} );  // ✅ ป้องกัน Interaction หมดอายุ
        
                // ดึงข้อมูลผู้ใช้ทั้งหมด
                const users = await Economy.find().lean(); // ✅ ใช้ `lean()` เพื่อลดเวลาโหลด
        
                if (users.length === 0) {
                    return interaction.editReply({ content: "❌ ไม่มีข้อมูลในระบบ Economy!", ephemeral: true });
                }
        
                // ✅ ใช้ JavaScript `.sort()` แทน `sort()` ใน Mongoose
                const topUsers = users.sort((a, b) => (b.wallet + b.bank) - (a.wallet + a.bank)).slice(0, 10);
        
                let leaderboardText = "🏆 **อันดับผู้ที่มีเงินมากที่สุดในเซิร์ฟเวอร์** 🏆\n\n";
                topUsers.forEach((user, index) => {
                    leaderboardText += `**#${index + 1}** <@${user.userId}> - 🪙 **${user.wallet + user.bank}**\n`;
                });
        
                await interaction.editReply({ content: leaderboardText, ephemeral: true });
            } catch (error) {
                console.error("❌ เกิดข้อผิดพลาดใน /leaderboard:", error);
                await interaction.editReply({ content: "❌ เกิดข้อผิดพลาด โปรดลองอีกครั้ง!", ephemeral: true });
            }
        }

        // ✅ ตั้งค่าจำนวนเงินของผู้ใช้
        // if (interaction.commandName === 'setmoney') {
        //     await interaction.deferReply({ ephemeral: true });
        
        //     const targetUser = interaction.options.getUser('user');
        //     const amount = interaction.options.getInteger('amount');
        
        //     if (!targetUser) {
        //         return interaction.editReply({ content: "❌ ไม่พบผู้ใช้!", ephemeral: true });
        //     }
        
        //     let user = await Economy.findOne({ userId: targetUser.id });
        //     if (!user) {
        //         user = new Economy({ userId: targetUser.id, wallet: 0, bank: 0 });
        //     }
        
        //     user.wallet = amount;
        //     await user.save();
        
        //     await interaction.editReply({ content: `✅ ตั้งค่าเงินของ **${targetUser.username}** เป็น **${amount}** 🪙 แล้ว!`, ephemeral: true });
        // }
        
        // if (interaction.commandName === 'addmoney') {
        //     await interaction.deferReply({ ephemeral: true });
        
        //     const targetUser = interaction.options.getUser('user');
        //     const amount = interaction.options.getInteger('amount');
        
        //     if (!targetUser) {
        //         return interaction.editReply({ content: "❌ ไม่พบผู้ใช้!", ephemeral: true });
        //     }
        
        //     let user = await Economy.findOne({ userId: targetUser.id });
        //     if (!user) {
        //         user = new Economy({ userId: targetUser.id, wallet: 0, bank: 0 });
        //     }
        
        //     user.wallet += amount;
        //     await user.save();
        
        //     await interaction.editReply({ content: `✅ เพิ่มเงินให้ **${targetUser.username}** จำนวน **${amount}** 🪙 แล้ว!`, ephemeral: true });
        // }
        
    // ✅ หักเงินจากผู้ใช้
    // if (interaction.commandName === 'removemoney') {
    //     await interaction.deferReply({ ephemeral: true });
    
    //     const targetUser = interaction.options.getUser('user');
    //     const amount = interaction.options.getInteger('amount');
    
    //     if (!targetUser) {
    //         return interaction.editReply({ content: "❌ ไม่พบผู้ใช้!", ephemeral: true });
    //     }
    
    //     let user = await Economy.findOne({ userId: targetUser.id });
    //     if (!user) {
    //         return interaction.editReply({ content: "❌ ผู้ใช้นี้ไม่มีบัญชีในระบบ Economy!", ephemeral: true });
    //     }
    
    //     if (user.wallet < amount) {
    //         return interaction.editReply({ content: "❌ ผู้ใช้นี้มีเงินไม่เพียงพอ!", ephemeral: true });
    //     }
    
    //     user.wallet -= amount;
    //     await user.save();
    
    //     await interaction.editReply({ content: `✅ หักเงิน **${amount}** 🪙 จาก **${targetUser.username}** แล้ว!`, ephemeral: true });
    // }
    
    // ✅ เดิมพันเงินของคุณ
    if (interaction.commandName === 'gamble') {
        await interaction.deferReply({ ephemeral: true });
    
        const amount = interaction.options.getInteger('amount');
        
        if (amount <= 0) {
            return interaction.editReply({ content: "❌ คุณต้องเดิมพันมากกว่า 0 🪙!", ephemeral: true });
        }
    
        let user = await Economy.findOne({ userId: interaction.user.id });
        if (!user || user.wallet < amount) {
            return interaction.editReply({ content: "❌ คุณมีเงินไม่พอสำหรับการเดิมพัน!", ephemeral: true });
        }
    
        // สุ่มผลลัพธ์ (50% ชนะ, 50% แพ้)
        const win = Math.random() < 0.2;  
    
        if (win) {
            user.wallet += amount;  // ได้เงินเพิ่มเท่าจำนวนที่เดิมพัน
            await interaction.editReply({ content: `🎉 **${interaction.user.username}** คุณชนะและได้รับ **${amount}** 🪙!`, ephemeral: true });
        } else {
            user.wallet -= amount;  // เสียเงินที่เดิมพัน
            await interaction.editReply({ content: `😢 **${interaction.user.username}** คุณแพ้และเสีย **${amount}** 🪙!`, ephemeral: true });
        }
    
        await user.save();
    }

    if (interaction.commandName === 'slot') {
        try {
            await interaction.deferReply({ ephemeral: false });  // ✅ ป้องกัน Unknown interaction
    
            let user = await Economy.findOne({ userId: interaction.user.id });
            const betAmount = interaction.options.getInteger('amount');
    
            if (!user || user.wallet < betAmount || betAmount < 100) {
                return interaction.editReply("❌ คุณต้องเดิมพันอย่างน้อย **100 🪙** และต้องมีเงินเพียงพอ!");
            }
    
            let freeSpins = 1;  // ✅ กำหนดค่าเริ่มต้น Free Spin = 1 (หมุนปกติ)
            let message = "";
    
            while (freeSpins > 0) {
                freeSpins--;  // ✅ ใช้ Free Spin แล้วลดค่าลง
                user.wallet -= betAmount;  // ✅ หักเงินเดิมพัน
    
                const symbols = ["🍒", "🍊", "⭐", "🍉", "🔔", "💎"];
                let slotResult = [];
    
                // 🌀 **กำหนดโอกาสชนะ**
                const odds = {
                    megaJackpot: 0.01,  // 🔥 Mega Jackpot (1%) → ได้ 50 เท่า
                    jackpot: 0.05,      // 🎰 แจ็คพอตปกติ (5%) → ได้ 10 เท่า
                    twoMatch: 0.35,     // 🎖️ ได้ 2 ตัวเหมือนกัน (35%) → ได้ 2 เท่า
                    freeSpin: 0.10,     // 🎟️ Free Spin (10%) → ได้หมุนฟรี
                    lose: 0.60          // 😢 แพ้ (60%) → เสียเงินเดิมพัน
                };
    
                let winType = "lose";
                let megaJackpotRoll = Math.random();
                let jackpotRoll = Math.random();
                let twoMatchRoll = Math.random();
                let freeSpinRoll = Math.random();
    
                if (megaJackpotRoll < odds.megaJackpot) {
                    winType = "megaJackpot";
                } else if (jackpotRoll < odds.jackpot) {
                    winType = "jackpot";
                } else if (twoMatchRoll < odds.twoMatch) {
                    winType = "twoMatch";
                }
    
                // 🌀 **สร้างผลลัพธ์ที่เหมาะสมกับโอกาสที่สุ่มได้**
                if (winType === "megaJackpot") {
                    slotResult = ["💎", "💎", "💎"];
                } else if (winType === "jackpot") {
                    let luckySymbol = symbols[Math.floor(Math.random() * symbols.length)];
                    slotResult = [luckySymbol, luckySymbol, luckySymbol];
                } else if (winType === "twoMatch") {
                    let luckySymbol = symbols[Math.floor(Math.random() * symbols.length)];
                    let otherSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                    slotResult = Math.random() < 0.5 ? [luckySymbol, luckySymbol, otherSymbol] : [luckySymbol, otherSymbol, luckySymbol];
                } else {
                    slotResult = [
                        symbols[Math.floor(Math.random() * symbols.length)],
                        symbols[Math.floor(Math.random() * symbols.length)],
                        symbols[Math.floor(Math.random() * symbols.length)]
                    ];
                }
    
                // 🎯 คำนวณรางวัล (สเกลตามเงินเดิมพัน)
                let winAmount = 0;
    
                if (winType === "megaJackpot") {
                    winAmount = betAmount * 50;
                    message = `🎰 **MEGA JACKPOT!!!** 🎰\n💰 คุณชนะ **${winAmount} 🪙**! 🎆🔥`;
                } else if (winType === "jackpot") {
                    winAmount = betAmount * 10;
                    message = `🎰 **JACKPOT!** 🎰\n💎 คุณชนะ **${winAmount} 🪙**! 🎉`;
                } else if (winType === "twoMatch") {
                    winAmount = betAmount * 2;
                    message = `✨ คุณชนะ **${winAmount} 🪙**!`;
                } else {
                    message = `😢 คุณแพ้และเสีย ${betAmount} 🪙... (ลองใหม่อีกครั้ง!)`;
                }
    
                user.wallet += winAmount;
    
                // 🎟️ **Free Spin Bonus**
                if (freeSpinRoll < odds.freeSpin) {
                    freeSpins++;  // ✅ เพิ่ม Free Spin ได้ 1 ครั้ง
                    message += `\n🎟️ **คุณได้ Free Spin! หมุนฟรีอีก 1 ครั้ง!**`;
                }
    
                await user.save();
    
                // 🎰 **อนิเมชันสล็อตหมุน**
                let slotAnimation = [
                    `🎰 | ⏳ ⏳ ⏳`,
                    `🎰 | ${symbols[Math.floor(Math.random() * symbols.length)]} ⏳ ⏳`,
                    `🎰 | ${symbols[Math.floor(Math.random() * symbols.length)]} ${symbols[Math.floor(Math.random() * symbols.length)]} ⏳`,
                    `🎰 | ${slotResult[0]} ${slotResult[1]} ${slotResult[2]}`
                ];
    
                for (let i = 0; i < slotAnimation.length; i++) {
                    await interaction.editReply(slotAnimation[i]);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // ⏳ หน่วงเวลาให้ดูเหมือนหมุนจริงๆ
                }
    
                // 🎯 **แสดงผลลัพธ์สุดท้าย**
                await interaction.editReply(`${slotAnimation[slotAnimation.length - 1]}\n${message}`);
            }
        } catch (error) {
            console.error("❌ เกิดข้อผิดพลาดใน /slot:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply("❌ เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง!");
            } else {
                await interaction.reply("❌ เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง!");
            }
        }
    }
        
    
    // ✅ ทำงานเพื่อรับเงิน
    // ✅ ระบบทำงาน /work
    if (interaction.commandName === 'work') {
        await interaction.deferReply({ ephemeral: true });  // ✅ ทำให้ข้อความเห็นแค่คนใช้คำสั่ง
    
        let user = await Economy.findOne({ userId: interaction.user.id });
        if (!user) {
            user = new Economy({ userId: interaction.user.id });
        }
    
        const now = new Date();
        const cooldown = 15 * 60 * 1000; // 15 นาที (มิลลิวินาที)
    
        if (user.lastWork && now - user.lastWork < cooldown) {
            const remainingTime = cooldown - (now - user.lastWork);
            const minutes = Math.floor(remainingTime / (1000 * 15));
            const seconds = Math.floor((remainingTime % (1000 * 15)) / 1000);
    
            return interaction.editReply(`⏳ คุณสามารถทำงานได้อีกครั้งใน **${minutes} นาที ${seconds} วินาที**`);
        }
    
        // ✅ โอกาส 20% ที่จะล้มเหลว
        const failChance = Math.random();
        if (failChance < 0.2) {
            return interaction.editReply(`❌ คุณทำงานพลาดครั้งนี้! ลองใหม่อีกครั้งในภายหลัง.`);
        }
    
        // ✅ คำนวณเงินที่ได้รับ
        let earnings = Math.floor(Math.random() * (500 - 100 + 1)) + 100; // 100 - 500 🪙
    
        // ✅ โอกาส 10% ได้โบนัสพิเศษ
        const bonusChance = Math.random();
        let bonusText = "";
        if (bonusChance < 0.1) {
            earnings *= 2;  // ได้เงิน 2 เท่า
            bonusText = "🎉 **โบนัสพิเศษ! ได้เงินเพิ่ม 2 เท่า!** 🎉\n";
        }
    
        user.wallet += earnings;
        user.lastWork = now;
        await user.save();
    
        await interaction.editReply(`${bonusText}💼 **${interaction.user.username}** ทำงานและได้รับ **${earnings}** 🪙!`);
    }

    // ✅ blackjack
    if (interaction.commandName === 'blackjack') {
        try {
            await interaction.deferReply();

            let user = await Economy.findOne({ userId: interaction.user.id });
            const betAmount = interaction.options.getInteger('amount');

            if (!user || user.wallet < betAmount || betAmount < 100) {
                return interaction.editReply("❌ คุณต้องเดิมพันอย่างน้อย **100 🪙** และต้องมีเงินเพียงพอ!");
            }

            user.wallet -= betAmount; // หักเงินเดิมพันออกก่อนเล่น

            const drawCard = () => Math.floor(Math.random() * 11) + 1; // ไพ่ 1-11 แต้ม
            let playerCards = [drawCard(), drawCard()];
            let botCards = [drawCard(), drawCard()];

            let playerTotal = playerCards.reduce((a, b) => a + b, 0);
            let botTotal = botCards.reduce((a, b) => a + b, 0);

            const gameMessage = () => 
                `🃏 **Blackjack เริ่มเกม** 🎲  
                \n👨‍💼 **คุณ:** ${playerCards.join(", ")} (**${playerTotal} แต้ม**)  
                🤖 **บอท:** ${botCards[0]}, ❓ (**? แต้ม**)\n\n` +
                "**🛑 หยุด หรือ 🎴 จั่วไพ่?**";

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`blackjack_hit_${interaction.user.id}`)
                    .setLabel("🎴 จั่วไพ่")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`blackjack_stand_${interaction.user.id}`)
                    .setLabel("🛑 หยุด")
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.editReply({ content: gameMessage(), components: [row] });

            // ✅ เก็บสถานะเกมของผู้เล่น
            activeGames.set(interaction.user.id, { 
                user, betAmount, playerCards, botCards, playerTotal, botTotal 
            });

        } catch (error) {
            console.error("❌ เกิดข้อผิดพลาดใน Blackjack:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "❌ เกิดข้อผิดพลาด โปรดลองอีกครั้ง!", ephemeral: true });
            }
        }
    }

    // ✅ ระบบตอบสนองปุ่ม
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const userId = interaction.customId.split("_")[2]; // ดึง userId จากปุ่ม
        if (!activeGames.has(userId)) {
            return interaction.reply({ content: "❌ เกมของคุณหมดอายุ หรือถูกรีเซ็ต! ลองใช้ `/blackjack` ใหม่อีกครั้ง", ephemeral: true });
        }

        let game = activeGames.get(userId);

        try {
            if (interaction.customId.startsWith("blackjack_hit")) {
                let newCard = Math.floor(Math.random() * 11) + 1;
                game.playerCards.push(newCard);
                game.playerTotal = game.playerCards.reduce((a, b) => a + b, 0);

                if (game.playerTotal > 21) {
                    activeGames.delete(userId);
                    return interaction.update({
                        content: `💥 **คุณแพ้!** (แต้มเกิน 21) ❌\nเสีย **${game.betAmount} 🪙**`,
                        components: []
                    });
                }

                return interaction.update({
                    content: `🃏 **คุณจั่วได้ ${newCard}!**\nแต้มตอนนี้: **${game.playerTotal} แต้ม**\n\n✅ ใช้ปุ่ม **"จั่วไพ่"** เพื่อจั่วเพิ่ม หรือ **"หยุด"** เพื่อหยุด!`,
                    components: interaction.message.components
                });
            }

            if (interaction.customId.startsWith("blackjack_stand")) {
                await interaction.deferUpdate(); // ✅ ป้องกัน Interaction Error

                while (game.botTotal < 17) {
                    let newCard = Math.floor(Math.random() * 11) + 1;
                    game.botCards.push(newCard);
                    game.botTotal = game.botCards.reduce((a, b) => a + b, 0);
                }

                let resultMessage = "";
                let winAmount = 0;

                if (game.botTotal > 21 || game.playerTotal > game.botTotal) {
                    winAmount = game.betAmount * 2;
                    game.user.wallet += winAmount;
                    resultMessage = `🏆 **คุณชนะ!** 🎉 ได้รับ **${winAmount} 🪙**`;
                } else if (game.playerTotal === game.botTotal) {
                    game.user.wallet += game.betAmount;
                    resultMessage = `🤝 **เสมอ!** เงินเดิมพันถูกคืน`;
                } else {
                    resultMessage = `😢 **คุณแพ้** และเสีย **${game.betAmount} 🪙**`;
                }

                await game.user.save();
                activeGames.delete(userId);

                return interaction.editReply({
                    content: `🃏 **Blackjack จบเกม** 🎲  
                    \n👨‍💼 **คุณ:** ${game.playerCards.join(", ")} (**${game.playerTotal} แต้ม**)  
                    🤖 **บอท:** ${game.botCards.join(", ")} (**${game.botTotal} แต้ม**)\n\n` +
                    resultMessage,
                    components: []
                });
            }
        } catch (error) {
            console.error("❌ เกิดข้อผิดพลาดระหว่างเล่น Blackjack:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "❌ เกิดข้อผิดพลาด โปรดลองอีกครั้ง!", ephemeral: true });
            }
        }
    });



    
        
        
});

client.login(process.env.TOKEN);
