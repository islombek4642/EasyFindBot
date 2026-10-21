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

export function buildModerationCard(vacancy, lang = 'uz', queueMeta = null) {
  const salaryText = formatSalary(vacancy, lang);
  const cardTitle = t(lang, 'moderation.card_title').replace(/\*\*/g, '').trim();

  const titleHeader = queueMeta
    ? `<b>${escapeHtml(t(lang, 'admin.queue_title', { current: queueMeta.index + 1, total: queueMeta.total }))}</b>\n\n`
    : `<b>${escapeHtml(cardTitle)}</b>\n\n`;

  const text =
    titleHeader +
    `📌 <b>${escapeHtml(t(lang, 'moderation.title'))}:</b> ${escapeHtml(vacancy.title)}\n` +
    `🏢 <b>${escapeHtml(t(lang, 'moderation.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n` +
    `📂 <b>${escapeHtml(t(lang, 'moderation.category'))}:</b> ${escapeHtml(vacancy.category)}\n` +
    `📍 <b>${escapeHtml(t(lang, 'moderation.region'))}:</b> ${escapeHtml(vacancy.region)}\n` +
    `⏱️ <b>${escapeHtml(t(lang, 'moderation.employment_type'))}:</b> ${escapeHtml(t(lang, 'employment_types.' + vacancy.employmentType) || vacancy.employmentType)}\n` +
    `💰 <b>${escapeHtml(t(lang, 'moderation.salary'))}:</b> ${escapeHtml(salaryText)}\n\n` +
    `📝 <b>${escapeHtml(t(lang, 'moderation.description'))}:</b>\n<blockquote expandable>${escapeHtml(vacancy.description)}</blockquote>\n\n` +
    (vacancy.requirements ? `🎯 <b>${escapeHtml(t(lang, 'moderation.requirements'))}:</b>\n<blockquote expandable>${escapeHtml(vacancy.requirements)}</blockquote>\n\n` : '') +
    `📞 <b>${escapeHtml(t(lang, 'moderation.contacts'))}:</b> ${escapeHtml(vacancy.contacts)}\n` +
    `👤 <b>${escapeHtml(t(lang, 'moderation.employer_id'))}:</b> <code>${escapeHtml(vacancy.employerTgId)}</code>\n` +
    `🆔 <b>${escapeHtml(t(lang, 'moderation.vacancy_id'))}:</b> <code>${escapeHtml(vacancy.id)}</code>`;

  const inline_keyboard = [];

  if (queueMeta) {
    // Admin private chat queue mode
    inline_keyboard.push([
      { text: t(lang, 'moderation.btn_approve'), callback_data: `mod_approve:${vacancy.id}:${queueMeta.index}` },
      { text: t(lang, 'moderation.btn_reject'), callback_data: `mod_reject_prompt:${vacancy.id}:${queueMeta.index}` },
    ]);

    if (queueMeta.total > 1) {
      const navRow = [];
      if (queueMeta.index > 0) {
        navRow.push({ text: t(lang, 'admin.btn_prev'), callback_data: `admin:queue:${queueMeta.index - 1}` });
      }
      navRow.push({ text: `${queueMeta.index + 1} / ${queueMeta.total}`, callback_data: 'noop' });
      if (queueMeta.index < queueMeta.total - 1) {
        navRow.push({ text: t(lang, 'admin.btn_next'), callback_data: `admin:queue:${queueMeta.index + 1}` });
      }
      inline_keyboard.push(navRow);
    }

    inline_keyboard.push([
      { text: t(lang, 'commands.back'), callback_data: 'admin:menu' },
    ]);
  } else {
    // Channel or broadcast notification mode
    inline_keyboard.push([
      { text: t(lang, 'moderation.btn_approve'), callback_data: `mod_approve:${vacancy.id}` },
      { text: t(lang, 'moderation.btn_reject'), callback_data: `mod_reject:${vacancy.id}` },
    ]);
  }

  const reply_markup = { inline_keyboard };

  return { text, reply_markup, parse_mode: 'HTML' };
}

export function buildRejectReasonsMenu(vacancyId, queueContext = 0, lang = 'uz') {
  const text = t(lang, 'moderation.reject_choose_reason');
  const inline_keyboard = [
    [{ text: t(lang, 'moderation.reason_incomplete'), callback_data: `mod_reject_reason:${vacancyId}:${queueContext}:incomplete` }],
    [{ text: t(lang, 'moderation.reason_contacts'), callback_data: `mod_reject_reason:${vacancyId}:${queueContext}:contacts` }],
    [{ text: t(lang, 'moderation.reason_rules'), callback_data: `mod_reject_reason:${vacancyId}:${queueContext}:rules` }],
  ];

  if (queueContext !== 'channel') {
    inline_keyboard.push([
      { text: t(lang, 'moderation.reason_custom'), callback_data: `mod_reject_custom:${vacancyId}:${queueContext}` },
    ]);
    inline_keyboard.push([
      { text: t(lang, 'admin.btn_cancel'), callback_data: `admin:queue:${queueContext}` },
    ]);
  } else {
    inline_keyboard.push([
      { text: t(lang, 'admin.btn_cancel'), callback_data: `mod_cancel_reject:${vacancyId}` },
    ]);
  }

  return { text, reply_markup: { inline_keyboard }, parse_mode: 'HTML' };
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
