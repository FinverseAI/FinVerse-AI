export function validateEnvironment(config: Record<string, unknown>) {
  const production = config.NODE_ENV === 'production';
  if (!config.DATABASE_URL && config.NODE_ENV !== 'test') {
    throw new Error('DATABASE_URL is required.');
  }
  if (production && !config.BETTER_AUTH_URL) {
    throw new Error('BETTER_AUTH_URL is required in production.');
  }
  let origin: URL;
  try {
    if (
      config.BETTER_AUTH_URL !== undefined &&
      typeof config.BETTER_AUTH_URL !== 'string'
    ) {
      throw new Error('Invalid URL type');
    }
    origin = new URL(config.BETTER_AUTH_URL || 'http://localhost:3000');
  } catch {
    throw new Error('BETTER_AUTH_URL must be a valid HTTP(S) URL.');
  }
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password
  ) {
    throw new Error(
      'BETTER_AUTH_URL must be an HTTP(S) URL without credentials.',
    );
  }
  if (
    production &&
    origin.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  ) {
    throw new Error('BETTER_AUTH_URL must use HTTPS in production.');
  }
  const port = Number(config.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer between 1 and 65535.');
  return { ...config, PORT: port, BETTER_AUTH_URL: origin.origin };
}
