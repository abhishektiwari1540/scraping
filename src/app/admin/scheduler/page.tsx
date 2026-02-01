'use client';

import React, { useState, useEffect } from 'react';

interface SchedulerStatus {
  isRunning: boolean;
  lastRunTime: string | null;
  runCount: number;
  nextRunTime: string | null;
}

export default function SchedulerAdminPage() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [intervalHours, setIntervalHours] = useState(6);
  const [maxKeywords, setMaxKeywords] = useState(10);
  const [log, setLog] = useState<string[]>([]);

  // Fetch scheduler status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/scheduler');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      addLog('Error fetching scheduler status');
    }
  };

  // Add log message
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Start scheduler
  const startScheduler = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', intervalHours })
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
        addLog(`Scheduler started (interval: ${intervalHours} hours)`);
      } else {
        addLog(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error starting scheduler:', error);
      addLog('Error starting scheduler');
    } finally {
      setLoading(false);
    }
  };

  // Stop scheduler
  const stopScheduler = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
        addLog('Scheduler stopped');
      } else {
        addLog(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error stopping scheduler:', error);
      addLog('Error stopping scheduler');
    } finally {
      setLoading(false);
    }
  };

  // Run scheduler once
  const runOnce = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runOnce: true, maxKeywords })
      });
      
      const data = await response.json();
      if (data.success) {
        addLog('Scheduler run initiated');
      } else {
        addLog(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error running scheduler:', error);
      addLog('Error running scheduler');
    } finally {
      setLoading(false);
      // Refresh status after a delay
      setTimeout(fetchStatus, 5000);
    }
  };

  // Update interval
  const updateInterval = async () => {
    if (intervalHours < 1 || intervalHours > 24) {
      addLog('Interval must be between 1 and 24 hours');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalHours })
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
        addLog(`Interval updated to ${intervalHours} hours`);
      } else {
        addLog(`Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating interval:', error);
      addLog('Error updating interval');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Jaipur Job Scheduler Admin
        </h1>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Scheduler Status
          </h2>
          
          {status ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${status.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-700">
                    Status: <span className={`font-semibold ${status.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                      {status.isRunning ? 'RUNNING' : 'STOPPED'}
                    </span>
                  </span>
                </div>
                <div className="text-gray-700">
                  Run Count: <span className="font-semibold">{status.runCount}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-gray-700">
                  Last Run: <span className="font-semibold">
                    {status.lastRunTime ? new Date(status.lastRunTime).toLocaleString() : 'Never'}
                  </span>
                </div>
                <div className="text-gray-700">
                  Next Run: <span className="font-semibold">
                    {status.nextRunTime ? new Date(status.nextRunTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Loading status...</div>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Main Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Scheduler Controls
              </h2>
              
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <button
                    onClick={startScheduler}
                    disabled={loading || (status?.isRunning)}
                    className={`px-4 py-2 rounded-md font-medium ${
                      loading || status?.isRunning
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {loading ? 'Processing...' : 'Start Scheduler'}
                  </button>
                  
                  <button
                    onClick={stopScheduler}
                    disabled={loading || !status?.isRunning}
                    className={`px-4 py-2 rounded-md font-medium ${
                      loading || !status?.isRunning
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    Stop Scheduler
                  </button>
                  
                  <button
                    onClick={runOnce}
                    disabled={loading}
                    className={`px-4 py-2 rounded-md font-medium ${
                      loading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Run Once
                  </button>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="font-medium text-gray-700 mb-2">Run Once Options</h3>
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Max Keywords
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={maxKeywords}
                        onChange={(e) => setMaxKeywords(parseInt(e.target.value) || 10)}
                        className="w-24 px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      Limits keywords to process
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interval Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Interval Settings
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Interval (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(parseInt(e.target.value) || 6)}
                      className="w-24 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <button
                    onClick={updateInterval}
                    disabled={loading}
                    className={`px-4 py-2 rounded-md font-medium ${
                      loading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    Update Interval
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  Scheduler runs automatically every {intervalHours} hours
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Activity Log
              </h2>
              <button
                onClick={() => setLog([])}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Clear Log
              </button>
            </div>
            
            <div className="h-[400px] overflow-y-auto bg-gray-50 rounded-md p-4">
              {log.length > 0 ? (
                <div className="space-y-2">
                  {log.map((entry, index) => (
                    <div key={index} className="text-sm font-mono">
                      {entry}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No activity logs yet
                </div>
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              Logs auto-refresh every 30 seconds
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Job Statistics
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Total Keywords</div>
              <div className="text-2xl font-bold text-blue-700">150+</div>
              <div className="text-xs text-blue-500">Categories covered</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Jaipur Location</div>
              <div className="text-2xl font-bold text-green-700">50km</div>
              <div className="text-xs text-green-500">Radius covered</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600">Max per Run</div>
              <div className="text-2xl font-bold text-purple-700">450</div>
              <div className="text-xs text-purple-500">Jobs per cycle</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600">Auto Duplicate</div>
              <div className="text-2xl font-bold text-orange-700">Skip</div>
              <div className="text-xs text-orange-500">Prevents duplicates</div>
            </div>
          </div>
        </div>

        {/* Quick Start Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">
            🚀 Quick Start Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>Click "Start Scheduler" to run automatically every 6 hours</li>
            <li>Use "Run Once" to test with limited keywords</li>
            <li>Monitor logs for activity and errors</li>
            <li>Check scraped jobs in the main database</li>
            <li>Adjust interval based on LinkedIn rate limits</li>
          </ol>
        </div>
      </div>
    </div>
  );
}