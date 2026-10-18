export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function mdToHtml(str) {
  if (str === null || str === undefined) return '';
  const text = String(str);

  // Preserve valid Telegram HTML tags
  const tagPattern = /<\/?(?:b|strong|i|em|u|ins|s|strike|del|code|pre|blockquote|tg-spoiler|tg-emoji|a)(?:\s+[^>]*?)?>/gi;
  const placeholders = [];
  const protectedText = text.replace(tagPattern, (match) => {
    const idx = placeholders.length;
    placeholders.push(match);
    return `___TG_TAG_${idx}___`;
  });

  // Escape any remaining raw characters (<, >, &)
  let safe = escapeHtml(protectedText);

  // Convert markdown bold and inline code
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Restore preserved HTML tags
  safe = safe.replace(/___TG_TAG_(\d+)___/g, (_, idx) => placeholders[Number(idx)] || '');

  return safe;
}
