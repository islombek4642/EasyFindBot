import { api, db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { applications, vacancies, users } from '../schema.js';
import { APPLICATION_STATUSES } from '../lib/constants/statuses.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const { applicationId, status } = input || {};
  const appId = parseInt(applicationId, 10);

  if (!appId || !Object.values(APPLICATION_STATUSES).includes(status)) {
    return { success: false, error: 'Invalid application ID or status' };
  }

  const employerTgId = Number(tgUser.id);

  try {
    const application = await db.select().from(applications).where(eq(applications.id, appId)).get();
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // Verify vacancy ownership
    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, application.vacancyId)).get();
    if (!vacancy || Number(vacancy.employerTgId) !== employerTgId) {
      return { success: false, error: 'Permission denied' };
    }

    await db.update(applications)
      .set({
        status,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(applications.id, appId))
      .run();

    // If accepted or rejected, notify the applicant
    if (status === 'accepted' || status === 'rejected') {
      try {
        const candidateUser = await db.select({ language: users.language })
          .from(users)
          .where(eq(users.tgId, application.seekerTgId))
          .get();

        const lang = candidateUser?.language || 'uz';
        let alertMsg = "";

        if (status === 'accepted') {
          alertMsg =
            `🎉 **Arizangiz qabul qilindi!**\n\n` +
            `🏢 **${vacancy.companyName}** kompaniyasi **${vacancy.title}** vakansiyasi bo'yicha arizangizni ma'qulladi.\n` +
            `📞 Tez orada ish beruvchi siz bilan bog'lanadi (yoki aloqa: ${vacancy.contacts}).`;
        } else if (status === 'rejected') {
          alertMsg =
            `ℹ️ **Ariza holati yangilandi**\n\n` +
            `🏢 **${vacancy.companyName}** kompaniyasi **${vacancy.title}** vakansiyasi bo'yicha arizangizni ko'rib chiqdi, ammo bu safar boshqa nomzod ma'qul deb topildi.\n` +
            `Sizga boshqa takliflarimizda omad tilaymiz!`;
        }

        if (alertMsg) {
          await api.sendMessage({
            chat_id: application.seekerTgId,
            text: alertMsg,
            parse_mode: 'Markdown',
          });
        }
      } catch (e) {
        // Ignore candidate notification error
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
