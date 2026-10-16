import { getModerationChannelId } from './settings.js';
import { getAllAdminTgIds } from './auth.js';
import { t } from '../locales/index.js';

function formatSalary(vacancy, lang = 'uz') {
  if (vacancy.salaryType === 'negotiable') {
    return t(lang, 'common.negotiable');
  }
  if (vacancy.salaryType === 'fixed') {
    return `${vacancy.salaryMin?.toLocaleString() || 0} ${vacancy.salaryCurrency || 'USD'}`;
  }
  return `${vacancy.salaryMin?.toLocaleString() || 0} - ${vacancy.salaryMax?.toLocaleString() || 0} ${vacancy.salaryCurrency || 'USD'}`;
}

export function buildModerationCard(vacancy, lang = 'uz') {
  const salaryText = formatSalary(vacancy, lang);

  const text =
    `${t(lang, 'moderation.card_title')}\n\n` +
    `📌 **${t(lang, 'moderation.title')}:** ${vacancy.title}\n` +
    `🏢 **${t(lang, 'moderation.company')}:** ${vacancy.companyName}\n` +
    `📂 **${t(lang, 'moderation.category')}:** ${vacancy.category}\n` +
    `📍 **${t(lang, 'moderation.region')}:** ${vacancy.region}\n` +
    `⏱️ **${t(lang, 'moderation.employment_type')}:** ${vacancy.employmentType}\n` +
    `💰 **${t(lang, 'moderation.salary')}:** ${salaryText}\n\n` +
    `📝 **${t(lang, 'moderation.description')}:**\n${vacancy.description}\n\n` +
    (vacancy.requirements ? `🎯 **${t(lang, 'moderation.requirements')}:**\n${vacancy.requirements}\n\n` : "") +
    `📞 **${t(lang, 'moderation.contacts')}:** ${vacancy.contacts}\n` +
    `👤 **${t(lang, 'moderation.employer_id')}:** \`${vacancy.employerTgId}\`\n` +
    `🆔 **${t(lang, 'moderation.vacancy_id')}:** \`${vacancy.id}\``;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: t(lang, 'moderation.btn_approve'), callback_data: `mod_approve:${vacancy.id}` },
        { text: t(lang, 'moderation.btn_reject'), callback_data: `mod_reject:${vacancy.id}` },
      ],
    ],
  };

  return { text, reply_markup };
}

export async function sendToModeration(api, vacancy, lang = 'uz') {
  const { text, reply_markup } = buildModerationCard(vacancy, lang);
  const channelId = await getModerationChannelId();

  let sent = false;
  if (channelId) {
    try {
      await api.sendMessage({
        chat_id: channelId,
        text,
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
        await api.sendMessage({
          chat_id: adminId,
          text,
          parse_mode: 'Markdown',
          reply_markup,
        });
      } catch (e) {
        // Ignore single admin delivery failure
      }
    }
  }
}
