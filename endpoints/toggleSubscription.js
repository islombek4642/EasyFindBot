import { db } from 'sdk';
import { eq, and } from 'sdk/db';
import { subscriptions } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

export default async function (input, ctx) {
  const userTgId = getAuthenticatedUserId(ctx, input);
  if (!userTgId) {
    return { success: false, error: 'Unauthorized' };
  }

  const { category, region = null } = input || {};
  if (!category) {
    return { success: false, error: 'ERR_CATEGORY_REQUIRED' };
  }

  const regionVal = region && region !== 'all' ? region : null;

  try {
    const existing = await db.select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userTgId, userTgId),
          eq(subscriptions.category, category)
        )
      )
      .get();

    if (existing) {
      const nextState = !existing.isActive;
      await db.update(subscriptions)
        .set({ isActive: nextState, region: regionVal })
        .where(eq(subscriptions.id, existing.id))
        .run();

      return {
        success: true,
        isSubscribed: nextState,
        subscriptionId: existing.id,
      };
    }

    const [created] = await db.insert(subscriptions)
      .values({
        userTgId,
        category,
        region: regionVal,
        isActive: true,
      })
      .returning()
      .run();

    return {
      success: true,
      isSubscribed: true,
      subscriptionId: created.id,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
