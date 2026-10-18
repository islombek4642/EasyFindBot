import { db } from 'sdk';
import { eq, desc, isNull, sql } from 'sdk/db';
import { applications, vacancies } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

export default async function (input, ctx) {
  const seekerTgId = getAuthenticatedUserId(ctx, input);
  if (!seekerTgId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    try {
      await db.update(applications)
        .set({ createdAt: sql`(unixepoch())` })
        .where(isNull(applications.createdAt))
        .run();
    } catch (_) {}

    const list = await db.select()
      .from(applications)
      .where(eq(applications.seekerTgId, seekerTgId))
      .orderBy(desc(applications.createdAt))
      .all();

    const enriched = await Promise.all(
      list.map(async (app) => {
        const vac = await db.select({
          title: vacancies.title,
          companyName: vacancies.companyName,
          category: vacancies.category,
          region: vacancies.region,
          salaryType: vacancies.salaryType,
          salaryMin: vacancies.salaryMin,
          salaryMax: vacancies.salaryMax,
          salaryCurrency: vacancies.salaryCurrency,
          status: vacancies.status,
        })
          .from(vacancies)
          .where(eq(vacancies.id, app.vacancyId))
          .get();

        return {
          ...app,
          createdAt: app.createdAt || app.updatedAt || Math.floor(Date.now() / 1000),
          vacancy: vac || null,
        };
      })
    );

    return {
      success: true,
      applications: enriched,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
