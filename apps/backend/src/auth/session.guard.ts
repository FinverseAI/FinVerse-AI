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
          redirect: 'error',
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
