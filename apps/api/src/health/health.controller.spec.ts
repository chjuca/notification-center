import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const dataSource = { query: vi.fn() };
  let controller: HealthController;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: dataSource }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('answers ok when the database responds', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
  });

  it('answers 503 without leaking the cause when the database is down', async () => {
    dataSource.query.mockRejectedValue(
      new Error('connect ECONNREFUSED 10.0.0.5:5432'),
    );

    const error = await controller.check().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).toBe('Database unavailable');
  });
});
