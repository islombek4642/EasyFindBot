import { db } from 'sdk';
import { eq } from 'sdk/db';
import { resumes } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

function toEpochMs(val) {
  if (!val) return null;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val < 1e11 ? val * 1000 : val;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}

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

    const formatted = resume
      ? {
          ...resume,
          createdAt: toEpochMs(resume.createdAt),
          updatedAt: toEpochMs(resume.updatedAt),
        }
      : null;

    return {
      success: true,
      resume: formatted,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

