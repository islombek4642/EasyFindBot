export const config = {
  // Super Admin Telegram ID (immutable root authority)
  superAdminTgId: 8756078762,

  // Fallback channel IDs (dynamically overridden by database settings table)
  moderationChannelId: '@EasyFindModeration',
  publicChannelId: '@EasyFindJobs',

  // Bot & Channel identities
  channelUsername: 'EasyFindJobs',
  botUsername: 'EasyFind_UzBot',
  miniAppUrl: 'https://app8716517896.tgcloud.ai',

  // App defaults
  defaultCurrency: 'USD',
  paginationLimit: 15,
};
