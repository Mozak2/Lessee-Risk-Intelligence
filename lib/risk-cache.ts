// Snapshot caching logic for airline risk assessments

import prisma from './db';
import { RiskResult, RiskContext } from './risk-model';
import { calculateAirlineRisk } from './risk-aggregator';

const CACHE_DURATION_HOURS = 6;

/**
 * Get or calculate airline risk with caching
 * Reuses snapshots if they're less than 6 hours old
 */
export async function getOrCalculateAirlineRisk(
  context: RiskContext
): Promise<RiskResult> {
  const icao = context.airline.icao.toUpperCase();

  // Try to find airline in database
  let airline = await prisma.airline.findUnique({
    where: { icao },
    include: {
      riskSnapshots: {
        orderBy: { calculatedAt: 'desc' },
        take: 1,
      },
    },
  });

  // If airline doesn't exist in DB, create it
  if (!airline) {
    airline = await prisma.airline.create({
      data: {
        icao: context.airline.icao,
        iata: undefined,
        name: context.airline.name,
        country: context.airline.country,
        active: context.airline.active,
        fleetSize: context.airline.fleetSize,
      },
      include: {
        riskSnapshots: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
    });
    console.log(`Created airline in database: ${icao}`);
  }

  // Check if we have a recent snapshot
  const latestSnapshot = airline.riskSnapshots[0];
  const now = new Date();
  const cacheExpiryTime = new Date(now.getTime() - CACHE_DURATION_HOURS * 60 * 60 * 1000);

  if (latestSnapshot && latestSnapshot.calculatedAt > cacheExpiryTime) {
    console.log(`Using cached risk snapshot for ${icao} (age: ${Math.round((now.getTime() - latestSnapshot.calculatedAt.getTime()) / 60000)}min)`);
    
    // Reconstruct RiskResult from snapshot
    return reconstructRiskResultFromSnapshot(latestSnapshot, context);
  }

  // No recent snapshot - calculate fresh risk
  console.log(`Calculating fresh risk for ${icao}`);
  const riskResult = await calculateAirlineRisk(context);

  // Save snapshot to database
  await saveRiskSnapshot(airline.id, riskResult);

  return riskResult;
}

/**
 * Reconstruct a RiskResult from a database snapshot
 */
function reconstructRiskResultFromSnapshot(
  snapshot: any,
  context: RiskContext
): RiskResult {
  const components: any = {};
  const breakdown: any[] = [];

  if (snapshot.countryScore !== null) {
    components.country = snapshot.countryScore;
    breakdown.push({
      key: 'country',
      name: 'Country Risk',
      score: snapshot.countryScore,
      weight: 0.28,
    });
  }

  if (snapshot.activityScore !== null) {
    components.activity = snapshot.activityScore;
    breakdown.push({
      key: 'activity',
      name: 'Operational Presence Risk',
      score: snapshot.activityScore,
      weight: 0.20,
    });
  }

  if (snapshot.sizeScore !== null || snapshot.statusScore !== null) {
    // For Fleet & Status, we might have both or just size
    const avgScore = snapshot.sizeScore ?? snapshot.statusScore ?? 50;
    components.size = snapshot.sizeScore ?? avgScore;
    components.status = snapshot.statusScore ?? avgScore;
    breakdown.push({
      key: 'size',
      name: 'Fleet & Status Risk',
      score: avgScore,
      weight: 0.32,
    });
  }

  if (snapshot.financialScore !== null) {
    components.financial = snapshot.financialScore;
    breakdown.push({
      key: 'financial',
      name: 'Financial Risk',
      score: snapshot.financialScore,
      weight: 0.20,
    });
  }

  // Parse sourceData if available (stored as JSON string in SQLite)
  let storedContext = context;
  if (snapshot.sourceData) {
    try {
      storedContext = typeof snapshot.sourceData === 'string' 
        ? JSON.parse(snapshot.sourceData)
        : snapshot.sourceData;
    } catch (e) {
      console.warn('Failed to parse sourceData from snapshot');
    }
  }

  return {
    overallScore: snapshot.overallScore,
    riskBucket: snapshot.riskBucket as any,
    components,
    breakdown,
    context: storedContext,
    calculatedAt: snapshot.calculatedAt,
    expiresAt: snapshot.expiresAt,
  };
}

/**
 * Save a risk snapshot to the database
 */
async function saveRiskSnapshot(
  airlineId: string,
  riskResult: RiskResult
): Promise<void> {
  try {
    await prisma.airlineRiskSnapshot.create({
      data: {
        airlineId,
        overallScore: riskResult.overallScore,
        riskBucket: riskResult.riskBucket,
        countryScore: riskResult.components.country ?? null,
        activityScore: riskResult.components.activity ?? null,
        sizeScore: riskResult.components.size ?? null,
        statusScore: riskResult.components.status ?? null,
        financialScore: riskResult.components.financial ?? null,
        newsScore: riskResult.components.news ?? null,
        sourceData: JSON.stringify(riskResult.context), // Convert to JSON string for SQLite
        calculatedAt: riskResult.calculatedAt,
        expiresAt: riskResult.expiresAt,
      },
    });
    console.log(`Saved risk snapshot for airline ${airlineId}`);
  } catch (error) {
    console.error('Error saving risk snapshot:', error);
    // Don't throw - caching failure shouldn't break the app
  }
}

/**
 * Force recalculation of airline risk (bypasses cache)
 */
export async function forceRecalculateAirlineRisk(
  context: RiskContext
): Promise<RiskResult> {
  const riskResult = await calculateAirlineRisk(context);

  // Save to database if airline exists
  const airline = await prisma.airline.findUnique({
    where: { icao: context.airline.icao.toUpperCase() },
  });

  if (airline) {
    await saveRiskSnapshot(airline.id, riskResult);
  }

  return riskResult;
}
