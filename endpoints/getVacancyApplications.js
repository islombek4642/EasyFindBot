import { db } from 'sdk';
import { eq, and, desc } from 'sdk/db';
import { applications, vacancies, users, resumes } from '../schema.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const vacId = parseInt(input?.vacancyId, 10);
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

    const list = await db.select()
      .from(applications)
      .where(eq(applications.vacancyId, vacId))
      .orderBy(desc(applications.createdAt))
      .all();

    const enriched = await Promise.all(
      list.map(async (app) => {
        const candidateUser = await db.select({
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          phone: users.phone,
        })
          .from(users)
          .where(eq(users.tgId, app.seekerTgId))
          .get();

        let resumeData = null;
        if (app.resumeId) {
          resumeData = await db.select().from(resumes).where(eq(resumes.id, app.resumeId)).get();
        } else {
          resumeData = await db.select().from(resumes).where(eq(resumes.seekerTgId, app.seekerTgId)).get();
        }

        return {
          ...app,
          user: candidateUser || null,
          resume: resumeData || null,
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
