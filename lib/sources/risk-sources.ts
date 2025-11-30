// Country risk source - assesses risk based on airline's country

import { RiskSource, RiskComponents, RiskContext, RiskDimensionKey, normalizeScore } from '../risk-model';

export const countryRiskSource: RiskSource = {
  key: 'country' as RiskDimensionKey,
  name: 'Country Risk',
  description: 'Risk assessment based on the airline\'s country of operation',
  enabled: true,
  weight: 0.35, // 35% of overall score
  
  async calculate(context: RiskContext): Promise<RiskComponents> {
    const components: RiskComponents = {};
    
    if (!context.countryInfo) {
      // If no country data, assign moderate risk
      components.country = 50;
      return components;
    }
    
    // Simple country risk heuristics
    let countryRisk = 40; // Base moderate risk
    
    // Regional risk adjustments (simplified)
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
    if (context.countryInfo.gini) {
      const giniRisk = normalizeScore(context.countryInfo.gini, 25, 65, false);
      countryRisk = (countryRisk * 0.7) + (giniRisk * 0.3);
    }
    
    // Ensure score is in 0-100 range
    components.country = Math.max(0, Math.min(100, countryRisk));
    
    return components;
  },
};

// Activity risk source - assesses risk based on operational activity
export const activityRiskSource: RiskSource = {
  key: 'activity' as RiskDimensionKey,
  name: 'Activity Risk',
  description: 'Risk assessment based on airline\'s operational activity',
  enabled: true,
  weight: 0.25, // 25% of overall score
  
  async calculate(context: RiskContext): Promise<RiskComponents> {
    const components: RiskComponents = {};
    
    const flightsLast24h = context.activityData?.flightsLast24h ?? 0;
    
    // More flights = more active = lower risk
    // Scale: 0 flights = 100 risk, 100+ flights = 0 risk
    if (flightsLast24h === 0) {
      components.activity = 100; // Very high risk if no flights
    } else if (flightsLast24h < 10) {
      components.activity = 70; // High risk for very low activity
    } else if (flightsLast24h < 50) {
      components.activity = normalizeScore(flightsLast24h, 10, 50, true);
    } else {
      components.activity = normalizeScore(Math.min(flightsLast24h, 200), 50, 200, true);
    }
    
    return components;
  },
};

// Size and status risk source - assesses risk based on fleet size and active status
export const sizeAndStatusRiskSource: RiskSource = {
  key: 'size' as RiskDimensionKey,
  name: 'Size & Status Risk',
  description: 'Risk assessment based on fleet size and operational status',
  enabled: true,
  weight: 0.40, // 40% of overall score
  
  async calculate(context: RiskContext): Promise<RiskComponents> {
    const components: RiskComponents = {};
    
    let sizeStatusRisk = 50; // Base moderate risk
    
    // Status risk - inactive airline is very high risk
    if (!context.airline.active) {
      sizeStatusRisk += 40;
    }
    
    // Size risk - larger fleet typically means more stable airline
    const fleetSize = context.airline.fleetSize ?? 0;
    if (fleetSize === 0) {
      sizeStatusRisk += 20;
    } else if (fleetSize < 10) {
      sizeStatusRisk += 15; // Small fleet = higher risk
    } else if (fleetSize < 50) {
      sizeStatusRisk += 5;
    } else if (fleetSize >= 100) {
      sizeStatusRisk -= 15; // Large fleet = lower risk
    } else {
      sizeStatusRisk -= 5;
    }
    
    components.size = Math.max(0, Math.min(100, sizeStatusRisk));
    components.status = context.airline.active ? 20 : 90;
    
    return components;
  },
};

// Export all enabled sources for the aggregator
export const enabledRiskSources: RiskSource[] = [
  countryRiskSource,
  activityRiskSource,
  sizeAndStatusRiskSource,
  // Future sources can be added here:
  // newsRiskSource,
  // financialRiskSource,
];
