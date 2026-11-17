import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns the service status', () => {
      expect(appController.getRoot()).toEqual({
        service: 'FinVerse API',
        status: 'ok',
        health: '/api/health',
      });
    });
  });

  describe('health', () => {
    it('reports service liveness with an ISO timestamp', () => {
      const result = appController.getHealth();
      expect(result.success).toBe(true);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
