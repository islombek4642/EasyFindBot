import { config } from '../config.js';
import { getPublicChannelId } from './settings.js';

function formatSalary(vacancy) {
  if (vacancy.salaryType === 'negotiable') {
    return "Kelishuv asosida";
  }
  if (vacancy.salaryType === 'fixed') {
    return `${vacancy.salaryMin?.toLocaleString() || 0} ${vacancy.salaryCurrency || 'USD'}`;
  }
  return `${vacancy.salaryMin?.toLocaleString() || 0} - ${vacancy.salaryMax?.toLocaleString() || 0} ${vacancy.salaryCurrency || 'USD'}`;
}

export function formatChannelPost(vacancy) {
  const salaryText = formatSalary(vacancy);

  const text =
    "📢 **YANGI VAKANSIYA!**\n\n" +
    `📌 **${vacancy.title}**\n` +
    `🏢 **Kompaniya:** ${vacancy.companyName}\n` +
    `📂 **Soha:** #${vacancy.category}\n` +
    `📍 **Hudud:** ${vacancy.region}\n` +
    `⏱️ **Ish turi:** ${vacancy.employmentType}\n` +
    `💰 **Maosh:** ${salaryText}\n\n` +
    `📝 **Tavsif:**\n${vacancy.description}\n\n` +
    (vacancy.requirements ? `🎯 **Talablar:**\n${vacancy.requirements}\n\n` : "") +
    `📞 **Aloqa:** ${vacancy.contacts}\n\n` +
    "Ariza topshirish va batafsil ma'lumot olish uchun quyidagi tugmani bosing:";

  // CRITICAL TELEGRAM RULE: In channel posts, Telegram Bot API throws BUTTON_TYPE_INVALID if web_app button is used.
  // Standard URL button with startapp deep link parameter is mandatory.
  const appUrl = `https://t.me/${config.botUsername}/app?startapp=vac_${vacancy.id}`;
  const reply_markup = {
    inline_keyboard: [
      [
        { text: "📄 Ariza topshirish", url: appUrl },
      ],
    ],
  };

  return { text, reply_markup };
}

export async function publishToChannel(api, vacancy) {
  const channelId = await getPublicChannelId();
  if (!channelId) {
    return null;
  }

  const { text, reply_markup } = formatChannelPost(vacancy);

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
