function formatLog(level, source, message, data) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] [${source}] ${message}`;
  if (data !== undefined && data !== null) {
    if (data instanceof Error) {
      return `${base}\n${data.stack || data.message}`;
    }
    if (typeof data === 'object') {
      try {
        return `${base} ${JSON.stringify(data)}`;
      } catch (e) {
        return `${base} [Unserializable Object]`;
      }
    }
    return `${base} ${data}`;
  }
  return base;
}

export const logger = {
  info(source, message, data) {
    console.log(formatLog('INFO', source, message, data));
  },
  warn(source, message, data) {
    console.warn(formatLog('WARN', source, message, data));
  },
  error(source, message, error) {
    console.error(formatLog('ERROR', source, message, error));
  },
};
