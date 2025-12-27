// Financial data API wrapper
// Uses Financial Modeling Prep (free tier) or falls back to mock data

export interface FinancialFundamentals {
  ticker: string;
  companyName: string;
  totalDebt: number;
  totalEquity: number;
  cash: number;
  revenue: number;
  netIncome: number;
  // Computed ratios
  debtToEquity: number;
  profitMargin: number;
  cashToDebt: number;
  // Metadata
  currency: string;
  fiscalYear: string;
  dataSource: 'api' | 'mock';
}

/**
 * Fetch financial fundamentals for a given stock ticker
 * Uses Financial Modeling Prep API (free tier allows 250 requests/day)
 * API Key: Get free key at https://site.financialmodelingprep.com/developer/docs/
 */
export async function getFundamentalsForTicker(
  ticker: string
): Promise<FinancialFundamentals | null> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.warn('FMP_API_KEY not set, using mock financial data');
    return getMockFinancialData(ticker);
  }

  try {
    // Fetch balance sheet and income statement
    const [balanceSheetRes, incomeStatementRes] = await Promise.all([
      fetch(
        `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=1&apikey=${apiKey}`,
        { next: { revalidate: 86400 } } // Cache for 24 hours
      ),
      fetch(
        `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=1&apikey=${apiKey}`,
        { next: { revalidate: 86400 } }
      ),
    ]);

    if (!balanceSheetRes.ok || !incomeStatementRes.ok) {
      console.warn(`Financial API error for ${ticker}`);
      return getMockFinancialData(ticker);
    }

    const balanceSheet = await balanceSheetRes.json();
    const incomeStatement = await incomeStatementRes.json();

    if (!balanceSheet[0] || !incomeStatement[0]) {
      console.warn(`No financial data available for ${ticker}`);
      return null;
    }

    const bs = balanceSheet[0];
    const is = incomeStatement[0];

    // Extract key metrics
    const totalDebt = bs.totalDebt || 0;
    const totalEquity = bs.totalStockholdersEquity || 1; // Avoid division by zero
    const cash = bs.cashAndCashEquivalents || 0;
    const revenue = is.revenue || 1;
    const netIncome = is.netIncome || 0;

    // Calculate ratios
    const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 0;
    const profitMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
    const cashToDebt = totalDebt > 0 ? cash / totalDebt : 1;

    return {
      ticker,
      companyName: bs.symbol || ticker,
      totalDebt,
      totalEquity,
      cash,
      revenue,
      netIncome,
      debtToEquity,
      profitMargin,
      cashToDebt,
      currency: bs.reportedCurrency || 'USD',
      fiscalYear: bs.date || 'Unknown',
      dataSource: 'api',
    };
  } catch (error) {
    console.error(`Error fetching financial data for ${ticker}:`, error);
    return getMockFinancialData(ticker);
  }
}

/**
 * Mock financial data for development/testing
 * Based on realistic airline financial profiles
 */
function getMockFinancialData(ticker: string): FinancialFundamentals | null {
  const mockData: { [key: string]: Omit<FinancialFundamentals, 'ticker' | 'dataSource'> } = {
    // US Carriers (publicly traded)
    AAL: {
      companyName: 'American Airlines Group Inc.',
      totalDebt: 42000000000, // $42B debt
      totalEquity: 8000000000, // $8B equity
      cash: 12000000000, // $12B cash
      revenue: 52000000000, // $52B revenue
      netIncome: 1500000000, // $1.5B net income
      debtToEquity: 5.25,
      profitMargin: 2.88,
      cashToDebt: 0.29,
      currency: 'USD',
      fiscalYear: '2024',
    },
    UAL: {
      companyName: 'United Airlines Holdings Inc.',
      totalDebt: 36000000000,
      totalEquity: 12000000000,
      cash: 14000000000,
      revenue: 53000000000,
      netIncome: 2800000000,
      debtToEquity: 3.0,
      profitMargin: 5.28,
      cashToDebt: 0.39,
      currency: 'USD',
      fiscalYear: '2024',
    },
    DAL: {
      companyName: 'Delta Air Lines Inc.',
      totalDebt: 28000000000,
      totalEquity: 15000000000,
      cash: 4000000000,
      revenue: 58000000000,
      netIncome: 4600000000,
      debtToEquity: 1.87,
      profitMargin: 7.93,
      cashToDebt: 0.14,
      currency: 'USD',
      fiscalYear: '2024',
    },
    LUV: {
      companyName: 'Southwest Airlines Co.',
      totalDebt: 9000000000,
      totalEquity: 12000000000,
      cash: 13000000000,
      revenue: 27000000000,
      netIncome: 500000000,
      debtToEquity: 0.75,
      profitMargin: 1.85,
      cashToDebt: 1.44,
      currency: 'USD',
      fiscalYear: '2024',
    },
    JBLU: {
      companyName: 'JetBlue Airways Corporation',
      totalDebt: 6000000000,
      totalEquity: 3000000000,
      cash: 2000000000,
      revenue: 10000000000,
      netIncome: -200000000, // Loss
      debtToEquity: 2.0,
      profitMargin: -2.0,
      cashToDebt: 0.33,
      currency: 'USD',
      fiscalYear: '2024',
    },
    // European Carriers
    'AF.PA': {
      // Air France-KLM
      companyName: 'Air France-KLM SA',
      totalDebt: 18000000000,
      totalEquity: 6000000000,
      cash: 8000000000,
      revenue: 32000000000,
      netIncome: 900000000,
      debtToEquity: 3.0,
      profitMargin: 2.81,
      cashToDebt: 0.44,
      currency: 'EUR',
      fiscalYear: '2024',
    },
    'IAG.L': {
      // British Airways (IAG)
      companyName: 'International Consolidated Airlines Group SA',
      totalDebt: 14000000000,
      totalEquity: 8000000000,
      cash: 12000000000,
      revenue: 31000000000,
      netIncome: 2400000000,
      debtToEquity: 1.75,
      profitMargin: 7.74,
      cashToDebt: 0.86,
      currency: 'EUR',
      fiscalYear: '2024',
    },
    'LHA.DE': {
      // Lufthansa
      companyName: 'Deutsche Lufthansa AG',
      totalDebt: 16000000000,
      totalEquity: 10000000000,
      cash: 9000000000,
      revenue: 40000000000,
      netIncome: 1800000000,
      debtToEquity: 1.6,
      profitMargin: 4.5,
      cashToDebt: 0.56,
      currency: 'EUR',
      fiscalYear: '2024',
    },
    'RYA.L': {
      // Ryanair
      companyName: 'Ryanair Holdings plc',
      totalDebt: 4000000000,
      totalEquity: 8000000000,
      cash: 5000000000,
      revenue: 13000000000,
      netIncome: 1900000000,
      debtToEquity: 0.5,
      profitMargin: 14.62,
      cashToDebt: 1.25,
      currency: 'EUR',
      fiscalYear: '2024',
    },
    'EZJ.L': {
      // EasyJet
      companyName: 'easyJet plc',
      totalDebt: 3000000000,
      totalEquity: 4000000000,
      cash: 2500000000,
      revenue: 9000000000,
      netIncome: 600000000,
      debtToEquity: 0.75,
      profitMargin: 6.67,
      cashToDebt: 0.83,
      currency: 'GBP',
      fiscalYear: '2024',
    },
    // Asian Carriers
    'C6L.SI': {
      // Singapore Airlines
      companyName: 'Singapore Airlines Limited',
      totalDebt: 12000000000,
      totalEquity: 20000000000,
      cash: 15000000000,
      revenue: 19000000000,
      netIncome: 2800000000,
      debtToEquity: 0.6,
      profitMargin: 14.74,
      cashToDebt: 1.25,
      currency: 'SGD',
      fiscalYear: '2024',
    },
    '0293.HK': {
      // Cathay Pacific
      companyName: 'Cathay Pacific Airways Limited',
      totalDebt: 8000000000,
      totalEquity: 5000000000,
      cash: 6000000000,
      revenue: 12000000000,
      netIncome: 400000000,
      debtToEquity: 1.6,
      profitMargin: 3.33,
      cashToDebt: 0.75,
      currency: 'HKD',
      fiscalYear: '2024',
    },
    '9201.T': {
      // Japan Airlines
      companyName: 'Japan Airlines Co., Ltd.',
      totalDebt: 6000000000,
      totalEquity: 8000000000,
      cash: 5000000000,
      revenue: 15000000000,
      netIncome: 1200000000,
      debtToEquity: 0.75,
      profitMargin: 8.0,
      cashToDebt: 0.83,
      currency: 'JPY',
      fiscalYear: '2024',
    },
    '9202.T': {
      // ANA (All Nippon Airways)
      companyName: 'ANA Holdings Inc.',
      totalDebt: 10000000000,
      totalEquity: 7000000000,
      cash: 6000000000,
      revenue: 18000000000,
      netIncome: 800000000,
      debtToEquity: 1.43,
      profitMargin: 4.44,
      cashToDebt: 0.6,
      currency: 'JPY',
      fiscalYear: '2024',
    },
    // Other Carriers
    'AC.TO': {
      // Air Canada
      companyName: 'Air Canada',
      totalDebt: 8000000000,
      totalEquity: 5000000000,
      cash: 7000000000,
      revenue: 22000000000,
      netIncome: 1500000000,
      debtToEquity: 1.6,
      profitMargin: 6.82,
      cashToDebt: 0.88,
      currency: 'CAD',
      fiscalYear: '2024',
    },
    'QAN.AX': {
      // Qantas
      companyName: 'Qantas Airways Limited',
      totalDebt: 5000000000,
      totalEquity: 6000000000,
      cash: 4000000000,
      revenue: 16000000000,
      netIncome: 2000000000,
      debtToEquity: 0.83,
      profitMargin: 12.5,
      cashToDebt: 0.8,
      currency: 'AUD',
      fiscalYear: '2024',
    },
  };

  const data = mockData[ticker.toUpperCase()];
  if (!data) {
    return null;
  }

  return {
    ticker,
    ...data,
    dataSource: 'mock',
  };
}

/**
 * Helper to get ticker symbol from ICAO code
 * Maps airline ICAO codes to their stock tickers
 */
export function getTickerFromIcao(icao: string): string | null {
  const icaoToTicker: { [key: string]: string | null } = {
    // US Airlines
    AAL: 'AAL',
    UAL: 'UAL',
    DAL: 'DAL',
    SWA: 'LUV', // Southwest ticker is LUV
    JBU: 'JBLU',
    // European Airlines
    AFR: 'AF.PA', // Air France-KLM
    BAW: 'IAG.L', // British Airways (part of IAG)
    DLH: 'LHA.DE', // Lufthansa
    KLM: 'AF.PA', // KLM (same as Air France)
    RYR: 'RYA.L', // Ryanair
    EZY: 'EZJ.L', // EasyJet
    // Asian Airlines
    SIA: 'C6L.SI', // Singapore Airlines
    CPA: '0293.HK', // Cathay Pacific
    JAL: '9201.T', // Japan Airlines
    ANA: '9202.T', // All Nippon Airways
    // Other
    ACA: 'AC.TO', // Air Canada
    QFA: 'QAN.AX', // Qantas
    // Middle East airlines (government-owned, no public ticker)
    UAE: null as string | null, // Emirates - private
    QTR: null as string | null, // Qatar Airways - private
    ETD: null as string | null, // Etihad - private
  };

  const ticker = icaoToTicker[icao.toUpperCase()];
  return ticker !== undefined ? ticker : null;
}
