// Risk sources for airline risk assessment

import { RiskSource, RiskComponents, RiskContext, RiskDimensionKey, normalizeScore } from '../risk-model';
import { financialRiskSource } from './financial';

export const countryRiskSource: RiskSource = {
  key: 'country' as RiskDimensionKey,
  name: 'Country Risk',
  description: 'Risk assessment based on the airline\'s country of operation',
  enabled: true,
  weight: 0.28, // 28% of overall score
  
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

// Operational Presence risk source - assesses risk based on operational status and fleet
export const operationalPresenceRiskSource: RiskSource = {
  key: 'activity' as RiskDimensionKey,
  name: 'Operational Presence Risk',
  description: 'Risk assessment based on airline\'s operational status and fleet presence',
  enabled: true,
  weight: 0.20, // 20% of overall score
  
  async calculate(context: RiskContext): Promise<RiskComponents> {
    const components: RiskComponents = {};
    
    const isActive = context.airline.active;
    const fleetSize = context.airline.fleetSize ?? 0;
    
    // Operational Presence Risk scoring:
    // - Inactive airline = very high risk (80)
    // - Active + small fleet (<10) = high risk (60)
    // - Active + fleet 10-50 = moderate risk (45)
    // - Active + fleet >50 = low risk (30)
    // - Active + fleet >200 = very low risk (20)
    
    let operationalRisk: number;
    
    if (!isActive) {
      operationalRisk = 80; // Inactive = high risk
    } else if (fleetSize === 0) {
      operationalRisk = 70; // Active but no fleet data
    } else if (fleetSize < 10) {
      operationalRisk = 60; // Very small operator
    } else if (fleetSize < 50) {
      operationalRisk = 45; // Small to medium operator
    } else if (fleetSize < 200) {
      operationalRisk = 30; // Medium to large operator
    } else {
      operationalRisk = 20; // Major operator
    }
    
    components.activity = operationalRisk;
    
    return components;
  },
};

// Fleet and status risk source - assesses risk based on fleet size and active status
export const sizeAndStatusRiskSource: RiskSource = {
  key: 'size' as RiskDimensionKey,
  name: 'Fleet & Status Risk',
  description: 'Risk assessment based on fleet size and operational status',
  enabled: true,
  weight: 0.32, // 32% of overall score
  
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
  operationalPresenceRiskSource, // Renamed from activityRiskSource
  sizeAndStatusRiskSource,
  financialRiskSource, // NEW: Financial risk based on debt, profitability, liquidity
  // Future sources can be added here:
  // newsRiskSource,
];
