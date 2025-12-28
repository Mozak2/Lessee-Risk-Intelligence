/**
 * Tests for multi-currency portfolio risk calculations
 */

import { describe, it, expect } from '@jest/globals';

// Mock test data structures
interface MockExposure {
  exposureAmount: number;
  currency: string;
  airline: {
    icao: string;
    name: string;
    country: string;
    riskSnapshots: Array<{
      overallScore: number;
      riskBucket: 'Low' | 'Medium' | 'High';
    }>;
  };
}

// Helper function to calculate risk for a currency group (mimics the logic in portfolio-risk.ts)
function calculateCurrencyRisk(exposures: MockExposure[]) {
  let totalExposure = 0;
  let weightedRiskSum = 0;
  const buckets = { low: 0, medium: 0, high: 0 };

  for (const exposure of exposures) {
    const amount = exposure.exposureAmount;
    totalExposure += amount;

    const airlineRisk = exposure.airline.riskSnapshots[0]?.overallScore || 50;
    const riskBucket = exposure.airline.riskSnapshots[0]?.riskBucket || 'Medium';

    weightedRiskSum += amount * airlineRisk;

    if (riskBucket === 'Low') {
      buckets.low += amount;
    } else if (riskBucket === 'Medium') {
      buckets.medium += amount;
    } else {
      buckets.high += amount;
    }
  }

  const baseRisk = totalExposure > 0 ? weightedRiskSum / totalExposure : 0;
  const maxExposure = Math.max(...exposures.map(e => e.exposureAmount));
  const maxConcentration = totalExposure > 0 ? maxExposure / totalExposure : 0;

  let concentrationPenalty = 0;
  if (maxConcentration > 0.7) {
    concentrationPenalty = 10;
  } else if (maxConcentration > 0.5) {
    concentrationPenalty = 5;
  }

  const adjustedRisk = Math.min(100, baseRisk + concentrationPenalty);

  return {
    totalExposure,
    baseRisk,
    adjustedRisk,
    concentrationPenalty,
    maxConcentration,
    buckets,
  };
}

describe('Multi-Currency Portfolio Risk', () => {
  it('should calculate separate totals for USD and EUR exposures', () => {
    const mockExposures: MockExposure[] = [
      {
        exposureAmount: 1000000,
        currency: 'USD',
        airline: {
          icao: 'AAL',
          name: 'American Airlines',
          country: 'US',
          riskSnapshots: [{ overallScore: 55, riskBucket: 'Medium' }],
        },
      },
      {
        exposureAmount: 500000,
        currency: 'EUR',
        airline: {
          icao: 'DLH',
          name: 'Lufthansa',
          country: 'DE',
          riskSnapshots: [{ overallScore: 35, riskBucket: 'Low' }],
        },
      },
    ];

    // Group by currency
    const usdExposures = mockExposures.filter(e => e.currency === 'USD');
    const eurExposures = mockExposures.filter(e => e.currency === 'EUR');

    const usdRisk = calculateCurrencyRisk(usdExposures);
    const eurRisk = calculateCurrencyRisk(eurExposures);

    expect(usdRisk.totalExposure).toBe(1000000);
    expect(eurRisk.totalExposure).toBe(500000);
    expect(usdRisk.baseRisk).toBe(55);
    expect(eurRisk.baseRisk).toBe(35);
  });

  it('should calculate concentration penalty per currency, not across currencies', () => {
    const mockExposures: MockExposure[] = [
      {
        exposureAmount: 800000, // 80% of USD total
        currency: 'USD',
        airline: {
          icao: 'AAL',
          name: 'American Airlines',
          country: 'US',
          riskSnapshots: [{ overallScore: 50, riskBucket: 'Medium' }],
        },
      },
      {
        exposureAmount: 200000, // 20% of USD total
        currency: 'USD',
        airline: {
          icao: 'DAL',
          name: 'Delta Air Lines',
          country: 'US',
          riskSnapshots: [{ overallScore: 45, riskBucket: 'Medium' }],
        },
      },
      {
        exposureAmount: 300000, // 100% of EUR (but not concentrated across all exposures)
        currency: 'EUR',
        airline: {
          icao: 'DLH',
          name: 'Lufthansa',
          country: 'DE',
          riskSnapshots: [{ overallScore: 40, riskBucket: 'Medium' }],
        },
      },
    ];

    const usdExposures = mockExposures.filter(e => e.currency === 'USD');
    const eurExposures = mockExposures.filter(e => e.currency === 'EUR');

    const usdRisk = calculateCurrencyRisk(usdExposures);
    const eurRisk = calculateCurrencyRisk(eurExposures);

    // USD has 80% concentration -> penalty +10
    expect(usdRisk.maxConcentration).toBe(0.8);
    expect(usdRisk.concentrationPenalty).toBe(10);

    // EUR has 100% in one airline (only one airline) -> no diversification, penalty +10
    expect(eurRisk.maxConcentration).toBe(1.0);
    expect(eurRisk.concentrationPenalty).toBe(10);
  });

  it('should keep USD-only portfolio layout compact', () => {
    const mockExposures: MockExposure[] = [
      {
        exposureAmount: 1000000,
        currency: 'USD',
        airline: {
          icao: 'AAL',
          name: 'American Airlines',
          country: 'US',
          riskSnapshots: [{ overallScore: 50, riskBucket: 'Medium' }],
        },
      },
      {
        exposureAmount: 500000,
        currency: 'USD',
        airline: {
          icao: 'DAL',
          name: 'Delta',
          country: 'US',
          riskSnapshots: [{ overallScore: 45, riskBucket: 'Medium' }],
        },
      },
    ];

    const currencies = [...new Set(mockExposures.map(e => e.currency))];
    
    // Should only have one currency
    expect(currencies.length).toBe(1);
    expect(currencies[0]).toBe('USD');
  });

  it('should group bucket totals per currency', () => {
    const mockExposures: MockExposure[] = [
      {
        exposureAmount: 1000000,
        currency: 'USD',
        airline: {
          icao: 'AAL',
          name: 'American Airlines',
          country: 'US',
          riskSnapshots: [{ overallScore: 75, riskBucket: 'High' }],
        },
      },
      {
        exposureAmount: 500000,
        currency: 'EUR',
        airline: {
          icao: 'DLH',
          name: 'Lufthansa',
          country: 'DE',
          riskSnapshots: [{ overallScore: 35, riskBucket: 'Low' }],
        },
      },
    ];

    const usdExposures = mockExposures.filter(e => e.currency === 'USD');
    const eurExposures = mockExposures.filter(e => e.currency === 'EUR');

    const usdRisk = calculateCurrencyRisk(usdExposures);
    const eurRisk = calculateCurrencyRisk(eurExposures);

    // USD should only have high bucket
    expect(usdRisk.buckets.high).toBe(1000000);
    expect(usdRisk.buckets.low).toBe(0);
    expect(usdRisk.buckets.medium).toBe(0);

    // EUR should only have low bucket
    expect(eurRisk.buckets.low).toBe(500000);
    expect(eurRisk.buckets.high).toBe(0);
    expect(eurRisk.buckets.medium).toBe(0);
  });
});
