'use client';

interface Job {
  _id: string;
  job_title: string;
  company_name: string;
  location: string;
  posted_date: string;
  source: string;
  status: string;
}

interface Props {
  jobs: Job[];
}

export default function JobsTable({ jobs }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">No jobs scraped yet</div>
        <p className="text-gray-500 text-sm">Start the scraper to collect jobs</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Job Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Posted
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {jobs.map((job) => (
            <tr key={job._id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {job.job_title || 'N/A'}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-gray-900">{job.company_name || 'N/A'}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-gray-900">{job.location || 'N/A'}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {job.posted_date ? formatDate(job.posted_date) : 'N/A'}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status || 'unknown'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}