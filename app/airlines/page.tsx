'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchAirlines } from '@/lib/sources/aviation';

export default function AirlinesPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchAirlines(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Popular airlines for quick access
  const popularAirlines = [
    { icao: 'AAL', name: 'American Airlines' },
    { icao: 'UAL', name: 'United Airlines' },
    { icao: 'DAL', name: 'Delta Air Lines' },
    { icao: 'AFR', name: 'Air France' },
    { icao: 'BAW', name: 'British Airways' },
    { icao: 'DLH', name: 'Lufthansa' },
    { icao: 'UAE', name: 'Emirates' },
    { icao: 'SIA', name: 'Singapore Airlines' },
    { icao: 'RYR', name: 'Ryanair' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Airline Risk Assessment
          </h2>
        </div>
      </div>

      <div className="mt-8">
        <form onSubmit={handleSearch} className="max-w-xl">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Search by airline name or code (ICAO/IATA)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              name="search"
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., American Airlines, AAL, AA"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Search Results</h3>
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-transparent dark:border-gray-700">
              <ul className="divide-y divide-gray-200">
                {searchResults.map((airline) => (
                  <li key={airline.icao}>
                    <Link
                      href={`/airlines/${airline.icao}`}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                              {airline.name}
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {airline.icao} {airline.iata && `/ ${airline.iata}`} • {airline.country}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                airline.active
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
                              }`}
                            >
                              {airline.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Popular Airlines</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularAirlines.map((airline) => (
              <Link
                key={airline.icao}
                href={`/airlines/${airline.icao}`}
                className="relative rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-5 shadow-sm hover:border-gray-400 dark:hover:border-gray-500 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{airline.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{airline.icao}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
