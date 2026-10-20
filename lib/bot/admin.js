import { t } from '../locales/index.js';
import { escapeHtml } from './html.js';
import { config } from '../config.js';

export function buildAdminPanelMenu(lang = 'uz', isSuperAdmin = false) {
  const keyboard = [
    [
      { text: t(lang, 'admin.btn_queue'), callback_data: "admin:queue" },
      { text: t(lang, 'admin.btn_stats'), callback_data: "admin:stats" },
    ],
    [
      { text: t(lang, 'admin.btn_users_list'), callback_data: "admin:users:1" },
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
    activeResumes = 0,
  } = stats;

  const lines = [
    t(lang, 'admin.stats_title'),
    '',
    t(lang, 'admin.stats_users_total', { count: totalUsers }),
    t(lang, 'admin.stats_users_24h', { count: newUsers24h }),
    t(lang, 'admin.stats_users_7d', { count: newUsers7d }),
    t(lang, 'admin.stats_seekers', { count: seekers }),
    t(lang, 'admin.stats_employers', { count: employers }),
    '',
    t(lang, 'admin.stats_vacancies_total', { count: totalVacancies }),
    t(lang, 'admin.stats_vacancies_active', { count: activeVacancies }),
    t(lang, 'admin.stats_vacancies_pending', { count: pendingVacancies }),
    t(lang, 'admin.stats_vacancies_24h', { count: newVacancies24h }),
    t(lang, 'admin.stats_vacancies_7d', { count: newVacancies7d }),
    '',
    t(lang, 'admin.stats_applications_total', { count: totalApplications }),
    t(lang, 'admin.stats_applications_24h', { count: newApplications24h }),
    t(lang, 'admin.stats_resumes_total', { count: totalResumes }),
    t(lang, 'admin.stats_resumes_active', { count: activeResumes }),
  ];

  return {
    text: lines.join('\n'),
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

export function buildBroadcastAudienceMenu(counts = {}, lang = 'uz') {
  const { all = 0, seekers = 0, employers = 0 } = counts;
  const text = t(lang, 'admin.broadcast_title');
  const buttons = [
    [{ text: t(lang, 'admin.broadcast_aud_all', { count: all }), callback_data: "admin:broadcast:audience:all" }],
    [{ text: t(lang, 'admin.broadcast_aud_seekers', { count: seekers }), callback_data: "admin:broadcast:audience:seeker" }],
    [{ text: t(lang, 'admin.broadcast_aud_employers', { count: employers }), callback_data: "admin:broadcast:audience:employer" }],
    [{ text: t(lang, 'common.back'), callback_data: "admin:menu" }],
  ];

  return {
    text,
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
}

export function buildBroadcastPreview(audienceName, userCount, content, lang = 'uz') {
  const text = t(lang, 'admin.broadcast_preview_title', {
    audience: audienceName,
    count: userCount,
    content,
  });

  const buttons = [
    [{ text: t(lang, 'admin.broadcast_btn_send'), callback_data: "admin:broadcast:send" }],
    [{ text: t(lang, 'admin.broadcast_btn_cancel'), callback_data: "admin:broadcast:cancel" }],
  ];

  return {
    text,
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
}

export function formatDateTime(val) {
  if (!val) return '—';
  let ms = 0;
  if (val instanceof Date) {
    ms = val.getTime();
  } else if (typeof val === 'number') {
    ms = val > 10000000000 ? val : val * 1000;
  } else {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      ms = num > 10000000000 ? num : num * 1000;
    } else {
      const d = new Date(val);
      ms = isNaN(d.getTime()) ? 0 : d.getTime();
    }
  }
  if (!ms) return '—';

  // Format in UTC+5 (Tashkent)
  const d = new Date(ms + 5 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getUTCDate());
  const month = pad(d.getUTCMonth() + 1);
  const year = d.getUTCFullYear();
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function formatSafeName(firstName, lastName, maxLength = 18) {
  let full = `${firstName || ''} ${lastName || ''}`.trim() || 'Foydalanuvchi';
  full = full.replace(/[\r\n\t]+/g, ' ').trim();
  if (full.length > maxLength) {
    full = full.slice(0, maxLength - 3) + '...';
  }
  return escapeHtml(full);
}

export function buildUsersListReport(usersList = [], totalUsers = 0, page = 1, pageSize = 10, lang = 'uz') {
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  let text = `${t(lang, 'admin.users_list_title', { total: totalUsers, page: currentPage, totalPages })}\n\n`;

  if (usersList.length === 0) {
    text += `<i>${escapeHtml(t(lang, 'admin.users_empty'))}</i>`;
  } else {
    const startIndex = (currentPage - 1) * pageSize + 1;
    const lines = usersList.map((u, i) => {
      const idx = startIndex + i;
      const safeName = formatSafeName(u.firstName, u.lastName, 18);
      let userLink = safeName;
      if (u.username) {
        const cleanUsername = String(u.username).replace(/[^a-zA-Z0-9_]/g, '').trim();
        if (cleanUsername) {
          userLink = `<a href="https://t.me/${cleanUsername}">${safeName}</a>`;
        }
      }
      const dateStr = formatDateTime(u.createdAt);
      return `${idx}. ${userLink} (<code>${u.tgId}</code>) — ${dateStr}`;
    });
    text += lines.join('\n');
  }

  const inline_keyboard = [];
  if (totalPages > 1) {
    const navButtons = [];
    if (currentPage > 1) {
      navButtons.push({ text: '⬅️ ' + t(lang, 'common.prev'), callback_data: `admin:users:${currentPage - 1}` });
    }
    navButtons.push({ text: `${currentPage} / ${totalPages}`, callback_data: `admin:users:${currentPage}` });
    if (currentPage < totalPages) {
      navButtons.push({ text: t(lang, 'common.next') + ' ➡️', callback_data: `admin:users:${currentPage + 1}` });
    }
    inline_keyboard.push(navButtons);
  }

  inline_keyboard.push([
    { text: t(lang, 'common.back'), callback_data: "admin:menu" },
  ]);

  return {
    text,
    reply_markup: {
      inline_keyboard,
    },
  };
}


