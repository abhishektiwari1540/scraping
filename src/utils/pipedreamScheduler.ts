/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

// Tech keywords for scraping - DON'T export here if you're going to export later
const TECH_KEYWORDS = [
  'react', 'angular', 'vue', 'javascript', 'typescript', 'frontend',
  'nodejs', 'python', 'java', 'php', 'backend', 'full stack',
  'mern', 'mean', 'web developer', 'software engineer',
  'fresher', 'intern', 'trainee', 'junior', 'entry level',
  'react native', 'flutter', 'mobile developer', 'android', 'ios',
  'devops', 'aws', 'docker', 'kubernetes', 'cloud',
  'data science', 'machine learning', 'ai', 'data analyst',
  'ui ux', 'designer', 'product manager', 'qa', 'tester',
  'mern stack', 'nextjs', 'expressjs', 'mongodb', 'postgresql',
  'graphql', 'rest api', 'microservices', 'spring boot', 'django',
  'laravel', '.net', 'c#', 'c++', 'ruby on rails', 'go', 'rust'
];

interface JobResult {
  keyword: string;
  url: string;
  jobsFound: number;
  jobsSaved: number;
  jobsSkipped: number;
  timestamp: string;
}

interface ScrapingStatus {
  isRunning: boolean;
  currentKeyword: string;
  currentJob: number;
  totalJobs: number;
  progress: number;
  totalSaved: number;
  totalFound: number;
  results: JobResult[];
  estimatedTimeRemaining: string;
}

class PipedreamSchedulerClass {
  private isScraping: boolean = false;
  private status: ScrapingStatus;
  private jobQueue: Array<{keyword: string; url: string; status: 'pending' | 'completed' | 'failed'}> = [];
  private results: JobResult[] = [];
  
  // Pipedream webhook URL
  private readonly PIPEDREAM_WEBHOOK = 'https://eo3fx7vdzhapezn.m.pipedream.net';

  constructor() {
    this.status = {
      isRunning: false,
      currentKeyword: '',
      currentJob: 0,
      totalJobs: 0,
      progress: 0,
      totalSaved: 0,
      totalFound: 0,
      results: [],
      estimatedTimeRemaining: '0 minutes'
    };
  }

  // Initialize job queue
  private initializeJobQueue(): void {
    this.jobQueue = TECH_KEYWORDS.map(keyword => ({
      keyword,
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=Jaipur&position=1&pageNum=0`,
      status: 'pending'
    }));
    
    this.status.totalJobs = this.jobQueue.length;
    this.status.progress = 0;
    this.status.currentJob = 0;
    this.status.totalSaved = 0;
    this.status.totalFound = 0;
    this.status.results = [];
  }

  // Send update to Pipedream
  private async sendPipedreamUpdate(event: string, data: any): Promise<void> {
    try {
      await axios.post(this.PIPEDREAM_WEBHOOK, {
        event,
        timestamp: new Date().toISOString(),
        source: 'linkedin-jaipur-scraper',
        ...data
      }, { timeout: 5000 });
    } catch (error) {
      console.warn('⚠️ Failed to send update to Pipedream:', error);
    }
  }

  // Scrape a single keyword
  private async scrapeKeyword(keyword: string, url: string): Promise<JobResult> {
    console.log(`🔍 Scraping keyword: "${keyword}"`);
    
    try {
      // Call your own API to scrape
      const response = await axios.post(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/scrape`,
        {
          url,
          category: this.getCategoryForKeyword(keyword),
          tags: [keyword],
          source: 'overnight_scraping',
          maxJobs: 10,
          count: 10
        },
        { timeout: 180000 } // 3 minutes timeout
      );

      const result: JobResult = {
        keyword,
        url,
        jobsFound: response.data.summary?.totalListingsFound || 0,
        jobsSaved: response.data.summary?.jobsSaved || 0,
        jobsSkipped: response.data.summary?.jobsSkipped || 0,
        timestamp: new Date().toISOString()
      };

      // Update totals
      this.status.totalFound += result.jobsFound;
      this.status.totalSaved += result.jobsSaved;
      this.status.results.push(result);

      // Send success update
      await this.sendPipedreamUpdate('keyword_completed', {
        keyword,
        success: true,
        ...result
      });

      return result;

    } catch (error: any) {
      console.error(`❌ Failed to scrape keyword "${keyword}":`, error.message);
      
      const errorResult: JobResult = {
        keyword,
        url,
        jobsFound: 0,
        jobsSaved: 0,
        jobsSkipped: 0,
        timestamp: new Date().toISOString()
      };

      // Send error update
      await this.sendPipedreamUpdate('keyword_failed', {
        keyword,
        success: false,
        error: error.message,
        ...errorResult
      });

      return errorResult;
    }
  }

  // Determine category based on keyword
  private getCategoryForKeyword(keyword: string): string {
    const kw = keyword.toLowerCase();
    
    if (kw.includes('react') || kw.includes('angular') || kw.includes('vue') || 
        kw.includes('javascript') || kw.includes('typescript') || kw.includes('frontend')) {
      return 'Frontend';
    } else if (kw.includes('node') || kw.includes('python') || kw.includes('java') || 
               kw.includes('php') || kw.includes('backend') || kw.includes('.net')) {
      return 'Backend';
    } else if (kw.includes('full stack') || kw.includes('mern') || kw.includes('mean')) {
      return 'Full Stack';
    } else if (kw.includes('devops') || kw.includes('aws') || kw.includes('docker')) {
      return 'DevOps';
    } else if (kw.includes('data') || kw.includes('machine') || kw.includes('ai')) {
      return 'Data Science';
    } else if (kw.includes('mobile') || kw.includes('android') || kw.includes('ios')) {
      return 'Mobile';
    } else if (kw.includes('ui') || kw.includes('ux') || kw.includes('design')) {
      return 'Design';
    } else if (kw.includes('fresher') || kw.includes('intern') || kw.includes('trainee')) {
      return 'Entry Level';
    } else {
      return 'General';
    }
  }

  // Start overnight scraping
  public async startOvernightScraping(): Promise<void> {
    if (this.isScraping) {
      console.log('⚠️ Scraping is already running');
      return;
    }

    this.isScraping = true;
    this.initializeJobQueue();
    
    this.status.isRunning = true;
    this.status.currentJob = 0;
    this.status.progress = 0;

    console.log('🚀 Starting overnight scraping...');
    console.log(`📊 Total keywords: ${TECH_KEYWORDS.length}`);

    // Send start event
    await this.sendPipedreamUpdate('scraping_started', {
      totalKeywords: TECH_KEYWORDS.length,
      keywords: TECH_KEYWORDS,
      estimatedDuration: `${Math.ceil(TECH_KEYWORDS.length * 2)} minutes`
    });

    // Process queue
    for (let i = 0; i < this.jobQueue.length; i++) {
      if (!this.isScraping) break;

      const job = this.jobQueue[i];
      this.status.currentKeyword = job.keyword;
      this.status.currentJob = i + 1;
      this.status.progress = Math.round(((i + 1) / this.jobQueue.length) * 100);
      
      // Update estimated time
      const estimatedMinutes = Math.round((this.jobQueue.length - i - 1) * 1.5);
      this.status.estimatedTimeRemaining = `${estimatedMinutes} minutes`;

      console.log(`\n📋 Processing (${i + 1}/${this.jobQueue.length}): ${job.keyword}`);
      
      // Scrape the keyword
      const result = await this.scrapeKeyword(job.keyword, job.url);
      
      // Update job status
      if (result.jobsSaved > 0) {
        job.status = 'completed';
      } else {
        job.status = 'failed';
      }

      // Add delay between requests
      if (i < this.jobQueue.length - 1) {
        const delayTime = 3000 + Math.random() * 4000;
        console.log(`⏳ Waiting ${Math.round(delayTime / 1000)}s before next keyword...`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }
    }

    // Finalize
    this.status.isRunning = false;
    this.isScraping = false;

    console.log('\n✅ Overnight scraping completed!');
    console.log(`📊 Total jobs saved: ${this.status.totalSaved}`);
    console.log(`📊 Total jobs found: ${this.status.totalFound}`);

    // Send completion event
    await this.sendPipedreamUpdate('scraping_completed', {
      totalKeywordsProcessed: this.jobQueue.length,
      totalJobsSaved: this.status.totalSaved,
      totalJobsFound: this.status.totalFound,
      results: this.status.results.slice(-10),
      duration: 'Completed'
    });
  }

  // Stop scraping
  public stopScraping(): void {
    this.isScraping = false;
    this.status.isRunning = false;
    console.log('🛑 Scraping stopped by user');
    
    this.sendPipedreamUpdate('scraping_stopped', {
      completedKeywords: this.status.currentJob,
      totalKeywords: this.jobQueue.length,
      jobsSaved: this.status.totalSaved,
      progress: `${this.status.progress}%`
    }).catch(console.error);
  }

  // Get current status
  public getStatus(): ScrapingStatus {
    return {
      ...this.status,
      results: [...this.status.results].slice(-20)
    };
  }

  // Get results summary
  public getResultsSummary(): any {
    const completed = this.jobQueue.filter(j => j.status === 'completed').length;
    const failed = this.jobQueue.filter(j => j.status === 'failed').length;
    const pending = this.jobQueue.filter(j => j.status === 'pending').length;

    return {
      totalKeywords: this.jobQueue.length,
      completed,
      failed,
      pending,
      jobsSaved: this.status.totalSaved,
      jobsFound: this.status.totalFound,
      successRate: completed > 0 ? Math.round((completed / this.jobQueue.length) * 100) : 0,
      lastUpdated: new Date().toISOString(),
      topKeywords: this.status.results
        .filter(r => r.jobsSaved > 0)
        .sort((a, b) => b.jobsSaved - a.jobsSaved)
        .slice(0, 5)
    };
  }

  // Get job queue
  public getJobQueue(): Array<{keyword: string; url: string; status: string}> {
    return [...this.jobQueue];
  }

  // Check if scraping is running
  public isRunning(): boolean {
    return this.isScraping;
  }
}

// Create and export a single instance
const pipedreamScheduler = new PipedreamSchedulerClass();

// Export everything at the bottom - SINGLE EXPORT STATEMENT
export { TECH_KEYWORDS, pipedreamScheduler };
export default pipedreamScheduler;