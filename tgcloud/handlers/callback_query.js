import { api, db } from 'sdk';
import { eq, sql, count } from 'sdk/db';
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
import { buildModerationCard } from '../lib/bot/moderator.js';
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

  // 3. Moderation Actions: mod_approve:<id> or mod_reject:<id>
  if (data.startsWith('mod_approve:') || data.startsWith('mod_reject:')) {
    const isApproved = data.startsWith('mod_approve:');
    const vacId = parseInt(data.split(':')[1], 10);

    const isAdmin = await isUserAdmin(fromId);
    if (!isAdmin) {
      await ack(t(userLang, 'commands.unauthorized'), true);
      return;
    }

    // Race condition protection: Check status
    const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
    if (!vacancy || vacancy.status !== 'pending') {
      await ack(t(userLang, 'commands.already_reviewed'), true);
      return;
    }

    const moderatorUsername = callbackQuery.from?.username || fromId;
    const nowIso = new Date().toISOString();

    if (isApproved) {
      await db.update(vacancies)
        .set({
          status: 'approved',
          moderatedByTgId: Number(fromId),
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(vacancies.id, vacId))
        .run();

      await ack(t(userLang, 'moderation.status_approved'));

      // Edit moderation message in place (removes buttons, appends approval record)
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
    } else {
      await db.update(vacancies)
        .set({
          status: 'rejected',
          moderatedByTgId: Number(fromId),
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(vacancies.id, vacId))
        .run();

      await ack(t(userLang, 'moderation.status_rejected'));

      // Edit moderation message in place
      if (chatId && messageId) {
        const rejectedTag =
          `\n\n<b>${escapeHtml(t(userLang, 'moderation.status_rejected'))}</b>\n` +
          `👤 ${escapeHtml(t(userLang, 'moderation.moderator'))}: @${escapeHtml(moderatorUsername)}\n` +
          `⏰ ${escapeHtml(t(userLang, 'moderation.time'))}: ${nowIso}`;

        try {
          await api.editMessageText({
            chat_id: chatId,
            message_id: messageId,
            text: (msg?.text || '') + rejectedTag,
            parse_mode: 'HTML',
          });
        } catch (e) {
          logger.warn('handlers/callback_query.js', 'Could not edit moderation message', e);
        }
      }

      await notifyEmployer(api, vacancy.employerTgId, vacancy, 'rejected');
    }
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
        const [totalU] = await db.select({ value: count() }).from(users);
        const [seekersU] = await db.select({ value: count() }).from(users).where(eq(users.role, 'seeker'));
        const [employersU] = await db.select({ value: count() }).from(users).where(eq(users.role, 'employer'));
        const [totalV] = await db.select({ value: count() }).from(vacancies);
        const [activeV] = await db.select({ value: count() }).from(vacancies).where(eq(vacancies.status, 'approved'));
        const [pendingV] = await db.select({ value: count() }).from(vacancies).where(eq(vacancies.status, 'pending'));
        const [totalA] = await db.select({ value: count() }).from(applications);
        const [totalR] = await db.select({ value: count() }).from(resumes);

        const statsData = {
          totalUsers: totalU?.value || 0,
          seekers: seekersU?.value || 0,
          employers: employersU?.value || 0,
          totalVacancies: totalV?.value || 0,
          activeVacancies: activeV?.value || 0,
          pendingVacancies: pendingV?.value || 0,
          totalApplications: totalA?.value || 0,
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
    if (data === 'admin:queue') {
      const pendingList = await db.select()
        .from(vacancies)
        .where(eq(vacancies.status, 'pending'))
        .all();

      if (!pendingList || pendingList.length === 0) {
        if (chatId && messageId) {
          await api.editMessageText({
            chat_id: chatId,
            message_id: messageId,
            text: escapeHtml(t(userLang, 'admin.queue_empty')),
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

      // Display the first pending vacancy card with review buttons
      const firstVacancy = pendingList[0];
      const card = buildModerationCard(firstVacancy, userLang);
      card.reply_markup.inline_keyboard.push([
        { text: t(userLang, 'common.back'), callback_data: 'admin:menu' },
      ]);

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
          logger.error('handlers/callback_query.js', 'Error editing message for admin queue', err);
        }
      }
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
