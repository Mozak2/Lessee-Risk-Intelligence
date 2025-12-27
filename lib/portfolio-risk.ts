// Portfolio risk calculation logic

import prisma from './db';

export interface PortfolioRiskResult {
  totalExposure: number;
  portfolioRisk: number;
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
 * 
 * Formula: portfolioRisk = sum(exposure * airlineRisk) / sum(exposure)
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
      totalExposure: 0,
      portfolioRisk: 0,
      riskBucket: 'Low',
      buckets: { low: 0, medium: 0, high: 0 },
      topExposures: [],
      currency: 'USD',
    };
  }

  let totalExposure = 0;
  let weightedRiskSum = 0;
  const buckets = { low: 0, medium: 0, high: 0 };
  const exposuresWithRisk: Array<{
    airline: { icao: string; name: string; country: string };
    exposure: number;
    risk: number;
    riskBucket: string;
  }> = [];

  // Determine primary currency (most common in exposures)
  const currencies = portfolio.exposures.map((e) => e.currency);
  const primaryCurrency =
    currencies.find((c, i, arr) => arr.filter((x) => x === c).length > arr.length / 2) ||
    currencies[0] ||
    'USD';

  for (const exposure of portfolio.exposures) {
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

    exposuresWithRisk.push({
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

  // Calculate portfolio risk (exposure-weighted average)
  const portfolioRisk = totalExposure > 0 ? weightedRiskSum / totalExposure : 0;

  // Determine portfolio risk bucket
  let portfolioRiskBucket: 'Low' | 'Medium' | 'High' = 'Low';
  if (portfolioRisk > 60) {
    portfolioRiskBucket = 'High';
  } else if (portfolioRisk > 30) {
    portfolioRiskBucket = 'Medium';
  }

  // Sort exposures by amount (largest first)
  const topExposures = exposuresWithRisk
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 10); // Top 10 exposures

  return {
    totalExposure: Math.round(totalExposure * 100) / 100,
    portfolioRisk: Math.round(portfolioRisk * 10) / 10,
    riskBucket: portfolioRiskBucket,
    buckets: {
      low: Math.round(buckets.low * 100) / 100,
      medium: Math.round(buckets.medium * 100) / 100,
      high: Math.round(buckets.high * 100) / 100,
    },
    topExposures,
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
