import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & { userId: string };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const baseUrl =
      this.config.get<string>('BETTER_AUTH_URL') ?? 'http://localhost:3000';
    if (!request.headers.cookie)
      throw new UnauthorizedException('Please log in to continue.');
    // B62 (reviewed 2026-11-26): this is the same single source of
    // truth the web forwarder now sends — webOrigin() in
    // apps/web/lib/env.ts is `new URL(BETTER_AUTH_URL).origin`, and
    // the forwarder rewrites the Origin header to it on the
    // server-to-server fetch. No change needed here.
    if (
      request.method !== 'GET' &&
      request.headers.origin !== new URL(baseUrl).origin
    ) {
      throw new ForbiddenException(
        'This request must originate from FinVerse.',
      );
    }

    let response: Response;
    try {
      response = await fetch(
        new URL('/api/auth/get-session?disableCookieCache=true', baseUrl),
        {
          headers: { cookie: request.headers.cookie },
          cache: 'no-store',
          // B45: 'manual' so a redirect is visible as a 3xx response
          // instead of throwing and being misreported as an outage.
          redirect: 'manual',
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'The sign-in service is unavailable. Please try again.',
      );
    }
    if (response.status === 401)
      throw new UnauthorizedException(
        'Your session has expired. Please log in again.',
      );
    // B45: a redirect from get-session means there is no usable
    // session to verify (e.g. the auth service bounced to a login
    // page) — that is unauthenticated (401), not an outage (503).
    if (response.status >= 300 && response.status < 400)
      throw new UnauthorizedException(
        'Your session has expired. Please log in again.',
      );
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Unable to verify your session. Please try again.',
      );

    let session: {
      user?: { id?: string };
      session?: { expiresAt?: string };
    } | null;
    try {
      session = (await response.json()) as typeof session;
    } catch {
      throw new ServiceUnavailableException(
        'Unable to verify your session. Please try again.',
      );
    }
    if (
      !session?.user?.id ||
      !session.session?.expiresAt ||
      !(Date.parse(session.session.expiresAt) > Date.now())
    ) {
      throw new UnauthorizedException(
        'Your session has expired. Please log in again.',
      );
    }
    request.userId = session.user.id;
    return true;
  }
}
