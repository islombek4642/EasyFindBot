import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { vacancies, users } from '../schema.js';
import { sendToModeration } from '../lib/bot/moderator.js';
import { t } from '../lib/locales/index.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'ERR_UNAUTHORIZED' };
  }

  const employerTgId = Number(tgUser.id);
  const userRow = await db.select({ language: users.language }).from(users).where(eq(users.tgId, employerTgId)).get();
  const lang = userRow?.language || 'uz';

  const {
    title,
    companyName,
    category,
    region,
    employmentType = 'full_time',
    salaryType = 'range',
    salaryMin,
    salaryMax,
    salaryCurrency = 'USD',
    description,
    requirements,
    contacts,
  } = input || {};

  if (!title || !companyName || !category || !region || !description || !contacts) {
    return { success: false, error: t(lang, 'errors.required_fields') };
  }

  try {
    // Ensure employer role in users table
    await db.update(users)
      .set({ role: 'employer' })
      .where(eq(users.tgId, employerTgId))
      .run();

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
      vacancyId: created.id,
      status: 'pending',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
