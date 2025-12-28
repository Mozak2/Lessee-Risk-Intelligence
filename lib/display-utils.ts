// Shared display utility functions for both client and server components

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'CHF': 'CHF',
    'AUD': 'A$',
    'CAD': 'C$',
    'INR': '₹',
  };
  return symbols[currency] || currency + ' ';
}

export function getRiskBucketColor(bucket: string): string {
  switch (bucket) {
    case 'Low':
      return 'bg-green-100 text-green-800';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'High':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getScoreColor(score: number): string {
  if (score < 40) return 'text-green-600';
  if (score < 70) return 'text-yellow-600';
  return 'text-red-600';
}
