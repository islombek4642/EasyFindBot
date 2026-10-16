import { getModerationChannelId } from './settings.js';
import { getAllAdminTgIds } from './auth.js';

function formatSalary(vacancy) {
  if (vacancy.salaryType === 'negotiable') {
    return "Kelishuv asosida";
  }
  if (vacancy.salaryType === 'fixed') {
    return `${vacancy.salaryMin?.toLocaleString() || 0} ${vacancy.salaryCurrency || 'USD'}`;
  }
  return `${vacancy.salaryMin?.toLocaleString() || 0} - ${vacancy.salaryMax?.toLocaleString() || 0} ${vacancy.salaryCurrency || 'USD'}`;
}

export function buildModerationCard(vacancy) {
  const salaryText = formatSalary(vacancy);

  const text =
    "🔍 **Yangi Vakansiya — Moderatsiya**\n\n" +
    `📌 **Sarlavha:** ${vacancy.title}\n` +
    `🏢 **Kompaniya:** ${vacancy.companyName}\n` +
    `📂 **Kategoriya:** ${vacancy.category}\n` +
    `📍 **Hudud:** ${vacancy.region}\n` +
    `⏱️ **Ish turi:** ${vacancy.employmentType}\n` +
    `💰 **Maosh:** ${salaryText}\n\n` +
    `📝 **Tavsif:**\n${vacancy.description}\n\n` +
    (vacancy.requirements ? `🎯 **Talablar:**\n${vacancy.requirements}\n\n` : "") +
    `📞 **Aloqa:** ${vacancy.contacts}\n` +
    `👤 **Ish beruvchi ID:** \`${vacancy.employerTgId}\`\n` +
    `🆔 **Vakansiya ID:** \`${vacancy.id}\``;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: "✅ Tasdiqlash", callback_data: `mod_approve:${vacancy.id}` },
        { text: "❌ Rad etish", callback_data: `mod_reject:${vacancy.id}` },
      ],
    ],
  };

  return { text, reply_markup };
}

export async function sendToModeration(api, vacancy) {
  const { text, reply_markup } = buildModerationCard(vacancy);
  const channelId = await getModerationChannelId();

  let sent = false;
  if (channelId) {
    try {
      await api.sendMessage(channelId, text, {
        parse_mode: 'Markdown',
        reply_markup,
      });
      sent = true;
    } catch (err) {
      // Channel delivery error
    }
  }

  // Fallback: If moderation channel failed or not configured, send to individual admins
  if (!sent) {
    const adminIds = await getAllAdminTgIds();
    for (const adminId of adminIds) {
      try {
        await api.sendMessage(adminId, text, {
          parse_mode: 'Markdown',
          reply_markup,
        });
      } catch (e) {
        // Ignore single admin delivery failure
      }
    }
  }
}
