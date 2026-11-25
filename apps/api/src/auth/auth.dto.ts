import { z } from 'zod';

const emailSchema = z.email().max(320).meta({ example: 'ana@example.com' });

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128).meta({ example: 'correct-horse' }),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const registeredUserSchema = z.object({
  id: z.uuid(),
  email: z.email().meta({ example: 'ana@example.com' }),
});

export type RegisteredUser = z.infer<typeof registeredUserSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128).meta({ example: 'correct-horse' }),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const accessTokenSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z
    .number()
    .int()
    .meta({ description: 'Seconds until the token expires', example: 3600 }),
});

export type AccessToken = z.infer<typeof accessTokenSchema>;

export interface JwtPayload {
  sub: string;
}
