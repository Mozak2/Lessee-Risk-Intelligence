// Portfolio risk calculation logic

import prisma from './db';

export interface CurrencyRiskResult {
  totalExposure: number;
  baseRisk: number;
  adjustedRisk: number;
  concentrationPenalty: number;
  maxConcentration: number; // As decimal (0-1)
  riskBucket: 'Low' | 'Medium' | 'High';
  buckets: {
    low: number;
    medium: number;
    high: number;
  };
  rows: Array<{
    airline: {
      icao: string;
      name: string;
      country: string;
    };
    exposure: number;
    risk: number;
    riskBucket: string;
  }>;
}

export interface PortfolioRiskResult {
  perCurrency: Record<string, CurrencyRiskResult>;
  currencies: string[];
  // Legacy fields for backward compatibility (uses first currency if single-currency portfolio)
  totalExposure: number;
  baseRisk: number;
  adjustedRisk: number;
  portfolioRisk: number;
  concentrationPenalty: number;
  maxConcentration: number;
  riskBucket: 'Low' | 'Medium' | 'High';
  buckets: {
    low: number;
    medium: number;
    high: number;
  };
  topExposures: Array<{
    airline: {
      icao: string;
      name: string;
      country: string;
    };
    exposure: number;
    risk: number;
    riskBucket: string;
  }>;
  currency: string;
}

/**
 * Calculate portfolio-level risk from airline exposures
 * Supports multi-currency portfolios by calculating risk per currency
 */
export async function calculatePortfolioRisk(
  portfolioId: string
): Promise<PortfolioRiskResult | null> {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      exposures: {
        include: {
          airline: {
            include: {
              riskSnapshots: {
                orderBy: { calculatedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!portfolio) {
    return null;
  }

  if (portfolio.exposures.length === 0) {
    return {
      perCurrency: {},
      currencies: [],
      totalExposure: 0,
      baseRisk: 0,
      adjustedRisk: 0,
      portfolioRisk: 0,
      concentrationPenalty: 0,
      maxConcentration: 0,
      riskBucket: 'Low',
      buckets: { low: 0, medium: 0, high: 0 },
      topExposures: [],
      currency: 'USD',
    };
  }

  // Group exposures by currency
  const exposuresByCurrency = new Map<string, typeof portfolio.exposures>();
  for (const exposure of portfolio.exposures) {
    const currency = exposure.currency || 'USD';
    if (!exposuresByCurrency.has(currency)) {
      exposuresByCurrency.set(currency, []);
    }
    exposuresByCurrency.get(currency)!.push(exposure);
  }

  const currencies = Array.from(exposuresByCurrency.keys()).sort();
  const perCurrency: Record<string, CurrencyRiskResult> = {};

  // Calculate risk for each currency group
  for (const [currency, exposures] of exposuresByCurrency.entries()) {
    let totalExposure = 0;
    let weightedRiskSum = 0;
    const buckets = { low: 0, medium: 0, high: 0 };
    const rows: Array<{
      airline: { icao: string; name: string; country: string };
      exposure: number;
      risk: number;
      riskBucket: string;
    }> = [];

    for (const exposure of exposures) {
      const amount = exposure.exposureAmount;
      totalExposure += amount;

      // Get latest risk snapshot for airline
      const latestSnapshot = exposure.airline.riskSnapshots[0];
      let airlineRisk = 50; // Default moderate risk if no snapshot
      let riskBucket = 'Medium';

      if (latestSnapshot) {
        airlineRisk = latestSnapshot.overallScore;
        riskBucket = latestSnapshot.riskBucket;
      }

      // Calculate weighted risk contribution
      weightedRiskSum += amount * airlineRisk;

      // Group by risk bucket
      if (riskBucket === 'Low') {
        buckets.low += amount;
      } else if (riskBucket === 'Medium') {
        buckets.medium += amount;
      } else {
        buckets.high += amount;
      }

      rows.push({
        airline: {
          icao: exposure.airline.icao,
          name: exposure.airline.name,
          country: exposure.airline.country,
        },
        exposure: amount,
        risk: airlineRisk,
        riskBucket,
      });
    }

    // Calculate base risk (exposure-weighted average)
    const baseRisk = totalExposure > 0 ? weightedRiskSum / totalExposure : 0;

    // Calculate concentration penalty within this currency
    const maxExposureAmount = Math.max(...rows.map(r => r.exposure));
    const maxConcentration = totalExposure > 0 ? maxExposureAmount / totalExposure : 0;
    
    let concentrationPenalty = 0;
    if (maxConcentration > 0.7) {
      concentrationPenalty = 10;
    } else if (maxConcentration > 0.5) {
      concentrationPenalty = 5;
    }

    // Calculate adjusted risk (clamped at 100)
    const adjustedRisk = Math.min(100, baseRisk + concentrationPenalty);

    // Determine risk bucket based on adjusted risk
    let portfolioRiskBucket: 'Low' | 'Medium' | 'High' = 'Low';
    if (adjustedRisk >= 70) {
      portfolioRiskBucket = 'High';
    } else if (adjustedRisk >= 40) {
      portfolioRiskBucket = 'Medium';
    }

    // Sort rows by exposure descending
    rows.sort((a, b) => b.exposure - a.exposure);

    perCurrency[currency] = {
      totalExposure: Math.round(totalExposure * 100) / 100,
      baseRisk: Math.round(baseRisk * 10) / 10,
      adjustedRisk: Math.round(adjustedRisk * 10) / 10,
      concentrationPenalty,
      maxConcentration: Math.round(maxConcentration * 1000) / 1000,
      riskBucket: portfolioRiskBucket,
      buckets: {
        low: Math.round(buckets.low * 100) / 100,
        medium: Math.round(buckets.medium * 100) / 100,
        high: Math.round(buckets.high * 100) / 100,
      },
      rows,
    };
  }

  // For backward compatibility, use first currency as default
  const primaryCurrency = currencies[0] || 'USD';
  const primaryData = perCurrency[primaryCurrency] || {
    totalExposure: 0,
    baseRisk: 0,
    adjustedRisk: 0,
    concentrationPenalty: 0,
    maxConcentration: 0,
    riskBucket: 'Low' as const,
    buckets: { low: 0, medium: 0, high: 0 },
    rows: [],
  };

  return {
    perCurrency,
    currencies,
    totalExposure: primaryData.totalExposure,
    baseRisk: primaryData.baseRisk,
    adjustedRisk: primaryData.adjustedRisk,
    portfolioRisk: primaryData.adjustedRisk,
    concentrationPenalty: primaryData.concentrationPenalty,
    maxConcentration: primaryData.maxConcentration,
    riskBucket: primaryData.riskBucket,
    buckets: primaryData.buckets,
    topExposures: primaryData.rows.slice(0, 10),
    currency: primaryCurrency,
  };
}

/**
 * Get portfolio summary without full risk calculation
 */
export async function getPortfolioSummary(portfolioId: string) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      exposures: {
        include: {
          airline: true,
        },
      },
    },
  });

  if (!portfolio) {
    return null;
  }

  const totalExposure = portfolio.exposures.reduce(
    (sum, e) => sum + e.exposureAmount,
    0
  );

  const numAirlines = portfolio.exposures.length;

  return {
    id: portfolio.id,
    name: portfolio.name,
    description: portfolio.description,
    totalExposure,
    numAirlines,
    createdAt: portfolio.createdAt,
    updatedAt: portfolio.updatedAt,
  };
}
