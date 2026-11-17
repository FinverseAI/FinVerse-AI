export function databaseUrl(value: string | undefined) {
  if (!value) return undefined;
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) return value;
  for (const [key, fallback] of Object.entries({
    connection_limit: '5',
    pool_timeout: '15',
    connect_timeout: '20',
  })) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, fallback);
  }
  return url.toString();
}
