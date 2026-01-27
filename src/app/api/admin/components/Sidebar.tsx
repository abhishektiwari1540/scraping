'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  HomeIcon, 
  ChartBarIcon, 
  DatabaseIcon, 
  CogIcon,
  BellIcon,
  CloudDownloadIcon,
  CalendarIcon,
  ViewGridIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon, current: true },
  { name: 'Jobs Database', href: '/admin/jobs', icon: DatabaseIcon, current: false },
  { name: 'Scraping Stats', href: '/admin/stats', icon: ChartBarIcon, current: false },
  { name: 'Schedule', href: '/admin/schedule', icon: CalendarIcon, current: false },
  { name: 'Notifications', href: '/admin/notifications', icon: BellIcon, current: false },
  { name: 'Keywords', href: '/admin/keywords', icon: ViewGridIcon, current: false },
  { name: 'Settings', href: '/admin/settings', icon: CogIcon, current: false },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <CloudDownloadIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-3 text-xl font-bold text-gray-900">Job Scraper Pro</span>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current
                      ? 'bg-blue-50 text-blue-700 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                  } group flex items-center px-3 py-2 text-sm font-medium border-l-4`}
                >
                  <item.icon
                    className={`${
                      item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-5 w-5`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-gray-700">Webhook URL</p>
                <p className="text-xs text-gray-500 truncate">eo3fx7vdzhapezn.m.pipedream.net</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}