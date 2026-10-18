import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { settings } from '../../schema.js';
import { config } from '../config.js';

export function normalizeChannelId(input) {
  if (!input) return null;
  const str = String(input).trim();
  if (!str) return null;
  // If it starts with @ or -100, already in valid format
  if (str.startsWith('@') || str.startsWith('-100')) {
    return str;
  }
  // If negative numeric ID without 100 prefix: e.g. -3915753507 -> -1003915753507
  if (str.startsWith('-')) {
    const rawDigits = str.slice(1);
    if (!rawDigits.startsWith('100')) {
      return `-100${rawDigits}`;
    }
    return str;
  }
  // Pure digits: e.g. 3915753507 -> -1003915753507
  if (/^\d+$/.test(str)) {
    return `-100${str}`;
  }
  // Alphanumeric username without @: e.g. EasyFindJobs -> @EasyFindJobs
  if (/^[a-zA-Z0-9_]+$/.test(str)) {
    return `@${str}`;
  }
  return str;
}

export async function getSetting(key, fallback = null) {
  try {
    const row = await db.select().from(settings).where(eq(settings.key, key)).get();
    return row ? row.value : fallback;
  } catch (err) {
    return fallback;
  }
}

export async function setSetting(key, value) {
  await db.insert(settings)
    .values({ key, value: String(value) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: String(value), updatedAt: sql`(unixepoch())` },
    })
    .run();
}

export async function getModerationChannelId() {
  const raw = await getSetting('moderation_channel_id', config.moderationChannelId);
  return normalizeChannelId(raw);
}

export async function getPublicChannelId() {
  const raw = await getSetting('public_channel_id', config.publicChannelId);
  return normalizeChannelId(raw);
}
