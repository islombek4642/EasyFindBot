import { api } from 'sdk';
import { logger } from '../logger.js';

export async function registerBotCommands() {
  try {
    // --------------------------------------------------------------------------
    // 1. Descriptions (What can this bot do? - shown before /start)
    // --------------------------------------------------------------------------
    await api.setMyDescription({
      description:
        "EasyFind — O'zbekistondagi zamonaviy ish o'rinlari va mutaxassislar platformasi.\n\n" +
        "🔹 Vakansiyalarni qidiring va bir zumda ariza topshiring\n" +
        "🔹 O'z rezyumeingizni joylang va ish beruvchilarni toping\n" +
        "🔹 Kompaniyalar uchun e'lon berish va nomzodlarni saralash\n" +
        "🔹 Soha bo'yicha yangi vakansiyalardan xabardor bo'lish\n\n" +
        "Boshlash uchun pastdagi «Start» tugmasini bosing!",
    });

    await api.setMyDescription({
      description:
        "EasyFind — современная платформа вакансий и специалистов в Узбекистане.\n\n" +
        "🔹 Удобный поиск работы и быстрый отклик\n" +
        "🔹 Создание и размещение своего резюме\n" +
        "🔹 Публикация вакансий и отбор кандидатов для компаний\n" +
        "🔹 Уведомления о новых вакансиях в вашей сфере\n\n" +
        "Нажмите «Старт», чтобы начать!",
      language_code: 'ru',
    });

    await api.setMyDescription({
      description:
        "EasyFind — Modern job board and talent platform in Uzbekistan.\n\n" +
        "🔹 Browse job vacancies and apply instantly\n" +
        "🔹 Build a talent profile and get discovered by employers\n" +
        "🔹 Post jobs and review applicants seamlessly\n" +
        "🔹 Subscribe to instant alerts for your industry\n\n" +
        "Tap «Start» to begin!",
      language_code: 'en',
    });

    // --------------------------------------------------------------------------
    // 2. Short Descriptions (Shown on bot profile and link sharing)
    // --------------------------------------------------------------------------
    await api.setMyShortDescription({
      short_description: "O'zbekistondagi eng qulay ish va mutaxassislar topish platformasi.",
    });

    await api.setMyShortDescription({
      short_description: "Удобная платформа для поиска работы и специалистов в Узбекистане.",
      language_code: 'ru',
    });

    await api.setMyShortDescription({
      short_description: "Smart job board and talent discovery platform in Uzbekistan.",
      language_code: 'en',
    });

    // --------------------------------------------------------------------------
    // 3. Bot Command Menu
    // --------------------------------------------------------------------------
    // Default (Uzbek) commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: 'Botni ishga tushirish / Bosh sahifa' },
        { command: 'help', description: 'Yordam va qo\'llanma' },
        { command: 'language', description: 'Tilni almashtirish' },
      ],
    });

    // Russian commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: 'Запустить бота / Главная' },
        { command: 'help', description: 'Помощь и инструкции' },
        { command: 'language', description: 'Сменить язык' },
      ],
      language_code: 'ru',
    });

    // English commands
    await api.setMyCommands({
      commands: [
        { command: 'start', description: 'Start bot / Home' },
        { command: 'help', description: 'Help and guide' },
        { command: 'language', description: 'Change language' },
      ],
      language_code: 'en',
    });

    logger.info('lib/bot/setup.js', 'Bot descriptions and commands registered successfully across uz, ru, en');
    return { ok: true };
  } catch (err) {
    logger.error('lib/bot/setup.js', 'Failed to register bot descriptions/commands', err);
    throw err;
  }
}
