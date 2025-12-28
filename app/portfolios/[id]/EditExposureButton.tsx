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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Edit Exposure: {exposure.airline.name}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="exposureAmount" className="block text-sm font-medium text-gray-700">
              Exposure Amount *
            </label>
            <input
              type="text"
              id="exposureAmount"
              required
              value={formData.exposureAmount ? Number(formData.exposureAmount).toLocaleString('en-US') : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, '');
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setFormData({ ...formData, exposureAmount: value });
                }
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              Currency *
            </label>
            <input
              type="text"
              id="currency"
              required
              maxLength={3}
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>

          <div>
            <label htmlFor="numAircraft" className="block text-sm font-medium text-gray-700">
              Number of Aircraft (Optional)
            </label>
            <input
              type="number"
              id="numAircraft"
              min="0"
              value={formData.numAircraft}
              onChange={(e) => setFormData({ ...formData, numAircraft: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
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
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
