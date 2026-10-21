import { api } from 'sdk';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { t } from '../locales/index.js';

export async function registerBotCommands() {
  try {
    // --------------------------------------------------------------------------
    // 1. Descriptions (What can this bot do? - shown before /start)
    // --------------------------------------------------------------------------
    await api.setMyDescription({
      description: t('uz', 'bot_setup.desc_long'),
    });

    await api.setMyDescription({
      description: t('ru', 'bot_setup.desc_long'),
      language_code: 'ru',
    });

    await api.setMyDescription({
      description: t('en', 'bot_setup.desc_long'),
      language_code: 'en',
    });

    // --------------------------------------------------------------------------
    // 2. Short Descriptions (Shown on bot profile and link sharing)
    // --------------------------------------------------------------------------
    await api.setMyShortDescription({
      short_description: t('uz', 'bot_setup.desc_short'),
    });

    await api.setMyShortDescription({
      short_description: t('ru', 'bot_setup.desc_short'),
      language_code: 'ru',
    });

    await api.setMyShortDescription({
      short_description: t('en', 'bot_setup.desc_short'),
      language_code: 'en',
    });

    // --------------------------------------------------------------------------
    // 3. Bot Command Menu (only /start)
    // --------------------------------------------------------------------------
    // Default (Uzbek) commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: t('uz', 'bot_setup.cmd_start') },
      ],
    });

    // Russian commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: t('ru', 'bot_setup.cmd_start') },
      ],
      language_code: 'ru',
    });

    // English commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: t('en', 'bot_setup.cmd_start') },
      ],
      language_code: 'en',
    });

    // --------------------------------------------------------------------------
    // 4. Set WebApp Chat Menu Button (permanent bottom-left button)
    // --------------------------------------------------------------------------
    const appUrl = config.miniAppUrl || 'https://app8716517896.tgcloud.ai';
    try {
      await api.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: t('uz', 'bot_setup.btn_app'),
          web_app: { url: appUrl },
        },
      });
    } catch (e) {
      logger.warn('lib/bot/setup.js', 'Failed to setChatMenuButton', e);
    }

    logger.info('lib/bot/setup.js', 'Bot descriptions, commands and menu button registered successfully across uz, ru, en');
    return { ok: true };
  } catch (err) {
    logger.error('lib/bot/setup.js', 'Failed to register bot descriptions/commands', err);
    throw err;
  }
}
