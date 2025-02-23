import { SlashCommandBuilder } from 'discord.js';
import Economy from '../../models/economy.js';

export const data = new SlashCommandBuilder()
    .setName('balance')
    .setDescription('💰 เช็คยอดเงินของคุณ');

export async function execute(interaction) {
    let user = await Economy.findOne({ userId: interaction.user.id });

    if (!user) {
        user = new Economy({ userId: interaction.user.id });
        await user.save();
    }

    await interaction.reply(`💰 **${interaction.user.username}**\n🪙 Wallet: **${user.wallet}**\n🏦 Bank: **${user.bank}**`);
}