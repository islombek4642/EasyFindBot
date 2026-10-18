import { getModerationChannelId } from './settings.js';
import { getAllAdminTgIds } from './auth.js';
import { t } from '../locales/index.js';
import { escapeHtml } from './html.js';
import { logger } from '../logger.js';

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
  const cardTitle = t(lang, 'moderation.card_title').replace(/\*\*/g, '').trim();

  const text =
    `<b>${escapeHtml(cardTitle)}</b>\n\n` +
    `📌 <b>${escapeHtml(t(lang, 'moderation.title'))}:</b> ${escapeHtml(vacancy.title)}\n` +
    `🏢 <b>${escapeHtml(t(lang, 'moderation.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n` +
    `📂 <b>${escapeHtml(t(lang, 'moderation.category'))}:</b> ${escapeHtml(vacancy.category)}\n` +
    `📍 <b>${escapeHtml(t(lang, 'moderation.region'))}:</b> ${escapeHtml(vacancy.region)}\n` +
    `⏱️ <b>${escapeHtml(t(lang, 'moderation.employment_type'))}:</b> ${escapeHtml(vacancy.employmentType)}\n` +
    `💰 <b>${escapeHtml(t(lang, 'moderation.salary'))}:</b> ${escapeHtml(salaryText)}\n\n` +
    `📝 <b>${escapeHtml(t(lang, 'moderation.description'))}:</b>\n${escapeHtml(vacancy.description)}\n\n` +
    (vacancy.requirements ? `🎯 <b>${escapeHtml(t(lang, 'moderation.requirements'))}:</b>\n${escapeHtml(vacancy.requirements)}\n\n` : '') +
    `📞 <b>${escapeHtml(t(lang, 'moderation.contacts'))}:</b> ${escapeHtml(vacancy.contacts)}\n` +
    `👤 <b>${escapeHtml(t(lang, 'moderation.employer_id'))}:</b> <code>${escapeHtml(vacancy.employerTgId)}</code>\n` +
    `🆔 <b>${escapeHtml(t(lang, 'moderation.vacancy_id'))}:</b> <code>${escapeHtml(vacancy.id)}</code>`;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: t(lang, 'moderation.btn_approve'), callback_data: `mod_approve:${vacancy.id}` },
        { text: t(lang, 'moderation.btn_reject'), callback_data: `mod_reject:${vacancy.id}` },
      ],
    ],
  };

  return { text, reply_markup, parse_mode: 'HTML' };
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
        parse_mode: 'HTML',
        reply_markup,
      });
      sent = true;
      logger.info('lib/bot/moderator.js', `Sent vacancy ${vacancy.id} to moderation channel ${channelId}`);
    } catch (err) {
      logger.warn('lib/bot/moderator.js', `Failed to send to moderation channel ${channelId}:`, err);
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
          parse_mode: 'HTML',
          reply_markup,
        });
        logger.info('lib/bot/moderator.js', `Sent vacancy ${vacancy.id} to admin ${adminId}`);
      } catch (e) {
        logger.warn('lib/bot/moderator.js', `Failed to send to admin ${adminId}:`, e);
      }
    }
  }
}
