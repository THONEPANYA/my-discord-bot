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
            } else {
                // ลบข้อความเก่าในห้องยืนยันตัวตน
                const messages = await verifyChannel.messages.fetch();
                messages.forEach(msg => msg.delete());
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
    }

    if (interaction.isButton()) {
        console.log(`🔹 ปุ่มกดทำงาน: ${interaction.customId}`);

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
            const roleName = "สมาชิก"; // เปลี่ยนเป็นชื่อยศที่ต้องการให้
            const role = interaction.guild.roles.cache.find(r => r.name === roleName);
            
            if (!role) {
                return await interaction.reply({ content: "❌ ไม่พบยศที่ต้องการ!", ephemeral: true });
            }

            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (!member) {
                return await interaction.reply({ content: "❌ ไม่พบผู้ใช้ในเซิร์ฟเวอร์!", ephemeral: true });
            }

            await member.roles.add(role);
            await interaction.reply({ content: `✅ ได้รับยศ **${role.name}** เรียบร้อย!`, ephemeral: true });
        }
    }
});

// ✅ ล็อกอินบอท
client.login(process.env.TOKEN);