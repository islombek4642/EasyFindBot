import { db } from 'sdk';
import { eq } from 'sdk/db';
import { users, resumes } from '../schema.js';
import { isUserAdmin } from '../lib/bot/auth.js';

export default async function (input, ctx) {
  const tgUser = ctx.initData?.user;
  if (!tgUser?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const userId = Number(tgUser.id);
  let dbUser = await db.select().from(users).where(eq(users.tgId, userId)).get();

  if (!dbUser) {
    const defaultLang = (tgUser.language_code || '').startsWith('ru')
      ? 'ru'
      : (tgUser.language_code || '').startsWith('en')
      ? 'en'
      : 'uz';

    await db.insert(users)
      .values({
        tgId: userId,
        username: tgUser.username || null,
        firstName: tgUser.first_name || null,
        lastName: tgUser.last_name || null,
        role: 'seeker',
        language: defaultLang,
      })
      .run();

    dbUser = await db.select().from(users).where(eq(users.tgId, userId)).get();
  } else if (tgUser) {
    const shouldUpdate =
      (tgUser.first_name && dbUser.firstName !== tgUser.first_name) ||
      (tgUser.last_name && dbUser.lastName !== tgUser.last_name) ||
      (tgUser.username && dbUser.username !== tgUser.username);

    if (shouldUpdate) {
      await db.update(users)
        .set({
          firstName: tgUser.first_name || dbUser.firstName,
          lastName: tgUser.last_name || dbUser.lastName,
          username: tgUser.username || dbUser.username,
        })
        .where(eq(users.tgId, userId))
        .run();
      dbUser.firstName = tgUser.first_name || dbUser.firstName;
      dbUser.lastName = tgUser.last_name || dbUser.lastName;
      dbUser.username = tgUser.username || dbUser.username;
    }
  }

  const userResume = await db.select({ id: resumes.id })
    .from(resumes)
    .where(eq(resumes.seekerTgId, userId))
    .get();

  const isAdmin = await isUserAdmin(userId);

  return {
    success: true,
    user: {
      ...dbUser,
      id: dbUser.tgId,
      first_name: dbUser.firstName || tgUser?.first_name || '',
      last_name: dbUser.lastName || tgUser?.last_name || '',
      username: dbUser.username || tgUser?.username || '',
      photo_url: tgUser?.photo_url || null,
    },
    hasResume: !!userResume,
    isAdmin,
  };
}
