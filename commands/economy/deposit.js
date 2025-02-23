import { SlashCommandBuilder } from 'discord.js';
import Economy from '../../models/economy.js';

export const data = new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('🏦 ฝากเงินเข้าธนาคาร')
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

    if (user.wallet < amount) {
        return interaction.reply('❌ คุณมีเงินในกระเป๋าไม่พอที่จะฝาก!');
    }

    user.wallet -= amount;
    user.bank += amount;

    await user.save();
    await interaction.reply(`✅ คุณได้ฝาก **${amount}** 🪙 เข้าธนาคารแล้ว!`);
}