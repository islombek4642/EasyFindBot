import { config } from '../config.js';
import { getPublicChannelId } from './settings.js';
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

export function formatChannelPost(vacancy, lang = 'uz') {
  const salaryText = formatSalary(vacancy, lang);
  const headerText = t(lang, 'channel.header').replace(/\*\*/g, '').trim();

  const text =
    `<b>${escapeHtml(headerText)}</b>\n\n` +
    `📌 <b>${escapeHtml(vacancy.title)}</b>\n` +
    `🏢 <b>${escapeHtml(t(lang, 'channel.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n` +
    `📂 <b>${escapeHtml(t(lang, 'channel.category'))}:</b> #${escapeHtml(vacancy.category)}\n` +
    `📍 <b>${escapeHtml(t(lang, 'channel.region'))}:</b> ${escapeHtml(vacancy.region)}\n` +
    `⏱️ <b>${escapeHtml(t(lang, 'channel.employment_type'))}:</b> ${escapeHtml(vacancy.employmentType)}\n` +
    `💰 <b>${escapeHtml(t(lang, 'channel.salary'))}:</b> ${escapeHtml(salaryText)}\n\n` +
    `📝 <b>${escapeHtml(t(lang, 'channel.description'))}:</b>\n<blockquote expandable>${escapeHtml(vacancy.description)}</blockquote>\n\n` +
    (vacancy.requirements ? `🎯 <b>${escapeHtml(t(lang, 'channel.requirements'))}:</b>\n<blockquote expandable>${escapeHtml(vacancy.requirements)}</blockquote>\n\n` : '') +
    `📞 <b>${escapeHtml(t(lang, 'channel.contacts'))}:</b> ${escapeHtml(vacancy.contacts)}\n\n` +
    `${escapeHtml(t(lang, 'channel.footer'))}`;

  // CRITICAL TELEGRAM RULE: In channel posts, Telegram Bot API throws BUTTON_TYPE_INVALID if web_app button is used.
  // Standard URL button with startapp deep link parameter is mandatory.
  const appUrl = `https://t.me/${config.botUsername}/app?startapp=vac_${vacancy.id}`;
  const reply_markup = {
    inline_keyboard: [
      [
        { text: t(lang, 'channel.btn_apply'), url: appUrl },
      ],
    ],
  };

  return { text, reply_markup, parse_mode: 'HTML' };
}

export async function publishToChannel(api, vacancy, lang = 'uz') {
  const channelId = await getPublicChannelId();
  if (!channelId) {
    return null;
  }

  const { text, reply_markup } = formatChannelPost(vacancy, lang);

  try {
    const sent = await api.sendMessage({
      chat_id: channelId,
      text,
      parse_mode: 'HTML',
      reply_markup,
    });
    return sent?.message_id || null;
  } catch (err) {
    logger.warn('lib/bot/channel.js', `Failed to publish to channel ${channelId}:`, err);
    return null;
  }
}

export async function closeChannelPost(api, vacancy, lang = 'uz') {
  const channelId = await getPublicChannelId();
  if (!channelId || !vacancy.channelMessageId) {
    return false;
  }

  try {
    const salaryText = formatSalary(vacancy, lang);
    const closedHeader = `🚫 <b>${escapeHtml(t(lang, 'channel.closed_header') || 'VAKANSIYA YOPILGAN')}</b>\n<i>${escapeHtml(t(lang, 'channel.closed_sub') || '(Qabul to\'xtatildi)')}</i>`;

    const text =
      `${closedHeader}\n\n` +
      `<s>📌 <b>${escapeHtml(vacancy.title)}</b></s>\n` +
      `🏢 <b>${escapeHtml(t(lang, 'channel.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n` +
      `📂 <b>${escapeHtml(t(lang, 'channel.category'))}:</b> #${escapeHtml(vacancy.category)}\n` +
      `📍 <b>${escapeHtml(t(lang, 'channel.region'))}:</b> ${escapeHtml(vacancy.region)}\n` +
      `💰 <b>${escapeHtml(t(lang, 'channel.salary'))}:</b> ${escapeHtml(salaryText)}\n\n` +
      `🔒 <i>${escapeHtml(t(lang, 'channel.closed_note') || 'Ushbu vakansiya bo\'yicha arizalar qabuli yakunlangan.')}</i>\n\n` +
      `${escapeHtml(t(lang, 'channel.footer'))}`;

    await api.editMessageText({
      chat_id: channelId,
      message_id: vacancy.channelMessageId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [],
      },
    });
    logger.info('lib/bot/channel.js', `Closed vacancy post ${vacancy.channelMessageId} in channel ${channelId}`);
    return true;
  } catch (err) {
    logger.warn('lib/bot/channel.js', `Failed to edit closed channel post ${vacancy.channelMessageId}:`, err);
    return false;
  }
}
