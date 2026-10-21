import { config } from '../config.js';
import { getPublicChannelId, getSetting } from './settings.js';
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

export function formatChannelPost(vacancy, lang = 'uz', options = {}) {
  const salaryText = formatSalary(vacancy, lang);
  const headerText = t(lang, 'channel.header').replace(/\*\*/g, '').trim();
  const maxCaptionLength = options.maxCaptionLength || 0;

  let desc = vacancy.description || '';
  let reqs = vacancy.requirements || '';

  // If caption limit is requested (Telegram sendPhoto caption limit is 1024 characters)
  if (maxCaptionLength > 0) {
    const fixedPartLength =
      headerText.length +
      (vacancy.title || '').length +
      (vacancy.companyName || '').length +
      (vacancy.category || '').length +
      (vacancy.region || '').length +
      salaryText.length +
      (vacancy.contacts || '').length +
      320; // estimated HTML tags & label length

    const available = Math.max(150, maxCaptionLength - fixedPartLength);
    if (desc.length + reqs.length > available) {
      if (reqs) {
        const half = Math.floor(available / 2);
        if (desc.length > half) desc = desc.slice(0, half - 3) + '...';
        if (reqs.length > half) reqs = reqs.slice(0, half - 3) + '...';
      } else {
        if (desc.length > available) desc = desc.slice(0, available - 3) + '...';
      }
    }
  }

  const text =
    `<b>${escapeHtml(headerText)}</b>\n\n` +
    `📌 <b>${escapeHtml(vacancy.title)}</b>\n` +
    `🏢 <b>${escapeHtml(t(lang, 'channel.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n` +
    `📂 <b>${escapeHtml(t(lang, 'channel.category'))}:</b> #${escapeHtml(vacancy.category)}\n` +
    `📍 <b>${escapeHtml(t(lang, 'channel.region'))}:</b> ${escapeHtml(vacancy.region)}\n` +
    `⏱️ <b>${escapeHtml(t(lang, 'channel.employment_type'))}:</b> ${escapeHtml(t(lang, 'employment_types.' + vacancy.employmentType) || vacancy.employmentType)}\n` +
    `💰 <b>${escapeHtml(t(lang, 'channel.salary'))}:</b> ${escapeHtml(salaryText)}\n\n` +
    `📝 <b>${escapeHtml(t(lang, 'channel.description'))}:</b>\n<blockquote expandable>${escapeHtml(desc)}</blockquote>\n\n` +
    (reqs ? `🎯 <b>${escapeHtml(t(lang, 'channel.requirements'))}:</b>\n<blockquote expandable>${escapeHtml(reqs)}</blockquote>\n\n` : '') +
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
  const bannerUrl = (await getSetting('channel_banner_url')) || config.channelBannerUrl || `${config.miniAppUrl}/channel_banner.jpg`;

  try {
    if (bannerUrl) {
      let caption = text;
      // Telegram photo caption limit is 1024 characters
      if (caption.length > 1024) {
        caption = formatChannelPost(vacancy, lang, { maxCaptionLength: 1020 }).text;
      }

      try {
        const sent = await api.sendPhoto({
          chat_id: channelId,
          photo: bannerUrl,
          caption,
          parse_mode: 'HTML',
          reply_markup,
        });
        return sent?.message_id || null;
      } catch (photoErr) {
        logger.warn('lib/bot/channel.js', `sendPhoto failed, falling back to sendMessage:`, photoErr);
      }
    }

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
    const rawHeader = t(lang, 'channel.closed_header') || '🚫 VAKANSIYA YOPILGAN';
    const closedHeader = `<b>${escapeHtml(rawHeader)}</b>\n<i>${escapeHtml(t(lang, 'channel.closed_sub') || '(Qabul to\'xtatildi)')}</i>`;

    const text =
      `${closedHeader}\n\n` +
      `<s>📌 <b>${escapeHtml(vacancy.title)}</b></s>\n` +
      `🏢 <b>${escapeHtml(t(lang, 'channel.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n` +
      `📂 <b>${escapeHtml(t(lang, 'channel.category'))}:</b> #${escapeHtml(vacancy.category)}\n` +
      `📍 <b>${escapeHtml(t(lang, 'channel.region'))}:</b> ${escapeHtml(vacancy.region)}\n` +
      `💰 <b>${escapeHtml(t(lang, 'channel.salary'))}:</b> ${escapeHtml(salaryText)}\n\n` +
      `🔒 <i>${escapeHtml(t(lang, 'channel.closed_note') || 'Ushbu vakansiya bo\'yicha arizalar qabuli yakunlangan.')}</i>`;

    // Try editMessageCaption first (when post was published with a photo banner), fallback to editMessageText
    try {
      await api.editMessageCaption({
        chat_id: channelId,
        message_id: vacancy.channelMessageId,
        caption: text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [],
        },
      });
      logger.info('lib/bot/channel.js', `Closed vacancy post (caption) ${vacancy.channelMessageId} in channel ${channelId}`);
      return true;
    } catch (captionErr) {
      await api.editMessageText({
        chat_id: channelId,
        message_id: vacancy.channelMessageId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [],
        },
      });
      logger.info('lib/bot/channel.js', `Closed vacancy post (text) ${vacancy.channelMessageId} in channel ${channelId}`);
      return true;
    }
  } catch (err) {
    logger.warn('lib/bot/channel.js', `Failed to edit closed channel post ${vacancy.channelMessageId}:`, err);
    return false;
  }
}
