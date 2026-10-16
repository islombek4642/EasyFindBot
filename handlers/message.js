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

export function buildMainReplyKeyboard(isAdmin, lang = 'uz') {
  const miniAppBaseUrl = config.miniAppUrl || 'https://app.tgcloud.ai';

  const rows = [
    [
      {
        text: t(lang, 'keyboard.search_jobs'),
        web_app: { url: `${miniAppBaseUrl}?startapp=jobs` },
      },
      {
        text: t(lang, 'keyboard.post_job'),
        web_app: { url: `${miniAppBaseUrl}?startapp=post_job` },
      },
    ],
    [
      {
        text: t(lang, 'keyboard.my_applications'),
        web_app: { url: `${miniAppBaseUrl}?startapp=my_apps` },
      },
      {
        text: t(lang, 'keyboard.my_vacancies'),
        web_app: { url: `${miniAppBaseUrl}?startapp=my_vacs` },
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

  const isAdmin = await isUserAdmin(userId);
  const replyKeyboard = {
    keyboard: buildMainReplyKeyboard(isAdmin, userLang),
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
        inline_keyboard: [
          [
            { text: "🇺🇿 O'zbekcha", callback_data: "set_lang:uz" },
            { text: "🇷🇺 Русский", callback_data: "set_lang:ru" },
            { text: "🇬🇧 English", callback_data: "set_lang:en" },
          ],
        ],
      },
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
      reply_markup: replyKeyboard,
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
