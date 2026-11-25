import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { ApiErrorResponse } from '../../common/api-error-response.js';
import { ChannelRegistry } from './channel-registry.js';

const channelListSchema = z.array(
  z.object({ name: z.string().meta({ example: 'email' }) }),
);

type ChannelList = z.infer<typeof channelListSchema>;

@ApiTags('channels')
@ApiBearerAuth()
@ApiErrorResponse(401, 'Missing, invalid or expired access token')
@ApiErrorResponse(429, 'Too many requests. Try again in a minute')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelRegistry: ChannelRegistry) {}

  @Get()
  @ApiOperation({ summary: 'List the channels a notification can use' })
  @ApiOkResponse({ standardSchema: channelListSchema })
  findAll(): ChannelList {
    return this.channelRegistry.names().map((name) => ({ name }));
  }
}
