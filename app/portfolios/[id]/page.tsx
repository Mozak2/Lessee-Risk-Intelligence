import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { calculatePortfolioRisk } from '@/lib/portfolio-risk';
import DeletePortfolioButton from './DeletePortfolioButton';
import AddExposureForm from './AddExposureForm';
import EmptyState from './EmptyState';
import EditExposureButton from './EditExposureButton';
import DeleteExposureButton from './DeleteExposureButton';
import { getOrCalculateAirlineRisk } from '@/lib/risk-cache';

// Helper function to get currency symbol
function getCurrencySymbol(currency: string): string {
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

async function getPortfolio(id: string) {
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        exposures: {
          include: {
            airline: {
              include: {
                riskSnapshots: {
                  orderBy: { calculatedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    
    if (!portfolio) {
      return null;
    }
    
    // Calculate risk for any airlines without snapshots
    for (const exposure of portfolio.exposures) {
      if (!exposure.airline.riskSnapshots || exposure.airline.riskSnapshots.length === 0) {
        try {
          await getOrCalculateAirlineRisk({
            airline: {
              icao: exposure.airline.icao,
              name: exposure.airline.name,
              country: exposure.airline.country,
              active: exposure.airline.active,
              fleetSize: exposure.airline.fleetSize ?? undefined,
            },
          });
        } catch (error) {
          console.error(`Error calculating risk for ${exposure.airline.icao}:`, error);
        }
      }
    }
    
    // Re-fetch portfolio with updated snapshots
    const updatedPortfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        exposures: {
          include: {
            airline: {
              include: {
                riskSnapshots: {
                  orderBy: { calculatedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!updatedPortfolio) {
      return null;
    }
    
    // Calculate portfolio-level risk
    const portfolioRisk = await calculatePortfolioRisk(id);
    
    return {
      portfolio: updatedPortfolio,
      risk: portfolioRisk,
    };
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return null;
  }
}

function getRiskBucketColor(bucket: string) {
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

function getScoreColor(score: number) {
  if (score < 40) return 'text-green-600';
  if (score < 70) return 'text-yellow-600';
  return 'text-red-600';
}

export default async function PortfolioDetailPage({ params }: { params: { id: string } }) {
  const data = await getPortfolio(params.id);

  if (!data) {
    notFound();
  }

  const { portfolio, risk } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/portfolios" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back to Portfolios
        </Link>
      </div>

      {/* Portfolio Header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{portfolio.name}</h1>
            {portfolio.description && (
              <p className="mt-1 text-sm text-gray-500">{portfolio.description}</p>
            )}
          </div>
          <DeletePortfolioButton portfolioId={portfolio.id} portfolioName={portfolio.name} />
        </div>
      </div>

      {/* Portfolio Risk Summary */}
      {risk && portfolio.exposures.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Portfolio Risk Summary</h3>
            
            {/* Multi-currency summary */}
            {risk.currencies.length > 1 ? (
              <div className="space-y-8">
                {risk.currencies.map((currency) => {
                  const currencyData = risk.perCurrency[currency];
                  return (
                    <div key={currency} className="border-b pb-6 last:border-b-0">
                      <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">{currency}</span>
                        {getCurrencySymbol(currency)}{(currencyData.totalExposure / 1000000).toFixed(1)}M Total
                      </h4>
                      
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-4">
                        <div>
                          <div className="text-sm font-medium text-gray-500" title="Exposure-weighted average of airline risk scores">
                            Base Risk (Weighted Average)
                          </div>
                          <div className={`mt-1 text-2xl font-semibold ${getScoreColor(currencyData.baseRisk)}`}>
                            {currencyData.baseRisk}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500" title="Base risk adjusted for portfolio concentration">
                            Adjusted Risk (Concentration Applied)
                          </div>
                          <div className={`mt-1 text-2xl font-semibold ${getScoreColor(currencyData.adjustedRisk)}`}>
                            {currencyData.adjustedRisk}
                            {currencyData.concentrationPenalty > 0 && (
                              <span className="text-sm text-red-500 ml-1">+{currencyData.concentrationPenalty}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500" title="Categorizes risk as Low / Medium / High">
                            Risk Bucket
                          </div>
                          <div className="mt-1">
                            <span
                              className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getRiskBucketColor(
                                currencyData.riskBucket
                              )}`}
                            >
                              {currencyData.riskBucket}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">Airlines</div>
                          <div className="mt-1 text-2xl font-semibold text-gray-900">{currencyData.rows.length}</div>
                        </div>
                      </div>

                      {/* Explanation block */}
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h5 className="text-sm font-semibold text-blue-900 mb-2">Risk Calculation</h5>
                        <ul className="text-xs text-blue-800 space-y-1">
                          <li><strong>Base Risk (Weighted Average)</strong> represents the exposure-weighted average of individual airline risk scores.</li>
                          <li><strong>Adjusted Risk (Concentration Applied)</strong> is the base risk {currencyData.concentrationPenalty > 0 ? `plus a +${currencyData.concentrationPenalty} concentration penalty` : 'with no concentration adjustment applied'}.</li>
                          {currencyData.concentrationPenalty > 0 ? (
                            <li className="text-yellow-700"><strong>Concentration penalty applied:</strong> {(currencyData.maxConcentration * 100).toFixed(1)}% of exposure is held with a single airline.</li>
                          ) : (
                            <li className="text-green-700"><strong>No concentration penalty applied.</strong> Exposure is diversified across airlines.</li>
                          )}
                          <li className="text-gray-600 italic mt-2"><strong>Note:</strong> Exposure is grouped by currency. FX conversion is not applied.</li>
                        </ul>
                      </div>

                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Exposure by Risk Bucket ({currency})</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-green-800">Low Risk</div>
                            <div className="text-lg font-semibold text-green-900">
                              {getCurrencySymbol(currency)}{(currencyData.buckets.low / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-xs text-green-700">
                              {currencyData.totalExposure > 0 ? ((currencyData.buckets.low / currencyData.totalExposure) * 100).toFixed(0) : 0}%
                            </div>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-yellow-800">Medium Risk</div>
                            <div className="text-lg font-semibold text-yellow-900">
                              {getCurrencySymbol(currency)}{(currencyData.buckets.medium / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-xs text-yellow-700">
                              {currencyData.totalExposure > 0 ? ((currencyData.buckets.medium / currencyData.totalExposure) * 100).toFixed(0) : 0}%
                            </div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-red-800">High Risk</div>
                            <div className="text-lg font-semibold text-red-900">
                              {getCurrencySymbol(currency)}{(currencyData.buckets.high / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-xs text-red-700">
                              {currencyData.totalExposure > 0 ? ((currencyData.buckets.high / currencyData.totalExposure) * 100).toFixed(0) : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="text-xs text-gray-500 italic mt-4 p-3 bg-gray-50 rounded">
                  <strong>Note:</strong> Exposure is shown by currency. FX conversion is not applied in this MVP.
                </div>
              </div>
            ) : (
              // Single currency - keep compact layout
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-5">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Total Exposure</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">
                      {getCurrencySymbol(risk.currency)}{(risk.totalExposure / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-gray-500">{risk.currency}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500" title="Exposure-weighted average of airline risk scores">
                      Base Risk (Weighted Average)
                    </div>
                    <div className={`mt-1 text-2xl font-semibold ${getScoreColor(risk.baseRisk)}`}>
                      {risk.baseRisk}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500" title="Base risk adjusted for portfolio concentration">
                      Adjusted Risk (Concentration Applied)
                    </div>
                    <div className={`mt-1 text-2xl font-semibold ${getScoreColor(risk.adjustedRisk)}`}>
                      {risk.adjustedRisk}
                      {risk.concentrationPenalty > 0 && (
                        <span className="text-sm text-red-500 ml-1">+{risk.concentrationPenalty}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500" title="Categorizes risk as Low / Medium / High">
                      Risk Bucket
                    </div>
                    <div className="mt-1">
                      <span
                        className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getRiskBucketColor(
                          risk.riskBucket
                        )}`}
                      >
                        {risk.riskBucket}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Airlines</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{risk.topExposures.length}</div>
                  </div>
                </div>

                {/* Explanation block */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h5 className="text-sm font-semibold text-blue-900 mb-2">Risk Calculation</h5>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li><strong>Base Risk (Weighted Average)</strong> represents the exposure-weighted average of individual airline risk scores.</li>
                    <li><strong>Adjusted Risk (Concentration Applied)</strong> is the base risk {risk.concentrationPenalty > 0 ? `plus a +${risk.concentrationPenalty} concentration penalty` : 'with no concentration adjustment applied'}.</li>
                    {risk.concentrationPenalty > 0 ? (
                      <li className="text-yellow-700"><strong>Concentration penalty applied:</strong> {(risk.maxConcentration * 100).toFixed(1)}% of exposure is held with a single airline.</li>
                    ) : (
                      <li className="text-green-700"><strong>No concentration penalty applied.</strong> Exposure is diversified across airlines.</li>
                    )}
                  </ul>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Exposure by Risk Bucket</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs font-medium text-green-800">Low Risk</div>
                      <div className="text-lg font-semibold text-green-900">
                        {getCurrencySymbol(risk.currency)}{(risk.buckets.low / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-xs text-green-700">
                        {risk.totalExposure > 0 ? ((risk.buckets.low / risk.totalExposure) * 100).toFixed(0) : 0}%
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-xs font-medium text-yellow-800">Medium Risk</div>
                      <div className="text-lg font-semibold text-yellow-900">
                        {getCurrencySymbol(risk.currency)}{(risk.buckets.medium / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-xs text-yellow-700">
                        {risk.totalExposure > 0 ? ((risk.buckets.medium / risk.totalExposure) * 100).toFixed(0) : 0}%
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-xs font-medium text-red-800">High Risk</div>
                      <div className="text-lg font-semibold text-red-900">
                        {getCurrencySymbol(risk.currency)}{(risk.buckets.high / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-xs text-red-700">
                        {risk.totalExposure > 0 ? ((risk.buckets.high / risk.totalExposure) * 100).toFixed(0) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty state for portfolios without exposures */}
      {portfolio.exposures.length === 0 && <EmptyState />}

      {/* Add Exposure Form */}
      <div className="mb-6" id="add-exposure-form">
        <AddExposureForm portfolioId={portfolio.id} />
      </div>

      {/* Exposures List */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Lease Exposures</h3>
            <p className="text-xs text-gray-500 italic" title="Derived from airline operational, country, and financial indicators">Sorted by exposure amount (highest first)</p>
          </div>

          {portfolio.exposures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No exposures in this portfolio yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Airline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exposure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aircraft
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title="Derived from airline operational, country, and financial indicators">
                      Risk Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {portfolio.exposures
                    .sort((a: any, b: any) => b.exposureAmount - a.exposureAmount)
                    .map((exposure: any) => {
                    const latestSnapshot = exposure.airline.riskSnapshots?.[0];
                    return (
                      <tr key={exposure.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/airlines/${exposure.airline.icao}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {exposure.airline.name}
                          </Link>
                          <div className="text-xs text-gray-500">{exposure.airline.icao}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getCurrencySymbol(exposure.currency)}{exposure.exposureAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">{exposure.currency}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {exposure.numAircraft || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {latestSnapshot ? (
                            <span
                              className={`text-sm font-semibold ${getScoreColor(
                                latestSnapshot.overallScore
                              )}`}
                            >
                              {latestSnapshot.overallScore}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {latestSnapshot ? (
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBucketColor(
                                latestSnapshot.riskBucket
                              )}`}
                            >
                              {latestSnapshot.riskBucket}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <EditExposureButton 
                              portfolioId={portfolio.id}
                              exposure={exposure}
                            />
                            <DeleteExposureButton 
                              portfolioId={portfolio.id}
                              exposureId={exposure.id}
                              airlineName={exposure.airline.name}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* How Portfolio Risk is Calculated - Collapsible Section */}
      <details className="bg-white shadow sm:rounded-lg mt-6">
        <summary className="px-4 py-5 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors">
          <h3 className="text-lg leading-6 font-medium text-gray-900 inline-flex items-center">
            <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How Portfolio Risk is Calculated
          </h3>
        </summary>
        <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-0">
          <div className="prose prose-sm max-w-none text-gray-600">
            <h4 className="text-sm font-semibold text-gray-900 mt-0 mb-2">Methodology Overview</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <strong>Airline Risk Scores</strong> are derived from public operational and financial indicators. Scores range from 0 (lowest risk) to 100 (highest risk).
              </li>
              <li>
                <strong>Portfolio Base Risk (Weighted Average)</strong> is calculated as a weighted average based on exposure size. Airlines with larger exposures have proportionally greater impact on the portfolio score.
              </li>
              <li>
                <strong>Concentration Penalties</strong> are applied when a large share of exposure is allocated to a single airline:
                <ul className="mt-1 ml-4 text-xs">
                  <li>+5 points if a single airline represents &gt;50% of portfolio exposure</li>
                  <li>+10 points if a single airline represents &gt;70% of portfolio exposure</li>
                </ul>
              </li>
              <li>
                <strong>Multi-Currency Risk Calculation</strong>: Risk is calculated separately per currency. Each currency group (USD, EUR, GBP, etc.) is analyzed independently. FX conversion is intentionally excluded in this MVP.
              </li>
              <li>
                <strong>Risk Buckets</strong> categorize adjusted risk scores:
                <ul className="mt-1 ml-4 text-xs">
                  <li><span className="text-green-700 font-medium">Low</span>: &lt; 40</li>
                  <li><span className="text-yellow-700 font-medium">Medium</span>: 40-69</li>
                  <li><span className="text-red-700 font-medium">High</span>: ≥ 70</li>
                </ul>
              </li>
            </ul>
            <p className="text-xs text-gray-500 italic mt-4 mb-0">
              <strong>Important:</strong> This tool provides high-level risk assessment for portfolio monitoring and is not intended for valuation, credit decisioning, or regulatory reporting purposes.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
