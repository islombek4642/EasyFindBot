import { db } from 'sdk';
import { eq } from 'sdk/db';
import { subscriptions } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

export default async function (input, ctx) {
  const userTgId = getAuthenticatedUserId(ctx, input);
  if (!userTgId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const list = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userTgId, userTgId))
      .all();

    return {
      success: true,
      subscriptions: list,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
