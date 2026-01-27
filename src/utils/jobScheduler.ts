import axios from 'axios';
import { Types } from 'mongoose';

// All tech keywords for Jaipur
export const TECH_KEYWORDS = [
  'react js', 'javascript', 'python', 'java', 'node.js', 'angular',
  'frontend developer', 'backend developer', 'full stack developer',
  'software engineer', 'mern stack', 'react native', 'flutter',
  'devops', 'aws', 'cloud', 'data science', 'machine learning',
  'mern', 'java developer', 'php developer', 'laravel',
  'dot net', '.net core', 'c#', 'android developer', 'ios developer',
  'ui ux designer', 'web developer', 'mern stack developer',
  'nodejs', 'express js', 'mongodb', 'sql', 'postgresql',
  'django', 'spring boot', 'ruby on rails', 'wordpress',
  'shopify', 'mern developer', 'react developer',
  'fresher', 'intern', 'internship', 'trainee', 'entry level',
  'junior developer', 'associate software engineer'
];

// Experience levels for better filtering
export const EXPERIENCE_LEVELS = [
  '', // All levels
  'fresher',
  '0-1 years',
  '1-3 years',
  '3-5 years',
  '5+ years'
];

interface OvernightJob {
  _id?: Types.ObjectId;
  keyword: string;
  location: string;
  geoId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  jobsFound: number;
  jobsSaved: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

class JobScheduler {
  private static instance: JobScheduler;
  private isRunning = false;
  private currentJobIndex = 0;
  private jobQueue: Array<{
    keyword: string;
    location: string;
    geoId: string;
    experience?: string;
  }> = [];

  private constructor() {}

  static getInstance(): JobScheduler {
    if (!JobScheduler.instance) {
      JobScheduler.instance = new JobScheduler();
    }
    return JobScheduler.instance;
  }

  // Build search URLs for all tech keywords
  buildSearchUrls(): void {
    this.jobQueue = [];
    
    for (const keyword of TECH_KEYWORDS) {
      // Add with different experience levels
      for (const experience of EXPERIENCE_LEVELS) {
        const searchKeyword = experience 
          ? `${keyword} ${experience}`
          : keyword;
        
        this.jobQueue.push({
          keyword: searchKeyword.trim(),
          location: 'Jaipur',
          geoId: '101716408' // Jaipur's LinkedIn geoId
        });
      }
    }
    
    console.log(`Built ${this.jobQueue.length} search URLs for overnight scraping`);
  }

  // Start the overnight scraping process
  async startOvernightScrape() {
    if (this.isRunning) {
      console.log('Scraping already in progress');
      return;
    }

    this.isRunning = true;
    this.currentJobIndex = 0;
    this.buildSearchUrls();

    console.log('🌙 Starting overnight scraping process...');
    console.log(`Total keywords to process: ${this.jobQueue.length}`);

    // Process each keyword with delay
    for (let i = 0; i < this.jobQueue.length; i++) {
      const job = this.jobQueue[i];
      
      if (!this.isRunning) {
        console.log('Scraping stopped by user');
        break;
      }

      try {
        console.log(`\n[${i + 1}/${this.jobQueue.length}] Processing: ${job.keyword}`);
        
        // Call your existing API endpoint for each keyword
        await this.scrapeKeyword(job);
        
        // Wait before next request (10-15 seconds)
        const delay = Math.random() * 5000 + 10000;
        console.log(`⏳ Waiting ${Math.round(delay/1000)}s before next keyword...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.currentJobIndex = i + 1;
        
      } catch (error) {
        console.error(`Failed to scrape ${job.keyword}:`, error);
        // Continue with next keyword even if one fails
      }
    }

    this.isRunning = false;
    console.log('\n✅ Overnight scraping completed!');
  }

  private async scrapeKeyword(job: { keyword: string; location: string; geoId: string }) {
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(job.keyword)}&location=${encodeURIComponent(job.location)}&geoId=${job.geoId}`;
    
    try {
      // Call your existing POST endpoint
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: searchUrl,
          category: 'Technology',
          tags: ['tech', 'jaipur', job.keyword.toLowerCase()],
          source: 'linkedin_overnight',
          maxJobs: 50, // Get as many as possible
          force: true // Force re-scrape even if exists
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${job.keyword}: ${result.summary?.jobsSaved || 0} jobs saved`);
      } else {
        console.log(`⚠️ ${job.keyword}: ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`API call failed for ${job.keyword}:`, error);
      throw error;
    }
  }

  stopScraping() {
    this.isRunning = false;
    console.log('Stopping scraping process...');
  }

  getProgress() {
    return {
      isRunning: this.isRunning,
      currentJob: this.currentJobIndex,
      totalJobs: this.jobQueue.length,
      progress: this.jobQueue.length > 0 
        ? Math.round((this.currentJobIndex / this.jobQueue.length) * 100)
        : 0
    };
  }
}

export default JobScheduler.getInstance();