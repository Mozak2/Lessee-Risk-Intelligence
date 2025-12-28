'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteExposureButtonProps {
  portfolioId: string;
  exposureId: string;
  airlineName: string;
}

export default function DeleteExposureButton({
  portfolioId,
  exposureId,
  airlineName,
}: DeleteExposureButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/portfolios/${portfolioId}/exposures/${exposureId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete exposure');
      }

      router.refresh();
      setShowConfirm(false);
    } catch (error) {
      console.error('Error deleting exposure:', error);
      alert('Failed to delete exposure. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-red-600 hover:text-red-900"
        title="Delete exposure"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-10 max-w-3xl w-full mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-6 text-center">Delete Exposure</h3>
            <p className="text-sm text-gray-600 mb-8 leading-relaxed text-center px-4">
              Are you sure you want to delete the exposure for <strong>{airlineName}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
