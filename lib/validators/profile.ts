import { z } from 'zod';

export const profileSchema = z.object({
  company_name: z.string().min(1).max(120),
  gst_hst_number: z
    .string()
    .regex(/^\d{9}\s?RT\s?\d{4}$/i, 'Expected format: 123456789RT0001')
    .nullable()
    .or(z.literal('').transform(() => null)),
  mc_number: z.string().min(1).max(20).nullable(),
  address_line1: z.string().min(1),
  address_line2: z.string().nullable().or(z.literal('').transform(() => null)),
  city: z.string().min(1),
  province: z.string().length(2).toUpperCase(),
  postal_code: z.string().min(3).max(10),
  country: z.string().length(2).default('CA'),
  phone: z.string().min(7),
  language_preference: z.enum(['en', 'pa', 'hi', 'ur']).default('en'),
});

export type ProfileInput = z.infer<typeof profileSchema>;
