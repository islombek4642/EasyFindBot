import { db } from 'sdk';
import { eq, desc, count } from 'sdk/db';
import { vacancies, applications } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

function toEpochMs(val) {
  if (!val) return null;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val < 1e11 ? val * 1000 : val;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}

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
          createdAt: toEpochMs(vac.createdAt),
          updatedAt: toEpochMs(vac.updatedAt),
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

