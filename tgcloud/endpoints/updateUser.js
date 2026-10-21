import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { users } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

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

    return {
      success: true,
      user: updatedUser,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
