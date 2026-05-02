import { z } from 'zod';

// Schema mirrors the JSON contract sent to Claude. Every field is nullable
// because the model is instructed never to invent values.
export const accessorialSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

export const rateConExtractionSchema = z.object({
  broker_name: z.string().nullable(),
  broker_mc_number: z.string().nullable(),
  broker_ap_email: z.string().email().nullable().or(z.literal('').transform(() => null)),
  broker_phone: z.string().nullable(),
  load_number: z.string().nullable(),
  pickup_date: z.string().nullable(),
  pickup_address: z.string().nullable(),
  pickup_city: z.string().nullable(),
  pickup_state_or_province: z.string().nullable(),
  pickup_postal_code: z.string().nullable(),
  delivery_date: z.string().nullable(),
  delivery_address: z.string().nullable(),
  delivery_city: z.string().nullable(),
  delivery_state_or_province: z.string().nullable(),
  delivery_postal_code: z.string().nullable(),
  distance_miles: z.number().nullable(),
  equipment_type: z.string().nullable(),
  line_haul_rate: z.number().nullable(),
  fuel_surcharge: z.number().nullable(),
  accessorials: z.array(accessorialSchema).default([]),
  total_rate: z.number().nullable(),
  payment_terms_days: z.number().int().nullable(),
  currency: z.enum(['CAD', 'USD']).nullable(),
});

export type RateConExtraction = z.infer<typeof rateConExtractionSchema>;
export type RateConAccessorial = z.infer<typeof accessorialSchema>;
