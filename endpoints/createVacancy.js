import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { vacancies, users } from '../schema.js';
import { sendToModeration } from '../lib/bot/moderator.js';
import { t } from '../lib/locales/index.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

export default async function (input, ctx) {
  const employerTgId = getAuthenticatedUserId(ctx, input);
  if (!employerTgId) {
    return { success: false, error: 'ERR_UNAUTHORIZED' };
  }
  const userRow = await db.select({ language: users.language, role: users.role }).from(users).where(eq(users.tgId, employerTgId)).get();
  const lang = userRow?.language || 'uz';

  const {
    title,
    companyName = input?.company,
    category,
    region,
    employmentType = 'full_time',
    salaryType = 'range',
    salaryMin,
    salaryMax,
    salaryCurrency = input?.currency || 'USD',
    description,
    requirements,
    contacts,
  } = input || {};

  if (!title || !companyName || !category || !region || !description || !contacts) {
    return { success: false, ok: false, error: t(lang, 'errors.required_fields') };
  }

  try {
    // Ensure employer role in users table without overriding admin
    if (userRow?.role !== 'admin') {
      await db.update(users)
        .set({ role: 'employer' })
        .where(eq(users.tgId, employerTgId))
        .run();
    }

    const [created] = await db.insert(vacancies)
      .values({
        employerTgId,
        title: title.trim(),
        companyName: companyName.trim(),
        category,
        region,
        employmentType,
        salaryType,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        salaryCurrency: salaryCurrency || 'USD',
        description: description.trim(),
        requirements: requirements ? requirements.trim() : null,
        contacts: contacts.trim(),
        status: 'pending',
      })
      .returning()
      .run();

    // Notify moderation channel/admins
    await sendToModeration(api, created, lang);

    return {
      success: true,
      ok: true,
      vacancyId: created.id,
      status: 'pending',
    };
  } catch (err) {
    return { success: false, ok: false, error: err.message };
  }
}
