import { api, db } from 'sdk';
import { eq, and, sql } from 'sdk/db';
import { applications, vacancies, users, resumes } from '../schema.js';
import { t } from '../lib/locales/index.js';
import { config } from '../lib/config.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';
import { escapeHtml } from '../lib/bot/html.js';

export default async function (input, ctx) {
  const tgUser = ctx?.initData?.user;
  const seekerTgId = getAuthenticatedUserId(ctx, input);
  if (!seekerTgId) {
    return { success: false, error: 'ERR_UNAUTHORIZED' };
  }

  const vacId = parseInt(input?.vacancyId, 10);
  if (!vacId) {
    return { success: false, error: 'ERR_INVALID_INPUT' };
  }

  try {
    const existingUser = await db.select().from(users).where(eq(users.tgId, seekerTgId)).get();
    const candidateFirstName = input?.firstName || tgUser?.first_name || existingUser?.firstName || null;
    const candidateLastName = input?.lastName || tgUser?.last_name || existingUser?.lastName || null;
    const candidateUsername = input?.username || tgUser?.username || existingUser?.username || null;

    if (existingUser) {
      if (
        (candidateFirstName && candidateFirstName !== existingUser.firstName) ||
        (candidateLastName && candidateLastName !== existingUser.lastName) ||
        (candidateUsername && candidateUsername !== existingUser.username)
      ) {
        await db.update(users)
          .set({
            firstName: candidateFirstName || existingUser.firstName,
            lastName: candidateLastName || existingUser.lastName,
            username: candidateUsername || existingUser.username,
          })
          .where(eq(users.tgId, seekerTgId))
          .run();
      }
    } else {
      await db.insert(users)
        .values({
          tgId: seekerTgId,
          firstName: candidateFirstName,
          lastName: candidateLastName,
          username: candidateUsername,
          role: 'seeker',
          language: 'uz',
        })
        .run();
    }

    const userLang = existingUser?.language || 'uz';

    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
    if (!vacancy) {
      return { success: false, error: t(userLang, 'errors.not_found') };
    }
    if (vacancy.status === 'closed') {
      return { success: false, error: t(userLang, 'errors.vacancy_closed') };
    }
    if (vacancy.status !== 'approved') {
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
        createdAt: sql`(unixepoch())`,
        updatedAt: sql`(unixepoch())`,
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

      const candidateName = [candidateFirstName, candidateLastName].filter(Boolean).join(' ') || (candidateUsername ? `@${candidateUsername}` : String(seekerTgId));
      const notifTitle = t(empLang, 'notifier.new_application_title', { title: vacancy.title }).replace(/\*\*/g, '').trim();
      const notifBody = t(empLang, 'notifier.new_application_candidate', { name: candidateName }).replace(/\*\*/g, '').trim();
      const btnText = t(empLang, 'notifier.new_application_btn');

      const appUrl = `https://t.me/${config.botUsername}/app?startapp=my_vacs`;
      await api.sendMessage({
        chat_id: vacancy.employerTgId,
        text: `<b>${escapeHtml(notifTitle)}</b>\n\n${escapeHtml(notifBody)}`,
        parse_mode: 'HTML',
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
