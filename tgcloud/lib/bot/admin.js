import { t } from '../locales/index.js';
import { escapeHtml } from './html.js';
import { config } from '../config.js';

export function buildAdminPanelMenu(lang = 'uz', isSuperAdmin = false) {
  const keyboard = [
    [
      { text: t(lang, 'admin.btn_queue'), callback_data: "admin:queue" },
      { text: t(lang, 'admin.btn_stats'), callback_data: "admin:stats" },
    ],
  ];

  if (isSuperAdmin) {
    keyboard.push([
      { text: t(lang, 'admin.btn_manage_admins'), callback_data: "admin:manage_admins" },
      { text: t(lang, 'admin.btn_channels'), callback_data: "admin:channels" },
    ]);
    keyboard.push([
      { text: t(lang, 'admin.btn_broadcast'), callback_data: "admin:broadcast" },
    ]);
  }

  return {
    text: isSuperAdmin ? t(lang, 'admin.menu_title_super') : t(lang, 'admin.menu_title'),
    reply_markup: {
      inline_keyboard: keyboard,
    },
  };
}

export function buildManageAdminsMenu(currentAdmins = [], superAdminUser = null, lang = 'uz') {
  let text = `👥 <b>${escapeHtml(t(lang, 'admin.manage_admins_title'))}</b>\n\n`;

  text += `👑 <b>${escapeHtml(t(lang, 'admin.super_admin_title'))}:</b>\n`;
  if (superAdminUser) {
    const handle = superAdminUser.username ? `@${escapeHtml(superAdminUser.username)}` : escapeHtml(superAdminUser.firstName || 'Bosh Admin');
    text += `• ${handle} (<code>${superAdminUser.tgId}</code>)\n\n`;
  } else {
    text += `• <code>${config.superAdminTgId}</code>\n\n`;
  }

  text += `🛡 <b>${escapeHtml(t(lang, 'admin.regular_admins_title'))}:</b>\n`;
  const regularAdmins = currentAdmins.filter((a) => Number(a.tgId) !== Number(config.superAdminTgId));
  if (regularAdmins.length === 0) {
    text += `<i>${escapeHtml(t(lang, 'admin.no_regular_admins'))}</i>\n`;
  } else {
    regularAdmins.forEach((a, idx) => {
      const handle = a.username ? `@${escapeHtml(a.username)}` : escapeHtml(a.firstName || a.tgId);
      text += `${idx + 1}. ${handle} (<code>${a.tgId}</code>)\n`;
    });
  }

  const buttons = [
    [
      { text: t(lang, 'admin.btn_add_admin'), callback_data: "admin:add_admin" },
    ],
  ];

  if (regularAdmins.length > 0) {
    buttons.push([
      { text: t(lang, 'admin.btn_remove_admin'), callback_data: "admin:remove_admin_list" },
    ]);
  }

  buttons.push([
    { text: t(lang, 'common.back'), callback_data: "admin:menu" },
  ]);

  return {
    text,
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
}

export function buildRemoveAdminMenu(regularAdmins = [], lang = 'uz') {
  const buttons = regularAdmins.map((a) => {
    const label = `❌ ${a.username ? '@' + a.username : (a.firstName || a.tgId)}`;
    return [{ text: label, callback_data: `admin:remove:${a.tgId}` }];
  });

  buttons.push([
    { text: t(lang, 'common.back'), callback_data: "admin:manage_admins" },
  ]);

  return {
    text: `⚠️ <b>${escapeHtml(t(lang, 'admin.remove_admin_select'))}</b>`,
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
}

export function buildStatsReport(stats = {}, lang = 'uz') {
  const {
    totalUsers = 0,
    newUsers24h = 0,
    newUsers7d = 0,
    seekers = 0,
    employers = 0,
    totalVacancies = 0,
    newVacancies24h = 0,
    newVacancies7d = 0,
    activeVacancies = 0,
    pendingVacancies = 0,
    totalApplications = 0,
    newApplications24h = 0,
    totalResumes = 0,
  } = stats;

  const text =
    `${t(lang, 'admin.stats_title')}\n\n` +
    `${t(lang, 'admin.stats_users', { total: totalUsers })}\n` +
    `${t(lang, 'admin.stats_users_growth', { day: newUsers24h, week: newUsers7d })}\n` +
    `   • ${t(lang, 'admin.stats_seekers')}: ${seekers}\n` +
    `   • ${t(lang, 'admin.stats_employers')}: ${employers}\n\n` +
    `${t(lang, 'admin.stats_vacancies', { total: totalVacancies })}\n` +
    `${t(lang, 'admin.stats_vacancies_growth', { day: newVacancies24h, week: newVacancies7d })}\n` +
    `   • ${t(lang, 'admin.stats_active')}: ${activeVacancies}\n` +
    `   • ${t(lang, 'admin.stats_pending')}: ${pendingVacancies}\n\n` +
    `${t(lang, 'admin.stats_applications', { total: totalApplications, day: newApplications24h })}\n` +
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

  const buttons = [
    [
      { text: t(lang, 'admin.channels_btn_set_public'), callback_data: "admin:set_channel:public" },
    ],
    [
      { text: t(lang, 'admin.channels_btn_set_mod'), callback_data: "admin:set_channel:moderation" },
    ],
  ];

  const testRow = [];
  if (pubChannel) {
    testRow.push({ text: t(lang, 'admin.channels_btn_test_public'), callback_data: "admin:test_channel:public" });
  }
  if (modChannel) {
    testRow.push({ text: t(lang, 'admin.channels_btn_test_mod'), callback_data: "admin:test_channel:moderation" });
  }
  if (testRow.length > 0) {
    buttons.push(testRow);
  }

  buttons.push([
    { text: t(lang, 'common.back'), callback_data: "admin:menu" },
  ]);

  return {
    text,
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
}

