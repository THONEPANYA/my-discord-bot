import { 
    Client, GatewayIntentBits, PermissionsBitField, 
    SlashCommandBuilder, REST, Routes, ChannelType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle 
} from 'discord.js';
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
        .setDescription('📊 ตั้งค่าห้อง Server Stats')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
];

const statsChannels = {}; // เก็บ Channel ID ของห้องสถิติ

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

// ✅ จัดการ Slash Commands และปุ่มกด
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
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
        
            await interaction.reply({ content: "✅ ตั้งค่าระบบยืนยันตัวตนเรียบร้อย!", ephemeral: true });
        }

        if (commandName === 'setupstats') {
            await interaction.reply("⏳ กำลังตั้งค่าห้องสถิติ...");
        
            // หา Category ที่มีอยู่ก่อน
            let statsCategory = interaction.guild.channels.cache
                .filter(ch => ch.type === ChannelType.GuildCategory)
                .sort((a, b) => a.position - b.position) // เรียงลำดับจากบนสุดลงล่างสุด
                .first();
        
            if (!statsCategory) {
                statsCategory = await interaction.guild.channels.create({
                    name: "📊 Server Stats",
                    type: ChannelType.GuildCategory,
                    position: 0 // ✅ ตั้งค่าให้เป็นอันดับแรก
                });
            } else {
                await statsCategory.setPosition(0); // ✅ ย้ายหมวดหมู่ไปอยู่ข้างบนสุด
            }
        
            const stats = {
                members: `👥 สมาชิก: ${interaction.guild.memberCount}`,
                textChannels: `💬 ข้อความ: ${interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size}`,
                voiceChannels: `🔊 ห้องเสียง: ${interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size}`,
                roles: `🎭 บทบาท: ${interaction.guild.roles.cache.size}`
            };
        
            for (const [key, name] of Object.entries(stats)) {
                let channel = interaction.guild.channels.cache.find(ch => ch.name.startsWith(name.split(":")[0]) && ch.type === ChannelType.GuildVoice);
                if (!channel) {
                    channel = await interaction.guild.channels.create({
                        name,
                        type: ChannelType.GuildVoice,
                        parent: statsCategory.id,
                        position: 0, // ✅ ตั้งค่าห้องให้ไปอยู่ด้านบนของหมวดหมู่
                        permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
                    });
                }
                statsChannels[key] = channel.id;
            }
        
            await interaction.editReply("✅ **ตั้งค่าห้อง Server Stats สำเร็จ!**");
        }
    }

    if (interaction.isButton()) {
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
            const roleName = "สมาชิก"; // แก้ไขชื่อยศให้ถูกต้อง
            const role = interaction.guild.roles.cache.find(r => r.name === roleName);
            
            if (!role) {
                return await interaction.reply({ content: "❌ ไม่พบยศที่ต้องการ!", ephemeral: true });
            }
        
            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (!member) {
                return await interaction.reply({ content: "❌ ไม่พบผู้ใช้ในเซิร์ฟเวอร์!", ephemeral: true });
            }
        
            await interaction.deferReply({ ephemeral: true }); // ✅ ป้องกันการส่งคำตอบซ้ำ
        
            await member.roles.add(role);
        
            await interaction.editReply({ content: `✅ ได้รับยศ **${role.name}** เรียบร้อย!` }); // ✅ ใช้ editReply แทน reply
        }
    }
});

// ✅ อัปเดตสถิติแบบเรียลไทม์
client.on("guildMemberAdd", async (member) => updateStats(member.guild));
client.on("guildMemberRemove", async (member) => updateStats(member.guild));

async function updateStats(guild) {
    if (!statsChannels.members) return;
    const membersChannel = guild.channels.cache.get(statsChannels.members);
    const textChannelsChannel = guild.channels.cache.get(statsChannels.textChannels);
    const voiceChannelsChannel = guild.channels.cache.get(statsChannels.voiceChannels);
    const rolesChannel = guild.channels.cache.get(statsChannels.roles);

    if (membersChannel) await membersChannel.setName(`👥 สมาชิก: ${guild.memberCount}`);
    if (textChannelsChannel) await textChannelsChannel.setName(`💬 ข้อความ: ${guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size}`);
    if (voiceChannelsChannel) await voiceChannelsChannel.setName(`🔊 ห้องเสียง: ${guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size}`);
    if (rolesChannel) await rolesChannel.setName(`🎭 บทบาท: ${guild.roles.cache.size}`);
}

// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);