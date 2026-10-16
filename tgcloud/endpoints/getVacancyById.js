import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { vacancies, users } from '../schema.js';
import { getAuthenticatedUserId } from '../lib/bot/auth.js';

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
        viewsCount: vacancy.viewsCount + 1,
        employer,
        isOwner: requesterTgId && Number(vacancy.employerTgId) === requesterTgId,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
