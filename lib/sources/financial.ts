// Financial risk source for airline risk assessment
import { RiskSource, ComponentScore, RiskContext } from '../risk-model';
import {
  getFundamentalsForTicker,
  getTickerFromIcao,
  FinancialFundamentals,
} from './financialApi';

/**
 * Financial Risk Score Calculation
 * 
 * Methodology:
 * - Debt-to-Equity Ratio: Higher = riskier (airlines typically 1-3 range)
 * - Profit Margin: Lower/negative = riskier (airlines typically 2-10%)
 * - Cash-to-Debt Ratio: Lower = riskier (measures liquidity)
 * 
 * Output: 0-100 scale (lower is better), or null if unavailable
 * - 0-30: Strong financials
 * - 31-60: Moderate financial health
 * - 61-100: Financial stress/weakness
 * - null: Not publicly traded or data unavailable
 */

export const financialRiskSource: RiskSource = {
  key: 'financial',
  name: 'Financial Strength',
  description: 'Risk based on financial health: debt levels, profitability, liquidity',
  enabled: true,
  weight: 0.35, // 35% of overall risk score

  async calculate(context: RiskContext): Promise<ComponentScore> {
    const icao = context.airline.icao;

    // Get stock ticker for the airline
    const ticker = getTickerFromIcao(icao);

    // If no ticker (private airline), return null score
    if (!ticker) {
      return {
        score: null,
        confidence: 'LOW',
        metadata: {
          reason: 'Not publicly traded',
          dataSource: 'none',
          note: 'Financial data unavailable for private airlines',
        },
      };
    }

    // Fetch financial fundamentals
    const fundamentals = await getFundamentalsForTicker(ticker);

    // If data fetch failed, return null score
    if (!fundamentals) {
      return {
        score: null,
        confidence: 'LOW',
        metadata: {
          reason: 'Financial data unavailable',
          ticker,
          dataSource: 'none',
        },
      };
    }

    // Compute financial risk score
    const riskScore = computeFinancialRisk(fundamentals);

    return {
      score: riskScore,
      confidence: fundamentals.dataSource === 'api' ? 'HIGH' : 'MEDIUM',
      metadata: {
        ticker,
        dataSource: fundamentals.dataSource,
        debtToEquity: fundamentals.debtToEquity,
        profitMargin: fundamentals.profitMargin,
        cashToDebt: fundamentals.cashToDebt,
        currency: fundamentals.currency,
        fiscalYear: fundamentals.fiscalYear,
      },
    };
  },
};

/**
 * Compute financial risk score from fundamentals
 * 
 * @param fundamentals - Financial data including ratios
 * @returns Risk score from 0-100 (lower is better)
 */
export function computeFinancialRisk(fundamentals: FinancialFundamentals): number {
  const { debtToEquity, profitMargin, cashToDebt } = fundamentals;

  // Component 1: Debt-to-Equity Risk (40% weight)
  // Airlines typically have D/E ratio of 1-3
  // <1 = excellent (0), 1-2 = good (20), 2-3 = moderate (40), 3-5 = concerning (70), >5 = high risk (90)
  let debtRisk: number;
  if (debtToEquity < 1) {
    debtRisk = 0;
  } else if (debtToEquity < 2) {
    debtRisk = 20;
  } else if (debtToEquity < 3) {
    debtRisk = 40;
  } else if (debtToEquity < 5) {
    debtRisk = 70;
  } else {
    debtRisk = Math.min(100, 90 + (debtToEquity - 5) * 5);
  }

  // Component 2: Profitability Risk (40% weight)
  // Negative margins = high risk
  // 0-2% = moderate risk
  // 2-5% = low-moderate risk
  // 5-10% = low risk
  // >10% = very low risk
  let profitRisk: number;
  if (profitMargin < 0) {
    profitRisk = Math.min(100, 80 + Math.abs(profitMargin) * 5);
  } else if (profitMargin < 2) {
    profitRisk = 60 - profitMargin * 10;
  } else if (profitMargin < 5) {
    profitRisk = 40 - (profitMargin - 2) * 6.67;
  } else if (profitMargin < 10) {
    profitRisk = 20 - (profitMargin - 5) * 3;
  } else {
    profitRisk = Math.max(0, 5 - (profitMargin - 10) * 0.5);
  }

  // Component 3: Liquidity Risk (20% weight)
  // Cash-to-Debt ratio: measures ability to cover debt
  // >1.0 = excellent (0)
  // 0.5-1.0 = good (20)
  // 0.3-0.5 = moderate (40)
  // 0.1-0.3 = concerning (70)
  // <0.1 = high risk (90)
  let liquidityRisk: number;
  if (cashToDebt >= 1.0) {
    liquidityRisk = 0;
  } else if (cashToDebt >= 0.5) {
    liquidityRisk = 20;
  } else if (cashToDebt >= 0.3) {
    liquidityRisk = 40;
  } else if (cashToDebt >= 0.1) {
    liquidityRisk = 70;
  } else {
    liquidityRisk = 90;
  }

  // Weighted average
  const overallRisk = debtRisk * 0.4 + profitRisk * 0.4 + liquidityRisk * 0.2;

  // Clamp to 0-100 range and round to 1 decimal
  return Math.round(Math.max(0, Math.min(100, overallRisk)) * 10) / 10;
}

/**
 * Helper function to explain financial risk level
 */
export function getFinancialRiskDescription(score: number): string {
  if (score < 40) {
    return 'Strong financial position with healthy debt levels and profitability';
  } else if (score < 50) {
    return 'Moderate financial health with manageable debt';
  } else if (score < 70) {
    return 'Financial concerns present; elevated debt or profitability issues';
  } else {
    return 'Significant financial stress; high debt burden or operating losses';
  }
}
