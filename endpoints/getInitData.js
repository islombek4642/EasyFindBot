import { db } from 'sdk';
import { eq } from 'sdk/db';
import { users, resumes } from '../schema.js';
import { isUserAdmin, getAuthenticatedUserId } from '../lib/bot/auth.js';

export default async function (input, ctx) {
  const tgUser = ctx?.initData?.user;
  const userId = getAuthenticatedUserId(ctx, input);
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const firstName = tgUser?.first_name || input?.firstName || input?.first_name || null;
  const lastName = tgUser?.last_name || input?.lastName || input?.last_name || null;
  const username = tgUser?.username || input?.username || null;
  const userLang = tgUser?.language_code || input?.language || 'uz';

  let dbUser = await db.select().from(users).where(eq(users.tgId, userId)).get();

  if (!dbUser) {
    const defaultLang = userLang.startsWith('ru')
      ? 'ru'
      : userLang.startsWith('en')
      ? 'en'
      : 'uz';

    await db.insert(users)
      .values({
        tgId: userId,
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'seeker',
        language: defaultLang,
      })
      .run();

    dbUser = await db.select().from(users).where(eq(users.tgId, userId)).get();
  } else {
    const shouldUpdate =
      (firstName && dbUser.firstName !== firstName) ||
      (lastName && dbUser.lastName !== lastName) ||
      (username && dbUser.username !== username);

    if (shouldUpdate) {
      await db.update(users)
        .set({
          firstName: firstName || dbUser.firstName,
          lastName: lastName || dbUser.lastName,
          username: username || dbUser.username,
        })
        .where(eq(users.tgId, userId))
        .run();
      dbUser.firstName = firstName || dbUser.firstName;
      dbUser.lastName = lastName || dbUser.lastName;
      dbUser.username = username || dbUser.username;
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
