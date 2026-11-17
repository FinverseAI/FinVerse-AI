import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionGuard, type AuthenticatedRequest } from './session.guard';

describe('SessionGuard', () => {
  const originalFetch = global.fetch;
  let request: AuthenticatedRequest;
  let guard: SessionGuard;
  let context: ExecutionContext;

  beforeEach(() => {
    request = {
      method: 'POST',
      headers: {
        cookie: 'better-auth.session_token=signed',
        origin: 'http://localhost:3000',
      },
      body: { user_id: 'attacker' },
    } as AuthenticatedRequest;
    guard = new SessionGuard(new ConfigService());
    context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses only the identity returned by Better Auth', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      Response.json({
        user: { id: 'verified-user' },
        session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
      }),
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.userId).toBe('verified-user');
    expect(global.fetch).toHaveBeenCalledWith(
      new URL(
        'http://localhost:3000/api/auth/get-session?disableCookieCache=true',
      ),
      expect.objectContaining({
        headers: { cookie: 'better-auth.session_token=signed' },
      }),
    );
  });

  it('rejects missing credentials without contacting the auth server', async () => {
    delete request.headers.cookie;
    global.fetch = jest.fn();
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([undefined, 'https://attacker.example'])(
    'rejects writes from invalid origins %s',
    async (origin) => {
      request.headers.origin = origin;
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    },
  );

  it.each([
    null,
    { user: { id: 'old' }, session: { expiresAt: '2020-01-01' } },
  ])('rejects invalid or expired sessions', async (session) => {
    global.fetch = jest.fn().mockResolvedValue(Response.json(session));
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('distinguishes an auth outage from an unauthenticated user', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
