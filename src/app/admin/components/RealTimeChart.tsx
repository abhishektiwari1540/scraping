'use client';

import { useEffect, useState } from 'react';

interface ChartData {
  date: string;
  jobs: number;
}

interface Props {
  data: ChartData[];
}

export default function RealTimeChart({ data }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        Loading chart...
      </div>
    );
  }

  const maxJobs = Math.max(...data.map(d => d.jobs));
  const chartHeight = 200;

  return (
    <div className="relative">
      <div className="h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxJobs}</span>
          <span>{Math.round(maxJobs * 0.75)}</span>
          <span>{Math.round(maxJobs * 0.5)}</span>
          <span>{Math.round(maxJobs * 0.25)}</span>
          <span>0</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-10 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 0.25, 0.5, 0.75, 1].map((percent) => (
              <div 
                key={percent}
                className="border-t border-gray-100"
                style={{ top: `${percent * 100}%` }}
              />
            ))}
          </div>
          
          {/* Bars */}
          <div className="flex h-full items-end justify-between pt-4">
            {data.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-3/4 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
                  style={{ 
                    height: `${(item.jobs / maxJobs) * 100}%`,
                    minHeight: '2px'
                  }}
                  title={`${item.jobs} jobs on ${item.date}`}
                />
                <div className="mt-2 text-xs text-gray-500 truncate w-full text-center">
                  {item.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gradient-to-t from-blue-500 to-blue-300 rounded mr-2"></div>
          <span className="text-sm text-gray-600">Jobs Collected</span>
        </div>
      </div>
    </div>
  );
}