// Pure functions for scenario analysis (what-if simulations)
// Reuses portfolio risk calculation logic without database access

interface ExposureRow {
  airlineIcao: string;
  airlineName: string;
  airlineCountry: string;
  exposure: number;
  risk: number;
  riskBucket: string;
}

interface ScenarioInput {
  exposures: ExposureRow[];
  currency: string;
  modification?: {
    airlineIcao: string;
    newExposure: number;
  };
}

interface ScenarioResult {
  totalExposure: number;
  baseRisk: number;
  adjustedRisk: number;
  concentrationPenalty: number;
  maxConcentration: number;
  riskBucket: 'Low' | 'Medium' | 'High';
  topExposures: Array<{
    airlineIcao: string;
    airlineName: string;
    exposure: number;
    exposureShare: number; // as percentage
    risk: number;
    riskBucket: string;
  }>;
}

/**
 * Calculate portfolio risk for a given set of exposures
 * Pure function - no side effects
 */
export function calculateScenarioRisk(input: ScenarioInput): ScenarioResult {
  let exposures = [...input.exposures];

  // Apply modification if provided
  if (input.modification) {
    const modifiedIndex = exposures.findIndex(
      e => e.airlineIcao === input.modification!.airlineIcao
    );
    
    if (modifiedIndex >= 0) {
      exposures[modifiedIndex] = {
        ...exposures[modifiedIndex],
        exposure: input.modification.newExposure,
      };
    }
  }

  // Filter out zero exposures
  exposures = exposures.filter(e => e.exposure > 0);

  if (exposures.length === 0) {
    return {
      totalExposure: 0,
      baseRisk: 0,
      adjustedRisk: 0,
      concentrationPenalty: 0,
      maxConcentration: 0,
      riskBucket: 'Low',
      topExposures: [],
    };
  }

  // Calculate total exposure
  const totalExposure = exposures.reduce((sum, e) => sum + e.exposure, 0);

  // Calculate base risk (exposure-weighted average)
  const weightedRiskSum = exposures.reduce(
    (sum, e) => sum + e.exposure * e.risk,
    0
  );
  const baseRisk = totalExposure > 0 ? weightedRiskSum / totalExposure : 0;

  // Calculate concentration
  const maxExposureAmount = Math.max(...exposures.map(e => e.exposure));
  const maxConcentration = totalExposure > 0 ? maxExposureAmount / totalExposure : 0;

  // Calculate concentration penalty
  let concentrationPenalty = 0;
  if (maxConcentration > 0.7) {
    concentrationPenalty = 10;
  } else if (maxConcentration > 0.5) {
    concentrationPenalty = 5;
  }

  // Calculate adjusted risk
  const adjustedRisk = Math.min(100, baseRisk + concentrationPenalty);

  // Determine risk bucket
  let riskBucket: 'Low' | 'Medium' | 'High' = 'Low';
  if (adjustedRisk >= 70) {
    riskBucket = 'High';
  } else if (adjustedRisk >= 40) {
    riskBucket = 'Medium';
  }

  // Sort by exposure and calculate shares
  const sortedExposures = exposures
    .map(e => ({
      airlineIcao: e.airlineIcao,
      airlineName: e.airlineName,
      exposure: e.exposure,
      exposureShare: totalExposure > 0 ? (e.exposure / totalExposure) * 100 : 0,
      risk: e.risk,
      riskBucket: e.riskBucket,
    }))
    .sort((a, b) => b.exposure - a.exposure);

  return {
    totalExposure: Math.round(totalExposure * 100) / 100,
    baseRisk: Math.round(baseRisk * 10) / 10,
    adjustedRisk: Math.round(adjustedRisk * 10) / 10,
    concentrationPenalty,
    maxConcentration: Math.round(maxConcentration * 1000) / 1000,
    riskBucket,
    topExposures: sortedExposures.slice(0, 10),
  };
}
