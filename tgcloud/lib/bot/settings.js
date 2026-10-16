import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { settings } from '../../schema.js';
import { config } from '../config.js';

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
  return await getSetting('moderation_channel_id', config.moderationChannelId);
}

export async function getPublicChannelId() {
  return await getSetting('public_channel_id', config.publicChannelId);
}
