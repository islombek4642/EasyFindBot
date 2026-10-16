import { db } from 'sdk';
import { eq } from 'sdk/db';
import { resumes } from '../schema.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const seekerTgId = Number(tgUser.id);

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
