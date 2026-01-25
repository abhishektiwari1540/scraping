'use client';

import { useState, useEffect } from 'react';
import './globals.css';
interface Job {
  _id: string;
  job_title: string;
  company_name: string;
  location?: string;
  salary?: string;
  posted_date?: string;
  status: string;
  is_active: boolean;
}

interface Stats {
  totalJobs: number;
  activeJobs: number;
  remoteJobs: number;
  companiesCount: number;
  avgSalary: number | null;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState({
    jobs: false,
    stats: false,
    scrape: false,
  });
  const [activeTab, setActiveTab] = useState('scrape');

  // Fetch statistics on load
  useEffect(() => {
    fetchStats();
    fetchRecentJobs();
  }, []);

  const fetchStats = async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const fetchRecentJobs = async () => {
    setLoading(prev => ({ ...prev, jobs: true }));
    try {
      const response = await fetch('/api/data?limit=10');
      const data = await response.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(prev => ({ ...prev, jobs: false }));
    }
  };

  const handleScrape = async () => {
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    setScraping(true);
    setLoading(prev => ({ ...prev, scrape: true }));
    
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const result = await response.json();
      setResult(result);
      
      if (result.success) {
        alert('✅ Job scraped successfully!');
        // Refresh data
        fetchStats();
        fetchRecentJobs();
      } else {
        alert(`❌ Error: ${result.error || 'Failed to scrape'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to scrape website');
    } finally {
      setScraping(false);
      setLoading(prev => ({ ...prev, scrape: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      active: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Jobs</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {loading.stats ? '...' : stats?.totalJobs || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Active Jobs</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {loading.stats ? '...' : stats?.activeJobs || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Companies</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            {loading.stats ? '...' : stats?.companiesCount || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Avg Salary</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {loading.stats ? '...' : stats?.avgSalary ? `$${stats.avgSalary}k` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('scrape')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scrape'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Scrape Jobs
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'jobs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Recent Jobs
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'api'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              API Documentation
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Scrape Tab */}
          {activeTab === 'scrape' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Scrape Job Posting</h2>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter job posting URL (e.g., https://linkedin.com/jobs/view/123456)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleScrape}
                    disabled={scraping}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {scraping ? 'Scraping...' : 'Scrape'}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter a job posting URL from LinkedIn, Indeed, Glassdoor, etc.
                </p>
              </div>

              {result && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Scraping Result</h3>
                  <pre className="bg-white p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Job Postings</h2>
                <button
                  onClick={fetchRecentJobs}
                  disabled={loading.jobs}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                >
                  {loading.jobs ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {loading.jobs ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No jobs scraped yet. Start by scraping a job posting!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Posted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {jobs.map((job) => (
                        <tr key={job._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{job.job_title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{job.company_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-500">{job.location || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{job.salary || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(job.status)}
                            {job.is_active && (
                              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {formatDate(job.posted_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">API Documentation</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Endpoints</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">1. Scrape Job Posting</h4>
                    <code className="block mt-1 bg-gray-800 text-green-300 p-3 rounded text-sm">
                      POST /api/scrape
                    </code>
                    <p className="mt-2 text-gray-600">
                      Scrape a job posting from a URL and store it in the database.
                    </p>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Body:</span>
                      <pre className="mt-1 bg-gray-100 p-2 rounded text-xs">
{`{
  "url": "https://linkedin.com/jobs/view/123456",
  "category": "Software Development",
  "tags": ["javascript", "react"],
  "source": "linkedin"
}`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">2. List Jobs</h4>
                    <code className="block mt-1 bg-gray-800 text-green-300 p-3 rounded text-sm">
                      GET /api/data?page=1&limit=20&search=developer&location=remote
                    </code>
                    <p className="mt-2 text-gray-600">
                      Retrieve job postings with filtering, pagination, and search.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">3. Health Check</h4>
                    <code className="block mt-1 bg-gray-800 text-green-300 p-3 rounded text-sm">
                      GET /api/health
                    </code>
                    <p className="mt-2 text-gray-600">
                      Check database connection and get system statistics.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Test</h3>
                <p className="text-gray-600 mb-4">
                  Try scraping a sample job posting:
                </p>
                <button
                  onClick={() => {
                    setUrl('https://example.com/jobs/senior-developer');
                    setActiveTab('scrape');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Test with Example URL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/api/scrape"
            target="_blank"
            className="px-4 py-3 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 text-center"
          >
            Test Scrape API
          </a>
          <a
            href="/api/data"
            target="_blank"
            className="px-4 py-3 bg-green-50 text-green-700 font-medium rounded-lg hover:bg-green-100 text-center"
          >
            View All Jobs
          </a>
          <a
            href="/api/health"
            target="_blank"
            className="px-4 py-3 bg-purple-50 text-purple-700 font-medium rounded-lg hover:bg-purple-100 text-center"
          >
            Check System Health
          </a>
        </div>
      </div>
    </div>
  );
}