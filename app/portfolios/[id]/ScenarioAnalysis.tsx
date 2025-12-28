'use client';

import { useState } from 'react';
import { calculateScenarioRisk } from '@/lib/scenario-calculator';
import { getCurrencySymbol } from '@/lib/display-utils';

interface Exposure {
  id: string;
  airlineIcao: string;
  airlineName: string;
  airlineCountry: string;
  exposureAmount: number;
  currency: string;
  riskScore: number;
  riskBucket: string;
}

interface ScenarioAnalysisProps {
  exposures: Exposure[];
  currency: string;
  currentMetrics: {
    baseRisk: number;
    adjustedRisk: number;
    concentrationPenalty: number;
    riskBucket: string;
  };
}

export default function ScenarioAnalysis({
  exposures,
  currency,
  currentMetrics,
}: ScenarioAnalysisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAirline, setSelectedAirline] = useState('');
  const [newExposure, setNewExposure] = useState('');
  const [simulatedResult, setSimulatedResult] = useState<any>(null);

  const handleSimulate = () => {
    if (!selectedAirline || !newExposure) return;

    const exposureValue = parseFloat(newExposure);
    if (isNaN(exposureValue) || exposureValue < 0) {
      alert('Please enter a valid exposure amount');
      return;
    }

    // Prepare exposure data
    const exposureRows = exposures.map(e => ({
      airlineIcao: e.airlineIcao,
      airlineName: e.airlineName,
      airlineCountry: e.airlineCountry,
      exposure: e.exposureAmount,
      risk: e.riskScore,
      riskBucket: e.riskBucket,
    }));

    // Calculate scenario
    const result = calculateScenarioRisk({
      exposures: exposureRows,
      currency,
      modification: {
        airlineIcao: selectedAirline,
        newExposure: exposureValue,
      },
    });

    setSimulatedResult(result);
  };

  const handleClear = () => {
    setSelectedAirline('');
    setNewExposure('');
    setSimulatedResult(null);
  };

  const getDeltaColor = (delta: number) => {
    if (delta < 0) return 'text-green-600';
    if (delta > 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatDelta = (current: number, simulated: number) => {
    const delta = simulated - current;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}`;
  };

  const selectedExposure = exposures.find(e => e.airlineIcao === selectedAirline);

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center">
            <svg
              className="h-5 w-5 mr-2 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              What-if Scenario Analysis
            </h3>
          </div>
          <svg
            className={`h-5 w-5 text-gray-400 transform transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
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

        {isOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-500">
              Simulate changes to exposure amounts and see how portfolio risk would be affected.
              Changes are temporary and not saved.
            </p>

            {simulatedResult && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-purple-900">
                    Scenario mode active (not saved)
                  </span>
                </div>
                <button
                  onClick={handleClear}
                  className="text-sm text-purple-700 hover:text-purple-900 font-medium"
                >
                  Clear scenario
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Airline
                </label>
                <select
                  value={selectedAirline}
                  onChange={(e) => setSelectedAirline(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="">Choose an airline...</option>
                  {exposures.map((exp) => (
                    <option key={exp.airlineIcao} value={exp.airlineIcao}>
                      {exp.airlineName} ({exp.airlineIcao})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Exposure Amount
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">{getCurrencySymbol(currency)}</span>
                  </div>
                  <input
                    type="number"
                    value={newExposure}
                    onChange={(e) => setNewExposure(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1000"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm pl-8 py-2 border"
                  />
                </div>
                {selectedExposure && (
                  <p className="mt-1 text-xs text-gray-500">
                    Current: {getCurrencySymbol(currency)}
                    {selectedExposure.exposureAmount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={!selectedAirline || !newExposure}
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Run Simulation
            </button>

            {simulatedResult && (
              <div className="mt-6 space-y-4">
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Simulated Results</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Base Risk (Weighted Average)
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {currentMetrics.baseRisk}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {simulatedResult.baseRisk}
                        </span>
                        <span
                          className={`text-sm font-medium ${getDeltaColor(
                            simulatedResult.baseRisk - currentMetrics.baseRisk
                          )}`}
                        >
                          ({formatDelta(currentMetrics.baseRisk, simulatedResult.baseRisk)})
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Adjusted Risk
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {currentMetrics.adjustedRisk}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {simulatedResult.adjustedRisk}
                        </span>
                        <span
                          className={`text-sm font-medium ${getDeltaColor(
                            simulatedResult.adjustedRisk - currentMetrics.adjustedRisk
                          )}`}
                        >
                          ({formatDelta(currentMetrics.adjustedRisk, simulatedResult.adjustedRisk)})
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Concentration Penalty
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-gray-900">
                          +{currentMetrics.concentrationPenalty}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-lg font-semibold text-gray-900">
                          +{simulatedResult.concentrationPenalty}
                        </span>
                        <span
                          className={`text-sm font-medium ${getDeltaColor(
                            simulatedResult.concentrationPenalty - currentMetrics.concentrationPenalty
                          )}`}
                        >
                          ({formatDelta(
                            currentMetrics.concentrationPenalty,
                            simulatedResult.concentrationPenalty
                          )})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Risk Bucket: </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {currentMetrics.riskBucket}
                        </span>
                        <span className="text-sm text-gray-500 mx-2">→</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {simulatedResult.riskBucket}
                        </span>
                      </div>
                      {currentMetrics.riskBucket !== simulatedResult.riskBucket && (
                        <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded">
                          Bucket Changed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
