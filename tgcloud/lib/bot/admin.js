import { t } from '../locales/index.js';

export function buildAdminPanelMenu(lang = 'uz') {
  return {
    text: t(lang, 'admin.menu_title'),
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(lang, 'admin.btn_queue'), callback_data: "admin:queue" },
          { text: t(lang, 'admin.btn_stats'), callback_data: "admin:stats" },
        ],
        [
          { text: t(lang, 'admin.btn_manage_admins'), callback_data: "admin:manage_admins" },
          { text: t(lang, 'admin.btn_channels'), callback_data: "admin:channels" },
        ],
        [
          { text: t(lang, 'admin.btn_broadcast'), callback_data: "admin:broadcast" },
        ],
      ],
    },
  };
}

export function buildStatsReport(stats = {}, lang = 'uz') {
  const {
    totalUsers = 0,
    seekers = 0,
    employers = 0,
    totalVacancies = 0,
    activeVacancies = 0,
    pendingVacancies = 0,
    totalApplications = 0,
    totalResumes = 0,
  } = stats;

  const text =
    `${t(lang, 'admin.stats_title')}\n\n` +
    `${t(lang, 'admin.stats_users', { total: totalUsers })}\n` +
    `   • ${t(lang, 'admin.stats_seekers')}: ${seekers}\n` +
    `   • ${t(lang, 'admin.stats_employers')}: ${employers}\n\n` +
    `${t(lang, 'admin.stats_vacancies', { total: totalVacancies })}\n` +
    `   • ${t(lang, 'admin.stats_active')}: ${activeVacancies}\n` +
    `   • ${t(lang, 'admin.stats_pending')}: ${pendingVacancies}\n\n` +
    `${t(lang, 'admin.stats_applications', { total: totalApplications })}\n` +
    `${t(lang, 'admin.stats_resumes', { total: totalResumes })}`;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(lang, 'common.refresh'), callback_data: "admin:stats" },
          { text: t(lang, 'common.back'), callback_data: "admin:menu" },
        ],
      ],
    },
  };
}

export function buildChannelSettingsMenu(modChannel, pubChannel, lang = 'uz') {
  const notSpecified = t(lang, 'common.not_specified');
  const text =
    `${t(lang, 'admin.channels_title')}\n\n` +
    `${t(lang, 'admin.channels_public')} \`${pubChannel || notSpecified}\`\n` +
    `${t(lang, 'admin.channels_moderation')} \`${modChannel || notSpecified}\``;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(lang, 'admin.channels_btn_set_public'), callback_data: "admin:set_channel:public" },
        ],
        [
          { text: t(lang, 'admin.channels_btn_set_mod'), callback_data: "admin:set_channel:moderation" },
        ],
        [
          { text: t(lang, 'common.back'), callback_data: "admin:menu" },
        ],
      ],
    },
  };
}
