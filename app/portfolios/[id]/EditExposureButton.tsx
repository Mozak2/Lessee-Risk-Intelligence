'use client';

import { useState } from 'react';

interface EditExposureButtonProps {
  portfolioId: string;
  exposure: {
    id: string;
    airlineIcao: string;
    exposureAmount: number;
    currency: string;
    numAircraft: number | null;
    airline: {
      icao: string;
      name: string;
    };
  };
}

export default function EditExposureButton({ portfolioId, exposure }: EditExposureButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-900"
        title="Edit exposure"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>

      {isOpen && (
        <EditExposureModal
          portfolioId={portfolioId}
          exposure={exposure}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

interface EditExposureModalProps {
  portfolioId: string;
  exposure: {
    id: string;
    airlineIcao: string;
    exposureAmount: number;
    currency: string;
    numAircraft: number | null;
    airline: {
      icao: string;
      name: string;
    };
  };
  onClose: () => void;
}

function EditExposureModal({ portfolioId, exposure, onClose }: EditExposureModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    exposureAmount: exposure.exposureAmount.toString(),
    currency: exposure.currency,
    numAircraft: exposure.numAircraft?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/exposures/${exposure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exposureAmount: parseFloat(formData.exposureAmount.replace(/,/g, '')),
          currency: formData.currency,
          numAircraft: formData.numAircraft ? parseInt(formData.numAircraft) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update exposure');
      }

      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to update exposure');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-transparent dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Edit Exposure: {exposure.airline.name}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="exposureAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Exposure Amount *
            </label>
            <input
              type="text"
              id="exposureAmount"
              required
              value={formData.exposureAmount ? Number(formData.exposureAmount).toLocaleString('en-US', { maximumFractionDigits: 2, useGrouping: true }) : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, '');
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setFormData({ ...formData, exposureAmount: value });
                }
              }}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Currency *
            </label>
            <select
              id="currency"
              required
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div>
            <label htmlFor="numAircraft" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of Aircraft (Optional)
            </label>
            <input
              type="number"
              id="numAircraft"
              min="0"
              value={formData.numAircraft}
              onChange={(e) => setFormData({ ...formData, numAircraft: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
