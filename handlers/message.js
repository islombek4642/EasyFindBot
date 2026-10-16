import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { users, vacancies } from '../schema.js';
import { config } from '../lib/config.js';
import { isUserAdmin } from '../lib/bot/auth.js';
import { buildAdminPanelMenu } from '../lib/bot/admin.js';
import { getSetting, setSetting } from '../lib/bot/settings.js';
import { t } from '../lib/locales/index.js';
import { logger } from '../lib/logger.js';
import { registerBotCommands } from '../lib/bot/setup.js';

export function buildMainReplyKeyboard(isAdmin, lang = 'uz', user = null) {
  const miniAppBaseUrl = config.miniAppUrl || 'https://app.tgcloud.ai';
  let userParams = '';
  if (user) {
    const uid = typeof user === 'object' ? user.id : user;
    const fn = typeof user === 'object' ? (user.first_name || user.firstName || '') : '';
    const ln = typeof user === 'object' ? (user.last_name || user.lastName || '') : '';
    const un = typeof user === 'object' ? (user.username || '') : '';
    userParams = `&uid=${uid}`;
    if (fn) userParams += `&first_name=${encodeURIComponent(fn)}`;
    if (ln) userParams += `&last_name=${encodeURIComponent(ln)}`;
    if (un) userParams += `&username=${encodeURIComponent(un)}`;
  }

  const rows = [
    [
      {
        text: t(lang, 'keyboard.search_jobs'),
        web_app: { url: `${miniAppBaseUrl}?startapp=jobs${userParams}` },
      },
      {
        text: t(lang, 'keyboard.post_job'),
        web_app: { url: `${miniAppBaseUrl}?startapp=post_job${userParams}` },
      },
    ],
    [
      {
        text: t(lang, 'keyboard.my_applications'),
        web_app: { url: `${miniAppBaseUrl}?startapp=my_apps${userParams}` },
      },
      {
        text: t(lang, 'keyboard.my_vacancies'),
        web_app: { url: `${miniAppBaseUrl}?startapp=my_vacs${userParams}` },
      },
    ],
    [
      { text: t(lang, 'keyboard.change_language') },
      { text: t(lang, 'keyboard.help') },
    ],
  ];

  if (isAdmin) {
    rows.push([{ text: t(lang, 'keyboard.admin_panel') }]);
  }

  return rows;
}

export function buildLanguageReplyKeyboard(lang = 'uz') {
  return [
    [
      { text: t(lang, 'keyboard.lang_uz') },
      { text: t(lang, 'keyboard.lang_ru') },
      { text: t(lang, 'keyboard.lang_en') },
    ],
    [
      { text: t(lang, 'keyboard.back') },
    ],
  ];
}

export default async function (message, ctx) {
  const chatId = message?.chat?.id;
  const userId = message?.from?.id;
  const text = message?.text?.trim() || '';
  const from = message?.from || {};

  if (!chatId || !userId) return;

  logger.info('handlers/message.js', `Incoming message from ${userId}: "${text}"`);

  // 1. Fetch or register user in users table
  let userLang = 'uz';
  let isRegistered = false;
  try {
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.tgId, Number(userId)))
      .get();

    if (existingUser) {
      userLang = existingUser.language || 'uz';
      isRegistered = true;
      if (
        (from.first_name && existingUser.firstName !== from.first_name) ||
        (from.last_name && existingUser.lastName !== from.last_name) ||
        (from.username && existingUser.username !== from.username)
      ) {
        await db.update(users).set({
          firstName: from.first_name || existingUser.firstName,
          lastName: from.last_name || existingUser.lastName,
          username: from.username || existingUser.username,
        }).where(eq(users.tgId, Number(userId))).run();
      }
    } else {
      // Auto-detect initial language
      const userLocale = (from.language_code || '').toLowerCase();
      if (userLocale.startsWith('ru')) userLang = 'ru';
      else if (userLocale.startsWith('en')) userLang = 'en';
      else userLang = 'uz';

      await db.insert(users)
        .values({
          tgId: Number(userId),
          username: from.username || null,
          firstName: from.first_name || null,
          lastName: from.last_name || null,
          language: userLang,
          role: 'seeker',
        })
        .run();
      isRegistered = true;
    }
  } catch (err) {
    logger.error('handlers/message.js', 'Error registering user', err);
  }

  const userObj = { id: userId, ...from };
  const replyKeyboard = {
    keyboard: buildMainReplyKeyboard(isAdmin, userLang, userObj),
    resize_keyboard: true,
  };

  // 2. Check if admin has pending action (e.g. setting channel ID)
  if (isAdmin && text && !text.startsWith('/')) {
    const pendingAction = await getSetting(`pending_action_${userId}`);
    if (pendingAction) {
      if (pendingAction === 'set_channel_public') {
        await setSetting('public_channel_id', text);
        await setSetting(`pending_action_${userId}`, '');
        await api.sendMessage({
          chat_id: chatId,
          text: t(userLang, 'admin.channel_updated'),
          reply_markup: replyKeyboard,
        });
        return;
      } else if (pendingAction === 'set_channel_moderation') {
        await setSetting('moderation_channel_id', text);
        await setSetting(`pending_action_${userId}`, '');
        await api.sendMessage({
          chat_id: chatId,
          text: t(userLang, 'admin.channel_updated'),
          reply_markup: replyKeyboard,
        });
        return;
      }
    }
  }

  // 3. Deep link routing: /start vac_<id>
  if (text.startsWith('/start vac_')) {
    const vacId = parseInt(text.replace('/start vac_', '').trim(), 10);
    if (!isNaN(vacId)) {
      try {
        const vacancy = await db.select().from(vacancies).where(eq(vacancies.id, vacId)).get();
        if (vacancy && vacancy.status === 'approved') {
          const appUrl = `https://t.me/${config.botUsername}/app?startapp=vac_${vacId}`;
          const cardText =
            `📌 **${vacancy.title}**\n` +
            `🏢 **${t(userLang, 'channel.company')}:** ${vacancy.companyName}\n` +
            `📂 **${t(userLang, 'channel.category')}:** #${vacancy.category}\n` +
            `📍 **${t(userLang, 'channel.region')}:** ${vacancy.region}\n\n` +
            `${t(userLang, 'channel.footer')}`;

          await api.sendMessage({
            chat_id: chatId,
            text: cardText,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: t(userLang, 'channel.btn_apply'), url: appUrl }],
              ],
            },
          });
          return;
        }
      } catch (e) {
        logger.error('handlers/message.js', 'Error fetching deep linked vacancy', e);
      }
    }
  }

  // 4. Command: /start
  if (text.startsWith('/start')) {
    try {
      await registerBotCommands();
    } catch (e) {
      // non-blocking
    }

    const welcomeText = t(userLang, 'commands.welcome', {
      name: from.first_name || 'Foydalanuvchi',
    });

    await api.sendMessage({
      chat_id: chatId,
      text: welcomeText,
      reply_markup: replyKeyboard,
    });
    return;
  }

  // 5. Command /language or Keyboard: Change Language
  if (
    text === '/language' ||
    text === t(userLang, 'keyboard.change_language') ||
    text.includes('Tilni') ||
    text.includes('Язык') ||
    text.includes('Language')
  ) {
    const langPrompt = t(userLang, 'commands.language_select');
    await api.sendMessage({
      chat_id: chatId,
      text: langPrompt,
      reply_markup: {
        keyboard: buildLanguageReplyKeyboard(userLang),
        resize_keyboard: true,
      },
    });
    return;
  }

  // 5.1 Language Selection Reply Button Handlers
  if (
    text === t(userLang, 'keyboard.lang_uz') ||
    text === "🇺🇿 O'zbekcha" ||
    text.includes("O'zbekcha")
  ) {
    await db.update(users).set({ language: 'uz' }).where(eq(users.tgId, Number(userId))).run();
    const updatedIsAdmin = await isUserAdmin(userId);
    await api.sendMessage({
      chat_id: chatId,
      text: t('uz', 'commands.language_updated'),
      reply_markup: {
        keyboard: buildMainReplyKeyboard(updatedIsAdmin, 'uz', userObj),
        resize_keyboard: true,
      },
    });
    return;
  }

  if (
    text === t(userLang, 'keyboard.lang_ru') ||
    text === "🇷🇺 Русский" ||
    text.includes("Русский")
  ) {
    await db.update(users).set({ language: 'ru' }).where(eq(users.tgId, Number(userId))).run();
    const updatedIsAdmin = await isUserAdmin(userId);
    await api.sendMessage({
      chat_id: chatId,
      text: t('ru', 'commands.language_updated'),
      reply_markup: {
        keyboard: buildMainReplyKeyboard(updatedIsAdmin, 'ru', userObj),
        resize_keyboard: true,
      },
    });
    return;
  }

  if (
    text === t(userLang, 'keyboard.lang_en') ||
    text === "🇬🇧 English" ||
    text.includes("English")
  ) {
    await db.update(users).set({ language: 'en' }).where(eq(users.tgId, Number(userId))).run();
    const updatedIsAdmin = await isUserAdmin(userId);
    await api.sendMessage({
      chat_id: chatId,
      text: t('en', 'commands.language_updated'),
      reply_markup: {
        keyboard: buildMainReplyKeyboard(updatedIsAdmin, 'en', userObj),
        resize_keyboard: true,
      },
    });
    return;
  }

  // 5.2 Back button handler from Language Reply Keyboard
  if (
    text === t(userLang, 'keyboard.back') ||
    text.includes('Orqaga') ||
    text.includes('Назад') ||
    text.includes('Back')
  ) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(userLang, 'commands.welcome', {
        name: from.first_name || 'Foydalanuvchi',
      }),
      reply_markup: replyKeyboard,
    });
    return;
  }

  // 6. Command /about or Keyboard: About Bot
  if (
    text === '/about' ||
    text === t(userLang, 'keyboard.about_bot') ||
    text.includes('Bot haqida') ||
    text.includes('О боте') ||
    text.includes('About Bot')
  ) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(userLang, 'commands.about'),
      parse_mode: 'Markdown',
      reply_markup: replyKeyboard,
    });
    return;
  }

  // 7. Command /help or Keyboard: Help
  if (
    text === '/help' ||
    text === '/yordam' ||
    text === t(userLang, 'keyboard.help') ||
    text.includes('Yordam') ||
    text.includes('Помощь') ||
    text.includes('Help')
  ) {
    await api.sendMessage({
      chat_id: chatId,
      text: t(userLang, 'commands.help'),
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t(userLang, 'commands.btn_contact_admin'),
              url: `tg://user?id=${config.superAdminTgId}`,
            },
          ],
        ],
      },
    });
    return;
  }

  // 8. Command /admin or Keyboard: Admin Panel
  if (
    text === '/admin' ||
    text === t(userLang, 'keyboard.admin_panel') ||
    text.includes('Admin panel') ||
    text.includes('Админ панель')
  ) {
    if (!isAdmin) {
      await api.sendMessage({
        chat_id: chatId,
        text: t(userLang, 'commands.unauthorized'),
        reply_markup: replyKeyboard,
      });
      return;
    }

    const adminMenu = buildAdminPanelMenu(userLang);
    await api.sendMessage({
      chat_id: chatId,
      text: adminMenu.text,
      parse_mode: 'Markdown',
      reply_markup: adminMenu.reply_markup,
    });
    return;
  }

  // 9. Default fallback: prompt user with Reply Keyboard
  await api.sendMessage({
    chat_id: chatId,
    text: t(userLang, 'commands.welcome', {
      name: from.first_name || 'Foydalanuvchi',
    }),
    reply_markup: replyKeyboard,
  });
}
