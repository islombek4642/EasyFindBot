import { db } from 'sdk';
import { eq, and, or, gte, like, desc, sql, count } from 'sdk/db';
import { resumes, users } from '../schema.js';

export default async function (input = {}, ctx) {
  const {
    category,
    region,
    search,
    experienceMin,
    limit = 15,
    offset = 0,
  } = input;

  const conditions = [eq(resumes.isActive, true)];

  if (category && category !== 'all') {
    conditions.push(eq(resumes.category, category));
  }

  if (region && region !== 'all') {
    conditions.push(eq(resumes.region, region));
  }

  if (experienceMin && Number(experienceMin) > 0) {
    conditions.push(gte(resumes.experienceYears, Number(experienceMin)));
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${resumes.title})`, term),
        like(sql`lower(${resumes.bio})`, term)
      )
    );
  }

  const whereClause = and(...conditions);

  try {
    const [totalRow] = await db.select({ total: count() })
      .from(resumes)
      .where(whereClause);

    const safeLimit = Math.min(Math.max(Number(limit) || 15, 1), 50);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const items = await db.select()
      .from(resumes)
      .where(whereClause)
      .orderBy(desc(resumes.createdAt))
      .limit(safeLimit)
      .offset(safeOffset)
      .all();

    // Attach user metadata
    const enriched = await Promise.all(
      items.map(async (res) => {
        const u = await db.select({
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
        })
          .from(users)
          .where(eq(users.tgId, res.seekerTgId))
          .get();

        return {
          ...res,
          user: u || null,
        };
      })
    );

    return {
      success: true,
      resumes: enriched,
      total: totalRow?.total || 0,
      limit: safeLimit,
      offset: safeOffset,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
