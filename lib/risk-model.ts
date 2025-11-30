// Risk model type definitions and interfaces

export type RiskDimensionKey =
  | 'country'
  | 'activity'
  | 'size'
  | 'status'
  | 'news'       // Future
  | 'financial'; // Future

export type RiskBucket = 'Low' | 'Medium' | 'High';

// Component scores from different risk dimensions (0-100 scale)
export interface RiskComponents {
  [key: string]: number;
}

// Context data for risk calculation
export interface RiskContext {
  airline: {
    icao: string;
    name: string;
    country: string;
    active: boolean;
    fleetSize?: number;
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
  // Future context fields
  newsData?: any;
  financialData?: any;
}

// Interface for risk sources - pluggable architecture
export interface RiskSource {
  key: RiskDimensionKey;
  name: string;
  description: string;
  enabled: boolean;
  weight: number; // Relative weight in overall score calculation
  
  // Calculate component scores (0-100) from context
  calculate(context: RiskContext): Promise<RiskComponents>;
}

// Overall risk result
export interface RiskResult {
  overallScore: number; // 0-100
  riskBucket: RiskBucket;
  components: RiskComponents;
  breakdown: {
    key: RiskDimensionKey;
    name: string;
    score: number;
    weight: number;
  }[];
  context: RiskContext;
  calculatedAt: Date;
  expiresAt: Date;
}

// Configuration for risk calculation
export interface RiskConfig {
  cacheDurationMinutes: number;
  bucketThresholds: {
    lowMax: number;    // 0-30 = Low
    mediumMax: number; // 31-60 = Medium
                       // 61-100 = High
  };
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  cacheDurationMinutes: 60, // Cache risk scores for 1 hour
  bucketThresholds: {
    lowMax: 30,
    mediumMax: 60,
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
