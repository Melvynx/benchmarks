import { z } from "zod";

export const LoginCredentialsFormScheme = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  verifyPassword: z.string().min(8),
  image: z.string().optional(),
});

export type LoginCredentialsFormType = z.infer<
  typeof LoginCredentialsFormScheme
>;
