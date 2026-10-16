export function buildAdminPanelMenu() {
  return {
    text: "⚙️ **EasyFindBot Administrator Paneli**\n\nQuyidagi boshqaruv bo'limlaridan birini tanlang:",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "⏳ Moderatsiya navbati", callback_data: "admin:queue" },
          { text: "📊 Tizim statistikasi", callback_data: "admin:stats" },
        ],
        [
          { text: "👥 Adminlar boshqaruvi", callback_data: "admin:manage_admins" },
          { text: "📡 Kanallar sozlamalari", callback_data: "admin:channels" },
        ],
        [
          { text: "📢 Xabar yuborish (Broadcast)", callback_data: "admin:broadcast" },
        ],
      ],
    },
  };
}

export function buildStatsReport(stats = {}) {
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
    "📊 **EasyFindBot — Tizim Statistikasi**\n\n" +
    `👥 **Foydalanuvchilar:** ${totalUsers} ta\n` +
    `   • Nomzodlar: ${seekers} ta\n` +
    `   • Ish beruvchilar: ${employers} ta\n\n` +
    `💼 **Vakansiyalar:** ${totalVacancies} ta\n` +
    `   • Faol e'lonlar: ${activeVacancies} ta\n` +
    `   • Tekshiruvda (navbatda): ${pendingVacancies} ta\n\n` +
    `📄 **Arizalar:** ${totalApplications} ta yuborilgan\n` +
    `📋 **Rezyumelar:** ${totalResumes} ta faol rezyume`;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 Yangilash", callback_data: "admin:stats" },
          { text: "🔙 Asosiy menyu", callback_data: "admin:menu" },
        ],
      ],
    },
  };
}

export function buildChannelSettingsMenu(modChannel, pubChannel) {
  const text =
    "📡 **Kanallar Sozlamalari**\n\n" +
    `📢 **E'lonlar chiqadigan kanal:** \`${pubChannel || "Kiritilmagan"}\`\n` +
    `🛡️ **Moderatsiya kanali:** \`${modChannel || "Kiritilmagan"}\`\n\n` +
    "O'zgartirmoqchi bo'lgan kanalingizni tanlang:";

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📢 E'lonlar kanalini o'zgartirish", callback_data: "admin:set_channel:public" },
        ],
        [
          { text: "🛡️ Moderatsiya kanalini o'zgartirish", callback_data: "admin:set_channel:moderation" },
        ],
        [
          { text: "🔙 Asosiy menyu", callback_data: "admin:menu" },
        ],
      ],
    },
  };
}
