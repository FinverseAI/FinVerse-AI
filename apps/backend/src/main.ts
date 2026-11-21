import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);

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
