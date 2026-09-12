import { z } from 'zod';

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Username may only contain letters, numbers, underscores and hyphens',
      ),
    email: z.email('A valid email address is required').trim().toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
  })
  .strict();

export const loginSchema = z
  .object({
    username: z.string().trim().min(1, 'Username or email is required').max(254),
    password: z.string().min(1, 'Password is required').max(128),
  })
  .strict();

export const googleSchema = z
  .object({
    idToken: z.string().min(1, 'Google ID token is required'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleInput = z.infer<typeof googleSchema>;
