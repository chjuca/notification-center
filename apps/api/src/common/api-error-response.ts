import { ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

export const errorResponseSchema = z.object({
  statusCode: z.number().int().meta({ example: 400 }),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().meta({ example: 'Bad Request' }),
});

export const ApiErrorResponse = (status: number, description: string) =>
  ApiResponse({ status, description, standardSchema: errorResponseSchema });
