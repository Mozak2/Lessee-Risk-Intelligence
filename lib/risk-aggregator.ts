// Risk aggregator - combines multiple risk sources into overall score

import {
  RiskResult,
  RiskContext,
  RiskComponents,
  RiskConfig,
  DEFAULT_RISK_CONFIG,
  scoreToRiskBucket,
} from './risk-model';
import { enabledRiskSources } from './sources/risk-sources';
import prisma from './db';

/**
 * Calculate overall airline risk by aggregating all enabled risk sources
 */
export async function calculateAirlineRisk(
  context: RiskContext,
  config: RiskConfig = DEFAULT_RISK_CONFIG
): Promise<RiskResult> {
  // Calculate components from all enabled sources
  const allComponents: RiskComponents = {};
  const breakdown = [];
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const source of enabledRiskSources) {
    if (!source.enabled) continue;
    
    const sourceComponents = await source.calculate(context);
    
    // Merge components
    Object.assign(allComponents, sourceComponents);
    
    // Calculate weighted contribution
    const sourceScore = Object.values(sourceComponents).reduce((sum: number, score: number) => sum + score, 0) / 
                       Object.values(sourceComponents).length;
    
    totalWeightedScore += sourceScore * source.weight;
    totalWeight += source.weight;
    
    breakdown.push({
      key: source.key,
      name: source.name,
      score: sourceScore,
      weight: source.weight,
    });
  }
  
  // Calculate overall score (weighted average)
  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 50;
  const riskBucket = scoreToRiskBucket(overallScore, config);
  
  const calculatedAt = new Date();
  const expiresAt = new Date(calculatedAt.getTime() + config.cacheDurationMinutes * 60 * 1000);
  
  return {
    overallScore: Math.round(overallScore * 10) / 10, // Round to 1 decimal
    riskBucket,
    components: allComponents,
    breakdown,
    context,
    calculatedAt,
    expiresAt,
  };
}

/**
 * Get or calculate airline risk with caching
 */
export async function getAirlineRisk(
  icao: string,
  forceRefresh: boolean = false
): Promise<RiskResult | null> {
  // Try to get cached snapshot if not forcing refresh
  if (!forceRefresh) {
    const cached = await getCachedRiskSnapshot(icao);
    if (cached) {
      return cached;
    }
  }
  
  // Fetch airline data
  const airline = await prisma.airline.findUnique({
    where: { icao: icao.toUpperCase() },
  });
  
  if (!airline) {
    return null;
  }
  
  // Import API functions dynamically to avoid circular dependencies
  const { getAirlineByIcao } = await import('./sources/aviation');
  const { getCountryInfo } = await import('./sources/restCountries');
  const { getFlightsLast24h } = await import('./sources/opensky');
  
  // Fetch fresh data from APIs
  const [airlineData, countryInfo, activityData] = await Promise.all([
    getAirlineByIcao(icao),
    getCountryInfo(airline.country),
    getFlightsLast24h(icao),
  ]);
  
  // Build context
  const context: RiskContext = {
    airline: {
      icao: airline.icao,
      name: airline.name,
      country: airline.country,
      active: airline.active,
      fleetSize: airline.fleetSize ?? undefined,
    },
    countryInfo,
    activityData: { flightsLast24h: activityData },
  };
  
  // Calculate risk
  const riskResult = await calculateAirlineRisk(context);
  
  // Save snapshot to database
  await saveRiskSnapshot(airline.id, riskResult);
  
  return riskResult;
}

/**
 * Get cached risk snapshot if available and not expired
 */
async function getCachedRiskSnapshot(icao: string): Promise<RiskResult | null> {
  const airline = await prisma.airline.findUnique({
    where: { icao: icao.toUpperCase() },
    include: {
      riskSnapshots: {
        orderBy: { calculatedAt: 'desc' },
        take: 1,
      },
    },
  });
  
  if (!airline || airline.riskSnapshots.length === 0) {
    return null;
  }
  
  const snapshot = airline.riskSnapshots[0];
  
  // Check if expired
  if (new Date() > snapshot.expiresAt) {
    return null;
  }
  
  // Reconstruct RiskResult from snapshot
  const components: RiskComponents = {};
  if (snapshot.countryScore) components.country = snapshot.countryScore;
  if (snapshot.activityScore) components.activity = snapshot.activityScore;
  if (snapshot.sizeScore) components.size = snapshot.sizeScore;
  if (snapshot.statusScore) components.status = snapshot.statusScore;
  if (snapshot.newsScore) components.news = snapshot.newsScore;
  if (snapshot.financialScore) components.financial = snapshot.financialScore;
  
  return {
    overallScore: snapshot.overallScore,
    riskBucket: snapshot.riskBucket as any,
    components,
    breakdown: [], // Could reconstruct from sourceData if needed
    context: (snapshot.sourceData as any) || { airline: { icao, name: airline.name, country: airline.country, active: airline.active } },
    calculatedAt: snapshot.calculatedAt,
    expiresAt: snapshot.expiresAt,
  };
}

/**
 * Save risk snapshot to database
 */
async function saveRiskSnapshot(airlineId: string, result: RiskResult): Promise<void> {
  await prisma.airlineRiskSnapshot.create({
    data: {
      airlineId,
      overallScore: result.overallScore,
      riskBucket: result.riskBucket,
      countryScore: result.components.country,
      activityScore: result.components.activity,
      sizeScore: result.components.size,
      statusScore: result.components.status,
      newsScore: result.components.news,
      financialScore: result.components.financial,
      sourceData: result.context as any,
      calculatedAt: result.calculatedAt,
      expiresAt: result.expiresAt,
    },
  });
}

/**
 * Calculate portfolio-level risk
 */
export async function calculatePortfolioRisk(portfolioId: string) {
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
  
  let totalExposure = 0;
  let weightedRiskSum = 0;
  const exposureByBucket = { Low: 0, Medium: 0, High: 0 };
  
  for (const exposure of portfolio.exposures) {
    totalExposure += exposure.exposureAmount;
    
    const latestSnapshot = exposure.airline.riskSnapshots[0];
    if (latestSnapshot) {
      weightedRiskSum += latestSnapshot.overallScore * exposure.exposureAmount;
      exposureByBucket[latestSnapshot.riskBucket as keyof typeof exposureByBucket] += exposure.exposureAmount;
    }
  }
  
  const weightedAverageRisk = totalExposure > 0 ? weightedRiskSum / totalExposure : 0;
  
  return {
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    totalExposure,
    weightedAverageRisk: Math.round(weightedAverageRisk * 10) / 10,
    riskBucket: scoreToRiskBucket(weightedAverageRisk),
    exposureByBucket,
    numExposures: portfolio.exposures.length,
  };
}
