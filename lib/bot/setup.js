import { api } from 'sdk';
import { logger } from '../logger.js';

export async function registerBotCommands() {
  try {
    // 1. Default (Uzbek) commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: 'Botni ishga tushirish / Bosh sahifa' },
        { command: 'jobs', description: "Vakansiyalarni ko'rish" },
        { command: 'post_job', description: "Yangi vakansiya e'lon qilish" },
        { command: 'resumes', description: 'Mutaxassislar bazasi' },
        { command: 'admin', description: 'Admin panel' },
        { command: 'language', description: 'Tilni almashtirish' },
        { command: 'about', description: 'Bot haqida ma\'lumot' },
        { command: 'help', description: 'Yordam va qo\'llanma' },
      ],
    });

    // 2. Russian commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: 'Запустить бота / Главная' },
        { command: 'jobs', description: 'Поиск вакансий' },
        { command: 'post_job', description: 'Разместить вакансию' },
        { command: 'resumes', description: 'База специалистов' },
        { command: 'admin', description: 'Панель администратора' },
        { command: 'language', description: 'Сменить язык' },
        { command: 'about', description: 'О боте' },
        { command: 'help', description: 'Помощь' },
      ],
      language_code: 'ru',
    });

    // 3. English commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: 'Start bot / Home' },
        { command: 'jobs', description: 'Browse vacancies' },
        { command: 'post_job', description: 'Post a vacancy' },
        { command: 'resumes', description: 'Talent database' },
        { command: 'admin', description: 'Admin panel' },
        { command: 'language', description: 'Change language' },
        { command: 'about', description: 'About bot' },
        { command: 'help', description: 'Help & manual' },
      ],
      language_code: 'en',
    });

    logger.info('lib/bot/setup.js', 'Bot commands registered successfully across uz, ru, en');
    return { ok: true };
  } catch (err) {
    logger.error('lib/bot/setup.js', 'Failed to register bot commands', err);
    throw err;
  }
}
