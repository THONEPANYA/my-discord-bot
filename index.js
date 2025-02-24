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

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 ดูอันดับผู้ที่มีเงินมากที่สุดในเซิร์ฟเวอร์'),
    
    new SlashCommandBuilder()
        .setName('setmoney')
        .setDescription('💰 ตั้งค่าจำนวนเงินของผู้ใช้')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ✅ ให้เฉพาะแอดมินใช้ได้
        .addUserOption(option => option.setName('user').setDescription('เลือกผู้ใช้').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงินที่ต้องการตั้ง').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('💰 เพิ่มจำนวนเงินให้ผู้ใช้')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ✅ ให้เฉพาะแอดมินใช้ได้
        .addUserOption(option => option.setName('user').setDescription('เลือกผู้ใช้').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงินที่ต้องการเพิ่ม').setRequired(true)),

    new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('💰 หักเงินจากผู้ใช้')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ✅ ให้เฉพาะแอดมินใช้ได้
        .addUserOption(option => option.setName('user').setDescription('เลือกผู้ใช้').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงินที่ต้องการหัก').setRequired(true)),

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
                await interaction.deferReply();  // ✅ ป้องกัน Interaction หมดอายุ
        
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
        if (interaction.commandName === 'setmoney') {
            await interaction.deferReply({ ephemeral: true });
        
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
        
            if (!targetUser) {
                return interaction.editReply({ content: "❌ ไม่พบผู้ใช้!", ephemeral: true });
            }
        
            let user = await Economy.findOne({ userId: targetUser.id });
            if (!user) {
                user = new Economy({ userId: targetUser.id, wallet: 0, bank: 0 });
            }
        
            user.wallet = amount;
            await user.save();
        
            await interaction.editReply({ content: `✅ ตั้งค่าเงินของ **${targetUser.username}** เป็น **${amount}** 🪙 แล้ว!`, ephemeral: true });
        }
        
        if (interaction.commandName === 'addmoney') {
            await interaction.deferReply({ ephemeral: true });
        
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
        
            if (!targetUser) {
                return interaction.editReply({ content: "❌ ไม่พบผู้ใช้!", ephemeral: true });
            }
        
            let user = await Economy.findOne({ userId: targetUser.id });
            if (!user) {
                user = new Economy({ userId: targetUser.id, wallet: 0, bank: 0 });
            }
        
            user.wallet += amount;
            await user.save();
        
            await interaction.editReply({ content: `✅ เพิ่มเงินให้ **${targetUser.username}** จำนวน **${amount}** 🪙 แล้ว!`, ephemeral: true });
        }
        
    // ✅ หักเงินจากผู้ใช้
    if (interaction.commandName === 'removemoney') {
        await interaction.deferReply({ ephemeral: true });
    
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
    
        if (!targetUser) {
            return interaction.editReply({ content: "❌ ไม่พบผู้ใช้!", ephemeral: true });
        }
    
        let user = await Economy.findOne({ userId: targetUser.id });
        if (!user) {
            return interaction.editReply({ content: "❌ ผู้ใช้นี้ไม่มีบัญชีในระบบ Economy!", ephemeral: true });
        }
    
        if (user.wallet < amount) {
            return interaction.editReply({ content: "❌ ผู้ใช้นี้มีเงินไม่เพียงพอ!", ephemeral: true });
        }
    
        user.wallet -= amount;
        await user.save();
    
        await interaction.editReply({ content: `✅ หักเงิน **${amount}** 🪙 จาก **${targetUser.username}** แล้ว!`, ephemeral: true });
    }
    
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

    // ✅ Slot Machine
    if (interaction.commandName === 'slot') {
        await interaction.deferReply({ ephemeral: true });
    
        const amount = interaction.options.getInteger('amount');
        const fruits = ["🍎", "🍊", "🍇", "🍉", "🍒", "⭐"];  // 🔹 เพิ่ม "⭐" เป็นโบนัสพิเศษ
    
        if (amount <= 0) {
            return interaction.editReply({ content: "❌ คุณต้องเดิมพันมากกว่า 0 🪙!", ephemeral: true });
        }
    
        let user = await Economy.findOne({ userId: interaction.user.id });
        if (!user || user.wallet < amount) {
            return interaction.editReply({ content: "❌ คุณมีเงินไม่พอสำหรับการเดิมพัน!", ephemeral: true });
        }
    
        // 🎰 เพิ่มแอนิเมชันแสดงว่ากำลังหมุนสล็อต
        await interaction.editReply({ content: "🎰 กำลังหมุนสล็อต... 🎵🎶", ephemeral: true });
    
        setTimeout(async () => {
            // 🎰 สุ่มผลลัพธ์สล็อต 3 ช่อง
            const slot1 = fruits[Math.floor(Math.random() * fruits.length)];
            const slot2 = fruits[Math.floor(Math.random() * fruits.length)];
            const slot3 = fruits[Math.floor(Math.random() * fruits.length)];
    
            let resultMessage = `🎰 | **${slot1} | ${slot2} | ${slot3}** |\n`;
    
            let multiplier = 1;
            if (slot1 === slot2 && slot2 === slot3) {
                // ชนะ 5 เท่าถ้าทั้ง 3 ช่องเหมือนกัน
                multiplier = slot1 === "⭐" ? 10 : 5; // ⭐ โบนัสคูณ 10
                user.wallet += amount * multiplier;
                resultMessage += `🎉 แจ็คพอต! คุณชนะ **${amount * multiplier}** 🪙! 🎆✨`;
            } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
                // คืนเงินเดิมพัน
                user.wallet += amount;
                resultMessage += `😊 คุณได้คืนเงิน **${amount}** 🪙! 🎵🎶`;
            } else {
                // เสียเงินเดิมพัน
                user.wallet -= amount;
                resultMessage += `😢 คุณแพ้และเสีย **${amount}** 🪙! 🎭`;
            }
    
            await user.save();
            await interaction.editReply({ content: resultMessage, ephemeral: true });
        }, 3000); // ⏳ ทำให้รอนิดนึงก่อนแสดงผล
    }
    
        
        
});

client.login(process.env.TOKEN);
