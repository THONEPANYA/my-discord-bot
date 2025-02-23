import { SlashCommandBuilder } from 'discord.js';
import Economy from '../../models/economy.js';

export const data = new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('🏦 ถอนเงินจากธนาคาร')
    .addIntegerOption(option => option.setName('amount').setDescription('จำนวนเงิน').setRequired(true));

export async function execute(interaction) {
    let user = await Economy.findOne({ userId: interaction.user.id });

    if (!user) {
        user = new Economy({ userId: interaction.user.id });
        await user.save();
    }

    const amount = interaction.options.getInteger('amount');

    if (amount <= 0) {
        return interaction.reply('❌ คุณต้องระบุจำนวนเงินที่มากกว่า 0!');
    }

    if (user.bank < amount) {
        return interaction.reply('❌ คุณมีเงินในธนาคารไม่พอที่จะถอน!');
    }

    user.bank -= amount;
    user.wallet += amount;

    await user.save();
    await interaction.reply(`✅ คุณได้ถอน **${amount}** 🪙 จากธนาคารแล้ว!`);
}