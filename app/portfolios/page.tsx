import Link from 'next/link';

async function getPortfolios() {
  // Mock data for demo - in production, this would fetch from database
  return {
    portfolios: []
  };
}

export default async function PortfoliosPage() {
  const { portfolios } = await getPortfolios();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Lease Portfolios
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/portfolios/new"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Portfolio
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {portfolios.length === 0 ? (
          <div className="text-center py-12">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No portfolios</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new portfolio.</p>
            <div className="mt-6">
              <Link
                href="/portfolios/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Portfolio
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {portfolios.map((portfolio: any) => (
              <Link
                key={portfolio.id}
                href={`/portfolios/${portfolio.id}`}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 truncate">{portfolio.name}</h3>
                  {portfolio.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{portfolio.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {portfolio.exposures.length} exposure{portfolio.exposures.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-sm font-medium text-blue-600">View details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
