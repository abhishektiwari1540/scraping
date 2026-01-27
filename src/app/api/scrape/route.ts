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
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (error instanceof Error) {
        console.log(`⚠️ Database operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      } else {
        console.log(`⚠️ Database operation failed (attempt ${i + 1}/${maxRetries}):`, String(error));
      }
      
      if (i < maxRetries - 1) {
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  
  if (lastError instanceof Error) {
    throw lastError;
  } else {
    throw new Error(String(lastError));
  }
}

// Helper to check timeout
function checkTimeout(startTime: number, timeoutMs: number = 250000): boolean {
  const elapsed = Date.now() - startTime;
  const timeLeft = timeoutMs - elapsed;
  
  if (timeLeft < 30000) { // 30 seconds left
    console.log(`⏰ Warning: ${Math.round(timeLeft / 1000)} seconds remaining before timeout`);
  }
  
  return elapsed >= timeoutMs;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 250000; // 4 minutes 10 seconds (leaving buffer)
  
  try {
    // Check timeout early
    if (checkTimeout(startTime, MAX_EXECUTION_TIME)) {
      throw new Error('Execution timeout check failed at start');
    }
    
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
    
    const { url, category, tags, source, maxJobs = 20 } = body || {};
    
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
      return await handleLinkedInSearch(
        url, 
        category, 
        tags, 
        source,
        maxJobs,
        startTime,
        MAX_EXECUTION_TIME
      );
    } else {
      // Single job scraping
      return await handleSingleJobScrape(url, category, tags, source);
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

// Handle LinkedIn search page scraping with timeout management
async function handleLinkedInSearch(
  url: string, 
  category?: string, 
  tags?: string[], 
  source?: string,
  maxJobs: number = 20,
  startTime: number,
  timeoutMs: number = 250000
) {
  const operationStartTime = Date.now();
  
  try {
    console.log('🔄 Starting LinkedIn search scraping...');
    console.log(`⏱️ Timeout set to: ${timeoutMs / 1000} seconds`);
    console.log(`📦 Max jobs to process: ${maxJobs}`);
    
    // Step 1: Scrape the search page for job listings
    const jobListings = await scrapeLinkedInSearch(url);
    
    if (checkTimeout(startTime, timeoutMs)) {
      throw new Error('Timeout after scraping search page');
    }
    
    if (jobListings.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No job listings found on the search page',
        suggestion: 'Try a different search URL or check the page structure'
      }, { status: 404 });
    }
    
    console.log(`📋 Found ${jobListings.length} job listings`);
    
    // Step 2: Limit jobs based on timeout considerations
    const safeMaxJobs = Math.min(jobListings.length, maxJobs, 30); // Max 30 jobs for safety
    const jobsToProcess = jobListings.slice(0, safeMaxJobs);
    
    console.log(`⚡ Processing ${safeMaxJobs} jobs (timeout-safe)`);
    
    // Step 3: Scrape job details with concurrency control
    const jobDetails = await batchScrapeJobDetails(jobsToProcess, safeMaxJobs);
    
    if (checkTimeout(startTime, timeoutMs)) {
      throw new Error('Timeout after scraping job details');
    }
    
    console.log(`✅ Successfully processed ${jobDetails.length} job details`);
    
    // Step 4: Save to database with batch operations and timeout checks
    const results = await saveJobsWithTimeout(
      jobDetails,
      jobsToProcess,
      category,
      tags,
      source,
      startTime,
      timeoutMs
    );
    
    const { savedJobs, skippedJobs, failedJobs } = results;
    
    // Log results
    console.log('\n📊 SCRAPING SUMMARY:');
    console.log('========================');
    console.log(`Total listings found: ${jobListings.length}`);
    console.log(`Jobs attempted: ${safeMaxJobs}`);
    console.log(`Jobs processed: ${jobDetails.length}`);
    console.log(`Jobs saved: ${savedJobs.length}`);
    console.log(`Jobs skipped (duplicates): ${skippedJobs.length}`);
    console.log(`Jobs failed: ${failedJobs.length}`);
    console.log(`Total execution time: ${Date.now() - startTime}ms`);
    
    // Return comprehensive response
    return NextResponse.json({
      success: true,
      message: 'LinkedIn search scraping completed',
      summary: {
        totalListingsFound: jobListings.length,
        jobsAttempted: safeMaxJobs,
        jobsProcessed: jobDetails.length,
        jobsSaved: savedJobs.length,
        jobsSkipped: skippedJobs.length,
        jobsFailed: failedJobs.length,
        timeoutSafe: true,
        executionTime: `${Date.now() - startTime}ms`
      },
      data: {
        savedJobs: savedJobs.slice(0, 5), // Return first 5 for preview
        skippedJobs: skippedJobs.slice(0, 5),
        failedJobs: failedJobs.slice(0, 5),
        statistics: {
          totalSaved: savedJobs.length,
          totalSkipped: skippedJobs.length,
          totalFailed: failedJobs.length
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ LinkedIn search scraping failed:', error);
    
    const timeUsed = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: timeUsed >= timeoutMs ? 'Operation timed out' : 'Failed to scrape LinkedIn search',
      details: error instanceof Error ? error.message : 'Unknown error',
      timeUsed: `${timeUsed}ms`,
      timeout: timeUsed >= timeoutMs
    }, { 
      status: timeUsed >= timeoutMs ? 408 : 500 // 408 for timeout
    });
  }
}

// Optimized function to save jobs with timeout management
async function saveJobsWithTimeout(
  jobDetails: any[],
  jobListings: LinkedInJobListing[],
  category?: string,
  tags?: string[],
  source?: string,
  startTime: number,
  timeoutMs: number
) {
  const savedJobs = [];
  const skippedJobs = [];
  const failedJobs = [];
  
  // Process jobs in batches to avoid timeout
  const BATCH_SIZE = 5;
  const totalBatches = Math.ceil(jobDetails.length / BATCH_SIZE);
  
  for (let batch = 0; batch < totalBatches; batch++) {
    // Check timeout before starting each batch
    if (checkTimeout(startTime, timeoutMs)) {
      console.log(`⏰ Timeout reached, stopping after batch ${batch}`);
      break;
    }
    
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min((batch + 1) * BATCH_SIZE, jobDetails.length);
    const currentBatch = jobDetails.slice(batchStart, batchEnd);
    const currentListings = jobListings.slice(batchStart, batchEnd);
    
    console.log(`🔄 Processing batch ${batch + 1}/${totalBatches} (jobs ${batchStart + 1}-${batchEnd})`);
    
    // Process jobs in parallel within the batch
    const batchPromises = currentBatch.map(async (detail, index) => {
      const listing = currentListings[index];
      const jobIndex = batchStart + index;
      
      try {
        // Check timeout for individual job
        if (checkTimeout(startTime, timeoutMs - 10000)) { // 10 second buffer
          throw new Error('Timeout approaching, skipping remaining operations');
        }
        
        // Generate unique job ID
        const jobId = detail.job_id || listing.job_id || `linkedin_${Date.now()}_${jobIndex}`;
        
        // Check if job already exists
        const existingJob = await ScrapedData.findOne({ 
          $or: [
            { url: listing.job_url },
            { job_id: jobId },
            { 'metadata.data_entity_urn': listing.data_entity_urn }
          ]
        });
        
        if (existingJob) {
          console.log(`⏭️ Skipping existing job: ${detail.job_title}`);
          return {
            type: 'skipped' as const,
            data: {
              job_title: detail.job_title,
              url: listing.job_url,
              reason: 'Already exists in database'
            }
          };
        }
        
        // Convert to database format
        const jobData = convertToJobScrapedData(detail, listing);
        
        // Create job record
        const jobRecord = new ScrapedData({
          ...jobData,
          category: category || 'General',
          tags: tags || [],
          source: source || 'linkedin_search',
          status: 'completed',
          is_active: true,
          scraped_at: new Date(),
          last_updated: new Date(),
          job_id: jobId,
        });
        
        await jobRecord.save();
        console.log(`💾 Saved: ${detail.job_title}`);
        
        return {
          type: 'saved' as const,
          data: {
            ...jobRecord.toObject(),
            saved: true
          }
        };
        
      } catch (saveError) {
        console.error(`❌ Failed to save job ${detail.job_title}:`, saveError);
        return {
          type: 'failed' as const,
          data: {
            job_title: detail.job_title,
            url: listing.job_url,
            error: saveError instanceof Error ? saveError.message : 'Unknown error'
          }
        };
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Categorize results
    for (const result of batchResults) {
      if (result.type === 'saved') {
        savedJobs.push(result.data);
      } else if (result.type === 'skipped') {
        skippedJobs.push(result.data);
      } else if (result.type === 'failed') {
        failedJobs.push(result.data);
      }
    }
    
    // Add delay between batches if not the last batch
    if (batch < totalBatches - 1) {
      const delay = 1000; // 1 second between batches
      console.log(`⏳ Waiting ${delay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { savedJobs, skippedJobs, failedJobs };
}

// Handle single job scraping (optimized)
async function handleSingleJobScrape(
  url: string, 
  category?: string, 
  tags?: string[], 
  source?: string,
  force?: boolean
) {
  const startTime = Date.now();
  
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
        alreadyExists: true,
        executionTime: `${Date.now() - startTime}ms`
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
      last_updated: new Date(),
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
      data: jobRecord.toObject(),
      executionTime: `${Date.now() - startTime}ms`
    }, { status: 200 });

  } catch (error) {
    console.error('🚨 Single job scrape error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error in single job scrape',
        details: error instanceof Error ? error.message : 'Unknown error',
        executionTime: `${Date.now() - startTime}ms`
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const test = searchParams.get('test');
  
  if (test === 'connection') {
    try {
      await dbConnect();
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
        executionTime: `${Date.now() - startTime}ms`
      }, { status: 200 });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        executionTime: `${Date.now() - startTime}ms`
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({
    success: true,
    message: 'Scrape API is running',
    endpoints: {
      POST: 'Scrape a job or search page',
      'GET ?test=connection': 'Test database connection'
    },
    timeout: 'Max 300 seconds (5 minutes)',
    executionTime: `${Date.now() - startTime}ms`
  }, { status: 200 });
}