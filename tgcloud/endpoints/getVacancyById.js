import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { vacancies, users } from '../schema.js';
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
  const vacId = parseInt(input?.id, 10);
  if (!vacId) {
    return { success: false, error: 'Invalid vacancy ID' };
  }

  const requesterTgId = getAuthenticatedUserId(ctx, input);

  try {
    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
    if (!vacancy) {
      return { success: false, error: 'Vacancy not found' };
    }

    // Increment views counter
    await db.update(vacancies)
      .set({ viewsCount: sql`${vacancies.viewsCount} + 1` })
      .where(eq(vacancies.id, vacId))
      .run();

    // Fetch employer details (if available)
    const employer = await db.select({
      username: users.username,
      firstName: users.firstName,
      companyName: users.lastName,
    })
      .from(users)
      .where(eq(users.tgId, vacancy.employerTgId))
      .get();

    return {
      success: true,
      vacancy: {
        ...vacancy,
        createdAt: toEpochMs(vacancy.createdAt),
        updatedAt: toEpochMs(vacancy.updatedAt),
        viewsCount: vacancy.viewsCount + 1,
        employer,
        isOwner: requesterTgId && Number(vacancy.employerTgId) === requesterTgId,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

