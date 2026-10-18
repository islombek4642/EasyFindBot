import { db } from 'sdk';
import { eq, and, or, gte, like, desc, sql, count } from 'sdk/db';
import { vacancies } from '../schema.js';

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

export default async function (input = {}, ctx) {
  const {
    category,
    region,
    search,
    salaryMin,
    employmentType,
    limit = 15,
    offset = 0,
  } = input;

  // Option B: show both approved and closed vacancies
  const conditions = [
    or(eq(vacancies.status, 'approved'), eq(vacancies.status, 'closed'))
  ];

  if (category && category !== 'all') {
    conditions.push(eq(vacancies.category, category));
  }

  if (region && region !== 'all') {
    conditions.push(eq(vacancies.region, region));
  }

  if (employmentType && employmentType !== 'all') {
    conditions.push(eq(vacancies.employmentType, employmentType));
  }

  // Negotiable salary logic: include if salaryMin is met OR salaryType is negotiable
  if (salaryMin && Number(salaryMin) > 0) {
    conditions.push(
      or(
        gte(vacancies.salaryMin, Number(salaryMin)),
        eq(vacancies.salaryType, 'negotiable')
      )
    );
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${vacancies.title})`, term),
        like(sql`lower(${vacancies.companyName})`, term),
        like(sql`lower(${vacancies.description})`, term)
      )
    );
  }

  const whereClause = and(...conditions);

  try {
    const [totalRow] = await db.select({ total: count() })
      .from(vacancies)
      .where(whereClause);

    const safeLimit = Math.min(Math.max(Number(limit) || 15, 1), 50);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const items = await db.select()
      .from(vacancies)
      .where(whereClause)
      .orderBy(
        sql`CASE WHEN ${vacancies.status} = 'approved' THEN 0 ELSE 1 END`,
        desc(vacancies.createdAt)
      )
      .limit(safeLimit)
      .offset(safeOffset)
      .all();

    const formattedItems = items.map((vac) => ({
      ...vac,
      createdAt: toEpochMs(vac.createdAt),
      updatedAt: toEpochMs(vac.updatedAt),
    }));

    return {
      success: true,
      vacancies: formattedItems,
      total: totalRow?.total || 0,
      limit: safeLimit,
      offset: safeOffset,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

