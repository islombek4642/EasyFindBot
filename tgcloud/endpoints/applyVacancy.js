import { api, db } from 'sdk';
import { eq, and } from 'sdk/db';
import { applications, vacancies, users, resumes } from '../schema.js';
import { t } from '../lib/locales/index.js';
import { config } from '../lib/config.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'ERR_UNAUTHORIZED' };
  }

  const vacId = parseInt(input?.vacancyId, 10);
  if (!vacId) {
    return { success: false, error: 'ERR_INVALID_INPUT' };
  }

  const seekerTgId = Number(tgUser.id);

  try {
    const seekerUser = await db.select({ language: users.language })
      .from(users)
      .where(eq(users.tgId, seekerTgId))
      .get();
    const userLang = seekerUser?.language || 'uz';

    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
    if (!vacancy || vacancy.status !== 'approved') {
      return { success: false, error: t(userLang, 'errors.not_found') };
    }

    if (Number(vacancy.employerTgId) === seekerTgId) {
      return { success: false, error: t(userLang, 'errors.cannot_apply_own') };
    }

    // Check duplicate application
    const existing = await db.select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.vacancyId, vacId), eq(applications.seekerTgId, seekerTgId)))
      .get();

    if (existing) {
      return { success: false, error: t(userLang, 'errors.duplicate_application') };
    }

    // Fetch seeker active resume (if not passed explicitly)
    let resumeId = input?.resumeId ? Number(input.resumeId) : null;
    if (!resumeId) {
      const activeResume = await db.select({ id: resumes.id })
        .from(resumes)
        .where(eq(resumes.seekerTgId, seekerTgId))
        .get();
      if (activeResume) resumeId = activeResume.id;
    }

    const [created] = await db.insert(applications)
      .values({
        vacancyId: vacId,
        seekerTgId,
        resumeId,
        coverLetter: input?.coverLetter ? String(input.coverLetter).trim() : null,
        status: 'applied',
      })
      .returning()
      .run();

    // Notify employer in their preferred language
    try {
      const employerRow = await db.select({ language: users.language })
        .from(users)
        .where(eq(users.tgId, vacancy.employerTgId))
        .get();
      const empLang = employerRow?.language || 'uz';

      const candidateName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || String(seekerTgId);
      const notifTitle = t(empLang, 'notifier.new_application_title', { title: vacancy.title });
      const notifBody = t(empLang, 'notifier.new_application_candidate', { name: candidateName });
      const btnText = t(empLang, 'notifier.new_application_btn');

      const appUrl = `https://t.me/${config.botUsername}/app?startapp=my_vacs`;
      await api.sendMessage({
        chat_id: vacancy.employerTgId,
        text: `${notifTitle}\n\n${notifBody}`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: btnText, url: appUrl }],
          ],
        },
      });
    } catch (e) {
      // Ignore employer DM failure
    }

    return {
      success: true,
      applicationId: created.id,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
