// =============================================================================
// Canadian GST/HST calculation for inter/intra-provincial freight transport
// =============================================================================
//
// The CRA classifies freight transportation under three regimes:
//
//   1. Domestic interprovincial freight: zero-rated (GST/HST 0%).
//      The carrier doesn't charge tax to the broker but can still claim ITCs.
//      Ref: ETA s. 1, Sched. VI Pt. VII s. 6 (zero-rated freight transport).
//      https://laws-lois.justice.gc.ca/eng/acts/E-15/section-sched6.html
//
//   2. Domestic intraprovincial freight: standard, taxed at the destination
//      province's GST/HST rate.
//      Ref: CRA GST/HST Memorandum 28-2 — Freight Transportation Services.
//      https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/28-2.html
//
//   3. International freight (continuous outbound or inbound movement that
//      crosses the Canadian border): zero-rated.
//      Ref: ETA Sched. VI Pt. VII s. 1 (international freight transport).
//
// QC carriers also collect QST (9.975%) administered by Revenu Québec, not
// the CRA. Full QST handling is post-MVP — the function returns a flag so
// the UI can prompt the user to consult their accountant.
//
// Carriers must be GST/HST-registered to charge tax. A carrier whose taxable
// supplies stay under $30k/year is a "small supplier" and is not required to
// register. We respect a per-user flag and skip tax entirely if unregistered.

export type ProvinceCode =
  | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU'
  | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

// Standard GST/HST rates by province (effective rates as of 2024).
// New Brunswick, Newfoundland, Nova Scotia, Ontario, and PEI are HST.
// Everywhere else is plain 5% GST. NS dropped from 15% → 14% on 2025-04-01.
export const PROVINCIAL_RATES: Record<ProvinceCode, number> = {
  AB: 0.05,
  BC: 0.05,
  MB: 0.05,
  NB: 0.15,
  NL: 0.15,
  NS: 0.14,
  NT: 0.05,
  NU: 0.05,
  ON: 0.13,
  PE: 0.15,
  QC: 0.05, // GST only here. QST is handled separately, see qstApplies flag.
  SK: 0.05,
  YT: 0.05,
};

export type TaxableStatus = 'zero-rated' | 'standard' | 'exempt';

export interface CalculateTaxInput {
  pickupProvince: ProvinceCode | null;
  deliveryProvince: ProvinceCode | null;
  // True if either pickup or delivery is outside Canada. The caller is
  // responsible for detecting non-Canadian addresses.
  isInternational: boolean;
  // Set false for small suppliers under the $30k registration threshold.
  carrierIsGstRegistered: boolean;
}

export interface CalculateTaxResult {
  rate: number;
  taxableStatus: TaxableStatus;
  explanation: string;
  // QST applies when the destination is Quebec. Surfaced so the UI can warn
  // the user; rate is *not* baked into the returned `rate` for the MVP.
  qstApplies: boolean;
}

export function calculateTax(input: CalculateTaxInput): CalculateTaxResult {
  // Rule 1: small-supplier / unregistered carrier — no tax charged at all.
  if (!input.carrierIsGstRegistered) {
    return {
      rate: 0,
      taxableStatus: 'exempt',
      explanation:
        'Carrier is not GST/HST-registered (small supplier). No tax charged.',
      qstApplies: false,
    };
  }

  // Rule 2: international freight — zero-rated.
  if (input.isInternational) {
    return {
      rate: 0,
      taxableStatus: 'zero-rated',
      explanation:
        'Cross-border (international) freight is zero-rated under ETA Sched. VI Pt. VII s. 1.',
      qstApplies: false,
    };
  }

  // Rule 3: domestic interprovincial freight — zero-rated.
  if (
    input.pickupProvince &&
    input.deliveryProvince &&
    input.pickupProvince !== input.deliveryProvince
  ) {
    return {
      rate: 0,
      taxableStatus: 'zero-rated',
      explanation:
        'Interprovincial freight is zero-rated under ETA Sched. VI Pt. VII s. 6.',
      qstApplies: input.deliveryProvince === 'QC',
    };
  }

  // Rule 4: domestic intraprovincial — destination province's rate.
  if (
    input.pickupProvince &&
    input.deliveryProvince &&
    input.pickupProvince === input.deliveryProvince
  ) {
    const rate = PROVINCIAL_RATES[input.deliveryProvince];
    return {
      rate,
      taxableStatus: 'standard',
      explanation: `Intraprovincial freight in ${input.deliveryProvince}: ${(rate * 100).toFixed(2)}% GST/HST.`,
      qstApplies: input.deliveryProvince === 'QC',
    };
  }

  // Defensive fallback: missing province information. Caller should treat as
  // a soft error and prompt the user to fix the addresses before invoicing.
  return {
    rate: 0,
    taxableStatus: 'exempt',
    explanation:
      'Insufficient address data to determine tax treatment. Please confirm pickup and delivery provinces.',
    qstApplies: false,
  };
}

// Convenience helper for the invoice generator.
export function applyTax(
  subtotal: number,
  taxResult: CalculateTaxResult,
): { taxAmount: number; total: number } {
  const taxAmount = round2(subtotal * taxResult.rate);
  return { taxAmount, total: round2(subtotal + taxAmount) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
