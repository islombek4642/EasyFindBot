import { db } from 'sdk';
import { eq } from 'sdk/db';
import { resumes } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

export default async function (input, ctx) {
  const seekerTgId = getAuthenticatedUserId(ctx, input);
  if (!seekerTgId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const resume = await db.select()
      .from(resumes)
      .where(eq(resumes.seekerTgId, seekerTgId))
      .get();

    return {
      success: true,
      resume: resume || null,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
