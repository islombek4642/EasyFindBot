import { db } from 'sdk';
import { eq, desc, count } from 'sdk/db';
import { vacancies, applications } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

export default async function (input, ctx) {
  const employerTgId = getAuthenticatedUserId(ctx, input);
  if (!employerTgId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const list = await db.select()
      .from(vacancies)
      .where(eq(vacancies.employerTgId, employerTgId))
      .orderBy(desc(vacancies.createdAt))
      .all();

    // Attach application counts for each vacancy
    const enriched = await Promise.all(
      list.map(async (vac) => {
        const [appCount] = await db.select({ total: count() })
          .from(applications)
          .where(eq(applications.vacancyId, vac.id));
        return {
          ...vac,
          applicationsCount: appCount?.total || 0,
        };
      })
    );

    return {
      success: true,
      vacancies: enriched,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
