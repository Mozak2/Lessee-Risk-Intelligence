// Portfolio export utilities for CSV and JSON formats

import { formatExportDate } from '../format';

export interface PortfolioExportData {
  metadata: {
    portfolioId: string;
    portfolioName: string;
    description: string | null;
    exportedAt: string;
    isSimulation: boolean;
  };
  currencies: Array<{
    currency: string;
    totalExposure: number;
    baseRisk: number;
    adjustedRisk: number;
    concentrationPenalty: number;
    maxConcentration: number;
    riskBucket: string;
    numAirlines: number;
  }>;
  exposures: Array<{
    airlineIcao: string;
    airlineName: string;
    airlineCountry: string;
    exposureAmount: number;
    currency: string;
    numAircraft: number | null;
    riskScore: number;
    riskBucket: string;
  }>;
}

/**
 * Build export data structure from portfolio and risk data
 */
export function buildPortfolioExportData(
  portfolio: {
    id: string;
    name: string;
    description: string | null;
    exposures: Array<{
      airline: {
        icao: string;
        name: string;
        country: string;
        riskSnapshots?: Array<{
          overallScore: number;
          riskBucket: string;
        }>;
      };
      exposureAmount: number;
      currency: string;
      numAircraft: number | null;
    }>;
  },
  risk: {
    currencies: string[];
    perCurrency: Record<string, {
      totalExposure: number;
      baseRisk: number;
      adjustedRisk: number;
      concentrationPenalty: number;
      maxConcentration: number;
      riskBucket: string;
      rows: any[];
    }>;
  },
  isSimulation: boolean = false
): PortfolioExportData {
  const currencies = risk.currencies.map(currency => {
    const currencyData = risk.perCurrency[currency];
    return {
      currency,
      totalExposure: currencyData.totalExposure,
      baseRisk: currencyData.baseRisk,
      adjustedRisk: currencyData.adjustedRisk,
      concentrationPenalty: currencyData.concentrationPenalty,
      maxConcentration: currencyData.maxConcentration,
      riskBucket: currencyData.riskBucket,
      numAirlines: currencyData.rows.length,
    };
  });

  const exposures = portfolio.exposures.map(exp => ({
    airlineIcao: exp.airline.icao,
    airlineName: exp.airline.name,
    airlineCountry: exp.airline.country,
    exposureAmount: exp.exposureAmount,
    currency: exp.currency,
    numAircraft: exp.numAircraft,
    riskScore: exp.airline.riskSnapshots?.[0]?.overallScore || 0,
    riskBucket: exp.airline.riskSnapshots?.[0]?.riskBucket || 'Unknown',
  }));

  return {
    metadata: {
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      description: portfolio.description,
      exportedAt: formatExportDate(),
      isSimulation,
    },
    currencies,
    exposures,
  };
}

/**
 * Export portfolio data as JSON
 */
export function exportToJSON(data: PortfolioExportData, filename?: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `portfolio-${data.metadata.portfolioId}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV field value
 */
function escapeCsvField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Export portfolio data as CSV
 */
export function exportToCSV(data: PortfolioExportData, filename?: string): void {
  const lines: string[] = [];
  
  // Metadata section
  lines.push('PORTFOLIO SUMMARY');
  lines.push(`Portfolio ID,${escapeCsvField(data.metadata.portfolioId)}`);
  lines.push(`Portfolio Name,${escapeCsvField(data.metadata.portfolioName)}`);
  lines.push(`Description,${escapeCsvField(data.metadata.description)}`);
  lines.push(`Exported At,${escapeCsvField(data.metadata.exportedAt)}`);
  lines.push(`Is Simulation,${data.metadata.isSimulation ? 'Yes' : 'No'}`);
  lines.push('');
  
  // Currency summaries
  lines.push('CURRENCY SUMMARIES');
  lines.push('Currency,Total Exposure,Base Risk,Adjusted Risk,Concentration Penalty,Max Concentration %,Risk Bucket,Airlines');
  data.currencies.forEach(curr => {
    lines.push([
      escapeCsvField(curr.currency),
      escapeCsvField(curr.totalExposure),
      escapeCsvField(curr.baseRisk),
      escapeCsvField(curr.adjustedRisk),
      escapeCsvField(curr.concentrationPenalty),
      escapeCsvField((curr.maxConcentration * 100).toFixed(2)),
      escapeCsvField(curr.riskBucket),
      escapeCsvField(curr.numAirlines),
    ].join(','));
  });
  lines.push('');
  
  // Exposures table
  lines.push('AIRLINE EXPOSURES');
  lines.push('ICAO,Airline Name,Country,Exposure Amount,Currency,Aircraft Count,Risk Score,Risk Bucket');
  data.exposures.forEach(exp => {
    lines.push([
      escapeCsvField(exp.airlineIcao),
      escapeCsvField(exp.airlineName),
      escapeCsvField(exp.airlineCountry),
      escapeCsvField(exp.exposureAmount),
      escapeCsvField(exp.currency),
      escapeCsvField(exp.numAircraft || ''),
      escapeCsvField(exp.riskScore),
      escapeCsvField(exp.riskBucket),
    ].join(','));
  });
  
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `portfolio-${data.metadata.portfolioId}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
