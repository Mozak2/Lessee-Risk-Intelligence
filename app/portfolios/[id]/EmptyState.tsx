'use client';

export default function EmptyState() {
  const handleClick = () => {
    const formElement = document.getElementById('add-exposure-form');
    if (formElement) {
      // Find and click the "Add Exposure" button to open the form
      const addButton = formElement.querySelector('button') as HTMLButtonElement;
      if (addButton) {
        addButton.click();
        // Scroll to the form after a brief delay to allow it to open
        setTimeout(() => {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <button
        onClick={handleClick}
        className="w-full px-4 py-12 text-center hover:bg-gray-50 transition-colors cursor-pointer"
      >
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No exposures yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add airlines to this portfolio to start tracking risk.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Search for airlines by ICAO code (e.g., AAL, UAL, DAL)
        </p>
      </button>
    </div>
  );
}
