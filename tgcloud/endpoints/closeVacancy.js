import { api, db } from 'sdk';
import { eq, and, sql } from 'sdk/db';
import { vacancies, users } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';
import { closeChannelPost } from '../lib/bot/channel.js';

export default async function (input, ctx) {
  const employerTgId = getAuthenticatedUserId(ctx, input);
  if (!employerTgId) {
    return { success: false, error: 'Unauthorized' };
  }

  const vacId = parseInt(input?.id, 10);
  if (!vacId) {
    return { success: false, error: 'Invalid vacancy ID' };
  }

  try {
    const vacancy = await db.select()
      .from(vacancies)
      .where(and(eq(vacancies.id, vacId), eq(vacancies.employerTgId, employerTgId)))
      .get();

    if (!vacancy) {
      return { success: false, error: 'ERR_FORBIDDEN' };
    }

    await db.update(vacancies)
      .set({
        status: 'closed',
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(vacancies.id, vacId))
      .run();

    // If published to channel, update channel post to mark as closed and remove apply button
    if (vacancy.channelMessageId) {
      try {
        const empUser = await db.select({ language: users.language })
          .from(users)
          .where(eq(users.tgId, employerTgId))
          .get();
        await closeChannelPost(api, vacancy, empUser?.language || 'uz');
      } catch (_) {}
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
