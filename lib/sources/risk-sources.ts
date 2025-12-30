// Risk sources for airline risk assessment

import { RiskSource, ComponentScore, RiskContext, RiskDimensionKey, normalizeScore } from '../risk-model';
import { financialRiskSource } from './financial';

// Jurisdiction Risk (proxy) - Country-based risk assessment
export const jurisdictionRiskSource: RiskSource = {
  key: 'jurisdiction' as RiskDimensionKey,
  name: 'Jurisdiction Risk (proxy)',
  description: 'Risk assessment based on the airline\'s country of operation and regulatory environment',
  enabled: true,
  weight: 0.25, // 25% of overall score
  
  async calculate(context: RiskContext): Promise<ComponentScore> {
    if (!context.countryInfo) {
      // If no country data, return moderate risk with low confidence
      return {
        score: 50,
        confidence: 'LOW',
        metadata: {
          reason: 'Country data unavailable',
          note: 'This is a proxy measure based on available regional data',
        },
      };
    }
    
    // Simple country risk heuristics
    let countryRisk = 40; // Base moderate risk
    
    // Regional risk adjustments (simplified proxy)
    const region = context.countryInfo.region?.toLowerCase();
    if (region === 'europe' || region === 'americas') {
      countryRisk -= 15; // Lower risk
    } else if (region === 'africa' || region?.includes('middle east')) {
      countryRisk += 20; // Higher risk
    } else if (region === 'asia' || region === 'oceania') {
      countryRisk += 5; // Slightly higher risk
    }
    
    // Economic stability indicator (Gini coefficient)
    // Higher Gini = more inequality = higher risk
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (context.countryInfo.gini) {
      const giniRisk = normalizeScore(context.countryInfo.gini, 25, 65, false);
      countryRisk = (countryRisk * 0.7) + (giniRisk * 0.3);
      confidence = 'HIGH'; // Have both region and Gini data
    } else {
      confidence = 'MEDIUM'; // Only region data
    }
    
    // Ensure score is in 0-100 range
    const finalScore = Math.max(0, Math.min(100, countryRisk));
    
    return {
      score: finalScore,
      confidence,
      metadata: {
        region: context.countryInfo.region,
        gini: context.countryInfo.gini,
        note: 'Proxy measure based on regional and economic indicators',
      },
    };
  },
};

// Scale & Network Strength - Fleet size is the PRIMARY indicator (no longer split)
export const scaleAndNetworkRiskSource: RiskSource = {
  key: 'scale' as RiskDimensionKey,
  name: 'Scale & Network Strength',
  description: 'Risk assessment based on airline size and network scale (fleet size)',
  enabled: true,
  weight: 0.20, // 20% of overall score
  
  async calculate(context: RiskContext): Promise<ComponentScore> {
    const fleetSize = context.airline.fleetSize ?? 0;
    
    // Fleet size is the ONLY factor for scale risk
    // Larger fleet = more diversification, economies of scale, market presence
    let scaleRisk: number;
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    
    if (fleetSize === 0) {
      // No fleet data available
      return {
        score: 50, // Neutral
        confidence: 'LOW',
        metadata: {
          reason: 'Fleet size data unavailable',
          fleetSize: null,
        },
      };
    } else if (fleetSize < 10) {
      scaleRisk = 70; // Very small operator - high risk
      confidence = 'HIGH';
    } else if (fleetSize < 25) {
      scaleRisk = 60; // Small operator
      confidence = 'HIGH';
    } else if (fleetSize < 50) {
      scaleRisk = 45; // Small-medium operator
      confidence = 'HIGH';
    } else if (fleetSize < 100) {
      scaleRisk = 35; // Medium operator
      confidence = 'HIGH';
    } else if (fleetSize < 200) {
      scaleRisk = 25; // Large operator
      confidence = 'HIGH';
    } else {
      scaleRisk = 15; // Major operator - low risk
      confidence = 'HIGH';
    }
    
    return {
      score: scaleRisk,
      confidence,
      metadata: {
        fleetSize,
        category: fleetSize >= 200 ? 'Major' : fleetSize >= 100 ? 'Large' : fleetSize >= 50 ? 'Medium' : fleetSize >= 25 ? 'Small-Medium' : 'Small',
      },
    };
  },
};

// Fleet & Asset Liquidity (proxy) - NEW component
export const assetLiquidityRiskSource: RiskSource = {
  key: 'assetLiquidity' as RiskDimensionKey,
  name: 'Fleet & Asset Liquidity (proxy)',
  description: 'Risk based on fleet composition and asset marketability',
  enabled: true,
  weight: 0.20, // 20% of overall score
  
  async calculate(context: RiskContext): Promise<ComponentScore> {
    // Check if active - inactive airline has very high asset liquidity risk
    if (!context.airline.active) {
      return {
        score: 85,
        confidence: 'HIGH',
        metadata: {
          reason: 'Airline inactive - assets likely illiquid or distressed',
          active: false,
        },
      };
    }
    
    // TODO: In future, analyze fleet composition (narrowbody vs widebody)
    // For now, we don't have fleet composition data
    // Narrowbody-heavy (A320, B737) = lower risk (more liquid)
    // Widebody-heavy (A380, B777) = higher risk (less liquid, harder to place)
    
    // Return neutral score with LOW confidence since we lack fleet composition data
    return {
      score: null, // No score - data unavailable
      confidence: 'LOW',
      metadata: {
        reason: 'Fleet composition data unavailable',
        fleetCompositionUnavailable: true,
        note: 'Future enhancement: analyze narrowbody vs widebody mix',
        active: context.airline.active,
      },
    };
  },
};

// Export all enabled sources for the aggregator
export const enabledRiskSources: RiskSource[] = [
  jurisdictionRiskSource,      // 25% - Country-based risk
  scaleAndNetworkRiskSource,   // 20% - Fleet size only
  assetLiquidityRiskSource,    // 20% - Fleet composition (currently unavailable)
  financialRiskSource,         // 35% - Financial strength (returns null if unavailable)
  // Future sources can be added here:
  // newsRiskSource,
];
