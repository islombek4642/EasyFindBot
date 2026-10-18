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
    `📝 <b>${escapeHtml(t(lang, 'channel.description'))}:</b>\n${escapeHtml(vacancy.description)}\n\n` +
    (vacancy.requirements ? `🎯 <b>${escapeHtml(t(lang, 'channel.requirements'))}:</b>\n${escapeHtml(vacancy.requirements)}\n\n` : '') +
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
