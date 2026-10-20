import { db } from 'sdk';
import { eq, and } from 'sdk/db';
import { users } from '../../schema.js';
import { config } from '../config.js';

export function isUserSuperAdmin(tgId) {
  if (!tgId) return false;
  return config.superAdminTgId && Number(tgId) === Number(config.superAdminTgId);
}

export async function isUserAdmin(tgId) {
  if (!tgId) return false;
  if (isUserSuperAdmin(tgId)) {
    return true;
  }
  try {
    const user = await db.select({ role: users.role })
      .from(users)
      .where(and(eq(users.tgId, Number(tgId)), eq(users.role, 'admin')))
      .get();
    return !!user;
  } catch (err) {
    return false;
  }
}

export async function getAllAdminTgIds() {
  const ids = [];
  try {
    const adminUsers = await db.select({ tgId: users.tgId })
      .from(users)
      .where(eq(users.role, 'admin'))
      .all();
    for (const u of adminUsers) {
      if (u.tgId && !ids.includes(u.tgId)) {
        ids.push(u.tgId);
      }
    }
  } catch (err) {
    // fallback to superAdmin
  }

  if (config.superAdminTgId && !ids.includes(Number(config.superAdminTgId))) {
    ids.unshift(Number(config.superAdminTgId));
  }
  return ids;
}

export function getAuthenticatedUserId(ctx, input = {}) {
  // 1. Primary: Cryptographically verified user from Telegram WebApp context
  if (ctx?.initData?.user?.id) {
    return Number(ctx.initData.user.id);
  }
  if (ctx?.user?.id) {
    return Number(ctx.user.id);
  }
  if (ctx?.sender?.id) {
    return Number(ctx.sender.id);
  }

  // 2. Parse raw initData query string if present on ctx
  if (typeof ctx?.initData === 'string' && ctx.initData.length > 0) {
    try {
      const params = new URLSearchParams(ctx.initData);
      const userRaw = params.get('user');
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (parsed?.id) return Number(parsed.id);
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback for development/testing environments
  if (input?.uid) {
    return Number(input.uid);
  }
  if (input?.userId) {
    return Number(input.userId);
  }
  return null;
}
