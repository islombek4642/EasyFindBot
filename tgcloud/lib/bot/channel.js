import { config } from '../config.js';
import { getPublicChannelId } from './settings.js';
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

export function formatChannelPost(vacancy, lang = 'uz') {
  const salaryText = formatSalary(vacancy, lang);

  const text =
    `${t(lang, 'channel.header')}\n\n` +
    `📌 **${vacancy.title}**\n` +
    `🏢 **${t(lang, 'channel.company')}:** ${vacancy.companyName}\n` +
    `📂 **${t(lang, 'channel.category')}:** #${vacancy.category}\n` +
    `📍 **${t(lang, 'channel.region')}:** ${vacancy.region}\n` +
    `⏱️ **${t(lang, 'channel.employment_type')}:** ${vacancy.employmentType}\n` +
    `💰 **${t(lang, 'channel.salary')}:** ${salaryText}\n\n` +
    `📝 **${t(lang, 'channel.description')}:**\n${vacancy.description}\n\n` +
    (vacancy.requirements ? `🎯 **${t(lang, 'channel.requirements')}:**\n${vacancy.requirements}\n\n` : "") +
    `📞 **${t(lang, 'channel.contacts')}:** ${vacancy.contacts}\n\n` +
    `${t(lang, 'channel.footer')}`;

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

  return { text, reply_markup };
}

export async function publishToChannel(api, vacancy, lang = 'uz') {
  const channelId = await getPublicChannelId();
  if (!channelId) {
    return null;
  }

  const { text, reply_markup } = formatChannelPost(vacancy, lang);

  try {
    const sent = await api.sendMessage(channelId, text, {
      parse_mode: 'Markdown',
      reply_markup,
    });
    return sent?.message_id || null;
  } catch (err) {
    // Return null on channel permission or configuration failure
    return null;
  }
}
