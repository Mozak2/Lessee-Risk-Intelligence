'use client';

import { getCurrencySymbol, getRiskBucketColor } from '@/lib/display-utils';

interface ExposureInsight {
  airlineIcao: string;
  airlineName: string;
  exposure: number;
  exposureShare: number;
  riskScore: number;
  riskBucket: string;
}

interface ConcentrationInsightsProps {
  exposures: ExposureInsight[];
  currency: string;
  totalExposure: number;
}

export default function ConcentrationInsights({
  exposures,
  currency,
  totalExposure,
}: ConcentrationInsightsProps) {
  // Sort by exposure and get top 3
  const topExposures = [...exposures]
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 3);

  const largestExposureShare = topExposures[0]?.exposureShare || 0;

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Concentration Insights
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-900">Largest Single Exposure</div>
            <div className="mt-1 text-2xl font-semibold text-blue-900">
              {largestExposureShare.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-blue-700">
              {topExposures[0]?.airlineName || 'N/A'}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700">Total Airlines</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{exposures.length}</div>
            <div className="mt-1 text-xs text-gray-500">
              in {currency} portfolio
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Top 3 Exposures</h4>
          <div className="space-y-2">
            {topExposures.map((exp, index) => (
              <div
                key={exp.airlineIcao}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center flex-1">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mr-3">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {exp.airlineName}
                    </div>
                    <div className="text-xs text-gray-500">{exp.airlineIcao}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {getCurrencySymbol(currency)}
                      {(exp.exposure / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-gray-500">{exp.exposureShare.toFixed(1)}%</div>
                  </div>

                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBucketColor(
                      exp.riskBucket
                    )}`}
                  >
                    {exp.riskBucket}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {exposures.length > 3 && (
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500">
                +{exposures.length - 3} more airline{exposures.length - 3 !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {largestExposureShare > 50 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <svg
                className="h-5 w-5 text-yellow-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <div className="text-sm font-medium text-yellow-900">
                  High Concentration Detected
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  A single airline represents {largestExposureShare.toFixed(1)}% of your portfolio.
                  Consider diversifying to reduce concentration risk.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
