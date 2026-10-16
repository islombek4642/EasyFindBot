import { db } from 'sdk';
import { eq } from 'sdk/db';
import { subscriptions } from '../schema.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const userTgId = Number(tgUser.id);

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
