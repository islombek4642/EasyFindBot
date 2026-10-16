import { db } from 'sdk';
import { eq, and, or, isNull } from 'sdk/db';
import { subscriptions } from '../../schema.js';
import { config } from '../config.js';

export async function notifyEmployer(api, employerTgId, vacancy, status, reason = null) {
  if (!employerTgId) return;

  let text = "";
  if (status === 'approved') {
    text =
      "✅ **Sizning vakansiyangiz tasdiqlandi!**\n\n" +
      `📌 **Sarlavha:** ${vacancy.title}\n` +
      `🏢 **Kompaniya:** ${vacancy.companyName}\n\n` +
      "E'loningiz ommaviy kanalga chiqarildi va qidiruvda faol ko'rinmoqda.";
  } else if (status === 'rejected') {
    text =
      "❌ **Sizning vakansiyangiz rad etildi**\n\n" +
      `📌 **Sarlavha:** ${vacancy.title}\n` +
      `🏢 **Kompaniya:** ${vacancy.companyName}\n\n` +
      (reason ? `⚠️ **Sabab:** ${reason}\n\n` : "") +
      "Iltimos, e'lon ma'lumotlarini qoidalarga muvofiq to'g'rilab qayta yuboring.";
  }

  if (!text) return;

  try {
    await api.sendMessage(employerTgId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    // Ignore employer DM failure (e.g. user blocked the bot)
  }
}

export async function notifySubscribers(api, vacancy) {
  try {
    const matchingSubs = await db.select({ userTgId: subscriptions.userTgId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.isActive, true),
          eq(subscriptions.category, vacancy.category),
          or(
            eq(subscriptions.region, vacancy.region),
            isNull(subscriptions.region)
          )
        )
      )
      .all();

    if (!matchingSubs || matchingSubs.length === 0) return;

    const uniqueUserIds = [...new Set(matchingSubs.map((s) => s.userTgId))]
      .filter((id) => Number(id) !== Number(vacancy.employerTgId));

    const text =
      "🔔 **Siz obuna bo'lgan sohada yangi ish o'rni!**\n\n" +
      `📌 **${vacancy.title}**\n` +
      `🏢 **Kompaniya:** ${vacancy.companyName}\n` +
      `📍 **Hudud:** ${vacancy.region}\n\n` +
      "Ariza topshirish uchun quyidagi tugmani bosing:";

    const appUrl = `https://t.me/${config.botUsername}/app?startapp=vac_${vacancy.id}`;
    const reply_markup = {
      inline_keyboard: [
        [{ text: "📄 E'lonni ko'rish", url: appUrl }],
      ],
    };

    // Rate-limiting protection: batch 25 recipients with safe error handling
    const batchSize = 25;
    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const batch = uniqueUserIds.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((userId) =>
          api.sendMessage(userId, text, {
            parse_mode: 'Markdown',
            reply_markup,
          }).catch(() => null)
        )
      );

      // 1-second delay between batches if more remain
      if (i + batchSize < uniqueUserIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (err) {
    // Ignore subscription broadcast error
  }
}
