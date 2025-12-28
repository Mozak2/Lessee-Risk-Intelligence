// Formatting utilities for display and export

/**
 * Format monetary amounts with currency symbol
 */
export function formatMoney(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'CHF': 'CHF ',
    'AUD': 'A$',
    'CAD': 'C$',
    'INR': '₹',
  };
  
  const symbol = symbols[currency] || currency + ' ';
  
  // Format with commas
  if (amount >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(2)}K`;
  }
  
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format percentage values
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format delta values with sign
 */
export function formatDelta(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * Format percent delta values
 */
export function formatPercentDelta(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Get color class for delta values (for risk metrics)
 */
export function getDeltaColorClass(delta: number, invertColors: boolean = false): string {
  if (delta === 0) return 'text-gray-600';
  
  // For risk metrics, positive delta is bad (red), negative is good (green)
  // For other metrics, might want to invert
  if (invertColors) {
    return delta > 0 ? 'text-green-600' : 'text-red-600';
  }
  
  return delta > 0 ? 'text-red-600' : 'text-green-600';
}

/**
 * Format date for exports
 */
export function formatExportDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: Date = new Date()): string {
  return date.toLocaleString();
}
