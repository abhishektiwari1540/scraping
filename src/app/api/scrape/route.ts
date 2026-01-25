import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScrapedData from '@/models/ScrapedData';
import { 
  scrapeLinkedInSearch, 
  batchScrapeJobDetails, 
  convertToJobScrapedData,
  LinkedInJobListing
} from '@/utils/scraper';

// Helper function to retry database operations
async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Database operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      
      if (i < maxRetries - 1) {
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1))); // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }
    
    console.log('🔗 Connecting to database...');
    await dbConnect();
    
    const { url, category, tags, source, force } = body || {};
    
    if (!url) {
      return NextResponse.json(
        { 
          success: false,
          error: 'URL is required'
        },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid URL format'
        },
        { status: 400 }
      );
    }

    // Check if it's a LinkedIn search page
    const isLinkedInSearch = url.includes('linkedin.com/jobs/search') || 
                            (url.includes('linkedin.com/jobs/') && url.includes('search?'));
    
    if (isLinkedInSearch) {
      console.log('🔍 Detected LinkedIn search page, starting batch scraping...');
      return await handleLinkedInSearch(url, category, tags, source);
    } else {
      // Single job scraping
      return await handleSingleJobScrape(url, category, tags, source, force);
    }

  } catch (error) {
    console.error('🚨 API Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        executionTime: `${Date.now() - startTime}ms`
      },
      { status: 500 }
    );
  }
}

// Handle LinkedIn search page scraping
async function handleLinkedInSearch(
  url: string, 
  category?: string, 
  tags?: string[], 
  source?: string
) {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Starting LinkedIn search scraping...');
    
    // Step 1: Scrape the search page for job listings
    const jobListings = await scrapeLinkedInSearch(url);
    
    if (jobListings.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No job listings found on the search page',
        suggestion: 'Try a different search URL or check the page structure'
      }, { status: 404 });
    }
    
    console.log(`📋 Found ${jobListings.length} job listings`);
    
    // Step 2: Scrape each job detail
    const jobDetails = await batchScrapeJobDetails(jobListings);
    
    console.log(`✅ Successfully processed ${jobDetails.length} job details`);
    
    // Step 3: Save to database with retry logic
    const savedJobs = [];
    const failedJobs = [];
    
    for (let i = 0; i < jobDetails.length; i++) {
      const detail = jobDetails[i];
      const listing = jobListings[i];
      
      try {
        // Generate a unique job ID
        const jobId = detail.job_id || listing.job_id || `linkedin_${Date.now()}_${i}`;
        
        // Check if job already exists with retry
        const existingJob = await retryDbOperation(async () => {
          return await ScrapedData.findOne({ 
            $or: [
              { url: listing.job_url },
              { job_id: jobId }
            ]
          });
        });
        
        if (existingJob) {
          console.log(`ℹ️ Job already exists: ${detail.job_title}`);
          savedJobs.push({
            ...existingJob.toObject(),
            alreadyExists: true
          });
          continue;
        }
        
        // Convert to database format
        const jobData = convertToJobScrapedData(detail, listing);
        
        // Create job record - set last_updated manually instead of using middleware
        const jobRecord = new ScrapedData({
          ...jobData,
          category: category || 'General',
          tags: tags || [],
          source: source || 'linkedin_search',
          status: 'completed',
          is_active: true,
          scraped_at: new Date(),
          last_updated: new Date(), // Set manually here
          job_id: jobId,
        });
        
        // Set default values for required fields
        if (!jobRecord.job_title) {
          jobRecord.job_title = listing.job_title || 'Unknown Position';
        }
        if (!jobRecord.company_name) {
          jobRecord.company_name = listing.company_name || 'Unknown Company';
        }
        if (!jobRecord.location) {
          jobRecord.location = listing.location || 'Location not specified';
        }
        
        // Save with retry
        await retryDbOperation(async () => {
          await jobRecord.save();
        });
        
        savedJobs.push({
          ...jobRecord.toObject(),
          saved: true
        });
        console.log(`💾 Saved: ${detail.job_title}`);
        
      } catch (saveError) {
        console.error(`❌ Failed to save job ${detail.job_title}:`, saveError);
        failedJobs.push({
          job_title: detail.job_title,
          url: listing.job_url,
          error: saveError instanceof Error ? saveError.message : 'Unknown error'
        });
      }
      
      // Small delay between saves
      if (i < jobDetails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Log results
    console.log('📊 Job listings found:', jobListings.length);
    console.log('📊 Job details processed:', jobDetails.length);
    console.log('📊 Jobs saved to database:', savedJobs.length);
    console.log('📊 Jobs failed to save:', failedJobs.length);
    
    // Return success even if some jobs failed
    return NextResponse.json({
      success: true,
      message: 'LinkedIn search scraping completed',
      summary: {
        listingsFound: jobListings.length,
        detailsProcessed: jobDetails.length,
        jobsSaved: savedJobs.length,
        jobsFailed: failedJobs.length,
        alreadyExists: savedJobs.filter(j => (j as any).alreadyExists).length,
        executionTime: `${Date.now() - startTime}ms`
      },
      data: {
        listings: jobListings,
        savedJobs: savedJobs,
        failedJobs: failedJobs
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ LinkedIn search scraping failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to scrape LinkedIn search',
      details: error instanceof Error ? error.message : 'Unknown error',
      executionTime: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}

// Handle single job scraping (simplified)
async function handleSingleJobScrape(
  url: string, 
  category?: string, 
  tags?: string[], 
  source?: string,
  force?: boolean
) {
  try {
    // Check if job already exists
    const existingJob = await retryDbOperation(async () => {
      return await ScrapedData.findOne({ url });
    });
    
    if (existingJob && !force) {
      return NextResponse.json({
        success: true,
        message: 'Job already exists in database',
        data: existingJob,
        alreadyExists: true
      }, { status: 200 });
    }

    // Create job record
    const jobRecord = new ScrapedData({
      url,
      job_title: 'Job from LinkedIn',
      company_name: 'LinkedIn Company',
      category: category || 'General',
      tags: tags || [],
      source: source || 'linkedin',
      status: 'completed',
      is_active: true,
      scraped_at: new Date(),
      last_updated: new Date(), // Set manually
      job_id: `linkedin_${Date.now()}`,
      location: 'Location not specified',
      description: 'Job description will be updated when scraping is implemented.',
    });

    await retryDbOperation(async () => {
      await jobRecord.save();
    });

    return NextResponse.json({
      success: true,
      message: 'Job saved successfully',
      data: jobRecord.toObject()
    }, { status: 200 });

  } catch (error) {
    console.error('🚨 Single job scrape error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error in single job scrape',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const test = searchParams.get('test');
  
  if (test === 'connection') {
    try {
      await dbConnect();
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({
    success: true,
    message: 'Scrape API is running',
    endpoints: {
      POST: 'Scrape a job or search page',
      'GET ?test=connection': 'Test database connection'
    }
  }, { status: 200 });
}