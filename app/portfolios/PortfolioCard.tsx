'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  totalExposure: number;
  numAirlines: number;
}

interface PortfolioCardProps {
  portfolio: Portfolio;
}

export default function PortfolioCard({ portfolio }: PortfolioCardProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/portfolios/${portfolio.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete portfolio');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Failed to delete portfolio. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow relative border border-transparent dark:border-gray-700">
      <Link href={`/portfolios/${portfolio.id}`}>
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-medium text-gray-900 truncate flex-1">{portfolio.name}</h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteConfirm(!showDeleteConfirm);
              }}
              className="ml-2 text-gray-400 hover:text-red-600 focus:outline-none"
              title="Delete portfolio"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
          
          {portfolio.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{portfolio.description}</p>
          )}
          
          {showDeleteConfirm && (
            <div
              className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <p className="text-sm text-red-800 mb-2">Delete this portfolio?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Airlines</span>
              <span className="font-medium text-gray-900">{portfolio.numAirlines}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Exposure</span>
              <span className="font-medium text-gray-900">
                ${(portfolio.totalExposure / 1000000).toFixed(1)}M
              </span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center">
            <span className="text-sm font-medium text-blue-600">View details →</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
