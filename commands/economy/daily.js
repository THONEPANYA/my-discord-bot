import { SlashCommandBuilder } from 'discord.js';
import Economy from '../../models/economy.js';

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setDescription('💵 รับเงินประจำวัน');

export async function execute(interaction) {
    let user = await Economy.findOne({ userId: interaction.user.id });

    if (!user) {
        user = new Economy({ userId: interaction.user.id });
    }

    user.wallet += 500; // แจกเงิน 500
    await user.save();

    await interaction.reply(`🎉 **${interaction.user.username}** ได้รับ **500** 🪙!`);
}