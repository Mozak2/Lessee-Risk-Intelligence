'use client';

import { useState } from 'react';
import { buildPortfolioExportData, exportToCSV, exportToJSON } from '@/lib/export/portfolioExport';

interface ExportControlsProps {
  portfolio: any;
  risk: any;
  hasSimulation?: boolean;
  simulatedData?: any;
}

export default function ExportControls({
  portfolio,
  risk,
  hasSimulation = false,
  simulatedData = null,
}: ExportControlsProps) {
  const [exportSimulation, setExportSimulation] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = (format: 'csv' | 'json') => {
    setIsExporting(true);
    
    try {
      // Use simulated data if checkbox is checked and simulation exists
      const dataToExport = (exportSimulation && simulatedData) ? simulatedData : { portfolio, risk };
      
      const exportData = buildPortfolioExportData(
        dataToExport.portfolio,
        dataToExport.risk,
        exportSimulation && hasSimulation
      );

      if (format === 'csv') {
        exportToCSV(exportData);
      } else {
        exportToJSON(exportData);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasExposures = portfolio?.exposures?.length > 0;

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Export Portfolio Data
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Download portfolio summary and exposure details
            </p>
          </div>
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {hasSimulation && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={exportSimulation}
                onChange={(e) => setExportSimulation(e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-purple-900">
                Export simulated scenario instead of current portfolio
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={!hasExposures || isExporting}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={!hasExposures || isExporting}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {isExporting ? 'Exporting...' : 'Export JSON'}
          </button>
        </div>

        {!hasExposures && (
          <p className="mt-3 text-xs text-gray-500 text-center">
            Add exposures to enable exports
          </p>
        )}

        <div className="mt-4 text-xs text-gray-500">
          <p className="font-medium mb-1">Export includes:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Portfolio metadata and risk summary</li>
            <li>Per-currency risk metrics</li>
            <li>Detailed exposure table</li>
            <li>Timestamp and data source info</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
