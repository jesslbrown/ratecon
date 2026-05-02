import { z } from 'zod';
import { accessorialSchema } from './rate-con';

const provinceCode = z.string().length(2).toUpperCase();

export const loadInputSchema = z.object({
  broker_id: z.string().uuid().nullable(),
  load_number: z.string().min(1).max(64),
  pickup_date: z.string(),
  pickup_address_line1: z.string().min(1),
  pickup_city: z.string().min(1),
  pickup_province: provinceCode.or(z.string().length(2)),
  pickup_postal_code: z.string().min(3),
  pickup_country: z.string().length(2).default('CA'),
  delivery_date: z.string(),
  delivery_address_line1: z.string().min(1),
  delivery_city: z.string().min(1),
  delivery_province: provinceCode.or(z.string().length(2)),
  delivery_postal_code: z.string().min(3),
  delivery_country: z.string().length(2).default('CA'),
  distance_miles: z.number().nonnegative().nullable(),
  equipment_type: z.string().nullable(),
  line_haul_rate: z.number().nonnegative(),
  fuel_surcharge: z.number().nonnegative().default(0),
  accessorials: z.array(accessorialSchema).default([]),
  payment_terms_days: z.number().int().min(1).max(180).default(30),
  currency: z.enum(['CAD', 'USD']).default('CAD'),
});

export type LoadInput = z.infer<typeof loadInputSchema>;

export const brokerInputSchema = z.object({
  name: z.string().min(1),
  mc_number: z.string().nullable(),
  ap_email: z.string().email().nullable(),
  phone: z.string().nullable(),
  payment_terms_days: z.number().int().min(1).max(180).default(30),
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  postal_code: z.string().nullable(),
  country: z.string().length(2).default('US'),
});

export type BrokerInput = z.infer<typeof brokerInputSchema>;
