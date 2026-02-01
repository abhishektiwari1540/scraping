import { JobScrapedData } from '@/utils/types';
import { 
  scrapeLinkedInSearch, 
  batchScrapeJobDetails,
  convertToJobScrapedData,
  LinkedInJobListing 
} from '@/utils/scraper';
import dbConnect from '@/lib/mongodb';
import ScrapedData from '@/models/ScrapedData';

// Jaipur LinkedIn search configuration
export const JAIPUR_LOCATION_CONFIG = {
  location: 'Jaipur',
  geoId: '101716408',
  distance: '50',
  baseUrl: 'https://www.linkedin.com/jobs/search'
};

// Keywords to search for Jaipur jobs
export const JAIPUR_JOB_KEYWORDS = [
  '', // Empty string for all jobs
  'Software Engineer',
  'Developer',
  'Node.js',
  'React',
  'JavaScript',
  'Full Stack',
  'Frontend',
  'Backend',
  'Python',
  'Java',
  'Data Analyst',
  'Data Science',
  'Machine Learning',
  'DevOps',
  'Cloud',
  'AWS',
  'Azure',
  'MERN',
  'MEAN',
  'Web Developer',
  'Mobile Developer',
  'Android',
  'iOS',
  'Flutter',
  'React Native',
  'UI/UX Designer',
  'Product Manager',
  'Business Analyst',
  'Quality Assurance',
  'QA',
  'Test Engineer',
  'Automation',
  'Digital Marketing',
  'SEO',
  'Content Writer',
  'HR',
  'Recruiter',
  'Finance',
  'Accounting',
  'Sales',
  'Marketing',
  'Customer Service',
  'Support',
  'Operations',
  'Project Manager',
  'Scrum Master',
  'Agile',
  'Consultant',
  'Architect',
  'System Administrator',
  'Network Engineer',
  'Security',
  'Cybersecurity',
  'Blockchain',
  'AI',
  'Artificial Intelligence',
  'IoT',
  'Embedded Systems',
  'Hardware',
  'Electrical Engineer',
  'Mechanical Engineer',
  'Civil Engineer',
  'Architecture',
  'Interior Design',
  'Fashion',
  'Jewellery',
  'Gemstone',
  'Tourism',
  'Hotel Management',
  'Restaurant',
  'Chef',
  'Food',
  'Agriculture',
  'Real Estate',
  'Construction',
  'Logistics',
  'Supply Chain',
  'Manufacturing',
  'Textile',
  'Handicraft',
  'Retail',
  'E-commerce',
  'Shopify',
  'WordPress',
  'PHP',
  'Laravel',
  'Django',
  'Spring Boot',
  'Ruby on Rails',
  '.NET',
  'C#',
  'C++',
  'Go',
  'Rust',
  'Kotlin',
  'Swift',
  'TypeScript',
  'Angular',
  'Vue.js',
  'Next.js',
  'Nuxt.js',
  'GraphQL',
  'REST API',
  'Microservices',
  'Docker',
  'Kubernetes',
  'CI/CD',
  'Jenkins',
  'Git',
  'GitHub',
  'GitLab',
  'Jira',
  'Confluence',
  'Figma',
  'Adobe XD',
  'Sketch',
  'Photoshop',
  'Illustrator',
  'Video Editing',
  'Animation',
  '3D Modeling',
  'Game Development',
  'AR/VR',
  'Unity',
  'Unreal Engine',
  'Teaching',
  'Education',
  'Training',
  'Coaching',
  'Mentoring',
  'Research',
  'Scientist',
  'Professor',
  'Lecturer',
  'Tutor',
  'Writer',
  'Editor',
  'Journalist',
  'Reporter',
  'Photographer',
  'Videographer',
  'Social Media',
  'Influencer',
  'Blogger',
  'YouTuber',
  'Podcaster',
  'Event Manager',
  'Wedding Planner',
  'Fitness Trainer',
  'Yoga Instructor',
  'Nutritionist',
  'Doctor',
  'Nurse',
  'Healthcare',
  'Pharmacy',
  'Medical',
  'Hospital',
  'Clinic',
  'Dental',
  'Veterinary',
  'Lawyer',
  'Legal',
  'Advocate',
  'CA',
  'CS',
  'Accountant',
  'Auditor',
  'Tax',
  'Finance Manager',
  'Investment',
  'Banking',
  'Insurance',
  'Stock Market',
  'Trader',
  'Broker',
  'Real Estate Agent',
  'Property',
  'Builder',
  'Contractor',
  'Architect',
  'Interior Designer',
  'Civil Engineer',
  'Site Engineer',
  'Project Engineer',
  'Maintenance',
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'Welder',
  'Machinist',
  'Operator',
  'Technician',
  'Mechanic',
  'Driver',
  'Delivery',
  'Logistics Executive',
  'Warehouse',
  'Store Manager',
  'Inventory',
  'Purchase',
  'Procurement',
  'Vendor',
  'Supplier',
  'Distributor',
  'Wholesale',
  'Retail Manager',
  'Shopkeeper',
  'Sales Executive',
  'Marketing Executive',
  'Business Development',
  'Relationship Manager',
  'Customer Care',
  'Call Center',
  'BPO',
  'KPO',
  'ITES',
  'Outsourcing',
  'Consulting',
  'Freelance',
  'Contract',
  'Internship',
  'Trainee',
  'Fresher',
  'Entry Level',
  'Mid Level',
  'Senior Level',
  'Lead',
  'Manager',
  'Director',
  'VP',
  'CXO',
  'CEO',
  'Founder',
  'Co-founder',
  'Entrepreneur',
  'Startup',
  'Remote',
  'Work from Home',
  'Hybrid',
  'On-site',
  'Full-time',
  'Part-time',
  'Contract',
  'Temporary',
  'Permanent',
  'Volunteer'
];

// Job categories mapping
export const JOB_CATEGORIES = {
  'Software Engineer': 'IT & Software',
  'Developer': 'IT & Software',
  'Node.js': 'IT & Software',
  'React': 'IT & Software',
  'JavaScript': 'IT & Software',
  'Full Stack': 'IT & Software',
  'Frontend': 'IT & Software',
  'Backend': 'IT & Software',
  'Python': 'IT & Software',
  'Java': 'IT & Software',
  'Data Analyst': 'Data Science',
  'Data Science': 'Data Science',
  'Machine Learning': 'Data Science',
  'DevOps': 'IT & Software',
  'Cloud': 'IT & Software',
  'AWS': 'IT & Software',
  'Azure': 'IT & Software',
  'MERN': 'IT & Software',
  'MEAN': 'IT & Software',
  'Web Developer': 'IT & Software',
  'Mobile Developer': 'IT & Software',
  'Android': 'IT & Software',
  'iOS': 'IT & Software',
  'Flutter': 'IT & Software',
  'React Native': 'IT & Software',
  'UI/UX Designer': 'Design',
  'Product Manager': 'Management',
  'Business Analyst': 'Business',
  'Quality Assurance': 'IT & Software',
  'QA': 'IT & Software',
  'Test Engineer': 'IT & Software',
  'Automation': 'IT & Software',
  'Digital Marketing': 'Marketing',
  'SEO': 'Marketing',
  'Content Writer': 'Content',
  'HR': 'Human Resources',
  'Recruiter': 'Human Resources',
  'Finance': 'Finance',
  'Accounting': 'Finance',
  'Sales': 'Sales',
  'Marketing': 'Marketing',
  'Customer Service': 'Customer Service',
  'Support': 'Customer Service',
  'Operations': 'Operations',
  'Project Manager': 'Management',
  'Scrum Master': 'Management',
  'Agile': 'Management',
  'Consultant': 'Consulting',
  'Architect': 'Architecture',
  'System Administrator': 'IT & Software',
  'Network Engineer': 'IT & Software',
  'Security': 'IT & Software',
  'Cybersecurity': 'IT & Software',
  'Blockchain': 'IT & Software',
  'AI': 'Data Science',
  'Artificial Intelligence': 'Data Science',
  'IoT': 'IT & Software',
  'Embedded Systems': 'IT & Software',
  'Hardware': 'Hardware',
  'Electrical Engineer': 'Engineering',
  'Mechanical Engineer': 'Engineering',
  'Civil Engineer': 'Engineering',
  'Architecture': 'Architecture',
  'Interior Design': 'Design',
  'Fashion': 'Fashion',
  'Jewellery': 'Retail',
  'Gemstone': 'Retail',
  'Tourism': 'Tourism',
  'Hotel Management': 'Hospitality',
  'Restaurant': 'Hospitality',
  'Chef': 'Hospitality',
  'Food': 'Food',
  'Agriculture': 'Agriculture',
  'Real Estate': 'Real Estate',
  'Construction': 'Construction',
  'Logistics': 'Logistics',
  'Supply Chain': 'Logistics',
  'Manufacturing': 'Manufacturing',
  'Textile': 'Manufacturing',
  'Handicraft': 'Manufacturing',
  'Retail': 'Retail',
  'E-commerce': 'Retail',
  'Shopify': 'IT & Software',
  'WordPress': 'IT & Software',
  'PHP': 'IT & Software',
  'Laravel': 'IT & Software',
  'Django': 'IT & Software',
  'Spring Boot': 'IT & Software',
  'Ruby on Rails': 'IT & Software',
  '.NET': 'IT & Software',
  'C#': 'IT & Software',
  'C++': 'IT & Software',
  'Go': 'IT & Software',
  'Rust': 'IT & Software',
  'Kotlin': 'IT & Software',
  'Swift': 'IT & Software',
  'TypeScript': 'IT & Software',
  'Angular': 'IT & Software',
  'Vue.js': 'IT & Software',
  'Next.js': 'IT & Software',
  'Nuxt.js': 'IT & Software',
  'GraphQL': 'IT & Software',
  'REST API': 'IT & Software',
  'Microservices': 'IT & Software',
  'Docker': 'IT & Software',
  'Kubernetes': 'IT & Software',
  'CI/CD': 'IT & Software',
  'Jenkins': 'IT & Software',
  'Git': 'IT & Software',
  'GitHub': 'IT & Software',
  'GitLab': 'IT & Software',
  'Jira': 'IT & Software',
  'Confluence': 'IT & Software',
  'Figma': 'Design',
  'Adobe XD': 'Design',
  'Sketch': 'Design',
  'Photoshop': 'Design',
  'Illustrator': 'Design',
  'Video Editing': 'Media',
  'Animation': 'Media',
  '3D Modeling': 'Design',
  'Game Development': 'IT & Software',
  'AR/VR': 'IT & Software',
  'Unity': 'IT & Software',
  'Unreal Engine': 'IT & Software',
  'Teaching': 'Education',
  'Education': 'Education',
  'Training': 'Education',
  'Coaching': 'Education',
  'Mentoring': 'Education',
  'Research': 'Research',
  'Scientist': 'Research',
  'Professor': 'Education',
  'Lecturer': 'Education',
  'Tutor': 'Education',
  'Writer': 'Content',
  'Editor': 'Content',
  'Journalist': 'Media',
  'Reporter': 'Media',
  'Photographer': 'Media',
  'Videographer': 'Media',
  'Social Media': 'Marketing',
  'Influencer': 'Marketing',
  'Blogger': 'Content',
  'YouTuber': 'Media',
  'Podcaster': 'Media',
  'Event Manager': 'Management',
  'Wedding Planner': 'Management',
  'Fitness Trainer': 'Fitness',
  'Yoga Instructor': 'Fitness',
  'Nutritionist': 'Healthcare',
  'Doctor': 'Healthcare',
  'Nurse': 'Healthcare',
  'Healthcare': 'Healthcare',
  'Pharmacy': 'Healthcare',
  'Medical': 'Healthcare',
  'Hospital': 'Healthcare',
  'Clinic': 'Healthcare',
  'Dental': 'Healthcare',
  'Veterinary': 'Healthcare',
  'Lawyer': 'Legal',
  'Legal': 'Legal',
  'Advocate': 'Legal',
  'CA': 'Finance',
  'CS': 'Legal',
  'Accountant': 'Finance',
  'Auditor': 'Finance',
  'Tax': 'Finance',
  'Finance Manager': 'Finance',
  'Investment': 'Finance',
  'Banking': 'Finance',
  'Insurance': 'Finance',
  'Stock Market': 'Finance',
  'Trader': 'Finance',
  'Broker': 'Finance',
  'Real Estate Agent': 'Real Estate',
  'Property': 'Real Estate',
  'Builder': 'Construction',
  'Contractor': 'Construction',
  'Architect': 'Architecture',
  'Interior Designer': 'Design',
  'Civil Engineer': 'Engineering',
  'Site Engineer': 'Engineering',
  'Project Engineer': 'Engineering',
  'Maintenance': 'Maintenance',
  'Electrician': 'Maintenance',
  'Plumber': 'Maintenance',
  'Carpenter': 'Maintenance',
  'Painter': 'Maintenance',
  'Welder': 'Maintenance',
  'Machinist': 'Manufacturing',
  'Operator': 'Manufacturing',
  'Technician': 'Technical',
  'Mechanic': 'Technical',
  'Driver': 'Transportation',
  'Delivery': 'Transportation',
  'Logistics Executive': 'Logistics',
  'Warehouse': 'Logistics',
  'Store Manager': 'Retail',
  'Inventory': 'Logistics',
  'Purchase': 'Procurement',
  'Procurement': 'Procurement',
  'Vendor': 'Procurement',
  'Supplier': 'Procurement',
  'Distributor': 'Procurement',
  'Wholesale': 'Retail',
  'Retail Manager': 'Retail',
  'Shopkeeper': 'Retail',
  'Sales Executive': 'Sales',
  'Marketing Executive': 'Marketing',
  'Business Development': 'Business',
  'Relationship Manager': 'Sales',
  'Customer Care': 'Customer Service',
  'Call Center': 'Customer Service',
  'BPO': 'Customer Service',
  'KPO': 'Customer Service',
  'ITES': 'Customer Service',
  'Outsourcing': 'Consulting',
  'Consulting': 'Consulting',
  'Freelance': 'Freelance',
  'Contract': 'Contract',
  'Internship': 'Internship',
  'Trainee': 'Training',
  'Fresher': 'Entry Level',
  'Entry Level': 'Entry Level',
  'Mid Level': 'Mid Level',
  'Senior Level': 'Senior Level',
  'Lead': 'Management',
  'Manager': 'Management',
  'Director': 'Management',
  'VP': 'Management',
  'CXO': 'Management',
  'CEO': 'Management',
  'Founder': 'Entrepreneurship',
  'Co-founder': 'Entrepreneurship',
  'Entrepreneur': 'Entrepreneurship',
  'Startup': 'Entrepreneurship',
  'Remote': 'Remote',
  'Work from Home': 'Remote',
  'Hybrid': 'Hybrid',
  'On-site': 'On-site',
  'Full-time': 'Full-time',
  'Part-time': 'Part-time',
  'Contract': 'Contract',
  'Temporary': 'Temporary',
  'Permanent': 'Permanent',
  'Volunteer': 'Volunteer'
};

// Generate LinkedIn search URL for Jaipur
export function generateJaipurJobUrl(keyword: string = ''): string {
  const params = new URLSearchParams({
    keywords: keyword,
    location: JAIPUR_LOCATION_CONFIG.location,
    geoId: JAIPUR_LOCATION_CONFIG.geoId,
    distance: JAIPUR_LOCATION_CONFIG.distance,
    f_TPR: '', // Time posted (empty for all)
    f_JT: 'F', // Full-time only
    f_PP: JAIPUR_LOCATION_CONFIG.geoId, // Posted in Jaipur
    position: '1',
    pageNum: '0'
  });

  return `${JAIPUR_LOCATION_CONFIG.baseUrl}?${params.toString()}`;
}

// Batch processing configuration
export const BATCH_CONFIG = {
  MAX_JOBS_PER_KEYWORD: 30,
  MAX_JOBS_PER_BATCH: 15,
  CONCURRENT_SCRAPES: 3,
  DELAY_BETWEEN_KEYWORDS: 5000, // 5 seconds
  DELAY_BETWEEN_PAGES: 3000, // 3 seconds
  TOTAL_TIMEOUT: 240000, // 4 minutes per session
  MAX_RETRIES: 3,
};

// Enhanced duplicate checking with bloom filter concept
const processedUrls = new Set<string>();
const urlHashCache = new Map<string, string>();

// Generate hash for URL to save memory
function generateUrlHash(url: string): string {
  if (urlHashCache.has(url)) {
    return urlHashCache.get(url)!;
  }
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const hashStr = Math.abs(hash).toString(16);
  urlHashCache.set(url, hashStr);
  return hashStr;
}

// Check if job exists in database (optimized)
async function checkJobExistsOptimized(
  url: string, 
  jobId?: string, 
  dataEntityUrn?: string
): Promise<boolean> {
  try {
    // First check in-memory cache
    const urlHash = generateUrlHash(url);
    if (processedUrls.has(urlHash)) {
      return true;
    }

    // Then check database
    const query: any = { $or: [] };
    
    if (url) query.$or.push({ url });
    if (jobId) query.$or.push({ job_id: jobId });
    if (dataEntityUrn) query.$or.push({ 'metadata.data_entity_urn': dataEntityUrn });
    
    if (query.$or.length === 0) return false;
    
    const existingJob = await ScrapedData.findOne(query);
    
    if (existingJob) {
      // Add to cache
      processedUrls.add(urlHash);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking job existence:', error);
    return false; // Assume not exists on error
  }
}

// Process single keyword search
async function processKeywordSearch(
  keyword: string,
  maxJobs: number = BATCH_CONFIG.MAX_JOBS_PER_KEYWORD
): Promise<{
  keyword: string;
  totalFound: number;
  newJobs: number;
  skippedJobs: number;
  failedJobs: number;
  savedJobs: any[];
}> {
  console.log(`\n🔍 Searching for: "${keyword}" in Jaipur`);
  
  try {
    // Generate search URL
    const searchUrl = generateJaipurJobUrl(keyword);
    console.log(`🌐 URL: ${searchUrl}`);
    
    // Scrape search results
    const jobListings = await scrapeLinkedInSearch(searchUrl);
    
    if (jobListings.length === 0) {
      console.log(`❌ No jobs found for "${keyword}"`);
      return {
        keyword,
        totalFound: 0,
        newJobs: 0,
        skippedJobs: 0,
        failedJobs: 0,
        savedJobs: []
      };
    }
    
    console.log(`📋 Found ${jobListings.length} listings for "${keyword}"`);
    
    // Filter out duplicates BEFORE scraping details
    const uniqueListings: LinkedInJobListing[] = [];
    const duplicateListings: LinkedInJobListing[] = [];
    
    for (const listing of jobListings) {
      const exists = await checkJobExistsOptimized(
        listing.job_url,
        listing.job_id,
        listing.data_entity_urn
      );
      
      if (exists) {
        duplicateListings.push(listing);
      } else {
        uniqueListings.push(listing);
      }
    }
    
    console.log(`🆕 ${uniqueListings.length} new jobs, ${duplicateListings.length} duplicates`);
    
    // Limit jobs to process
    const jobsToProcess = uniqueListings.slice(0, Math.min(maxJobs, uniqueListings.length));
    
    if (jobsToProcess.length === 0) {
      console.log(`⏭️ All jobs already exist, skipping "${keyword}"`);
      return {
        keyword,
        totalFound: jobListings.length,
        newJobs: 0,
        skippedJobs: jobListings.length,
        failedJobs: 0,
        savedJobs: []
      };
    }
    
    // Scrape job details
    console.log(`⚡ Scraping ${jobsToProcess.length} new job details...`);
    const jobDetails = await batchScrapeJobDetails(jobsToProcess, BATCH_CONFIG.MAX_JOBS_PER_BATCH);
    
    // Save to database
    const savedJobs = [];
    let skippedJobs = 0;
    let failedJobs = 0;
    
    for (let i = 0; i < jobDetails.length; i++) {
      const detail = jobDetails[i];
      const listing = jobsToProcess[i];
      
      try {
        // Double-check before saving (race condition protection)
        const stillExists = await checkJobExistsOptimized(
          listing.job_url,
          listing.job_id,
          listing.data_entity_urn
        );
        
        if (stillExists) {
          console.log(`⏭️ Job already saved by another process: ${detail.job_title}`);
          skippedJobs++;
          continue;
        }
        
        // Convert to database format
        const jobData = convertToJobScrapedData(detail, listing);
        
        // Add category based on keyword
        const category = JOB_CATEGORIES[keyword] || 'General';
        
        // Create job record
        const jobRecord = new ScrapedData({
          ...jobData,
          category,
          tags: [keyword, 'Jaipur', category],
          source: 'linkedin_jaipur_scheduler',
          status: 'completed',
          is_active: true,
          scraped_at: new Date(),
          last_updated: new Date(),
          job_id: detail.job_id || listing.job_id || `jaipur_${Date.now()}_${i}`,
          search_keyword: keyword,
          location_city: 'Jaipur',
          location_state: 'Rajasthan',
          location_country: 'India',
          metadata: {
            ...jobData.metadata,
            search_keyword: keyword,
            scheduler_batch: new Date().toISOString().split('T')[0]
          }
        });
        
        // Save to database
        await jobRecord.save();
        
        // Add to cache
        processedUrls.add(generateUrlHash(listing.job_url));
        
        savedJobs.push({
          id: jobRecord._id,
          title: jobRecord.job_title,
          company: jobRecord.company_name,
          url: jobRecord.url
        });
        
        console.log(`💾 Saved: ${detail.job_title} at ${jobRecord.company_name}`);
        
      } catch (saveError) {
        console.error(`❌ Failed to save job: ${detail.job_title}`, saveError);
        failedJobs++;
      }
    }
    
    // Wait between keywords to avoid rate limiting
    if (keyword !== JAIPUR_JOB_KEYWORDS[JAIPUR_JOB_KEYWORDS.length - 1]) {
      await delay(BATCH_CONFIG.DELAY_BETWEEN_KEYWORDS);
    }
    
    return {
      keyword,
      totalFound: jobListings.length,
      newJobs: savedJobs.length,
      skippedJobs: duplicateListings.length + skippedJobs,
      failedJobs,
      savedJobs
    };
    
  } catch (error) {
    console.error(`🚨 Error processing keyword "${keyword}":`, error);
    return {
      keyword,
      totalFound: 0,
      newJobs: 0,
      skippedJobs: 0,
      failedJobs: 1,
      savedJobs: []
    };
  }
}

// Main scheduler function
export async function runJaipurJobScheduler(maxKeywords?: number): Promise<{
  success: boolean;
  stats: {
    totalKeywordsProcessed: number;
    totalJobsFound: number;
    totalJobsSaved: number;
    totalJobsSkipped: number;
    totalJobsFailed: number;
    executionTime: number;
    keywordsStats: any[];
  };
  summary: string;
}> {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🚀 STARTING JAIPUR JOB SCHEDULER');
  console.log('='.repeat(60));
  
  try {
    // Connect to database
    console.log('🔗 Connecting to database...');
    await dbConnect();
    
    // Clear cache at start
    processedUrls.clear();
    urlHashCache.clear();
    
    // Limit keywords if specified
    const keywordsToProcess = maxKeywords 
      ? JAIPUR_JOB_KEYWORDS.slice(0, maxKeywords)
      : JAIPUR_JOB_KEYWORDS;
    
    console.log(`📊 Processing ${keywordsToProcess.length} keywords`);
    
    const results = [];
    let totalJobsFound = 0;
    let totalJobsSaved = 0;
    let totalJobsSkipped = 0;
    let totalJobsFailed = 0;
    
    // Process keywords sequentially to avoid LinkedIn rate limiting
    for (let i = 0; i < keywordsToProcess.length; i++) {
      const keyword = keywordsToProcess[i];
      console.log(`\n📌 Keyword ${i + 1}/${keywordsToProcess.length}: "${keyword}"`);
      
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > BATCH_CONFIG.TOTAL_TIMEOUT) {
        console.log(`⏰ Timeout reached after ${elapsed}ms, stopping...`);
        break;
      }
      
      // Process keyword
      const result = await processKeywordSearch(keyword);
      
      // Update totals
      totalJobsFound += result.totalFound;
      totalJobsSaved += result.newJobs;
      totalJobsSkipped += result.skippedJobs;
      totalJobsFailed += result.failedJobs;
      
      results.push(result);
      
      // Log progress
      console.log(`📊 Progress: ${result.newJobs} saved, ${result.skippedJobs} skipped, ${result.failedJobs} failed`);
    }
    
    const executionTime = Date.now() - startTime;
    
    // Generate summary
    const summary = `
🎉 JAIPUR JOB SCHEDULER COMPLETED
====================================
📊 Summary:
   • Keywords processed: ${keywordsToProcess.length}
   • Total jobs found: ${totalJobsFound}
   • New jobs saved: ${totalJobsSaved}
   • Jobs skipped (duplicates): ${totalJobsSkipped}
   • Jobs failed: ${totalJobsFailed}
   • Execution time: ${Math.round(executionTime / 1000)} seconds
   • Success rate: ${totalJobsFound > 0 ? Math.round((totalJobsSaved / totalJobsFound) * 100) : 0}%

📈 Top Keywords:
${results
  .filter(r => r.newJobs > 0)
  .sort((a, b) => b.newJobs - a.newJobs)
  .slice(0, 5)
  .map(r => `   • "${r.keyword}": ${r.newJobs} jobs`)
  .join('\n')}

💡 Tips:
   • Run again in 6 hours for fresh jobs
   • Consider increasing delay between requests
   • Monitor LinkedIn rate limits
====================================
    `;
    
    console.log(summary);
    
    return {
      success: true,
      stats: {
        totalKeywordsProcessed: keywordsToProcess.length,
        totalJobsFound,
        totalJobsSaved,
        totalJobsSkipped,
        totalJobsFailed,
        executionTime,
        keywordsStats: results
      },
      summary
    };
    
  } catch (error) {
    console.error('🚨 Scheduler failed:', error);
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      stats: {
        totalKeywordsProcessed: 0,
        totalJobsFound: 0,
        totalJobsSaved: 0,
        totalJobsSkipped: 0,
        totalJobsFailed: 0,
        executionTime,
        keywordsStats: []
      },
      summary: `❌ Scheduler failed after ${Math.round(executionTime / 1000)} seconds`
    };
  }
}

// Periodic scheduler runner
export class JaipurJobScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private runCount = 0;
  
  // Start the scheduler
  start(intervalHours: number = 6): void {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }
    
    console.log(`🚀 Starting Jaipur Job Scheduler (runs every ${intervalHours} hours)`);
    this.isRunning = true;
    
    // Run immediately
    this.runScheduler();
    
    // Schedule periodic runs
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runScheduler();
    }, intervalMs);
    
    console.log(`✅ Scheduler started. Next run in ${intervalHours} hours`);
  }
  
  // Stop the scheduler
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }
    
    console.log('🛑 Stopping Jaipur Job Scheduler...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('✅ Scheduler stopped');
  }
  
  // Run scheduler once
  async runScheduler(maxKeywords?: number): Promise<void> {
    if (!this.isRunning) return;
    
    this.runCount++;
    this.lastRunTime = new Date();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 SCHEDULER RUN #${this.runCount} - ${this.lastRunTime.toLocaleString()}`);
    console.log('='.repeat(60));
    
    try {
      const result = await runJaipurJobScheduler(maxKeywords);
      
      // Log to database or file
      await this.logSchedulerRun(result);
      
      console.log(`✅ Run #${this.runCount} completed at ${new Date().toLocaleString()}`);
      
    } catch (error) {
      console.error(`❌ Run #${this.runCount} failed:`, error);
      
      // Log error
      await this.logSchedulerError(error);
    }
    
    console.log(`⏰ Next run scheduled in 6 hours`);
  }
  
  // Log scheduler run
  private async logSchedulerRun(result: any): Promise<void> {
    try {
      await dbConnect();
      
      const log = {
        run_number: this.runCount,
        run_time: this.lastRunTime,
        success: result.success,
        stats: result.stats,
        summary: result.summary,
        created_at: new Date()
      };
      
      // Save to database (create a SchedulerLog model if needed)
      // For now, just log to console
      console.log('📝 Scheduler run logged');
      
    } catch (error) {
      console.error('Failed to log scheduler run:', error);
    }
  }
  
  // Log scheduler error
  private async logSchedulerError(error: any): Promise<void> {
    try {
      console.error('📝 Scheduler error:', error);
      // Could save to error log database
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
  
  // Get scheduler status
  getStatus(): {
    isRunning: boolean;
    lastRunTime: Date | null;
    runCount: number;
    nextRunTime: Date | null;
  } {
    const nextRunTime = this.lastRunTime && this.intervalId 
      ? new Date(this.lastRunTime.getTime() + 6 * 60 * 60 * 1000)
      : null;
    
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      runCount: this.runCount,
      nextRunTime
    };
  }
}

// Utility function for delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}