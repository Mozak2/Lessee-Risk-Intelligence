import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAirlineByIcao } from '@/lib/sources/aviation';
import { getCountryInfo } from '@/lib/sources/restCountries';
import { getOrCalculateAirlineRisk } from '@/lib/risk-cache';
import { RiskContext } from '@/lib/risk-aggregator';

async function getAirlineRiskData(icao: string) {
  try {
    // Fetch airline data from API
    const airlineData = await getAirlineByIcao(icao);
    
    if (!airlineData) {
      return null;
    }
    
    // Fetch country info
    const countryInfo = await getCountryInfo(airlineData.country);
    
    // Build context for risk calculation
    const context: RiskContext = {
      airline: {
        icao: airlineData.icao,
        name: airlineData.name,
        country: airlineData.country,
        active: airlineData.active,
        fleetSize: airlineData.fleetSize,
        ticker: airlineData.ticker,
      },
      countryInfo,
    };
    
    // Get or calculate risk (with caching)
    const riskResult = await getOrCalculateAirlineRisk(context);
    
    return {
      airline: {
        id: airlineData.icao,
        icao: airlineData.icao,
        iata: airlineData.iata,
        name: airlineData.name,
        country: airlineData.country,
        active: airlineData.active,
        fleetSize: airlineData.fleetSize,
        isPublic: airlineData.isPublic,
        ticker: airlineData.ticker,
      },
      risk: {
        overallScore: riskResult.overallScore,
        riskBucket: riskResult.riskBucket,
        components: riskResult.components,
        breakdown: riskResult.breakdown,
        calculatedAt: riskResult.calculatedAt,
        expiresAt: riskResult.expiresAt,
      },
      context: riskResult.context,
    };
  } catch (error) {
    console.error('Error fetching airline risk:', error);
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

export default async function AirlinePage({ params }: { params: { icao: string } }) {
  const data = await getAirlineRiskData(params.icao);

  if (!data) {
    notFound();
  }

  const { airline, risk, context } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/airlines" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back to Airlines
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">{airline.name}</h1>
                {airline.isPublic !== undefined && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                    {airline.isPublic ? 'Public' : 'Private'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {airline.icao} {airline.iata && `/ ${airline.iata}`} • {airline.country}
              </p>
            </div>
            <span
              className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                airline.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {airline.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Overall Risk Score */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Overall Risk Score</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Last updated: {new Date(risk.calculatedAt).toLocaleString()}</p>
                <p className="text-xs mt-1 italic">Based on derived estimates and public data</p>
              </div>
            </div>
            <div className="mt-5 sm:mt-0 text-center">
              <div className={`text-5xl font-bold ${getScoreColor(risk.overallScore)}`}>
                {risk.overallScore}
              </div>
              <span
                className={`mt-2 inline-flex px-4 py-1 text-sm font-semibold rounded-full ${getRiskBucketColor(
                  risk.riskBucket
                )}`}
              >
                {risk.riskBucket} Risk
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Breakdown */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Risk Components</h3>
          <p className="text-sm text-gray-500 mb-4">Lower scores indicate lower risk (better performance). These are derived estimates.</p>
          <div className="space-y-4">
            {risk.breakdown.map((component: any) => (
              <div key={component.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">
                    {component.name} ({Math.round(component.weight * 100)}% weight)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${getScoreColor(component.score)}`}>
                      {component.score.toFixed(1)}
                    </span>
                    {component.score <= 10 && (
                      <span className="text-xs text-green-700 font-medium">Excellent</span>
                    )}
                    {component.score > 10 && component.score < 40 && (
                      <span className="text-xs text-green-600 font-medium">Good</span>
                    )}
                    {component.score >= 40 && component.score < 70 && (
                      <span className="text-xs text-yellow-600 font-medium">Medium</span>
                    )}
                    {component.score >= 70 && component.score <= 80 && (
                      <span className="text-xs text-red-600 font-medium">Concern</span>
                    )}
                    {component.score > 80 && (
                      <span className="text-xs text-red-700 font-medium">High Risk</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      component.score < 40
                        ? 'bg-green-600'
                        : component.score < 70
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.max(component.score, 2)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Country Info */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Country Information</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Country</dt>
                <dd className="text-sm text-gray-900">{airline.country}</dd>
              </div>
              {context.countryInfo?.region && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Region</dt>
                  <dd className="text-sm text-gray-900">{context.countryInfo.region}</dd>
                </div>
              )}
              {context.countryInfo?.subregion && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Subregion</dt>
                  <dd className="text-sm text-gray-900">{context.countryInfo.subregion}</dd>
                </div>
              )}
              {context.countryInfo?.gini && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Gini Index</dt>
                  <dd className="text-sm text-gray-900">{context.countryInfo.gini.toFixed(1)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Operational Presence */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Operational Presence</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Operational Status</dt>
                <dd className="text-sm text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${airline.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {airline.active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              {airline.fleetSize !== undefined && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fleet Presence</dt>
                  <dd className="text-sm text-gray-900">
                    {airline.fleetSize >= 200 ? 'Major Operator' :
                     airline.fleetSize >= 50 ? 'Medium to Large' :
                     airline.fleetSize >= 10 ? 'Small to Medium' :
                     airline.fleetSize > 0 ? 'Very Small' :
                     'Unknown'}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Fleet Size */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Fleet Information</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Fleet Size</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {airline.fleetSize ?? 'Unknown'}
                </dd>
              </div>
              {airline.fleetSize && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Size Category</dt>
                  <dd className="text-sm text-gray-900">
                    {airline.fleetSize >= 100
                      ? 'Large'
                      : airline.fleetSize >= 50
                      ? 'Medium'
                      : airline.fleetSize >= 10
                      ? 'Small'
                      : 'Very Small'}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Financial Health</h3>
            {context.financialData?.available ? (
              <dl className="space-y-2">
                {context.financialData.ticker && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Stock Ticker</dt>
                    <dd className="text-sm font-mono text-gray-900">{context.financialData.ticker}</dd>
                  </div>
                )}
                {context.financialData.debtToEquity !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Debt-to-Equity</dt>
                    <dd className="text-sm text-gray-900">
                      {context.financialData.debtToEquity.toFixed(2)}
                      <span className="ml-1 text-xs text-gray-500">
                        {context.financialData.debtToEquity < 1 ? '(Excellent)' :
                         context.financialData.debtToEquity < 2 ? '(Good)' :
                         context.financialData.debtToEquity < 3 ? '(Moderate)' :
                         '(High)'}
                      </span>
                    </dd>
                  </div>
                )}
                {context.financialData.profitMargin !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Profit Margin</dt>
                    <dd className="text-sm text-gray-900">
                      {context.financialData.profitMargin.toFixed(2)}%
                      <span className="ml-1 text-xs text-gray-500">
                        {context.financialData.profitMargin >= 10 ? '(Excellent)' :
                         context.financialData.profitMargin >= 5 ? '(Good)' :
                         context.financialData.profitMargin >= 0 ? '(Moderate)' :
                         '(Loss)'}
                      </span>
                    </dd>
                  </div>
                )}
                {context.financialData.cashToDebt !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cash-to-Debt</dt>
                    <dd className="text-sm text-gray-900">
                      {context.financialData.cashToDebt.toFixed(2)}
                      <span className="ml-1 text-xs text-gray-500">
                        {context.financialData.cashToDebt >= 1 ? '(Strong)' :
                         context.financialData.cashToDebt >= 0.5 ? '(Good)' :
                         context.financialData.cashToDebt >= 0.3 ? '(Moderate)' :
                         '(Weak)'}
                      </span>
                    </dd>
                  </div>
                )}
                {context.financialData.fiscalYear && (
                  <div className="pt-2 border-t border-gray-200">
                    <dt className="text-xs text-gray-400">Data Source</dt>
                    <dd className="text-xs text-gray-600">
                      {context.financialData.dataSource === 'mock' ? 'Mock Data' : 'API'} • FY {context.financialData.fiscalYear}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <div className="text-sm text-gray-500">
                <p className="mb-2">
                  {airline.isPublic === false 
                    ? 'Financial data unavailable for government-owned airlines.'
                    : 'Financial data unavailable for this airline.'}
                </p>
                {airline.ticker && (
                  <p className="text-xs text-gray-400">Ticker: {airline.ticker}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Score Legend */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Score Guide</h4>
        <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-semibold text-green-600">0-30: Low Risk</span>
            <p className="mt-1">Stable airline with strong fundamentals</p>
          </div>
          <div>
            <span className="font-semibold text-yellow-600">31-60: Medium Risk</span>
            <p className="mt-1">Moderate concerns requiring monitoring</p>
          </div>
          <div>
            <span className="font-semibold text-red-600">61-100: High Risk</span>
            <p className="mt-1">Significant risk factors present</p>
          </div>
        </div>
      </div>
    </div>
  );
}
