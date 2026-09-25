import { z } from "zod";

export const emailSchema = z.string().trim().email().max(254);
export const passwordSchema = z.string().min(8).max(128);
export const uuidSchema = z.string().uuid();
export const nameSchema = z.string().trim().min(2).max(100);
export const usernameSchema = z.string().trim().regex(/^[A-Za-z0-9_.-]{3,32}$/);
export const phoneSchema = z.string().trim().max(20).regex(/^\+?[0-9 ()-]{7,20}$/);
export const referralCodeSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{3,32}$/);
export const transactionIdSchema = z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9._:/-]+$/);
export const amountSchema = z.number().finite().positive().max(10_000_000).refine(v => Math.round(v * 100) === v * 100, "Amount supports at most 2 decimal places");
export const supportTextSchema = z.string().trim().min(1).max(10_000);
export const subjectSchema = z.string().trim().min(3).max(180);

export const signupSchema = z.object({
  fullName: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  referral: z.string().trim().max(32).regex(/^[A-Za-z0-9_-]*$/),
  terms: z.literal(true),
});

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
export const resetRequestSchema = z.object({ email: emailSchema });
export const passwordResetSchema = z.object({ password: passwordSchema, confirmation: passwordSchema });

export const profileSchema = z.object({
  fullName: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  phone: z.string().trim().max(20).refine(v => !v || phoneSchema.safeParse(v).success, "Invalid phone number"),
});

export const depositSchema = z.object({
  planId: uuidSchema,
  method: z.string().trim().min(2).max(80),
  transactionId: transactionIdSchema,
  proofName: z.string().trim().min(1).max(500),
});

export const withdrawalSchema = z.object({
  amount: amountSchema,
  method: z.string().trim().min(2).max(80),
  account: z.string().trim().min(3).max(500),
  requestKey: uuidSchema.optional(),
});

export const adIdSchema = uuidSchema;
export const sessionIdSchema = uuidSchema;
