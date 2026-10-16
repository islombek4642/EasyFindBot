import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { resumes, users } from '../schema.js';
import { t } from '../lib/locales/index.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'ERR_UNAUTHORIZED' };
  }

  const seekerTgId = Number(tgUser.id);
  const userRow = await db.select({ language: users.language }).from(users).where(eq(users.tgId, seekerTgId)).get();
  const lang = userRow?.language || 'uz';

  const {
    title,
    category,
    region,
    experienceYears = 0,
    expectedSalary,
    salaryCurrency = 'USD',
    skills = [],
    bio,
    contacts,
  } = input || {};

  if (!title || !category || !region || !contacts) {
    return { success: false, error: t(lang, 'errors.required_fields') };
  }

  try {
    const existing = await db.select({ id: resumes.id })
      .from(resumes)
      .where(eq(resumes.seekerTgId, seekerTgId))
      .get();

    if (existing) {
      await db.update(resumes)
        .set({
          title: title.trim(),
          category,
          region,
          experienceYears: Number(experienceYears) || 0,
          expectedSalary: expectedSalary ? Number(expectedSalary) : null,
          salaryCurrency: salaryCurrency || 'USD',
          skills: Array.isArray(skills) ? skills : [],
          bio: bio ? bio.trim() : null,
          contacts: contacts.trim(),
          isActive: true,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(resumes.id, existing.id))
        .run();

      return { success: true, resumeId: existing.id, isUpdated: true };
    }

    const [created] = await db.insert(resumes)
      .values({
        seekerTgId,
        title: title.trim(),
        category,
        region,
        experienceYears: Number(experienceYears) || 0,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        salaryCurrency: salaryCurrency || 'USD',
        skills: Array.isArray(skills) ? skills : [],
        bio: bio ? bio.trim() : null,
        contacts: contacts.trim(),
        isActive: true,
      })
      .returning()
      .run();

    return { success: true, resumeId: created.id, isCreated: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
