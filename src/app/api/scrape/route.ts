import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScrapedData from '@/models/ScrapedData';
import PipedreamScheduler, { TECH_KEYWORDS } from '@/utils/pipedreamScheduler';
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

// Helper function to check if job exists in database
async function checkJobExists(url: string, jobId?: string, dataEntityUrn?: string): Promise<boolean> {
  try {
    const query: any = { $or: [] };
    
    if (url) query.$or.push({ url });
    if (jobId) query.$or.push({ job_id: jobId });
    if (dataEntityUrn) query.$or.push({ 'metadata.data_entity_urn': dataEntityUrn });
    
    if (query.$or.length === 0) return false;
    
    const existingJob = await ScrapedData.findOne(query);
    return !!existingJob;
  } catch (error) {
    console.error('Error checking job existence:', error);
    return false;
  }
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
    
    // Parse parameters with default values
    const { url, category, tags, source, maxJobs = 10, count = 10 } = body || {};
    
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
        Math.min(maxJobs, count), // Use the smaller of maxJobs or count
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
  maxJobs: number = 10, // Changed default from 20 to 10
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
    
    // Step 2: Check for duplicates BEFORE scraping details
    console.log('🔍 Checking for existing jobs in database...');
    const uniqueJobListings: LinkedInJobListing[] = [];
    const duplicateJobs: LinkedInJobListing[] = [];
    
    for (const listing of jobListings) {
      const exists = await checkJobExists(
        listing.job_url, 
        listing.job_id, 
        listing.data_entity_urn
      );
      
      if (exists) {
        duplicateJobs.push(listing);
        console.log(`⏭️ Skipping existing job (scrape phase): ${listing.job_title}`);
      } else {
        uniqueJobListings.push(listing);
      }
    }
    
    console.log(`🆕 Found ${uniqueJobListings.length} new jobs, ${duplicateJobs.length} duplicates`);
    
    // Step 3: Limit jobs based on timeout considerations and requested count
    const safeMaxJobs = Math.min(uniqueJobListings.length, maxJobs, 30); // Max 30 jobs for safety
    const jobsToProcess = uniqueJobListings.slice(0, safeMaxJobs);
    
    console.log(`⚡ Processing ${safeMaxJobs} new jobs (timeout-safe)`);
    
    // Step 4: Scrape job details with concurrency control
    const jobDetails = await batchScrapeJobDetails(jobsToProcess, safeMaxJobs);
    
    if (checkTimeout(startTime, timeoutMs)) {
      throw new Error('Timeout after scraping job details');
    }
    
    console.log(`✅ Successfully processed ${jobDetails.length} job details`);
    
    // Step 5: Save to database with batch operations and timeout checks
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
    
    // Include duplicates in skipped count
    const totalSkipped = skippedJobs.length + duplicateJobs.length;
    
    // Log results
    console.log('\n📊 SCRAPING SUMMARY:');
    console.log('========================');
    console.log(`Total listings found: ${jobListings.length}`);
    console.log(`New jobs found: ${uniqueJobListings.length}`);
    console.log(`Duplicate jobs skipped: ${duplicateJobs.length}`);
    console.log(`Jobs attempted to scrape: ${safeMaxJobs}`);
    console.log(`Jobs scraped: ${jobDetails.length}`);
    console.log(`Jobs saved: ${savedJobs.length}`);
    console.log(`Jobs skipped (during save): ${skippedJobs.length}`);
    console.log(`Jobs failed: ${failedJobs.length}`);
    console.log(`Total execution time: ${Date.now() - startTime}ms`);
    
    // Return comprehensive response
    return NextResponse.json({
      success: true,
      message: 'LinkedIn search scraping completed',
      summary: {
        totalListingsFound: jobListings.length,
        newJobsFound: uniqueJobListings.length,
        duplicateJobsSkipped: duplicateJobs.length,
        jobsAttempted: safeMaxJobs,
        jobsScraped: jobDetails.length,
        jobsSaved: savedJobs.length,
        jobsSkipped: totalSkipped,
        jobsFailed: failedJobs.length,
        timeoutSafe: true,
        executionTime: `${Date.now() - startTime}ms`
      },
      data: {
        savedJobs: savedJobs.slice(0, 5), // Return first 5 for preview
        skippedJobs: {
          scrapePhase: duplicateJobs.slice(0, 5).map(job => ({
            job_title: job.job_title,
            url: job.job_url,
            reason: 'Already exists in database (checked before scraping)'
          })),
          savePhase: skippedJobs.slice(0, 5)
        },
        failedJobs: failedJobs.slice(0, 5),
        statistics: {
          totalSaved: savedJobs.length,
          totalSkipped: totalSkipped,
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
        
        // Check if job already exists (double-check)
        const existingJob = await ScrapedData.findOne({ 
          $or: [
            { url: listing.job_url },
            { job_id: jobId },
            { 'metadata.data_entity_urn': listing.data_entity_urn }
          ]
        });
        
        if (existingJob) {
          console.log(`⏭️ Skipping existing job (save phase): ${detail.job_title}`);
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
  const action = searchParams.get('action');
  const test = searchParams.get('test');
  
  const scheduler = PipedreamScheduler.getInstance();
  
  switch (action) {
    case 'start-overnight':
      return await handleStartOvernight(scheduler);
      
    case 'status':
      return await handleGetStatus(scheduler);
      
    case 'stop':
      return await handleStopScraping(scheduler);
      
    case 'results':
      return await handleGetResults(scheduler);
      
    case 'queue':
      return await handleGetQueue(scheduler);
      
    case 'keywords':
      return await handleGetKeywords();
      
    case 'test-pipedream':
      return await handleTestPipedream();
  }
  
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
    message: 'LinkedIn Scraper API',
    endpoints: {
      'POST /': 'Scrape LinkedIn jobs with body: {url, count?, maxJobs?, category?, tags?, source?}',
      'GET ?action=start-overnight': 'Start overnight scraping',
      'GET ?action=status': 'Get scraping status',
      'GET ?action=stop': 'Stop scraping',
      'GET ?action=results': 'Get results summary',
      'GET ?action=queue': 'Get job queue',
      'GET ?action=keywords': 'Get all keywords',
      'GET ?action=test-pipedream': 'Test Pipedream webhook',
      'GET ?test=connection': 'Test database connection'
    },
    default_behavior: 'Scrapes and saves 10 jobs by default',
    parameters: {
      url: 'Required: LinkedIn search URL',
      count: 'Optional: Number of jobs to scrape and save (default: 10, max: 30)',
      maxJobs: 'Optional: Alias for count',
      category: 'Optional: Job category',
      tags: 'Optional: Array of tags',
      source: 'Optional: Source identifier'
    },
    pipedreamWebhook: 'https://eo3fx7vdzhapezn.m.pipedream.net'
  });
}

async function handleStartOvernight(scheduler: any) {
  try {
    // Start in background (non-blocking)
    scheduler.startOvernightScraping().catch(console.error);
    
    return NextResponse.json({
      success: true,
      message: 'Overnight scraping started in background',
      status: 'processing',
      keywords: TECH_KEYWORDS.length,
      location: 'Jaipur',
      estimatedTime: `${Math.ceil(TECH_KEYWORDS.length * 15 / 60)} hours`,
      pipedreamWebhook: 'https://eo3fx7vdzhapezn.m.pipedream.net',
      monitor: 'Check /api/scrape?action=status for progress'
    }, { status: 202 }); // 202 Accepted
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to start scraping',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleGetStatus(scheduler: any) {
  const status = scheduler.getStatus();
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    scraping: status.isRunning,
    progress: status.progress,
    currentJob: `${status.currentJob}/${status.totalJobs}`,
    currentKeyword: status.currentKeyword,
    results: {
      totalSaved: status.totalSaved,
      totalFound: status.totalFound,
      recent: status.results
    },
    estimatedTimeRemaining: status.estimatedTimeRemaining,
    pipedream: 'Updates sent to https://eo3fx7vdzhapezn.m.pipedream.net'
  });
}

async function handleStopScraping(scheduler: any) {
  scheduler.stopScraping();
  
  return NextResponse.json({
    success: true,
    message: 'Scraping stopped',
    timestamp: new Date().toISOString()
  });
}

async function handleGetResults(scheduler: any) {
  const summary = scheduler.getResultsSummary();
  
  return NextResponse.json({
    success: true,
    summary: summary,
    timestamp: new Date().toISOString()
  });
}

async function handleGetQueue(scheduler: any) {
  const queue = scheduler.getJobQueue();
  
  return NextResponse.json({
    success: true,
    totalJobs: queue.length,
    completed: queue.filter(j => j.status === 'completed').length,
    failed: queue.filter(j => j.status === 'failed').length,
    pending: queue.filter(j => j.status === 'pending').length,
    queue: queue.slice(0, 20) // First 20 jobs
  });
}

async function handleGetKeywords() {
  return NextResponse.json({
    success: true,
    totalKeywords: TECH_KEYWORDS.length,
    keywords: TECH_KEYWORDS,
    categories: {
      frontend: TECH_KEYWORDS.filter(k => 
        ['react', 'angular', 'vue', 'javascript', 'typescript', 'frontend', 'ui'].some(t => k.includes(t))
      ),
      backend: TECH_KEYWORDS.filter(k => 
        ['node', 'python', 'java', 'php', '.net', 'backend', 'spring'].some(t => k.includes(t))
      ),
      fullstack: TECH_KEYWORDS.filter(k => 
        ['full stack', 'mern', 'mean', 'web developer'].some(t => k.includes(t))
      ),
      entryLevel: TECH_KEYWORDS.filter(k => 
        ['fresher', 'intern', 'trainee', 'junior', 'entry level'].some(t => k.includes(t))
      )
    }
  });
}

async function handleTestPipedream() {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.post(
      'https://eo3fx7vdzhapezn.m.pipedream.net',
      {
        event: 'test',
        message: 'Testing Pipedream webhook connection',
        timestamp: new Date().toISOString(),
        source: 'linkedin-jaipur-scraper',
        status: 'success'
      },
      { timeout: 5000 }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Pipedream webhook test successful',
      status: response.status,
      pipedreamUrl: 'https://eo3fx7vdzhapezn.m.pipedream.net'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Pipedream webhook test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      pipedreamUrl: 'https://eo3fx7vdzhapezn.m.pipedream.net'
    }, { status: 500 });
  }
}