'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface AddExposureFormProps {
  portfolioId: string;
}

interface Airline {
  icao: string;
  name: string;
  country: string;
}

export default function AddExposureForm({ portfolioId }: AddExposureFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredAirlines, setFilteredAirlines] = useState<Airline[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    icao: '',
    exposureAmount: '',
    currency: 'USD',
    numAircraft: '',
    notes: '',
  });

  // Fetch airlines list
  useEffect(() => {
    const fetchAirlines = async () => {
      try {
        console.log('Fetching airlines...');
        const response = await fetch('/api/airlines');
        console.log('Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Airlines fetched:', data.airlines?.length || 0);
          setAirlines(data.airlines || []);
        }
      } catch (error) {
        console.error('Failed to fetch airlines:', error);
      }
    };
    if (isOpen) {
      fetchAirlines();
    }
  }, [isOpen]);

  // Filter airlines based on input
  useEffect(() => {
    if (formData.icao) {
      const filtered = airlines.filter(airline =>
        airline.icao.toLowerCase().includes(formData.icao.toLowerCase()) ||
        airline.name.toLowerCase().includes(formData.icao.toLowerCase())
      );
      console.log('Filtered airlines:', filtered.length, 'from', airlines.length);
      setFilteredAirlines(filtered);
    } else {
      console.log('Showing all airlines:', airlines.length);
      setFilteredAirlines(airlines);
    }
  }, [formData.icao, airlines]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/exposures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icao: formData.icao.toUpperCase(),
          exposureAmount: parseFloat(formData.exposureAmount),
          currency: formData.currency,
          numAircraft: formData.numAircraft ? parseInt(formData.numAircraft) : null,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add exposure');
      }

      // Reset form and close
      setFormData({
        icao: '',
        exposureAmount: '',
        currency: 'USD',
        numAircraft: '',
        notes: '',
      });
      setIsOpen(false);
      
      // Refresh the page to show new exposure
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add exposure');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg
          className="h-4 w-4 mr-2"
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
        Add Exposure
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6 border border-transparent dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Add Airline Exposure</h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setError('');
          }}
          className="text-gray-400 hover:text-gray-500"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <label htmlFor="icao" className="block text-sm font-medium text-gray-700">
            Airline ICAO Code *
          </label>
          <div className="mt-1 relative">
            <input
              type="text"
              id="icao"
              required
              maxLength={4}
              placeholder="e.g., AAL, UAL, DAL"
              value={formData.icao}
              onChange={(e) => {
                setFormData({ ...formData, icao: e.target.value.toUpperCase() });
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border pr-10"
            />
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="absolute inset-y-0 right-0 flex items-center justify-center pr-3"
            >
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
          {showDropdown && filteredAirlines.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg max-h-60 rounded-md border border-gray-300 dark:border-gray-600 overflow-auto">
              {filteredAirlines.slice(0, 50).map((airline) => (
                <button
                  key={airline.icao}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, icao: airline.icao });
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">{airline.icao}</span>
                      <span className="ml-2 text-sm text-gray-600">{airline.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{airline.country}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            4-letter ICAO code or search by airline name
          </p>
        </div>

        <div>
          <label htmlFor="exposureAmount" className="block text-sm font-medium text-gray-700">
            Exposure Amount *
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                id="exposureAmount"
                required
                placeholder="0.00"
                value={formData.exposureAmount ? parseFloat(formData.exposureAmount.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  if (value === '' || !isNaN(parseFloat(value))) {
                    setFormData({ ...formData, exposureAmount: value });
                  }
                }}
                className="block w-full pl-7 pr-3 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-700 font-semibold sm:text-sm focus:border-blue-500 focus:ring-blue-500 cursor-pointer"
            >
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Example: 5,000,000 for $5M
          </p>
        </div>

        <div>
          <label htmlFor="numAircraft" className="block text-sm font-medium text-gray-700">
            Number of Aircraft (Optional)
          </label>
          <input
            type="number"
            id="numAircraft"
            min="1"
            placeholder="e.g., 5"
            value={formData.numAircraft}
            onChange={(e) => setFormData({ ...formData, numAircraft: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Additional details about this exposure..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Exposure'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError('');
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Supported airlines:</strong> AAL, UAL, DAL, LUV, JBLU, BAW, AFR, LHA, UAE, QTR, and many more.
        </p>
      </div>
    </div>
  );
}
