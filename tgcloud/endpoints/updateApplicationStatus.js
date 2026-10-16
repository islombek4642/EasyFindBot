import { api, db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { applications, vacancies, users } from '../schema.js';
import { APPLICATION_STATUSES } from '../lib/constants/statuses.js';
import { t } from '../lib/locales/index.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'ERR_UNAUTHORIZED' };
  }

  const { applicationId, status } = input || {};
  const appId = parseInt(applicationId, 10);

  if (!appId || !Object.values(APPLICATION_STATUSES).includes(status)) {
    return { success: false, error: 'ERR_INVALID_INPUT' };
  }

  const employerTgId = Number(tgUser.id);

  try {
    const application = await db.select().from(applications).where(eq(applications.id, appId)).get();
    if (!application) {
      return { success: false, error: 'ERR_NOT_FOUND' };
    }

    // Verify vacancy ownership
    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, application.vacancyId)).get();
    if (!vacancy || Number(vacancy.employerTgId) !== employerTgId) {
      return { success: false, error: 'ERR_FORBIDDEN' };
    }

    await db.update(applications)
      .set({
        status,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(applications.id, appId))
      .run();

    // If accepted or rejected, notify the applicant in their preferred language
    if (status === 'accepted' || status === 'rejected') {
      try {
        const candidateUser = await db.select({ language: users.language })
          .from(users)
          .where(eq(users.tgId, application.seekerTgId))
          .get();

        const lang = candidateUser?.language || 'uz';
        let alertMsg = "";

        if (status === 'accepted') {
          const title = t(lang, 'notifier.app_accepted_title');
          const desc = t(lang, 'notifier.app_accepted_desc', {
            company: vacancy.companyName,
            title: vacancy.title,
            contacts: vacancy.contacts,
          });
          alertMsg = `${title}\n\n${desc}`;
        } else if (status === 'rejected') {
          const title = t(lang, 'notifier.app_rejected_title');
          const desc = t(lang, 'notifier.app_rejected_desc', {
            company: vacancy.companyName,
            title: vacancy.title,
          });
          alertMsg = `${title}\n\n${desc}`;
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
