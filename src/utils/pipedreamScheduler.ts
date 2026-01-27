import { Types } from 'mongoose';
import axios from 'axios';

// Tech keywords for Jaipur - comprehensive list
export const TECH_KEYWORDS = [
  // Frontend
  'react js', 'react native', 'angular', 'vue js', 'javascript', 
  'typescript', 'next js', 'frontend developer', 'ui developer',
  
  // Backend
  'node js', 'python', 'java', 'spring boot', 'django', 'flask',
  'php', 'laravel', 'express js', 'ruby on rails', '.net', 'c#',
  
  // Full Stack
  'full stack developer', 'mern stack', 'mean stack', 'lamp stack',
  'full stack engineer', 'web developer',
  
  // Mobile
  'android developer', 'ios developer', 'flutter', 'mobile developer',
  'react native developer',
  
  // DevOps & Cloud
  'devops engineer', 'aws', 'azure', 'cloud engineer', 'docker',
  'kubernetes', 'jenkins', 'ci cd',
  
  // Data & AI
  'data science', 'machine learning', 'data analyst', 'python developer',
  'ai engineer', 'ml engineer',
  
  // Databases
  'mongodb', 'sql', 'mysql', 'postgresql', 'database administrator',
  
  // Testing & QA
  'qa engineer', 'software tester', 'automation testing', 'manual testing',
  
  // Entry Level & Internships
  'fresher', 'intern', 'internship', 'trainee', 'entry level',
  'junior developer', 'associate software engineer', 'graduate engineer',
  'software engineer trainee', 'web development internship',
  
  // Additional tech
  'wordpress', 'shopify', 'ui ux designer', 'graphic designer',
  'technical support', 'it support', 'system administrator'
];

interface ScrapingJob {
  keyword: string;
  location: string;
  geoId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  jobsFound: number;
  jobsSaved: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

class PipedreamScheduler {
  private static instance: PipedreamScheduler;
  private isRunning = false;
  private currentJobIndex = 0;
  private jobQueue: ScrapingJob[] = [];
  private results: Array<{keyword: string; saved: number; total: number}> = [];
private readonly PIPEDREAM_WEBHOOK = 'https://eo3fx7vdzhapezn.m.pipedream.net';
  private constructor() {}

  static getInstance(): PipedreamScheduler {
    if (!PipedreamScheduler.instance) {
      PipedreamScheduler.instance = new PipedreamScheduler();
    }
    return PipedreamScheduler.instance;
  }

  // Initialize job queue
  initializeJobs(): void {
    this.jobQueue = [];
    
    for (const keyword of TECH_KEYWORDS) {
      this.jobQueue.push({
        keyword,
        location: 'Jaipur',
        geoId: '101716408',
        status: 'pending',
        jobsFound: 0,
        jobsSaved: 0,
        startedAt: new Date()
      });
    }
    
    console.log(`✅ Initialized ${this.jobQueue.length} scraping jobs`);
  }

  // Start scraping with Pipedream integration
  async startOvernightScraping(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Scraping is already running');
      return;
    }

    this.isRunning = true;
    this.currentJobIndex = 0;
    this.results = [];
    this.initializeJobs();

    console.log('🌙 Starting overnight LinkedIn scraping for Jaipur...');
    console.log(`📊 Total keywords: ${this.jobQueue.length}`);
    console.log(`⏰ Estimated time: ${Math.ceil(this.jobQueue.length * 15 / 60)} hours`);
    
    // Send start notification to Pipedream
    await this.sendToPipedream('start', {
      message: 'Overnight scraping started',
      totalKeywords: this.jobQueue.length,
      startTime: new Date().toISOString(),
      location: 'Jaipur'
    });

    try {
      // Process each keyword
      for (let i = 0; i < this.jobQueue.length; i++) {
        if (!this.isRunning) {
          console.log('🛑 Scraping stopped by user');
          break;
        }

        const job = this.jobQueue[i];
        job.status = 'processing';
        job.startedAt = new Date();
        
        console.log(`\n🔍 [${i + 1}/${this.jobQueue.length}] Scraping: "${job.keyword}"`);
        
        try {
          // Scrape this keyword
          const result = await this.scrapeKeyword(job);
          
          job.status = 'completed';
          job.completedAt = new Date();
          job.jobsFound = result.total;
          job.jobsSaved = result.saved;
          
          this.results.push({
            keyword: job.keyword,
            saved: result.saved,
            total: result.total
          });

          console.log(`✅ "${job.keyword}": ${result.saved}/${result.total} jobs saved`);

          // Send progress update to Pipedream every 5 keywords
          if ((i + 1) % 5 === 0 || i === this.jobQueue.length - 1) {
            await this.sendProgressUpdate(i + 1, this.jobQueue.length);
          }

        } catch (error) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : 'Unknown error';
          job.completedAt = new Date();
          
          console.error(`❌ Failed to scrape "${job.keyword}":`, job.error);
          
          // Continue with next keyword even if one fails
        }

        this.currentJobIndex = i + 1;
        
        // Wait before next request (random delay between 10-20 seconds)
        if (i < this.jobQueue.length - 1) {
          const delay = Math.random() * 10000 + 10000; // 10-20 seconds
          console.log(`⏳ Waiting ${Math.round(delay/1000)}s before next keyword...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Send completion notification
      await this.sendCompletionReport();

    } catch (error) {
      console.error('🚨 Fatal error in overnight scraping:', error);
      await this.sendToPipedream('error', {
        message: 'Fatal error in scraping',
        error: error instanceof Error ? error.message : 'Unknown error',
        time: new Date().toISOString()
      });
    } finally {
      this.isRunning = false;
      console.log('\n🎉 Overnight scraping completed!');
    }
  }

  private async scrapeKeyword(job: ScrapingJob): Promise<{total: number; saved: number}> {
    try {
      // Call your existing scraping API
      const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(job.keyword)}&location=${encodeURIComponent(job.location)}&geoId=${job.geoId}`;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: searchUrl,
          category: 'Technology',
          tags: ['tech', 'jaipur', job.keyword.toLowerCase().replace(/\s+/g, '-')],
          source: 'linkedin_overnight',
          maxJobs: 100, // Get maximum jobs per keyword
          force: true // Always scrape fresh data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        total: result.summary?.jobsProcessed || 0,
        saved: result.summary?.jobsSaved || 0
      };

    } catch (error) {
      console.error(`API call failed for "${job.keyword}":`, error);
      throw error;
    }
  }

  // Send updates to Pipedream
  private async sendToPipedream(eventType: string, data: any): Promise<void> {
    try {
      await axios.post(this.PIPEDREAM_WEBHOOK, {
        event: eventType,
        timestamp: new Date().toISOString(),
        source: 'linkedin-jaipur-scraper',
        ...data
      }, {
        timeout: 5000
      });
      
      console.log(`📤 Sent ${eventType} event to Pipedream`);
    } catch (error) {
      console.warn(`⚠️ Failed to send ${eventType} to Pipedream:`, error);
    }
  }

  private async sendProgressUpdate(current: number, total: number): Promise<void> {
    const progress = Math.round((current / total) * 100);
    
    const completedJobs = this.results.slice(-5); // Last 5 completed jobs
    
    await this.sendToPipedream('progress', {
      message: 'Scraping progress update',
      progress: progress,
      current: current,
      total: total,
      estimatedCompletion: this.estimateCompletionTime(current, total),
      recentJobs: completedJobs,
      currentKeyword: this.jobQueue[current - 1]?.keyword
    });
  }

  private async sendCompletionReport(): Promise<void> {
    const totalJobsSaved = this.results.reduce((sum, r) => sum + r.saved, 0);
    const totalJobsFound = this.results.reduce((sum, r) => sum + r.total, 0);
    
    // Get top 10 most successful keywords
    const topKeywords = [...this.results]
      .sort((a, b) => b.saved - a.saved)
      .slice(0, 10)
      .map(r => ({ keyword: r.keyword, saved: r.saved }));

    // Get failed jobs
    const failedJobs = this.jobQueue.filter(j => j.status === 'failed');

    await this.sendToPipedream('complete', {
      message: 'Overnight scraping completed successfully',
      summary: {
        totalKeywords: this.jobQueue.length,
        successfulKeywords: this.jobQueue.filter(j => j.status === 'completed').length,
        failedKeywords: failedJobs.length,
        totalJobsSaved: totalJobsSaved,
        totalJobsFound: totalJobsFound,
        successRate: totalJobsFound > 0 ? Math.round((totalJobsSaved / totalJobsFound) * 100) : 0
      },
      topKeywords: topKeywords,
      failedKeywords: failedJobs.map(j => ({
        keyword: j.keyword,
        error: j.error
      })),
      duration: this.calculateDuration(),
      completedAt: new Date().toISOString()
    });
  }

  private estimateCompletionTime(current: number, total: number): string {
    const remaining = total - current;
    const estimatedMinutes = Math.ceil(remaining * 15 / 60); // 15 seconds per keyword
    
    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} minutes`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }

  private calculateDuration(): string {
    if (this.jobQueue.length === 0) return '0s';
    
    const firstJob = this.jobQueue[0];
    const lastJob = this.jobQueue[this.jobQueue.length - 1];
    
    if (!firstJob.startedAt || !lastJob.completedAt) return 'Unknown';
    
    const durationMs = lastJob.completedAt.getTime() - firstJob.startedAt.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  // Public methods
  getStatus() {
    const progress = this.jobQueue.length > 0 
      ? Math.round((this.currentJobIndex / this.jobQueue.length) * 100)
      : 0;
    
    return {
      isRunning: this.isRunning,
      progress: progress,
      currentJob: this.currentJobIndex,
      totalJobs: this.jobQueue.length,
      currentKeyword: this.jobQueue[this.currentJobIndex]?.keyword,
      results: this.results.slice(-10), // Last 10 results
      estimatedTimeRemaining: this.isRunning 
        ? this.estimateCompletionTime(this.currentJobIndex, this.jobQueue.length)
        : '0s',
      totalSaved: this.results.reduce((sum, r) => sum + r.saved, 0),
      totalFound: this.results.reduce((sum, r) => sum + r.total, 0)
    };
  }

  stopScraping(): void {
    this.isRunning = false;
    console.log('🛑 Stopping scraping process...');
    
    // Send stop notification
    this.sendToPipedream('stopped', {
      message: 'Scraping stopped by user',
      progress: Math.round((this.currentJobIndex / this.jobQueue.length) * 100),
      jobsCompleted: this.currentJobIndex,
      totalJobs: this.jobQueue.length
    });
  }

  getJobQueue(): ScrapingJob[] {
    return [...this.jobQueue];
  }

  getResultsSummary() {
    return {
      totalKeywords: this.jobQueue.length,
      completed: this.jobQueue.filter(j => j.status === 'completed').length,
      failed: this.jobQueue.filter(j => j.status === 'failed').length,
      pending: this.jobQueue.filter(j => j.status === 'pending').length,
      totalJobsSaved: this.results.reduce((sum, r) => sum + r.saved, 0),
      totalJobsFound: this.results.reduce((sum, r) => sum + r.total, 0),
      successRate: this.results.reduce((sum, r) => sum + r.total, 0) > 0 
        ? Math.round((this.results.reduce((sum, r) => sum + r.saved, 0) / 
                     this.results.reduce((sum, r) => sum + r.total, 0)) * 100)
        : 0
    };
  }
}

export default PipedreamScheduler.getInstance();