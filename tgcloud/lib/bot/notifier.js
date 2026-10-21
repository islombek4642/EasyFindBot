import { db } from 'sdk';
import { eq, and, or, isNull } from 'sdk/db';
import { subscriptions, users } from '../../schema.js';
import { config } from '../config.js';
import { t } from '../locales/index.js';
import { escapeHtml } from './html.js';
import { logger } from '../logger.js';

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

  let text = '';
  if (status === 'approved') {
    const titleText = t(lang, 'notifier.emp_approved_title').replace(/\*\*/g, '').trim();
    text =
      `<b>${escapeHtml(titleText)}</b>\n\n` +
      `📌 <b>${escapeHtml(t(lang, 'channel.title'))}:</b> ${escapeHtml(vacancy.title)}\n` +
      `🏢 <b>${escapeHtml(t(lang, 'channel.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n\n` +
      `${escapeHtml(t(lang, 'notifier.emp_approved_desc'))}`;
  } else if (status === 'rejected') {
    const titleText = t(lang, 'notifier.emp_rejected_title').replace(/\*\*/g, '').trim();
    text =
      `<b>${escapeHtml(titleText)}</b>\n\n` +
      `📌 <b>${escapeHtml(t(lang, 'channel.title'))}:</b> ${escapeHtml(vacancy.title)}\n` +
      `🏢 <b>${escapeHtml(t(lang, 'channel.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n\n` +
      (reason ? `⚠️ <b>${escapeHtml(t(lang, 'notifier.emp_rejected_reason').replace(/\*\*/g, '').replace(/⚠️\s*/g, ''))}</b> ${escapeHtml(reason)}\n\n` : '') +
      `${escapeHtml(t(lang, 'notifier.emp_rejected_desc'))}`;
  }

  if (!text) return;

  try {
    await api.sendMessage({
      chat_id: employerTgId,
      text,
      parse_mode: 'HTML',
    });
  } catch (err) {
    logger.warn('lib/bot/notifier.js', `Failed to send notification to employer ${employerTgId}:`, err);
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

          const subTitle = t(userLang, 'notifier.sub_title').replace(/\*\*/g, '').trim();

          const text =
            `<b>${escapeHtml(subTitle)}</b>\n\n` +
            `📌 <b>${escapeHtml(vacancy.title)}</b>\n` +
            `🏢 <b>${escapeHtml(t(userLang, 'channel.company'))}:</b> ${escapeHtml(vacancy.companyName)}\n` +
            `📍 <b>${escapeHtml(t(userLang, 'channel.region'))}:</b> ${escapeHtml(t(userLang, 'regions.' + vacancy.region) || vacancy.region)}\n\n` +
            `${escapeHtml(t(userLang, 'channel.footer'))}`;

          const reply_markup = {
            inline_keyboard: [
              [{ text: t(userLang, 'notifier.sub_btn'), url: appUrl }],
            ],
          };

          return api.sendMessage({
            chat_id: userId,
            text,
            parse_mode: 'HTML',
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
    logger.warn('lib/bot/notifier.js', 'Error during notifySubscribers broadcast:', err);
  }
}
