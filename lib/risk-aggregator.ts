// Risk aggregator - combines multiple risk sources into overall score

import {
  RiskResult,
  RiskContext,
  RiskComponents,
  RiskConfig,
  DEFAULT_RISK_CONFIG,
  scoreToRiskBucket,
  RiskDimensionKey,
} from './risk-model';
import { enabledRiskSources } from './sources/risk-sources';
import prisma from './db';

// Re-export for convenience
export type { RiskContext };

/**
 * Calculate overall airline risk by aggregating all enabled risk sources
 * Handles missing components by reweighting across available data
 */
export async function calculateAirlineRisk(
  context: RiskContext,
  config: RiskConfig = DEFAULT_RISK_CONFIG
): Promise<RiskResult> {
  // Calculate components from all enabled sources
  const allComponents: RiskComponents = {};
  const breakdown = [];
  const missingComponents: string[] = [];
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalAvailableWeight = 0;
  let reweighted = false;
  
  for (const source of enabledRiskSources) {
    if (!source.enabled) continue;
    
    const componentScore = await source.calculate(context);
    
    // Store the component with its metadata
    allComponents[source.key] = componentScore;
    
    // Update context with financial metadata if present
    if (source.key === 'financial' && componentScore.metadata) {
      context.financialData = componentScore.metadata as any;
    }
    
    // Handle null scores (missing data)
    if (componentScore.score === null || componentScore.score === undefined) {
      missingComponents.push(source.name);
      breakdown.push({
        key: source.key,
        name: source.name,
        score: null,
        confidence: componentScore.confidence,
        weight: source.weight,
        effectiveWeight: 0, // Not used in calculation
      });
      continue;
    }
    
    // Component is available - include in weighted calculation
    totalWeightedScore += componentScore.score * source.weight;
    totalWeight += source.weight;
    totalAvailableWeight += source.weight;
    
    breakdown.push({
      key: source.key,
      name: source.name,
      score: componentScore.score,
      confidence: componentScore.confidence,
      weight: source.weight,
      effectiveWeight: source.weight, // Will be normalized if reweighted
    });
  }
  
  // Reweight if some components are missing
  if (totalAvailableWeight < 1.0 && totalAvailableWeight > 0) {
    reweighted = true;
    // Normalize weights of available components to sum to 1.0
    breakdown.forEach(item => {
      if (item.score !== null && item.effectiveWeight) {
        item.effectiveWeight = item.weight / totalAvailableWeight;
      }
    });
  }
  
  // Calculate overall score (weighted average of available components)
  const overallScore = totalAvailableWeight > 0 ? totalWeightedScore / totalAvailableWeight : 50;
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
    metadata: {
      missingComponents: missingComponents.length > 0 ? missingComponents : undefined,
      reweighted: reweighted ? true : undefined,
    },
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
  
  if (snapshot.jurisdictionScore !== null) {
    components.jurisdiction = {
      score: snapshot.jurisdictionScore,
      confidence: (snapshot.jurisdictionConfidence as any) || 'MEDIUM',
      metadata: {},
    };
  }
  
  if (snapshot.scaleScore !== null) {
    components.scale = {
      score: snapshot.scaleScore,
      confidence: (snapshot.scaleConfidence as any) || 'MEDIUM',
      metadata: {},
    };
  }
  
  if (snapshot.assetLiquidityScore !== null) {
    components.assetLiquidity = {
      score: snapshot.assetLiquidityScore,
      confidence: (snapshot.assetLiquidityConfidence as any) || 'LOW',
      metadata: {},
    };
  }
  
  if (snapshot.financialScore !== null) {
    components.financial = {
      score: snapshot.financialScore,
      confidence: (snapshot.financialConfidence as any) || 'MEDIUM',
      metadata: {},
    };
  }
  
  // Parse component metadata if available
  if (snapshot.componentMetadata) {
    try {
      const metadata = JSON.parse(snapshot.componentMetadata);
      if (components.jurisdiction) components.jurisdiction.metadata = metadata.jurisdiction || {};
      if (components.scale) components.scale.metadata = metadata.scale || {};
      if (components.assetLiquidity) components.assetLiquidity.metadata = metadata.assetLiquidity || {};
      if (components.financial) components.financial.metadata = metadata.financial || {};
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // Reconstruct breakdown (simplified)
  const breakdown = [];
  if (components.jurisdiction) {
    breakdown.push({
      key: 'jurisdiction' as RiskDimensionKey,
      name: 'Jurisdiction Risk (proxy)',
      score: components.jurisdiction.score,
      confidence: components.jurisdiction.confidence,
      weight: 0.25,
    });
  }
  if (components.scale) {
    breakdown.push({
      key: 'scale' as RiskDimensionKey,
      name: 'Scale & Network Strength',
      score: components.scale.score,
      confidence: components.scale.confidence,
      weight: 0.20,
    });
  }
  if (components.assetLiquidity) {
    breakdown.push({
      key: 'assetLiquidity' as RiskDimensionKey,
      name: 'Fleet & Asset Liquidity (proxy)',
      score: components.assetLiquidity.score,
      confidence: components.assetLiquidity.confidence,
      weight: 0.20,
    });
  }
  if (components.financial) {
    breakdown.push({
      key: 'financial' as RiskDimensionKey,
      name: 'Financial Strength',
      score: components.financial.score,
      confidence: components.financial.confidence,
      weight: 0.35,
    });
  }
  
  return {
    overallScore: snapshot.overallScore,
    riskBucket: snapshot.riskBucket as any,
    components,
    breakdown,
    context: (snapshot.sourceData as any) || { 
      airline: { 
        icao, 
        name: airline.name, 
        country: airline.country, 
        active: airline.active 
      } 
    },
    calculatedAt: snapshot.calculatedAt,
    expiresAt: snapshot.expiresAt,
    metadata: {
      missingComponents: snapshot.missingComponents ? snapshot.missingComponents.split(', ') : undefined,
      reweighted: snapshot.reweighted ? true : undefined,
    },
  };
}

/**
 * Save risk snapshot to database
 */
async function saveRiskSnapshot(airlineId: string, result: RiskResult): Promise<void> {
  // Extract component scores and confidence levels
  const jurisdictionComp = result.components.jurisdiction;
  const scaleComp = result.components.scale;
  const assetLiquidityComp = result.components.assetLiquidity;
  const financialComp = result.components.financial;
  
  await prisma.airlineRiskSnapshot.create({
    data: {
      airlineId,
      overallScore: result.overallScore,
      riskBucket: result.riskBucket,
      dataVersion: '2.0',
      
      // Jurisdiction Risk
      jurisdictionScore: jurisdictionComp?.score ?? null,
      jurisdictionConfidence: jurisdictionComp?.confidence ?? null,
      
      // Scale & Network Strength
      scaleScore: scaleComp?.score ?? null,
      scaleConfidence: scaleComp?.confidence ?? null,
      
      // Fleet & Asset Liquidity
      assetLiquidityScore: assetLiquidityComp?.score ?? null,
      assetLiquidityConfidence: assetLiquidityComp?.confidence ?? null,
      
      // Financial Strength
      financialScore: financialComp?.score ?? null,
      financialConfidence: financialComp?.confidence ?? null,
      
      // Metadata
      sourceData: result.context as any,
      componentMetadata: JSON.stringify({
        jurisdiction: jurisdictionComp?.metadata,
        scale: scaleComp?.metadata,
        assetLiquidity: assetLiquidityComp?.metadata,
        financial: financialComp?.metadata,
      }),
      reweighted: result.metadata?.reweighted ?? false,
      missingComponents: result.metadata?.missingComponents?.join(', ') ?? null,
      
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
