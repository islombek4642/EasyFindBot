import { db } from 'sdk';
import { eq, and, sql } from 'sdk/db';
import { vacancies } from '../schema.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const vacId = parseInt(input?.id, 10);
  if (!vacId) {
    return { success: false, error: 'Invalid vacancy ID' };
  }

  const employerTgId = Number(tgUser.id);

  try {
    const vacancy = await db.select()
      .from(vacancies)
      .where(and(eq(vacancies.id, vacId), eq(vacancies.employerTgId, employerTgId)))
      .get();

    if (!vacancy) {
      return { success: false, error: 'ERR_FORBIDDEN' };
    }

    await db.update(vacancies)
      .set({
        status: 'closed',
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(vacancies.id, vacId))
      .run();

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
