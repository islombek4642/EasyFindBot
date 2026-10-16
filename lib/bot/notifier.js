import { db } from 'sdk';
import { eq, and, or, isNull } from 'sdk/db';
import { subscriptions, users } from '../../schema.js';
import { config } from '../config.js';
import { t } from '../locales/index.js';

export async function notifyEmployer(api, employerTgId, vacancy, status, reason = null) {
  if (!employerTgId) return;

  // Retrieve employer preferred language
  let lang = 'uz';
  try {
    const user = await db.select({ language: users.language })
      .from(users)
      .where(eq(users.tgId, Number(employerTgId)))
      .get();
    if (user?.language) lang = user.language;
  } catch (e) {
    // default to uz
  }

  let text = "";
  if (status === 'approved') {
    text =
      `${t(lang, 'notifier.emp_approved_title')}\n\n` +
      `📌 **${t(lang, 'channel.title')}:** ${vacancy.title}\n` +
      `🏢 **${t(lang, 'channel.company')}:** ${vacancy.companyName}\n\n` +
      `${t(lang, 'notifier.emp_approved_desc')}`;
  } else if (status === 'rejected') {
    text =
      `${t(lang, 'notifier.emp_rejected_title')}\n\n` +
      `📌 **${t(lang, 'channel.title')}:** ${vacancy.title}\n` +
      `🏢 **${t(lang, 'channel.company')}:** ${vacancy.companyName}\n\n` +
      (reason ? `${t(lang, 'notifier.emp_rejected_reason')} ${reason}\n\n` : "") +
      `${t(lang, 'notifier.emp_rejected_desc')}`;
  }

  if (!text) return;

  try {
    await api.sendMessage({
      chat_id: employerTgId,
      text,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    // Ignore employer DM failure
  }
}

export async function notifySubscribers(api, vacancy) {
  try {
    const matchingSubs = await db.select({
      userTgId: subscriptions.userTgId,
    })
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

    if (uniqueUserIds.length === 0) return;

    const appUrl = `https://t.me/${config.botUsername}/app?startapp=vac_${vacancy.id}`;

    // Rate-limiting protection: batch 25 recipients with safe error handling
    const batchSize = 25;
    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const batch = uniqueUserIds.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (userId) => {
          let userLang = 'uz';
          try {
            const u = await db.select({ language: users.language })
              .from(users)
              .where(eq(users.tgId, Number(userId)))
              .get();
            if (u?.language) userLang = u.language;
          } catch (e) {
            // fallback uz
          }

          const text =
            `${t(userLang, 'notifier.sub_title')}\n\n` +
            `📌 **${vacancy.title}**\n` +
            `🏢 **${t(userLang, 'channel.company')}:** ${vacancy.companyName}\n` +
            `📍 **${t(userLang, 'channel.region')}:** ${vacancy.region}\n\n` +
            `${t(userLang, 'channel.footer')}`;

          const reply_markup = {
            inline_keyboard: [
              [{ text: t(userLang, 'notifier.sub_btn'), url: appUrl }],
            ],
          };

          return api.sendMessage({
            chat_id: userId,
            text,
            parse_mode: 'Markdown',
            reply_markup,
          });
        })
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
