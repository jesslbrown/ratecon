import { describe, it, expect } from 'vitest';
import {
  applyTax,
  calculateTax,
  PROVINCIAL_RATES,
  type CalculateTaxInput,
} from './canadian-tax';

const baseInput: CalculateTaxInput = {
  pickupProvince: 'ON',
  deliveryProvince: 'ON',
  isInternational: false,
  carrierIsGstRegistered: true,
};

describe('calculateTax', () => {
  describe('unregistered carrier (small supplier)', () => {
    it('charges no tax regardless of route', () => {
      const result = calculateTax({
        ...baseInput,
        carrierIsGstRegistered: false,
      });
      expect(result.rate).toBe(0);
      expect(result.taxableStatus).toBe('exempt');
      expect(result.qstApplies).toBe(false);
    });

    it('still charges no tax even when destination is Quebec', () => {
      const result = calculateTax({
        pickupProvince: 'QC',
        deliveryProvince: 'QC',
        isInternational: false,
        carrierIsGstRegistered: false,
      });
      expect(result.rate).toBe(0);
      expect(result.taxableStatus).toBe('exempt');
    });
  });

  describe('international freight', () => {
    it('cross-border to US is zero-rated', () => {
      const result = calculateTax({
        pickupProvince: 'ON',
        deliveryProvince: null,
        isInternational: true,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBe(0);
      expect(result.taxableStatus).toBe('zero-rated');
    });

    it('cross-border from US is zero-rated', () => {
      const result = calculateTax({
        pickupProvince: null,
        deliveryProvince: 'BC',
        isInternational: true,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBe(0);
      expect(result.taxableStatus).toBe('zero-rated');
    });
  });

  describe('interprovincial freight', () => {
    it('ON → AB is zero-rated', () => {
      const result = calculateTax({
        pickupProvince: 'ON',
        deliveryProvince: 'AB',
        isInternational: false,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBe(0);
      expect(result.taxableStatus).toBe('zero-rated');
    });

    it('BC → QC is zero-rated but flags qstApplies', () => {
      const result = calculateTax({
        pickupProvince: 'BC',
        deliveryProvince: 'QC',
        isInternational: false,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBe(0);
      expect(result.taxableStatus).toBe('zero-rated');
      expect(result.qstApplies).toBe(true);
    });
  });

  describe('intraprovincial freight', () => {
    it('Ontario → Ontario is HST 13%', () => {
      const result = calculateTax({
        pickupProvince: 'ON',
        deliveryProvince: 'ON',
        isInternational: false,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBeCloseTo(0.13, 5);
      expect(result.taxableStatus).toBe('standard');
    });

    it('Alberta → Alberta is GST 5%', () => {
      const result = calculateTax({
        pickupProvince: 'AB',
        deliveryProvince: 'AB',
        isInternational: false,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBeCloseTo(0.05, 5);
      expect(result.taxableStatus).toBe('standard');
    });

    it('Quebec → Quebec is GST 5% with qstApplies flag', () => {
      const result = calculateTax({
        pickupProvince: 'QC',
        deliveryProvince: 'QC',
        isInternational: false,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBeCloseTo(0.05, 5);
      expect(result.taxableStatus).toBe('standard');
      expect(result.qstApplies).toBe(true);
    });

    it('New Brunswick → New Brunswick is HST 15%', () => {
      const result = calculateTax({
        pickupProvince: 'NB',
        deliveryProvince: 'NB',
        isInternational: false,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBeCloseTo(0.15, 5);
    });

    it('Nova Scotia → Nova Scotia is HST 14% (post 2025-04-01)', () => {
      const result = calculateTax({
        pickupProvince: 'NS',
        deliveryProvince: 'NS',
        isInternational: false,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBeCloseTo(0.14, 5);
    });
  });

  describe('missing data', () => {
    it('returns exempt when provinces are missing', () => {
      const result = calculateTax({
        pickupProvince: null,
        deliveryProvince: null,
        isInternational: false,
        carrierIsGstRegistered: true,
      });
      expect(result.rate).toBe(0);
      expect(result.taxableStatus).toBe('exempt');
    });
  });

  it('exposes a province rate for every Canadian jurisdiction', () => {
    const codes: (keyof typeof PROVINCIAL_RATES)[] = [
      'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU',
      'ON', 'PE', 'QC', 'SK', 'YT',
    ];
    for (const c of codes) {
      expect(PROVINCIAL_RATES[c]).toBeGreaterThan(0);
    }
  });
});

describe('applyTax', () => {
  it('rounds tax and total to 2 decimals', () => {
    const tax = calculateTax({
      pickupProvince: 'ON',
      deliveryProvince: 'ON',
      isInternational: false,
      carrierIsGstRegistered: true,
    });
    const result = applyTax(1234.56, tax);
    expect(result.taxAmount).toBe(160.49);
    expect(result.total).toBe(1395.05);
  });

  it('returns zero tax for zero-rated routes', () => {
    const tax = calculateTax({
      pickupProvince: 'ON',
      deliveryProvince: 'AB',
      isInternational: false,
      carrierIsGstRegistered: true,
    });
    const result = applyTax(2500, tax);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(2500);
  });
});
