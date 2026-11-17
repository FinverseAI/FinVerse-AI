import { validateEnvironment } from './environment';

describe('deployment configuration', () => {
  const required = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/finverse',
    BETTER_AUTH_URL: 'https://finance.example',
  };
  it('normalizes the public origin and configurable port', () => {
    expect(validateEnvironment({ ...required, PORT: '4001' })).toMatchObject({
      PORT: 4001,
      BETTER_AUTH_URL: 'https://finance.example',
    });
  });
  it.each([
    { DATABASE_URL: undefined },
    { BETTER_AUTH_URL: undefined },
    { BETTER_AUTH_URL: 'not-a-url' },
    { BETTER_AUTH_URL: 'http://finance.example' },
    { BETTER_AUTH_URL: 'https://user:secret@finance.example' },
    { PORT: 0 },
    { PORT: 'bad' },
  ])('rejects invalid production configuration %p', (fields) => {
    expect(() => validateEnvironment({ ...required, ...fields })).toThrow();
  });
});
