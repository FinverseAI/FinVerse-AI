import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      service: 'FinVerse API',
      status: 'ok',
      health: '/api/health',
    };
  }

  // Browsers request this automatically when an API URL is opened directly.
  // A no-content response prevents a harmless missing-favicon 404.
  @Get('favicon.ico')
  @HttpCode(204)
  getFavicon(): void {}

  @Get('api/health')
  getHealth() {
    return {
      success: true,
      message: 'FinVerse backend is running',
      timestamp: new Date().toISOString(),
    };
  }
}
