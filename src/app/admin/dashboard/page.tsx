'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  BellAlertIcon,
  CpuChipIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

// Types
interface ScrapingStatus {
  isRunning: boolean;
  progress: number;
  currentJob: string;
  currentKeyword: string;
  results: {
    totalSaved: number;
    totalFound: number;
    recent: Array<{keyword: string; saved: number; total: number}>;
  };
  estimatedTimeRemaining: string;
  timestamp?: string;
}

interface JobStat {
  date: string;
  jobs: number;
}

export default function DashboardPage() {
  // State
  const [status, setStatus] = useState<ScrapingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [jobStats, setJobStats] = useState<JobStat[]>([]);
  const [notifications, setNotifications] = useState<any[]>([
    { id: 1, message: 'Scraper ready to start', time: 'Just now', type: 'info' }
  ]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scrape?action=status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
    return null;
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/scrape?action=results');
      const data = await res.json();
      if (data.success) setStats(data.summary);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Fetch recent jobs
  const fetchRecentJobs = async () => {
    try {
      const res = await fetch('/api/jobs?limit=5&sort=-scraped_at');
      const data = await res.json();
      if (data.success) setRecentJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch recent jobs:', error);
    }
  };

  // Start scraping
  const startScraping = async () => {
    if (!confirm('Start overnight scraping of all Jaipur tech jobs?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/scrape?action=start-overnight');
      const data = await res.json();
      
      if (data.success) {
        addNotification({
          message: 'Overnight scraping started',
          type: 'success',
          time: new Date().toLocaleTimeString()
        });
        
        // Start polling for updates
        setTimeout(() => {
          fetchStatus();
          setAutoRefresh(true);
        }, 2000);
      } else {
        alert(data.error || 'Failed to start scraping');
      }
    } catch (error) {
      alert('Failed to start scraping');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Stop scraping
  const stopScraping = async () => {
    if (!confirm('Stop the current scraping process?')) return;
    
    try {
      const res = await fetch('/api/scrape?action=stop');
      const data = await res.json();
      
      if (data.success) {
        addNotification({
          message: 'Scraping stopped',
          type: 'warning',
          time: new Date().toLocaleTimeString()
        });
        fetchStatus();
      }
    } catch (error) {
      console.error('Failed to stop scraping:', error);
    }
  };

  // Test Pipedream
  const testPipedream = async () => {
    try {
      const res = await fetch('/api/scrape?action=test-pipedream');
      const data = await res.json();
      
      addNotification({
        message: data.message || 'Pipedream test completed',
        type: data.success ? 'success' : 'error',
        time: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addNotification({
        message: 'Pipedream test failed',
        type: 'error',
        time: new Date().toLocaleTimeString()
      });
    }
  };

  // Add notification
  const addNotification = (notification: any) => {
    const newNotification = {
      id: notifications.length + 1,
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
  };

  // Refresh all data
  const refreshAll = () => {
    fetchStatus();
    fetchStats();
    fetchRecentJobs();
    addNotification({
      message: 'Data refreshed',
      type: 'info',
      time: new Date().toLocaleTimeString()
    });
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (status?.scraping) {
        fetchStatus();
      }
    }, 10000); // Every 10 seconds when scraping
    
    return () => clearInterval(interval);
  }, [autoRefresh, status?.scraping, fetchStatus]);

  // Initial data fetch
  useEffect(() => {
    fetchStatus();
    fetchStats();
    fetchRecentJobs();
    
    // Generate mock job stats for chart
    const generateJobStats = () => {
      const stats: JobStat[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        stats.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          jobs: Math.floor(Math.random() * 100) + 20
        });
      }
      setJobStats(stats);
    };
    
    generateJobStats();
  }, [fetchStatus, fetchStats]);

  // Simple chart component
  const SimpleChart = ({ data }: { data: JobStat[] }) => {
    if (data.length === 0) return null;
    
    const maxJobs = Math.max(...data.map(d => d.jobs));
    
    return (
      <div className="h-64 relative">
        <div className="ml-10 h-full relative">
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
    );
  };

  // Simple jobs table
  const SimpleJobsTable = ({ jobs }: { jobs: any[] }) => {
    if (jobs.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">No jobs scraped yet</div>
          <p className="text-gray-500 text-sm">Start the scraper to collect jobs</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.slice(0, 5).map((job) => (
              <tr key={job._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-xs">
                  {job.job_title || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{job.company_name || 'N/A'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {job.posted_date ? new Date(job.posted_date).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">LinkedIn Job Scraper Dashboard</h1>
            <p className="mt-2 opacity-90">Automated scraping of tech jobs in Jaipur</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">📍 Jaipur, India</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">🔗 LinkedIn API</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">🌙 Overnight Mode</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">📊 Real-time Stats</span>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <div className={`px-4 py-2 rounded-lg ${status?.isRunning ? 'bg-green-500' : 'bg-gray-700'} text-center`}>
              <div className="text-sm font-medium">Status</div>
              <div className="text-xl font-bold mt-1">{status?.isRunning ? 'RUNNING' : 'READY'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Scraper Controls</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="auto-refresh" className="ml-2 text-sm text-gray-600">
                Auto-refresh
              </label>
            </div>
            <button
              onClick={refreshAll}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="text-3xl font-bold text-blue-700 mb-2">{stats?.totalJobsSaved || 0}</div>
            <div className="text-gray-600">Total Jobs Saved</div>
            <ArchiveBoxIcon className="h-8 w-8 text-blue-500 mt-3" />
          </div>
          
          <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <div className="text-3xl font-bold text-green-700 mb-2">{stats?.successRate || 0}%</div>
            <div className="text-gray-600">Success Rate</div>
            <ChartBarIcon className="h-8 w-8 text-green-500 mt-3" />
          </div>
          
          <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <div className="text-3xl font-bold text-purple-700 mb-2">{stats?.totalKeywords || 45}</div>
            <div className="text-gray-600">Keywords Configured</div>
            <CpuChipIcon className="h-8 w-8 text-purple-500 mt-3" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={startScraping}
            disabled={loading || status?.isRunning}
            className={`flex items-center px-6 py-3 rounded-lg font-medium text-white ${
              (loading || status?.isRunning) 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Starting...
              </>
            ) : status?.isRunning ? (
              <>
                <PlayIcon className="h-5 w-5 mr-2" />
                Scraping in Progress
              </>
            ) : (
              <>
                <PlayIcon className="h-5 w-5 mr-2" />
                🌙 Start Overnight Scraping
              </>
            )}
          </button>
          
          <button
            onClick={stopScraping}
            disabled={!status?.isRunning}
            className={`flex items-center px-6 py-3 rounded-lg font-medium ${
              !status?.isRunning 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <StopIcon className="h-5 w-5 mr-2" />
            Stop Scraping
          </button>
          
          <button
            onClick={testPipedream}
            className="flex items-center px-6 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white"
          >
            <BellAlertIcon className="h-5 w-5 mr-2" />
            Test Pipedream
          </button>
          
          <button
            onClick={() => window.open('https://eo3fx7vdzhapezn.m.pipedream.net', '_blank')}
            className="flex items-center px-6 py-3 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 text-white"
          >
            <span className="mr-2">🔗</span>
            Open Pipedream
          </button>
        </div>
      </div>

      {/* Progress Section */}
      {status && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Current Progress</h2>
          
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {status.isRunning ? 'Scraping in progress...' : 'Ready to start'}
              </span>
              <span className="text-sm font-bold text-blue-600">{status.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${
                  status.isRunning ? 'bg-gradient-to-r from-green-400 to-blue-500' : 'bg-gray-300'
                }`}
                style={{ width: `${status.progress}%` }}
              ></div>
            </div>
            
            {status.isRunning && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">Current Keyword</div>
                  <div className="font-semibold text-gray-800 truncate">{status.currentKeyword || 'None'}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600">Progress</div>
                  <div className="font-semibold text-gray-800">{status.currentJob}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600">Time Remaining</div>
                  <div className="font-semibold text-gray-800">{status.estimatedTimeRemaining}</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-gray-600">Jobs Saved</div>
                  <div className="font-semibold text-gray-800">{status.results.totalSaved}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Jobs Collected Over Time</h2>
          <SimpleChart data={jobStats} />
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Notifications</h2>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-4 rounded-lg border-l-4 ${
                  notification.type === 'success' ? 'border-green-500 bg-green-50' :
                  notification.type === 'error' ? 'border-red-500 bg-red-50' :
                  notification.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-gray-800">{notification.message}</p>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Recently Scraped Jobs</h2>
        <SimpleJobsTable jobs={recentJobs} />
      </div>

      {/* Footer Info */}
      <div className="bg-gray-800 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Pipedream Webhook Integration</h3>
            <p className="text-gray-300 mt-1">All scraping events are logged to Pipedream</p>
            <div className="mt-3">
              <code className="bg-gray-900 px-3 py-1 rounded text-sm font-mono">
                https://eo3fx7vdzhapezn.m.pipedream.net
              </code>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={testPipedream}
              className="px-4 py-2 bg-blue-500 rounded-lg font-medium hover:bg-blue-600"
            >
              Send Test Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}