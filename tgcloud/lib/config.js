export const config = {
  // Super Admin Telegram ID (immutable root authority)
  superAdminTgId: 0,

  // Fallback channel IDs (dynamically overridden by database settings table)
  moderationChannelId: '@EasyFindModeration',
  publicChannelId: '@EasyFindJobs',

  // Bot & Channel identities
  channelUsername: 'EasyFindJobs',
  botUsername: 'EasyFindBot',

  // App defaults
  defaultCurrency: 'USD',
  paginationLimit: 15,
};
