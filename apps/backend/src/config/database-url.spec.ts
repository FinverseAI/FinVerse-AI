import { databaseUrl } from './database-url';

describe('runtime database connection pool', () => {
  it('bounds connections per process without dropping provider settings', () => {
    const url = new URL(
      databaseUrl('postgresql://db.example/finance?sslmode=require')!,
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      sslmode: 'require',
      connection_limit: '5',
      pool_timeout: '15',
      connect_timeout: '20',
    });
  });
  it('preserves explicitly tuned pool settings', () => {
    const url = new URL(
      databaseUrl(
        'postgresql://db.example/finance?connection_limit=2&pool_timeout=8',
      )!,
    );
    expect(url.searchParams.get('connection_limit')).toBe('2');
    expect(url.searchParams.get('pool_timeout')).toBe('8');
  });
});
