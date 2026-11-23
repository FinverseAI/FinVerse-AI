import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      service: 'FinVerse API',
      status: 'ok',
      health: '/api/health',
    });
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(response.body.success).toBe(true);
  });

  it('/favicon.ico (GET) returns no content instead of a 404', async () => {
    await request(app.getHttpServer()).get('/favicon.ico').expect(204);
  });

  it('rejects unauthenticated profile requests', async () => {
    await request(app.getHttpServer()).get('/api/profile').expect(401);
  });

  it('rejects unauthenticated readiness requests', async () => {
    await request(app.getHttpServer()).get('/api/readiness').expect(401);
  });

  it('rejects unauthenticated expense-extraction requests', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/extract-expense')
      .send({ text: 'coffee 250' })
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
