import { api, db } from 'sdk';
import { eq, and } from 'sdk/db';
import { applications, vacancies, users, resumes } from '../schema.js';
import { t } from '../lib/locales/index.js';
import { config } from '../lib/config.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const vacId = parseInt(input?.vacancyId, 10);
  if (!vacId) {
    return { success: false, error: 'Invalid vacancy ID' };
  }

  const seekerTgId = Number(tgUser.id);

  try {
    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
    if (!vacancy || vacancy.status !== 'approved') {
      return { success: false, error: 'Vakansiya topilmadi yoki qabul yopilgan' };
    }

    if (Number(vacancy.employerTgId) === seekerTgId) {
      return { success: false, error: 'O\'z vakansiyangizga ariza topshira olmaysiz' };
    }

    // Check duplicate application
    const existing = await db.select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.vacancyId, vacId), eq(applications.seekerTgId, seekerTgId)))
      .get();

    if (existing) {
      return { success: false, error: 'Siz ushbu vakansiyaga allaqachon ariza topshirgansiz' };
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

      const candidateName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Nomzod';
      const notifText =
        `📬 **${vacancy.title}** vakansiyangizga yangi ariza tushdi!\n\n` +
        `👤 **Nomzod:** ${candidateName}\n\n` +
        "Arizani ko'rish uchun ilovadagi kabinetingizga kiring:";

      const appUrl = `https://t.me/${config.botUsername}/app?startapp=my_vacs`;
      await api.sendMessage({
        chat_id: vacancy.employerTgId,
        text: notifText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "💼 Arizalarni ko'rish", url: appUrl }],
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
