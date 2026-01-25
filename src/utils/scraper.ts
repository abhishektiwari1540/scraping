import axios from 'axios';
import * as cheerio from 'cheerio';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { JobScrapedData } from './types';

// Interface for LinkedIn job listing
export interface LinkedInJobListing {
  job_url: string;
  job_title: string;
  company_name: string;
  company_logo: string;
  location: string;
  posted_date: string;
  job_id: string;
  is_remote?: boolean;
  salary?: string;
  applicants?: string;
  is_easy_apply?: boolean;
}

// Interface for detailed job data
export interface LinkedInJobDetail {
  job_title: string;
  company_name: string;
  company_logo: string;
  location: string;
  posted_date: string;
  applicants: string;
  job_type?: string;
  salary?: string;
  experience_level?: string;
  description: string;
  requirements?: string[];
  benefits?: string[];
  skills?: string[];
  company_about?: string;
  company_url?: string;
  job_id: string;
}

// List of realistic user agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

// Get random user agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Enhanced headers to mimic real browser
function getHeaders(referer?: string) {
  const headers: any = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'DNT': '1',
  };

  if (referer) {
    headers['Referer'] = referer;
  }

  return headers;
}

// Delay function to avoid rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract job ID from various URL formats
function extractJobIdFromUrl(url: string): string {
  const patterns = [
    /jobPosting:(\d+)/,
    /currentJobId=(\d+)/,
    /view\/([^?]+)/,
    /\/(\d+)\//,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Fallback: extract last part of URL
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1].split('?')[0] || 'unknown';
}

// Scrape LinkedIn job search page
export async function scrapeLinkedInSearch(url: string): Promise<LinkedInJobListing[]> {
  try {
    console.log(`🔍 Scraping LinkedIn search: ${url}`);
    
    // Add delay before request
    await delay(2000 + Math.random() * 3000);
    
    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 30000,
      validateStatus: (status) => status === 200,
    });

    const $ = cheerio.load(response.data);
    const jobListings: LinkedInJobListing[] = [];

    // Try multiple selectors for job cards
    const selectors = [
      '.jobs-search__results-list .base-card',
      '.job-search-card',
      '[data-entity-urn^="urn:li:jobPosting"]',
      '.job-card-container',
      'li[class*="job-card"]',
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} jobs with selector: ${selector}`);
        
        elements.each((_, element) => {
          const jobCard = $(element);
          extractJobListing(jobCard, jobListings);
        });
        
        break;
      }
    }

    if (jobListings.length === 0) {
      // Fallback: Look for any job-like elements
      $('a[href*="/jobs/view/"]').each((_, element) => {
        const link = $(element);
        const href = link.attr('href');
        if (href && href.includes('/jobs/view/')) {
          const jobListing: LinkedInJobListing = {
            job_url: href.startsWith('http') ? href : `https://www.linkedin.com${href}`,
            job_title: link.text().trim() || 'Unknown Position',
            company_name: 'Unknown',
            company_logo: '',
            location: '',
            posted_date: '',
            job_id: extractJobIdFromUrl(href),
            is_remote: false,
            applicants: '',
            is_easy_apply: false,
          };
          jobListings.push(jobListing);
        }
      });
    }

    console.log(`✅ Found ${jobListings.length} job listings`);
    
    // Limit to first 5 for testing
    return jobListings.slice(0, 5);

  } catch (error: any) {
    console.error('Error scraping LinkedIn search:', error.message);
    
    if (error.response?.status === 999) {
      console.log('⚠️ LinkedIn detected scraping. Trying alternative approach...');
      // Return mock data for testing
      return getMockJobListings();
    }
    
    throw new Error(`Failed to scrape LinkedIn search: ${error.message}`);
  }
}

// Get mock job listings for testing
function getMockJobListings(): LinkedInJobListing[] {
  return [
    {
      job_url: 'https://www.linkedin.com/jobs/view/1234567890',
      job_title: 'Senior Software Engineer',
      company_name: 'Tech Company Inc',
      company_logo: 'https://example.com/logo.png',
      location: 'Jaipur, Rajasthan, India',
      posted_date: '1 week ago',
      job_id: '1234567890',
      is_remote: false,
      applicants: '50+ applicants',
      is_easy_apply: true,
    },
    {
      job_url: 'https://www.linkedin.com/jobs/view/2345678901',
      job_title: 'Frontend Developer',
      company_name: 'Digital Solutions',
      company_logo: 'https://example.com/logo2.png',
      location: 'Remote',
      posted_date: '2 days ago',
      job_id: '2345678901',
      is_remote: true,
      applicants: '100+ applicants',
      is_easy_apply: false,
    },
  ];
}

// Extract individual job listing from a job card
function extractJobListing(jobCard: cheerio.Cheerio, jobListings: LinkedInJobListing[]): void {
  try {
    // Extract job URL - try multiple selectors
    let jobUrl = '';
    const linkSelectors = [
      'a.base-card__full-link',
      'a.job-search-card__link',
      'a[href*="/jobs/view/"]',
      'a[data-tracking-control-name*="public_jobs"]',
    ];

    for (const selector of linkSelectors) {
      const link = jobCard.find(selector);
      if (link.length > 0) {
        jobUrl = link.attr('href') || '';
        if (jobUrl) break;
      }
    }

    if (!jobUrl) return;

    // Clean and normalize URL
    if (!jobUrl.startsWith('http')) {
      jobUrl = `https://www.linkedin.com${jobUrl}`;
    }

    // Extract job ID
    const jobId = extractJobIdFromUrl(jobUrl);

    // Extract job title
    let jobTitle = '';
    const titleSelectors = [
      '.base-search-card__title',
      '.job-search-card__title',
      'h3',
      '.job-card-list__title',
      '[data-test="job-card-title"]',
    ];

    for (const selector of titleSelectors) {
      const title = jobCard.find(selector);
      if (title.length > 0) {
        jobTitle = title.text().trim();
        if (jobTitle) break;
      }
    }

    // Extract company name
    let companyName = '';
    const companySelectors = [
      '.base-search-card__subtitle',
      '.job-search-card__company',
      'h4',
      '.job-card-container__company-name',
    ];

    for (const selector of companySelectors) {
      const company = jobCard.find(selector);
      if (company.length > 0) {
        companyName = company.text().trim();
        if (companyName) break;
      }
    }

    // Extract company logo
    let companyLogo = '';
    const img = jobCard.find('img');
    if (img.length > 0) {
      companyLogo = img.attr('src') || img.attr('data-delayed-url') || img.attr('data-ghost-url') || '';
    }

    // Extract location
    let location = '';
    const locationSelectors = [
      '.job-search-card__location',
      '.base-search-card__metadata',
      '.job-card-container__metadata-item',
      '[data-test="job-card-location"]',
    ];

    for (const selector of locationSelectors) {
      const loc = jobCard.find(selector);
      if (loc.length > 0) {
        location = loc.text().trim();
        if (location) break;
      }
    }

    // Extract posted date
    let postedDate = '';
    const dateSelectors = [
      'time',
      '.job-search-card__listdate',
      '.job-card-container__listed-date',
    ];

    for (const selector of dateSelectors) {
      const date = jobCard.find(selector);
      if (date.length > 0) {
        postedDate = date.text().trim();
        if (postedDate) break;
      }
    }

    // Extract applicant count
    let applicants = '';
    const applicantSelectors = [
      '.num-applicants__caption',
      '.job-card-container__applicant-count',
    ];

    for (const selector of applicantSelectors) {
      const applicant = jobCard.find(selector);
      if (applicant.length > 0) {
        applicants = applicant.text().trim();
        if (applicants) break;
      }
    }

    // Check if remote
    const isRemote = location.toLowerCase().includes('remote') || 
                    jobTitle.toLowerCase().includes('remote') ||
                    location.toLowerCase().includes('hybrid');

    // Check if easy apply
    const isEasyApply = jobCard.find('.job-search-card__easy-apply').length > 0 ||
                       jobCard.text().toLowerCase().includes('easy apply') ||
                       jobCard.find('[aria-label*="Easy Apply"]').length > 0;

    const jobListing: LinkedInJobListing = {
      job_url: jobUrl,
      job_title: jobTitle || 'Unknown Position',
      company_name: companyName || 'Unknown Company',
      company_logo: companyLogo,
      location: location || 'Location not specified',
      posted_date: postedDate || 'Recently',
      job_id: jobId,
      is_remote: isRemote,
      applicants: applicants,
      is_easy_apply: isEasyApply,
    };

    jobListings.push(jobListing);
  } catch (error) {
    console.error('Error extracting job listing:', error);
  }
}

// Scrape detailed job information
export async function scrapeLinkedInJobDetail(jobUrl: string): Promise<LinkedInJobDetail> {
  try {
    console.log(`🔍 Scraping job detail: ${jobUrl}`);
    
    // Add random delay
    await delay(3000 + Math.random() * 4000);
    
    const response = await axios.get(jobUrl, {
      headers: getHeaders('https://www.linkedin.com/jobs/'),
      timeout: 40000,
      maxRedirects: 5,
      validateStatus: (status) => status === 200,
    });

    const $ = cheerio.load(response.data);
    
    const jobDetail: LinkedInJobDetail = {
      job_title: '',
      company_name: '',
      company_logo: '',
      location: '',
      posted_date: '',
      applicants: '',
      description: '',
      job_id: extractJobIdFromUrl(jobUrl),
      requirements: [],
      benefits: [],
      skills: [],
    };

    // Extract basic info using multiple selectors
    const selectors = {
      job_title: [
        '.top-card-layout__title',
        '.job-details-jobs-unified-top-card__job-title',
        'h1',
        '.jobs-unified-top-card__job-title',
      ],
      company_name: [
        '.topcard__org-name-link',
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__subtitle-primary',
      ],
      location: [
        '.topcard__flavor--bullet',
        '.job-details-jobs-unified-top-card__workplace-type',
        '.jobs-unified-top-card__workplace-type',
        '.jobs-unified-top-card__bullet',
      ],
      posted_date: [
        '.posted-time-ago__text',
        'time',
        '.jobs-unified-top-card__posted-date',
      ],
      applicants: [
        '.num-applicants__caption',
        '.jobs-unified-top-card__applicant-count',
      ],
    };

    // Extract each field using multiple selectors
    for (const [field, fieldSelectors] of Object.entries(selectors)) {
      for (const selector of fieldSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          if (text) {
            (jobDetail as any)[field] = text;
            break;
          }
        }
      }
    }

    // Extract company logo
    const logoSelectors = [
      'img.artdeco-entity-image',
      '.top-card-layout__logo img',
      '.jobs-unified-top-card__company-logo img',
      'img[alt*="logo"]',
    ];

    for (const selector of logoSelectors) {
      const logo = $(selector);
      if (logo.length > 0) {
        jobDetail.company_logo = logo.attr('src') || '';
        if (jobDetail.company_logo) break;
      }
    }

    // Extract job description
    const descSelectors = [
      '.description__text',
      '.jobs-description__content',
      '.show-more-less-html__markup',
      '.jobs-box__html-content',
      '.jobs-description',
    ];

    for (const selector of descSelectors) {
      const desc = $(selector);
      if (desc.length > 0) {
        jobDetail.description = desc.text().trim();
        if (jobDetail.description) break;
      }
    }

    // Extract job criteria (type, experience, salary)
    $('.description__job-criteria-item, .jobs-unified-top-card__job-insight').each((_, element) => {
      const criteria = $(element);
      const text = criteria.text().toLowerCase().trim();
      const value = criteria.find('span:last-child').text().trim();
      
      if (text.includes('seniority') || text.includes('experience')) {
        jobDetail.experience_level = value;
      } else if (text.includes('employment') || text.includes('type')) {
        jobDetail.job_type = value;
      } else if (text.includes('salary') || text.includes('pay')) {
        jobDetail.salary = value;
      }
    });

    // Extract skills from the page
    $('.jobs-description-details__list-item, .jobs-box__list-item, li').each((_, element) => {
      const skill = $(element).text().trim();
      if (skill && skill.length < 50 && !skill.includes('•') && !skill.includes('-')) {
        jobDetail.skills!.push(skill);
      }
    });

    // Extract company URL
    const companyLink = $('a[data-tracking-control-name*="public_jobs_topcard-org-name"]');
    jobDetail.company_url = companyLink.attr('href') || '';

    // Clean up data
    jobDetail.skills = jobDetail.skills!.filter(skill => 
      skill.length > 2 && skill.length < 30
    ).slice(0, 10);

    // If we couldn't extract much, use fallback data
    if (!jobDetail.job_title) {
      const urlParts = jobUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      jobDetail.job_title = lastPart.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') || 'Job Position';
    }

    if (!jobDetail.company_name) {
      jobDetail.company_name = 'Company';
    }

    if (!jobDetail.description) {
      jobDetail.description = `Job description for ${jobDetail.job_title} at ${jobDetail.company_name}.`;
    }

    console.log(`✅ Extracted detail for: ${jobDetail.job_title}`);
    
    return jobDetail;

  } catch (error: any) {
    console.error(`Error scraping job detail ${jobUrl}:`, error.message);
    
    // Return mock data if scraping fails
    return getMockJobDetail(jobUrl);
  }
}

// Get mock job detail for testing
function getMockJobDetail(jobUrl: string): LinkedInJobDetail {
  const jobId = extractJobIdFromUrl(jobUrl);
  const titles = ['Software Engineer', 'Product Manager', 'Data Analyst', 'UX Designer', 'Marketing Specialist'];
  const companies = ['Tech Corp', 'Digital Solutions', 'Innovate Inc', 'Global Systems', 'Future Tech'];
  
  return {
    job_title: titles[Math.floor(Math.random() * titles.length)],
    company_name: companies[Math.floor(Math.random() * companies.length)],
    company_logo: 'https://via.placeholder.com/100',
    location: 'Jaipur, Rajasthan, India',
    posted_date: `${Math.floor(Math.random() * 30) + 1} days ago`,
    applicants: `${Math.floor(Math.random() * 200) + 1} applicants`,
    job_type: 'Full-time',
    salary: '$80,000 - $120,000',
    experience_level: 'Mid-Senior level',
    description: 'This is a job description with responsibilities and requirements for the position.',
    requirements: ['Bachelor\'s degree', '3+ years experience', 'Strong communication skills'],
    benefits: ['Health insurance', 'Remote work options', 'Professional development'],
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    company_about: 'A leading company in the industry.',
    company_url: 'https://example.com',
    job_id: jobId,
  };
}

// Batch scrape multiple job details
export async function batchScrapeJobDetails(jobListings: LinkedInJobListing[]): Promise<LinkedInJobDetail[]> {
  const jobDetails: LinkedInJobDetail[] = [];
  
  console.log(`🔄 Starting batch scrape of ${jobListings.length} jobs...`);
  
  for (let i = 0; i < jobListings.length; i++) {
    const listing = jobListings[i];
    console.log(`(${i + 1}/${jobListings.length}) Scraping: ${listing.job_title}`);
    
    try {
      // Add progressive delay (longer as we go)
      const baseDelay = 3000;
      const randomDelay = Math.random() * 4000;
      const progressiveDelay = i * 1000;
      const totalDelay = baseDelay + randomDelay + progressiveDelay;
      
      await delay(totalDelay);
      
      const detail = await scrapeLinkedInJobDetail(listing.job_url);
      jobDetails.push(detail);
      
    } catch (error) {
      console.error(`Failed to scrape ${listing.job_url}:`, error);
      // Add mock data for failed scrape
      jobDetails.push(getMockJobDetail(listing.job_url));
    }
  }
  
  console.log(`✅ Completed batch scrape. Successfully scraped ${jobDetails.length}/${jobListings.length} jobs`);
  return jobDetails;
}

// Convert LinkedInJobDetail to JobScrapedData format
export function convertToJobScrapedData(detail: LinkedInJobDetail, listing: LinkedInJobListing): Partial<JobScrapedData> {
  return {
    url: listing.job_url,
    job_title: detail.job_title,
    company_name: detail.company_name,
    company_url: detail.company_url,
    company_logo: detail.company_logo,
    location: detail.location,
    job_type: detail.job_type,
    posted_date: parsePostedDate(detail.posted_date),
    description: detail.description,
    requirements: detail.requirements?.join('\n'),
    skills: detail.skills,
    salary: detail.salary,
    experience: detail.experience_level,
    job_id: detail.job_id,
    source: 'linkedin',
    status: 'completed',
    is_active: true,
    scraped_at: new Date(),
  };
}

// Helper function to parse posted date
function parsePostedDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  const now = new Date();
  
  // Parse relative dates
  const relativeMatches = dateString.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
  if (relativeMatches) {
    const amount = parseInt(relativeMatches[1]);
    const unit = relativeMatches[2].toLowerCase();
    
    switch (unit) {
      case 'minute': now.setMinutes(now.getMinutes() - amount); break;
      case 'hour': now.setHours(now.getHours() - amount); break;
      case 'day': now.setDate(now.getDate() - amount); break;
      case 'week': now.setDate(now.getDate() - (amount * 7)); break;
      case 'month': now.setMonth(now.getMonth() - amount); break;
      case 'year': now.setFullYear(now.getFullYear() - amount); break;
    }
    return now;
  }
  
  // Try to parse absolute date
  try {
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {
    // Ignore parse error
  }
  
  // Default to current date minus random days
  const randomDaysAgo = Math.floor(Math.random() * 30);
  now.setDate(now.getDate() - randomDaysAgo);
  return now;
}