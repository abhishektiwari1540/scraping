import dbConnect from '@/lib/mongodb';
import ScrapedData from '@/models/ScrapedData';

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  connection: string;
  totalDocuments?: number;
  error?: string;
  timestamp: string;
}

export async function connectToDatabase(): Promise<boolean> {
  try {
    await dbConnect();
    console.log('✅ Connected to MongoDB Atlas');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    await dbConnect();
    
    // Check connection by running a simple query
    const count = await ScrapedData.countDocuments({});
    const stats = await ScrapedData.collection.stats();
    
    return {
      status: 'healthy',
      connection: 'established',
      totalDocuments: count,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connection: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function cleanupOldData(days: number = 30): Promise<{ deleted: number }> {
  try {
    await dbConnect();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await ScrapedData.deleteMany({
      scraped_at: { $lt: cutoffDate },
      status: { $in: ['failed', 'expired'] }
    });
    
    console.log(`Cleaned up ${result.deletedCount} old records`);
    
    return { deleted: result.deletedCount || 0 };
  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
}

export async function getStatistics() {
  try {
    await dbConnect();
    
    const totalJobs = await ScrapedData.countDocuments({});
    const activeJobs = await ScrapedData.countDocuments({ is_active: true, status: 'completed' });
    const failedJobs = await ScrapedData.countDocuments({ status: 'failed' });
    
    // Get companies count
    const companies = await ScrapedData.distinct('company_name');
    
    // Get job types distribution
    const jobTypes = await ScrapedData.aggregate([
      { $match: { job_type: { $exists: true, $ne: '' } } },
      { $group: { _id: '$job_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get latest jobs
    const latestJobs = await ScrapedData.find({})
      .sort({ scraped_at: -1 })
      .limit(5)
      .select('job_title company_name location scraped_at');
    
    return {
      totalJobs,
      activeJobs,
      failedJobs,
      companiesCount: companies.length,
      jobTypes,
      latestJobs,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Statistics error:', error);
    throw error;
  }
}