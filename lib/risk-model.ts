// Risk model type definitions and interfaces

export type RiskDimensionKey =
  | 'jurisdiction'    // Renamed from 'country'
  | 'scale'          // Renamed from 'size' - Scale & Network Strength
  | 'assetLiquidity' // NEW - Fleet & Asset Liquidity
  | 'financial'      // Financial Strength
  | 'news';          // Future

export type RiskBucket = 'Low' | 'Medium' | 'High';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// Component score with confidence level
export interface ComponentScore {
  score: number | null; // 0-100 scale, or null if unavailable
  confidence: ConfidenceLevel;
  metadata?: Record<string, any>; // Additional context about the score
}

// Component scores from different risk dimensions (0-100 scale)
export interface RiskComponents {
  [key: string]: ComponentScore | any; // Allow metadata objects alongside scores
}

// Context data for risk calculation
export interface RiskContext {
  airline: {
    icao: string;
    name: string;
    country: string;
    active: boolean;
    fleetSize?: number;
    ticker?: string; // Stock ticker for financial data
  };
  countryInfo?: {
    region?: string;
    subregion?: string;
    population?: number;
    gini?: number;
  };
  activityData?: {
    flightsLast24h?: number;
  };
  financialData?: {
    available: boolean;
    ticker?: string;
    debtToEquity?: number;
    profitMargin?: number;
    cashToDebt?: number;
    currency?: string;
    fiscalYear?: string;
    dataSource?: 'api' | 'mock' | 'none';
  };
  // Future context fields
  newsData?: any;
}

// Interface for risk sources - pluggable architecture
export interface RiskSource {
  key: RiskDimensionKey;
  name: string;
  description: string;
  enabled: boolean;
  weight: number; // Relative weight in overall score calculation
  
  // Calculate component scores (0-100) from context
  // Returns ComponentScore with confidence level and optional metadata
  calculate(context: RiskContext): Promise<ComponentScore>;
}

// Overall risk result
export interface RiskResult {
  overallScore: number; // 0-100
  riskBucket: RiskBucket;
  components: RiskComponents;
  breakdown: {
    key: RiskDimensionKey;
    name: string;
    score: number | null;
    confidence: ConfidenceLevel;
    weight: number;
    effectiveWeight?: number; // Actual weight used if components were missing
  }[];
  context: RiskContext;
  calculatedAt: Date;
  expiresAt: Date;
  metadata?: {
    missingComponents?: string[];
    reweighted?: boolean;
  };
}

// Configuration for risk calculation
export interface RiskConfig {
  cacheDurationMinutes: number;
  bucketThresholds: {
    lowMax: number;    // 0-40 = Low
    mediumMax: number; // 40-70 = Medium
                       // 70-100 = High
  };
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  cacheDurationMinutes: 60, // Cache risk scores for 1 hour
  bucketThresholds: {
    lowMax: 40,
    mediumMax: 70,
  },
};

// Helper function to map score to bucket
export function scoreToRiskBucket(score: number, config: RiskConfig = DEFAULT_RISK_CONFIG): RiskBucket {
  if (score <= config.bucketThresholds.lowMax) return 'Low';
  if (score <= config.bucketThresholds.mediumMax) return 'Medium';
  return 'High';
}

// Normalize a value to 0-100 scale
export function normalizeScore(value: number, min: number, max: number, invert: boolean = false): number {
  const normalized = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return invert ? 100 - normalized : normalized;
}
