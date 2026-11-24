import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(8).max(128),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export interface RegisteredUser {
  id: string;
  email: string;
}
