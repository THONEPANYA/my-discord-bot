import { SlashCommandBuilder } from 'discord.js';
import Economy from '../../models/economy.js';

export const data = new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('💸 โอนเงินให้สมาชิก')
    .addUserOption(option => option.setName('user').setDescription('ผู้รับเงิน').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงิน').setRequired(true));

export async function execute(interaction) {
    const sender = await Economy.findOne({ userId: interaction.user.id });
    const recipient = await Economy.findOne({ userId: interaction.options.getUser('user').id });

    const amount = interaction.options.getInteger('amount');

    if (!sender || sender.wallet < amount) {
        return interaction.reply('❌ คุณมีเงินไม่พอที่จะโอน!');
    }

    if (!recipient) {
        return interaction.reply('❌ ไม่พบบัญชีของผู้รับ!');
    }

    sender.wallet -= amount;
    recipient.wallet += amount;

    await sender.save();
    await recipient.save();

    await interaction.reply(`✅ โอน **${amount}** 🪙 ให้ ${interaction.options.getUser('user').username} สำเร็จ!`);
}