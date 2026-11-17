import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.getOrThrow<string>('BETTER_AUTH_URL'),
    credentials: true,
  });

  app.enableShutdownHooks();
  try {
    await app.listen(config.getOrThrow<number>('PORT'));
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : 'Startup failed',
    'Bootstrap',
  );
  process.exitCode = 1;
});
