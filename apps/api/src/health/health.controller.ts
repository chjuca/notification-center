import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { z } from 'zod';
import { Public } from '../auth/public.decorator.js';
import { ApiErrorResponse } from '../common/api-error-response.js';

const healthSchema = z.object({ status: z.literal('ok') });

type Health = z.infer<typeof healthSchema>;

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Check that the api and its database respond' })
  @ApiOkResponse({ standardSchema: healthSchema })
  @ApiErrorResponse(503, 'The database does not respond')
  async check(): Promise<Health> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok' };
  }
}
