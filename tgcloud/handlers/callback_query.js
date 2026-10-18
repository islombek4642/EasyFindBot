import { api, db } from 'sdk';
import { eq, sql, count, asc } from 'sdk/db';
import { users, vacancies, applications, resumes } from '../schema.js';
import { isUserAdmin, isUserSuperAdmin } from '../lib/bot/auth.js';
import { config } from '../lib/config.js';
import {
  buildAdminPanelMenu,
  buildStatsReport,
  buildChannelSettingsMenu,
  buildManageAdminsMenu,
  buildRemoveAdminMenu,
} from '../lib/bot/admin.js';
import { buildModerationCard, buildRejectReasonsMenu } from '../lib/bot/moderator.js';
import { publishToChannel } from '../lib/bot/channel.js';
import { notifyEmployer, notifySubscribers } from '../lib/bot/notifier.js';
import { getModerationChannelId, getPublicChannelId, setSetting, deleteSetting } from '../lib/bot/settings.js';
import { t } from '../lib/locales/index.js';
import { logger } from '../lib/logger.js';
import { escapeHtml, mdToHtml } from '../lib/bot/html.js';
import { buildMainReplyKeyboard } from './message.js';

export default async function (callbackQuery, ctx) {
  const data = callbackQuery?.data || '';
  const fromId = callbackQuery?.from?.id;
  const msg = callbackQuery?.message;
  const chatId = msg?.chat?.id;
  const messageId = msg?.message_id;

  if (!fromId) return;

  logger.info('handlers/callback_query.js', `Callback from ${fromId}: "${data}"`);

  // 1. Determine user language
  let userLang = 'uz';
  try {
    const user = await db.select({ language: users.language })
      .from(users)
      .where(eq(users.tgId, Number(fromId)))
      .get();
    if (user?.language) userLang = user.language;
  } catch (e) {
    // fallback uz
  }

  // Helper to answer callback query
  const ack = async (text = '', showAlert = false) => {
    try {
      await api.answerCallbackQuery({
        callback_query_id: callbackQuery.id,
        text,
        show_alert: showAlert,
      });
    } catch (e) {
      // Ignore ack failure
    }
  };

  // Helper to render moderation queue step in-place
  const renderQueueStep = async (targetIdx = 0, isEmptyInitial = false) => {
    const remaining = await db.select()
      .from(vacancies)
      .where(eq(vacancies.status, 'pending'))
      .orderBy(asc(vacancies.createdAt))
      .all();

    if (!remaining || remaining.length === 0) {
      if (chatId && messageId) {
        const emptyMsg = isEmptyInitial ? t(userLang, 'admin.queue_empty') : t(userLang, 'admin.queue_all_done');
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: mdToHtml(emptyMsg),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: t(userLang, 'commands.back'), callback_data: 'admin:menu' }],
            ],
          },
        });
      }
      return;
    }

    const safeIdx = Math.max(0, Math.min(targetIdx, remaining.length - 1));
    const card = buildModerationCard(remaining[safeIdx], userLang, { index: safeIdx, total: remaining.length });
    if (chatId && messageId) {
      try {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: card.text,
          parse_mode: 'HTML',
          reply_markup: card.reply_markup,
        });
      } catch (err) {
        logger.error('handlers/callback_query.js', 'Error editing message in renderQueueStep', err);
      }
    }
  };

  // 2. Language Switch: set_lang:<lang>
  if (data.startsWith('set_lang:')) {
    const newLang = data.split(':')[1] || 'uz';
    try {
      await db.update(users)
        .set({ language: newLang })
        .where(eq(users.tgId, Number(fromId)))
        .run();
    } catch (err) {
      logger.error('handlers/callback_query.js', 'Error updating language', err);
    }

    await ack(t(newLang, 'commands.language_updated'));

    const isAdmin = await isUserAdmin(fromId);
    if (chatId) {
      await api.sendMessage({
        chat_id: chatId,
        text: t(newLang, 'commands.language_updated'),
        reply_markup: {
          keyboard: buildMainReplyKeyboard(isAdmin, newLang, fromId),
          resize_keyboard: true,
        },
      });
    }
    return;
  }

  // 2.1 Noop pagination callback
  if (data === 'noop') {
    await ack();
    return;
  }

  // 2.2 Cancel channel reject prompt
  if (data.startsWith('mod_cancel_reject:')) {
    const vacId = parseInt(data.split(':')[1], 10);
    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
    if (vacancy && vacancy.status === 'pending') {
      const card = buildModerationCard(vacancy, userLang);
      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: card.text,
          parse_mode: 'HTML',
          reply_markup: card.reply_markup,
        });
      }
    }
    await ack();
    return;
  }

  // 2.3 Reject reasons prompt in queue
  if (data.startsWith('mod_reject_prompt:')) {
    const isAdmin = await isUserAdmin(fromId);
    if (!isAdmin) {
      await ack(t(userLang, 'commands.unauthorized'), true);
      return;
    }
    const parts = data.split(':');
    const vacId = parseInt(parts[1], 10);
    const queueIdx = parseInt(parts[2] || '0', 10);
    const menu = buildRejectReasonsMenu(vacId, queueIdx, userLang);
    if (chatId && messageId) {
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: mdToHtml(menu.text),
        parse_mode: 'HTML',
        reply_markup: menu.reply_markup,
      });
    }
    await ack();
    return;
  }

  // 2.4 Prompt for custom rejection reason
  if (data.startsWith('mod_reject_custom:')) {
    const isAdmin = await isUserAdmin(fromId);
    if (!isAdmin) {
      await ack(t(userLang, 'commands.unauthorized'), true);
      return;
    }
    const parts = data.split(':');
    const vacId = parseInt(parts[1], 10);
    const queueIdx = parseInt(parts[2] || '0', 10);
    await setSetting(`pending_action_${fromId}`, `custom_reject:${vacId}:${queueIdx}`);
    if (chatId && messageId) {
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: mdToHtml(t(userLang, 'moderation.prompt_custom_reason')),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: t(userLang, 'admin.btn_cancel'), callback_data: `admin:queue:${queueIdx}` }],
          ],
        },
      });
    }
    await ack();
    return;
  }

  // 2.5 Submit selected rejection reason
  if (data.startsWith('mod_reject_reason:')) {
    const isAdmin = await isUserAdmin(fromId);
    if (!isAdmin) {
      await ack(t(userLang, 'commands.unauthorized'), true);
      return;
    }
    const parts = data.split(':');
    const vacId = parseInt(parts[1], 10);
    const queueCtx = parts[2];
    const reasonKey = parts[3];

    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
    if (!vacancy || vacancy.status !== 'pending') {
      await ack(t(userLang, 'commands.already_reviewed'), true);
      if (queueCtx !== 'channel') {
        await renderQueueStep(parseInt(queueCtx, 10) || 0);
      }
      return;
    }

    let employerLang = 'uz';
    try {
      const empUser = await db.select({ language: users.language }).from(users).where(eq(users.tgId, vacancy.employerTgId)).get();
      if (empUser?.language) employerLang = empUser.language;
    } catch (e) {}

    const reasonText = t(employerLang, `moderation.reason_${reasonKey}`);

    await db.update(vacancies)
      .set({
        status: 'rejected',
        rejectionReason: reasonText,
        moderatedByTgId: Number(fromId),
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(vacancies.id, vacId))
      .run();

    await ack(t(userLang, 'moderation.status_rejected'));

    const moderatorUsername = callbackQuery.from?.username || fromId;
    const nowIso = new Date().toISOString();

    await notifyEmployer(api, vacancy.employerTgId, vacancy, 'rejected', reasonText);

    if (queueCtx === 'channel') {
      if (chatId && messageId) {
        const rejectedTag =
          `\n\n<b>${escapeHtml(t(userLang, 'moderation.status_rejected'))}</b>\n` +
          `👤 ${escapeHtml(t(userLang, 'moderation.moderator'))}: @${escapeHtml(moderatorUsername)}\n` +
          `⏰ ${escapeHtml(t(userLang, 'moderation.time'))}: ${nowIso}\n` +
          `⚠️ <b>${escapeHtml(t(userLang, 'notifier.emp_rejected_reason').replace(/\*\*/g, '').replace(/⚠️\s*/g, ''))}</b> ${escapeHtml(reasonText)}`;

        try {
          await api.editMessageText({
            chat_id: chatId,
            message_id: messageId,
            text: (msg?.text || '') + rejectedTag,
            parse_mode: 'HTML',
          });
        } catch (e) {
          logger.warn('handlers/callback_query.js', 'Could not edit channel message on reject', e);
        }
      }
    } else {
      await renderQueueStep(parseInt(queueCtx, 10) || 0);
    }
    return;
  }

  // 2.6 Reject triggered from channel without reason yet
  if (data.startsWith('mod_reject:')) {
    const isAdmin = await isUserAdmin(fromId);
    if (!isAdmin) {
      await ack(t(userLang, 'commands.unauthorized'), true);
      return;
    }
    const vacId = parseInt(data.split(':')[1], 10);
    const menu = buildRejectReasonsMenu(vacId, 'channel', userLang);
    if (chatId && messageId) {
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: mdToHtml(menu.text),
        parse_mode: 'HTML',
        reply_markup: menu.reply_markup,
      });
    }
    await ack();
    return;
  }

  // 3. Moderation Approval: mod_approve:<id> or mod_approve:<id>:<idx>
  if (data.startsWith('mod_approve:')) {
    const parts = data.split(':');
    const vacId = parseInt(parts[1], 10);
    const queueIdxStr = parts[2];

    const isAdmin = await isUserAdmin(fromId);
    if (!isAdmin) {
      await ack(t(userLang, 'commands.unauthorized'), true);
      return;
    }

    // Race condition protection: Check status
    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
    if (!vacancy || vacancy.status !== 'pending') {
      await ack(t(userLang, 'commands.already_reviewed'), true);
      if (queueIdxStr !== undefined) {
        await renderQueueStep(parseInt(queueIdxStr, 10) || 0);
      }
      return;
    }

    const moderatorUsername = callbackQuery.from?.username || fromId;
    const nowIso = new Date().toISOString();

    await db.update(vacancies)
      .set({
        status: 'approved',
        moderatedByTgId: Number(fromId),
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(vacancies.id, vacId))
      .run();

    await ack(t(userLang, 'moderation.status_approved'));

    if (queueIdxStr === undefined) {
      // Edit moderation message in channel (removes buttons, appends approval record)
      if (chatId && messageId) {
        const approvedTag =
          `\n\n<b>${escapeHtml(t(userLang, 'moderation.status_approved'))}</b>\n` +
          `👤 ${escapeHtml(t(userLang, 'moderation.moderator'))}: @${escapeHtml(moderatorUsername)} (<code>${fromId}</code>)\n` +
          `⏰ ${escapeHtml(t(userLang, 'moderation.time'))}: ${nowIso}`;

        try {
          await api.editMessageText({
            chat_id: chatId,
            message_id: messageId,
            text: (msg?.text || '') + approvedTag,
            parse_mode: 'HTML',
          });
        } catch (e) {
          logger.warn('handlers/callback_query.js', 'Could not edit moderation message', e);
        }
      }
    } else {
      // In bot admin queue: automatically advance to next pending vacancy
      await renderQueueStep(parseInt(queueIdxStr, 10) || 0);
    }

    // Publish to public channel & send notifications
    const channelMsgId = await publishToChannel(api, vacancy, userLang);
    if (channelMsgId) {
      await db.update(vacancies)
        .set({ channelMessageId: channelMsgId })
        .where(eq(vacancies.id, vacId))
        .run();
    }

    await notifyEmployer(api, vacancy.employerTgId, vacancy, 'approved');
    await notifySubscribers(api, vacancy);
    return;
  }

  // 4. Admin Panel Callbacks
  if (data.startsWith('admin:')) {
    const isAdmin = await isUserAdmin(fromId);
    if (!isAdmin) {
      await ack(t(userLang, 'commands.unauthorized'), true);
      return;
    }

    await ack();

    // 4.1. Admin Menu (In-place return)
    if (data === 'admin:menu') {
      const isSuper = isUserSuperAdmin(fromId);
      const menu = buildAdminPanelMenu(userLang, isSuper);
      if (chatId && messageId) {
        try {
          await api.editMessageText({
            chat_id: chatId,
            message_id: messageId,
            text: mdToHtml(menu.text),
            parse_mode: 'HTML',
            reply_markup: menu.reply_markup,
          });
        } catch (err) {
          logger.error('handlers/callback_query.js', 'Error editing admin:menu', err);
        }
      }
      return;
    }

    // 4.2. Admin Stats
    if (data === 'admin:stats') {
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        const dayAgoSec = nowSec - 86400;
        const weekAgoSec = nowSec - 7 * 86400;

        const [totalU] = await db.select({ value: count() }).from(users);
        const [dayU] = await db.select({ value: count() }).from(users).where(sql`(${users.createdAt} >= ${dayAgoSec} OR ${users.createdAt} >= ${dayAgoSec * 1000})`);
        const [weekU] = await db.select({ value: count() }).from(users).where(sql`(${users.createdAt} >= ${weekAgoSec} OR ${users.createdAt} >= ${weekAgoSec * 1000})`);
        const [seekersU] = await db.select({ value: count() }).from(users).where(eq(users.role, 'seeker'));
        const [employersU] = await db.select({ value: count() }).from(users).where(eq(users.role, 'employer'));

        const [totalV] = await db.select({ value: count() }).from(vacancies);
        const [dayV] = await db.select({ value: count() }).from(vacancies).where(sql`(${vacancies.createdAt} >= ${dayAgoSec} OR ${vacancies.createdAt} >= ${dayAgoSec * 1000})`);
        const [weekV] = await db.select({ value: count() }).from(vacancies).where(sql`(${vacancies.createdAt} >= ${weekAgoSec} OR ${vacancies.createdAt} >= ${weekAgoSec * 1000})`);
        const [activeV] = await db.select({ value: count() }).from(vacancies).where(eq(vacancies.status, 'approved'));
        const [pendingV] = await db.select({ value: count() }).from(vacancies).where(eq(vacancies.status, 'pending'));

        const [totalA] = await db.select({ value: count() }).from(applications);
        const [dayA] = await db.select({ value: count() }).from(applications).where(sql`(${applications.createdAt} >= ${dayAgoSec} OR ${applications.createdAt} >= ${dayAgoSec * 1000})`);
        const [totalR] = await db.select({ value: count() }).from(resumes);

        const statsData = {
          totalUsers: totalU?.value || 0,
          newUsers24h: dayU?.value || 0,
          newUsers7d: weekU?.value || 0,
          seekers: seekersU?.value || 0,
          employers: employersU?.value || 0,
          totalVacancies: totalV?.value || 0,
          newVacancies24h: dayV?.value || 0,
          newVacancies7d: weekV?.value || 0,
          activeVacancies: activeV?.value || 0,
          pendingVacancies: pendingV?.value || 0,
          totalApplications: totalA?.value || 0,
          newApplications24h: dayA?.value || 0,
          totalResumes: totalR?.value || 0,
        };

        const statsReport = buildStatsReport(statsData, userLang);
        if (chatId && messageId) {
          await api.editMessageText({
            chat_id: chatId,
            message_id: messageId,
            text: mdToHtml(statsReport.text),
            parse_mode: 'HTML',
            reply_markup: statsReport.reply_markup,
          });
        }
      } catch (err) {
        logger.error('handlers/callback_query.js', 'Error gathering stats', err);
      }
      return;
    }

    // 4.3. Channel Settings Menu (SuperAdmin only)
    if (data === 'admin:channels') {
      if (!isUserSuperAdmin(fromId)) {
        await ack(t(userLang, 'admin.unauthorized_action'), true);
        return;
      }

      const modChannel = await getModerationChannelId();
      const pubChannel = await getPublicChannelId();
      const menu = buildChannelSettingsMenu(modChannel, pubChannel, userLang);
      if (chatId && messageId) {
        try {
          await api.editMessageText({
            chat_id: chatId,
            message_id: messageId,
            text: mdToHtml(menu.text),
            parse_mode: 'HTML',
            reply_markup: menu.reply_markup,
          });
        } catch (err) {
          logger.error('handlers/callback_query.js', 'Error editing admin:channels', err);
        }
      }
      return;
    }

    // 4.31. Test Channel connection (SuperAdmin only)
    if (data === 'admin:test_channel:public' || data === 'admin:test_channel:moderation') {
      if (!isUserSuperAdmin(fromId)) {
        await ack(t(userLang, 'admin.unauthorized_action'), true);
        return;
      }
      const isPublic = data === 'admin:test_channel:public';
      const channelId = isPublic ? await getPublicChannelId() : await getModerationChannelId();

      if (!channelId) {
        await ack(t(userLang, 'admin.channels_not_configured'), true);
        return;
      }

      try {
        const testMsg = await api.sendMessage({
          chat_id: channelId,
          text: `🧪 <b>${escapeHtml(t(userLang, 'admin.channels_test_msg'))}</b>`,
          parse_mode: 'HTML',
        });
        if (testMsg?.message_id) {
          try {
            await api.deleteMessage({ chat_id: channelId, message_id: testMsg.message_id });
          } catch (e) {
            // Ignore delete error
          }
        }
        await ack(t(userLang, 'admin.channels_test_success'), true);
      } catch (err) {
        logger.warn('handlers/callback_query.js', `Channel test failed for ${channelId}:`, err);
        const errMsg = err?.description || err?.message || '';
        await ack(t(userLang, 'admin.channels_test_failed') + (errMsg ? `\n\n(${errMsg})` : ''), true);
      }
      return;
    }

    // 4.4. Set Channels (prompt state)
    if (data === 'admin:set_channel:public') {
      await setSetting(`pending_action_${fromId}`, 'set_channel_public');
      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: t(userLang, 'admin.channels_prompt_public'),
          reply_markup: {
            inline_keyboard: [
              [{ text: t(userLang, 'common.back'), callback_data: 'admin:channels' }],
            ],
          },
        });
      }
      return;
    }

    if (data === 'admin:set_channel:moderation') {
      await setSetting(`pending_action_${fromId}`, 'set_channel_moderation');
      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: t(userLang, 'admin.channels_prompt_mod'),
          reply_markup: {
            inline_keyboard: [
              [{ text: t(userLang, 'common.back'), callback_data: 'admin:channels' }],
            ],
          },
        });
      }
      return;
    }

    // 4.5. Moderation Queue from Bot Admin Panel
    if (data === 'admin:queue' || data.startsWith('admin:queue:')) {
      let idx = 0;
      const isInitial = data === 'admin:queue';
      if (data.startsWith('admin:queue:')) {
        idx = parseInt(data.split(':')[2], 10) || 0;
      }
      await renderQueueStep(idx, isInitial);
      return;
    }

    // 4.6. Manage Admins (SuperAdmin only)
    if (data === 'admin:manage_admins') {
      if (!isUserSuperAdmin(fromId)) {
        await ack(t(userLang, 'admin.unauthorized_action'), true);
        return;
      }

      const superAdminUser = await db.select().from(users).where(eq(users.tgId, Number(config.superAdminTgId))).get();
      const currentAdmins = await db.select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .all();

      const menu = buildManageAdminsMenu(currentAdmins, superAdminUser, userLang);
      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: 'HTML',
          reply_markup: menu.reply_markup,
        });
      }
      return;
    }

    // 4.7. Prompt Add Admin
    if (data === 'admin:add_admin') {
      if (!isUserSuperAdmin(fromId)) {
        await ack(t(userLang, 'admin.unauthorized_action'), true);
        return;
      }

      await setSetting(`pending_action_${fromId}`, 'add_admin');
      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: t(userLang, 'admin.prompt_add_admin'),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: t(userLang, 'admin.btn_cancel'), callback_data: 'admin:cancel_pending' }],
            ],
          },
        });
      }
      return;
    }

    // 4.8. Cancel Pending Admin Action
    if (data === 'admin:cancel_pending') {
      await setSetting(`pending_action_${fromId}`, '');
      const superAdminUser = await db.select().from(users).where(eq(users.tgId, Number(config.superAdminTgId))).get();
      const currentAdmins = await db.select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .all();

      const menu = buildManageAdminsMenu(currentAdmins, superAdminUser, userLang);
      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: 'HTML',
          reply_markup: menu.reply_markup,
        });
      }
      return;
    }

    // 4.9. List Admins to Remove
    if (data === 'admin:remove_admin_list') {
      if (!isUserSuperAdmin(fromId)) {
        await ack(t(userLang, 'admin.unauthorized_action'), true);
        return;
      }

      const regularAdmins = await db.select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .all();

      const filtered = regularAdmins.filter((a) => Number(a.tgId) !== Number(config.superAdminTgId));
      if (filtered.length === 0) {
        await ack(t(userLang, 'admin.no_regular_admins'), true);
        return;
      }

      const menu = buildRemoveAdminMenu(filtered, userLang);
      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: 'HTML',
          reply_markup: menu.reply_markup,
        });
      }
      return;
    }

    // 4.10. Remove specific admin: admin:remove:<tgId>
    if (data.startsWith('admin:remove:')) {
      if (!isUserSuperAdmin(fromId)) {
        await ack(t(userLang, 'admin.unauthorized_action'), true);
        return;
      }

      const targetTgId = Number(data.replace('admin:remove:', ''));
      if (targetTgId === Number(config.superAdminTgId)) {
        await ack(t(userLang, 'admin.cannot_remove_superadmin'), true);
        return;
      }

      await db.update(users)
        .set({ role: 'seeker' })
        .where(eq(users.tgId, targetTgId))
        .run();

      await ack(t(userLang, 'admin.admin_removed_success'), true);

      // Notify removed user
      try {
        await api.sendMessage({
          chat_id: targetTgId,
          text: t('uz', 'admin.admin_notify_revoked'),
        });
      } catch (err) {
        // user may have blocked bot
      }

      // Re-render manage admins menu
      const superAdminUser = await db.select().from(users).where(eq(users.tgId, Number(config.superAdminTgId))).get();
      const currentAdmins = await db.select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .all();

      const menu = buildManageAdminsMenu(currentAdmins, superAdminUser, userLang);
      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: menu.text,
          parse_mode: 'HTML',
          reply_markup: menu.reply_markup,
        });
      }
      return;
    }

    // 4.11. Broadcast Placeholder (SuperAdmin only)
    if (data === 'admin:broadcast') {
      if (!isUserSuperAdmin(fromId)) {
        await ack(t(userLang, 'admin.unauthorized_action'), true);
        return;
      }

      if (chatId && messageId) {
        await api.editMessageText({
          chat_id: chatId,
          message_id: messageId,
          text: `📢 <b>${escapeHtml(t(userLang, 'admin.btn_broadcast'))}</b>\n\n<i>Tez kunda...</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: t(userLang, 'common.back'), callback_data: 'admin:menu' }],
            ],
          },
        });
      }
      return;
    }
  }
}
