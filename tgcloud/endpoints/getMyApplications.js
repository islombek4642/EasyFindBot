import { db } from 'sdk';
import { eq, desc } from 'sdk/db';
import { applications, vacancies } from '../schema.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const seekerTgId = Number(tgUser.id);

  try {
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
