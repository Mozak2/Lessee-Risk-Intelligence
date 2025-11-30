import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAirlineByIcao } from '@/lib/sources/aviation';
import { getCountryInfo } from '@/lib/sources/restCountries';
import { getFlightsLast24h } from '@/lib/sources/opensky';
import { calculateAirlineRisk, RiskContext } from '@/lib/risk-aggregator';

async function getAirlineRiskData(icao: string) {
  try {
    // Fetch airline data from API
    const airlineData = await getAirlineByIcao(icao);
    
    if (!airlineData) {
      return null;
    }
    
    // Fetch additional data for risk calculation
    const [countryInfo, flightsLast24h] = await Promise.all([
      getCountryInfo(airlineData.country),
      getFlightsLast24h(icao),
    ]);
    
    // Build context for risk calculation
    const context: RiskContext = {
      airline: {
        icao: airlineData.icao,
        name: airlineData.name,
        country: airlineData.country,
        active: airlineData.active,
        fleetSize: airlineData.fleetSize,
      },
      countryInfo,
      activityData: { flightsLast24h },
    };
    
    // Calculate risk
    const riskResult = await calculateAirlineRisk(context);
    
    // Debug logging
    console.log(`\n=== Risk Calculation for ${icao} ===`);
    console.log('Flights Last 24h:', flightsLast24h);
    console.log('Risk Breakdown:', JSON.stringify(riskResult.breakdown, null, 2));
    console.log('Components:', JSON.stringify(riskResult.components, null, 2));
    
    return {
      airline: {
        id: airlineData.icao,
        icao: airlineData.icao,
        iata: airlineData.iata,
        name: airlineData.name,
        country: airlineData.country,
        active: airlineData.active,
        fleetSize: airlineData.fleetSize,
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
  if (score <= 30) return 'text-green-600';
  if (score <= 60) return 'text-yellow-600';
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
              <h1 className="text-3xl font-bold text-gray-900">{airline.name}</h1>
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
                <p>Calculated on {new Date(risk.calculatedAt).toLocaleString()}</p>
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
          <p className="text-sm text-gray-500 mb-4">Lower scores indicate lower risk (better performance)</p>
          <div className="space-y-4">
            {risk.breakdown.map((component: any) => (
              <div key={component.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">
                    {component.name} ({Math.round(component.weight * 100)}% weight)
                  </span>
                  <span className={`font-semibold ${getScoreColor(component.score)}`}>
                    {component.score.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      component.score <= 30
                        ? 'bg-green-600'
                        : component.score <= 60
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Activity Metrics */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Activity Metrics</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Flights (Last 24h)</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {context.activityData?.flightsLast24h ?? 'N/A'}
                </dd>
                {context.activityData?.flightsLast24h !== undefined && (
                  <dd className="text-xs text-gray-500 mt-1">
                    {context.activityData.flightsLast24h >= 200 ? 'Very High Activity' :
                     context.activityData.flightsLast24h >= 100 ? 'High Activity' :
                     context.activityData.flightsLast24h >= 50 ? 'Moderate Activity' :
                     context.activityData.flightsLast24h >= 10 ? 'Low Activity' :
                     'Very Low Activity'}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Operational Status</dt>
                <dd className="text-sm text-gray-900">{airline.active ? 'Active' : 'Inactive'}</dd>
              </div>
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
