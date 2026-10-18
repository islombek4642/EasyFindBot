import { api, db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { applications, vacancies, users } from '../schema.js';
import { APPLICATION_STATUSES } from '../lib/constants/statuses.js';
import { t } from '../lib/locales/index.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';
import { escapeHtml } from '../lib/bot/html.js';
import { logger } from '../lib/logger.js';

export default async function (input, ctx) {
  const employerTgId = getAuthenticatedUserId(ctx, input);
  if (!employerTgId) {
    return { success: false, error: 'ERR_UNAUTHORIZED' };
  }

  const { status } = input || {};
  const appId = parseInt(input?.applicationId || input?.id, 10);

  if (!appId || !Object.values(APPLICATION_STATUSES).includes(status)) {
    return { success: false, error: 'ERR_INVALID_INPUT' };
  }

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
        let alertMsg = '';

        if (status === 'accepted') {
          const title = t(lang, 'notifier.app_accepted_title').replace(/\*\*/g, '').trim();
          const desc = t(lang, 'notifier.app_accepted_desc', {
            company: vacancy.companyName,
            title: vacancy.title,
            contacts: vacancy.contacts,
          }).replace(/\*\*/g, '');

          alertMsg = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(desc)}`;
        } else if (status === 'rejected') {
          const title = t(lang, 'notifier.app_rejected_title').replace(/\*\*/g, '').trim();
          const desc = t(lang, 'notifier.app_rejected_desc', {
            company: vacancy.companyName,
            title: vacancy.title,
          }).replace(/\*\*/g, '');

          alertMsg = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(desc)}`;
        }

        if (alertMsg) {
          await api.sendMessage({
            chat_id: application.seekerTgId,
            text: alertMsg,
            parse_mode: 'HTML',
          });
          logger.info('endpoints/updateApplicationStatus.js', `Sent status ${status} notification to seeker ${application.seekerTgId}`);
        }
      } catch (e) {
        logger.warn('endpoints/updateApplicationStatus.js', 'Candidate notification error', e);
      }
    }

    return { success: true };
  } catch (err) {
    logger.error('endpoints/updateApplicationStatus.js', 'Error updating application status', err);
    return { success: false, error: err.message };
  }
}
