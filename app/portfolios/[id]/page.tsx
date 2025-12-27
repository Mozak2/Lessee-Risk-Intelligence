import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { calculatePortfolioRisk } from '@/lib/portfolio-risk';

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
    
    // Calculate portfolio-level risk
    const portfolioRisk = await calculatePortfolioRisk(id);
    
    return {
      portfolio,
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
  if (score <= 30) return 'text-green-600';
  if (score <= 60) return 'text-yellow-600';
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
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-3xl font-bold text-gray-900">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="mt-1 text-sm text-gray-500">{portfolio.description}</p>
          )}
        </div>
      </div>

      {/* Portfolio Risk Summary */}
      {risk && portfolio.exposures.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Portfolio Risk Summary</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Exposure</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  ${(risk.totalExposure / 1000000).toFixed(1)}M
                </dd>
                <dd className="text-xs text-gray-500">{risk.currency}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Portfolio Risk</dt>
                <dd className={`mt-1 text-2xl font-semibold ${getScoreColor(risk.portfolioRisk)}`}>
                  {risk.portfolioRisk}
                </dd>
                <dd className="text-xs text-gray-500">Weighted Average</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Risk Bucket</dt>
                <dd className="mt-1">
                  <span
                    className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getRiskBucketColor(
                      risk.riskBucket
                    )}`}
                  >
                    {risk.riskBucket}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Airlines</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{risk.topExposures.length}</dd>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Exposure by Risk Bucket</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs font-medium text-green-800">Low Risk</div>
                  <div className="text-lg font-semibold text-green-900">
                    ${(risk.buckets.low / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-xs text-green-700">
                    {risk.totalExposure > 0 ? ((risk.buckets.low / risk.totalExposure) * 100).toFixed(0) : 0}%
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-xs font-medium text-yellow-800">Medium Risk</div>
                  <div className="text-lg font-semibold text-yellow-900">
                    ${(risk.buckets.medium / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-xs text-yellow-700">
                    {risk.totalExposure > 0 ? ((risk.buckets.medium / risk.totalExposure) * 100).toFixed(0) : 0}%
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-xs font-medium text-red-800">High Risk</div>
                  <div className="text-lg font-semibold text-red-900">
                    ${(risk.buckets.high / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-xs text-red-700">
                    {risk.totalExposure > 0 ? ((risk.buckets.high / risk.totalExposure) * 100).toFixed(0) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state for portfolios without exposures */}
      {portfolio.exposures.length === 0 && (
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No exposures yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add airlines to this portfolio to start tracking risk.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Search for airlines by ICAO code (e.g., AAL, UAL, DAL)
            </p>
          </div>
        </div>
      )}

      {/* Exposures List */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Lease Exposures</h3>
            <Link
              href={`/portfolios/${portfolio.id}/add-exposure`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Exposure
            </Link>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {portfolio.exposures.map((exposure: any) => {
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
                            ${exposure.exposureAmount.toLocaleString()}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
