import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Create the Nest application without starting an HTTP listener.
 * main.ts uses this and then calls app.listen() for a long-lived server.
 * The Netlify Function entry (netlify/functions/api.ts) uses this and hands
 * the underlying Express instance to serverless-http instead.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.getOrThrow<string>('BETTER_AUTH_URL'),
    credentials: true,
  });

  app.enableShutdownHooks();
  Logger.log('FinVerse backend app created', 'Bootstrap');
  return app;
}
