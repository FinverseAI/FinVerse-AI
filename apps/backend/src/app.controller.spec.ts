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

  describe('health', () => {
    it('reports service liveness with an ISO timestamp', () => {
      const result = appController.getHealth();
      expect(result.success).toBe(true);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
