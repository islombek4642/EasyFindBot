import { api, db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { users } from '../schema.js';
import { getAuthenticatedUserId, isUserAdmin } from '../lib/bot/auth.js';
import { buildMainReplyKeyboard } from '../handlers/message.js';
import { t } from '../lib/locales/index.js';

export default async function (input, ctx) {
  const userId = getAuthenticatedUserId(ctx, input);
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }
  const { language, role, phone, firstName, lastName } = input || {};

  const updates = {
    updatedAt: sql`(unixepoch())`,
  };

  if (language && ['uz', 'ru', 'en'].includes(language)) {
    updates.language = language;
  }

  if (role && ['seeker', 'employer'].includes(role)) {
    const existingUser = await db.select({ role: users.role }).from(users).where(eq(users.tgId, userId)).get();
    if (existingUser?.role !== 'admin') {
      updates.role = role;
    }
  }

  if (phone !== undefined) {
    updates.phone = phone ? String(phone).trim() : null;
  }

  if (firstName !== undefined) {
    updates.firstName = firstName ? String(firstName).trim() : null;
  }

  if (lastName !== undefined) {
    updates.lastName = lastName ? String(lastName).trim() : null;
  }

  try {
    await db.update(users)
      .set(updates)
      .where(eq(users.tgId, userId))
      .run();

    const updatedUser = await db.select().from(users).where(eq(users.tgId, userId)).get();

    // If language was updated, refresh the persistent Telegram bot Reply Keyboard in background
    if (language && ['uz', 'ru', 'en'].includes(language)) {
      try {
        const isAdmin = await isUserAdmin(userId);
        await api.sendMessage({
          chat_id: userId,
          text: t(language, 'commands.language_updated'),
          reply_markup: {
            keyboard: buildMainReplyKeyboard(isAdmin, language, updatedUser),
            resize_keyboard: true,
          },
        });
      } catch (_) {
        // Non-blocking in case bot notification cannot be sent
      }
    }

    return {
      success: true,
      user: updatedUser,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
