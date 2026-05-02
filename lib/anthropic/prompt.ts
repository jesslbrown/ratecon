// The extraction prompt is checked into source so changes go through code
// review and ship in lockstep with the Zod schema in
// lib/validators/rate-con.ts. Never tweak one without the other.

export const SYSTEM_PROMPT = `You extract structured data from North American freight rate confirmations. You return strict JSON only. You never invent values. If a field is unclear or absent, return null.`;

export const USER_PROMPT = `Extract these fields from this rate confirmation: broker_name, broker_mc_number, broker_ap_email, broker_phone, load_number, pickup_date (ISO 8601), pickup_address, pickup_city, pickup_state_or_province, pickup_postal_code, delivery_date, delivery_address, delivery_city, delivery_state_or_province, delivery_postal_code, distance_miles, equipment_type, line_haul_rate, fuel_surcharge, accessorials (array of {description, amount}), total_rate, payment_terms_days, currency. Return JSON matching this exact schema.`;

// Hard ceiling on uploads. Claude vision accepts up to 5MB images, but PDFs
// can be larger; we cap at 10MB to keep extraction cost predictable.
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;

// We retry transient API failures (network, 5xx) up to this many times.
// User-facing parse failures are surfaced immediately with the raw response.
export const MAX_API_RETRIES = 3;
