'use client';

import { BellIcon } from '@heroicons/react/24/outline';

export default function Header() {
  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex items-center">
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">
            LinkedIn Job Scraper - Jaipur Tech Jobs
          </h1>
        </div>
        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          <button
            type="button"
            className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500"
          >
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="relative flex-shrink-0">
            <div className="flex items-center">
              <span className="hidden md:inline text-sm text-gray-700 mr-2">Status:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}