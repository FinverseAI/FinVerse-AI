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
    it('returns a timestamped health response', () => {
      expect(appController.getHealth()).toEqual({
        success: true,
        message: 'FinVerse Backend is running 🚀',
        timestamp: expect.any(String),
      });
    });
  });
});
