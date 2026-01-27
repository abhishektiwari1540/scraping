import axios from 'axios';
import * as cheerio from 'cheerio';
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
  data_entity_urn?: string;
  data_reference_id?: string;
  data_tracking_id?: string;
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
  data_entity_urn?: string;
  work_from?: string;
  hr_name?: string;
  hr_linkedin?: string;
  review?: string;
  company_rating?: number;
  visa_sponsorship?: boolean;
  relocation_assistance?: boolean;
}

// User agents
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

// Define headers type
interface AxiosHeaders {
  [key: string]: string;
}

// Get headers
function getHeaders(referer?: string): AxiosHeaders {
  const headers: AxiosHeaders = {
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

// Delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract job ID from URL
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

  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1].split('?')[0] || Date.now().toString();
}

// Scrape LinkedIn search page for 50+ jobs
export async function scrapeLinkedInSearch(url: string): Promise<LinkedInJobListing[]> {
  try {
    console.log(`🔍 Scraping LinkedIn search: ${url}`);
    
    await delay(2000 + Math.random() * 3000);
    
    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });

    const $ = cheerio.load(response.data);
    const jobListings: LinkedInJobListing[] = [];

    // Look for job cards in the results list
    const jobCards = $('.jobs-search__results-list li, .jobs-search-results-list li, [data-entity-urn^="urn:li:jobPosting"]');
    
    if (jobCards.length === 0) {
      // Alternative: look for base-card class
      $('.base-card').each((_, element) => {
        const jobCard = $(element);
        if (jobCard.find('a[href*="/jobs/view/"]').length > 0) {
          extractJobListingFromCard(jobCard, jobListings);
        }
      });
    } else {
      jobCards.each((_, element) => {
        const jobCard = $(element);
        extractJobListingFromCard(jobCard, jobListings);
      });
    }

    console.log(`✅ Found ${jobListings.length} job listings`);
    
    // Return all jobs found (not limited to 5)
    return jobListings;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error scraping LinkedIn search:', errorMessage);
    throw new Error(`Failed to scrape LinkedIn search: ${errorMessage}`);
  }
}

// Define a type for Cheerio elements
type CheerioAPI = typeof cheerio;
type CheerioElement = cheerio.Element;
type CheerioSelection = cheerio.Cheerio<CheerioElement>;

// Extract job listing from a job card
function extractJobListingFromCard(jobCard: CheerioSelection, jobListings: LinkedInJobListing[]): void {
  try {
    // Get data attributes
    const dataEntityUrn = jobCard.attr('data-entity-urn') || '';
    const dataReferenceId = jobCard.attr('data-reference-id') || '';
    const dataTrackingId = jobCard.attr('data-tracking-id') || '';

    // Extract job URL from anchor tag
    const jobLink = jobCard.find('a[href*="/jobs/view/"], a.base-card__full-link');
    let jobUrl = jobLink.attr('href') || '';
    
    if (!jobUrl) return;

    // Normalize URL
    if (!jobUrl.startsWith('http')) {
      jobUrl = `https://www.linkedin.com${jobUrl}`;
    }

    // Extract job ID
    const jobId = extractJobIdFromUrl(jobUrl);

    // Extract job title from multiple possible locations
    let jobTitle = '';
    const titleSources = [
      jobCard.find('.sr-only').text().trim(),
      jobCard.find('h3').text().trim(),
      jobCard.find('.base-search-card__title').text().trim(),
      jobCard.find('.job-search-card__title').text().trim(),
      jobCard.find('span[aria-hidden="true"]').text().trim(),
    ];
    
    for (const title of titleSources) {
      if (title && title.length > 3) {
        jobTitle = title;
        break;
      }
    }

    // Extract company name
    let companyName = '';
    const companySources = [
      jobCard.find('.base-search-card__subtitle').text().trim(),
      jobCard.find('.job-search-card__company').text().trim(),
      jobCard.find('h4 a').text().trim(),
      jobCard.find('[data-tracking-control-name*="public_jobs_topcard-org-name"]').text().trim(),
    ];
    
    for (const company of companySources) {
      if (company && company.length > 1) {
        companyName = company;
        break;
      }
    }

    // Extract company logo
    let companyLogo = '';
    const logoImg = jobCard.find('.search-entity-media img, img.artdeco-entity-image');
    if (logoImg.length > 0) {
      companyLogo = logoImg.attr('src') || 
                    logoImg.attr('data-delayed-url') || 
                    logoImg.attr('data-ghost-url') || '';
    }

    // Extract location
    let location = '';
    const locationSources = [
      jobCard.find('.job-search-card__location').text().trim(),
      jobCard.find('.base-search-card__metadata').text().trim(),
      jobCard.find('.job-card-container__metadata-item').text().trim(),
      jobCard.find('[data-test="job-card-location"]').text().trim(),
    ];
    
    for (const loc of locationSources) {
      if (loc && loc.length > 3) {
        location = loc;
        break;
      }
    }

    // Extract posted date
    let postedDate = '';
    const dateSources = [
      jobCard.find('time').text().trim(),
      jobCard.find('.job-search-card__listdate').text().trim(),
      jobCard.find('.job-card-container__listed-date').text().trim(),
      jobCard.find('.posted-time-ago__text').text().trim(),
    ];
    
    for (const date of dateSources) {
      if (date && date.length > 3) {
        postedDate = date;
        break;
      }
    }

    // Extract applicant count
    let applicants = '';
    const applicantCount = jobCard.find('.num-applicants__caption').text().trim();
    if (applicantCount) {
      applicants = applicantCount;
    }

    // Check if remote
    const locationText = location.toLowerCase() + ' ' + (jobTitle || '').toLowerCase();
    const isRemote = locationText.includes('remote') || 
                    locationText.includes('hybrid') ||
                    locationText.includes('work from home');

    // Check if easy apply
    const isEasyApply = jobCard.find('.job-search-card__easy-apply').length > 0 ||
                       jobCard.text().toLowerCase().includes('easy apply');

    const jobListing: LinkedInJobListing = {
      job_url: jobUrl,
      job_title: jobTitle || 'Position',
      company_name: companyName || 'Company',
      company_logo: companyLogo,
      location: location || 'Location not specified',
      posted_date: postedDate || 'Recently',
      job_id: jobId,
      is_remote: isRemote,
      applicants: applicants,
      is_easy_apply: isEasyApply,
      data_entity_urn: dataEntityUrn,
      data_reference_id: dataReferenceId,
      data_tracking_id: dataTrackingId,
    };

    // Add to list if it has minimal required info
    if (jobUrl && jobId) {
      jobListings.push(jobListing);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error extracting job listing:', errorMessage);
  }
}

// Scrape detailed job information from job detail page
export async function scrapeLinkedInJobDetail(jobUrl: string): Promise<LinkedInJobDetail> {
  try {
    console.log(`🔍 Scraping job detail: ${jobUrl}`);
    
    await delay(3000 + Math.random() * 4000);
    
    const response = await axios.get(jobUrl, {
      headers: getHeaders('https://www.linkedin.com/jobs/'),
      timeout: 40000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });

    const $ = cheerio.load(response.data);
    const jobId = extractJobIdFromUrl(jobUrl);
    
    const jobDetail: LinkedInJobDetail = {
      job_title: '',
      company_name: '',
      company_logo: '',
      location: '',
      posted_date: '',
      applicants: '',
      description: '',
      job_id: jobId,
      requirements: [],
      benefits: [],
      skills: [],
    };

    // Extract from top card section
    const topCard = $('.top-card-layout, .job-view-layout, .jobs-unified-top-card');
    
    // Job title
    jobDetail.job_title = topCard.find('.top-card-layout__title, .jobs-unified-top-card__job-title, h1').first().text().trim() || '';

    // Company name
    jobDetail.company_name = topCard.find('.topcard__org-name-link, .jobs-unified-top-card__company-name').text().trim() || '';

    // Company logo
    const logoImg = topCard.find('img.artdeco-entity-image, .top-card-layout__logo img, .jobs-unified-top-card__company-logo img');
    if (logoImg.length > 0) {
      jobDetail.company_logo = logoImg.attr('src') || logoImg.attr('data-delayed-url') || '';
    }

    // Location
    jobDetail.location = topCard.find('.topcard__flavor--bullet, .jobs-unified-top-card__workplace-type').first().text().trim() || '';

    // Posted date
    jobDetail.posted_date = topCard.find('.posted-time-ago__text, time').first().text().trim() || '';

    // Applicants
    jobDetail.applicants = topCard.find('.num-applicants__caption, .jobs-unified-top-card__applicant-count').text().trim() || '';

    // Extract data attributes
    const dataEntityUrn = $('[data-entity-urn]').first().attr('data-entity-urn');
    if (dataEntityUrn) {
      jobDetail.data_entity_urn = dataEntityUrn;
    }

    // Extract description
    const descriptionSection = $('.description__text, .jobs-description__content, .show-more-less-html__markup');
    jobDetail.description = descriptionSection.text().trim() || $('body').text().substring(0, 5000);

    // Extract job criteria
    $('.description__job-criteria-item, .jobs-unified-top-card__job-insight').each((_, element) => {
      const criteria = $(element);
      const label = criteria.text().toLowerCase().trim();
      const value = criteria.find('span:last-child').text().trim();
      
      if (label.includes('seniority') || label.includes('experience')) {
        jobDetail.experience_level = value;
      } else if (label.includes('employment') || label.includes('type')) {
        jobDetail.job_type = value;
      } else if (label.includes('salary') || label.includes('pay')) {
        jobDetail.salary = value;
      } else if (label.includes('work from') || label.includes('remote')) {
        jobDetail.work_from = value;
      }
    });

    // Extract skills
    $('.jobs-description-details__list-item, .jobs-box__list-item, .jobs-ppc-criteria__list li').each((_, element) => {
      const skill = $(element).text().trim();
      if (skill && skill.length < 50) {
        jobDetail.skills!.push(skill);
      }
    });

    // Extract requirements from description
    const descLower = jobDetail.description.toLowerCase();
    const reqKeywords = ['requirement', 'qualification', 'must have', 'should have', 'need to have', 'responsibilit'];
    
    for (const keyword of reqKeywords) {
      const startIdx = descLower.indexOf(keyword);
      if (startIdx !== -1) {
        const requirementText = jobDetail.description.substring(startIdx, startIdx + 1000);
        const lines = requirementText.split('\n').filter(line => 
          line.trim().length > 10 && 
          (line.includes('•') || line.includes('-') || line.includes(':'))
        );
        jobDetail.requirements = lines.slice(0, 10).map(line => line.replace(/[•\-]\s*/, '').trim());
        break;
      }
    }

    // Extract company URL
    const companyLink = $('a[data-tracking-control-name*="public_jobs_topcard-org-name"]');
    jobDetail.company_url = companyLink.attr('href') || '';

    // Extract company about
    const companyAbout = $('.about-company, .jobs-company__box').text().trim();
    if (companyAbout) {
      jobDetail.company_about = companyAbout.substring(0, 1000);
    }

    // Extract benefits
    const benefitsKeywords = ['benefit', 'perk', 'compensation', 'bonus', 'insurance', 'vacation'];
    for (const keyword of benefitsKeywords) {
      const startIdx = descLower.indexOf(keyword);
      if (startIdx !== -1) {
        const benefitText = jobDetail.description.substring(startIdx, startIdx + 500);
        const lines = benefitText.split('\n').filter(line => 
          line.trim().length > 5 && 
          (line.includes('•') || line.includes('-') || line.includes(':'))
        );
        jobDetail.benefits = lines.slice(0, 10).map(line => line.replace(/[•\-]\s*/, '').trim());
        break;
      }
    }

    // Extract visa and relocation info
    if (descLower.includes('visa') || descLower.includes('sponsorship')) {
      jobDetail.visa_sponsorship = true;
    }
    
    if (descLower.includes('relocation') || descLower.includes('relocate')) {
      jobDetail.relocation_assistance = true;
    }

    // Extract HR info patterns
    const hrPatterns = [
      /(?:hr|human resources|recruiter|hiring manager)\s*[:]?\s*([A-Za-z\s]+)/i,
      /contact\s*[:]?\s*([A-Za-z\s]+)/i,
      /hiring\s*[:]?\s*([A-Za-z\s]+)/i,
    ];
    
    for (const pattern of hrPatterns) {
      const match = jobDetail.description.match(pattern);
      if (match && match[1]) {
        jobDetail.hr_name = match[1].trim();
        break;
      }
    }

    // Look for LinkedIn profile links
    const linkedinLinks = jobDetail.description.match(/linkedin\.com\/in\/[A-Za-z0-9-]+/g);
    if (linkedinLinks && linkedinLinks.length > 0) {
      jobDetail.hr_linkedin = `https://www.${linkedinLinks[0]}`;
    }

    // Look for reviews/ratings patterns
    const reviewPatterns = [
      /(?:rating|review|score)\s*[:]?\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*out of \s*\d+/i,
    ];
    
    for (const pattern of reviewPatterns) {
      const match = jobDetail.description.match(pattern);
      if (match && match[1]) {
        const rating = parseFloat(match[1]);
        if (rating >= 0 && rating <= 5) {
          jobDetail.company_rating = rating;
          break;
        }
      }
    }

    // Clean up arrays
    jobDetail.skills = jobDetail.skills!.filter(skill => 
      skill.length > 2 && skill.length < 100
    ).slice(0, 15);

    jobDetail.requirements = jobDetail.requirements!.filter(req => 
      req.length > 5 && req.length < 200
    ).slice(0, 10);

    jobDetail.benefits = jobDetail.benefits!.filter(benefit => 
      benefit.length > 5 && benefit.length < 200
    ).slice(0, 10);

    console.log(`✅ Extracted detail for: ${jobDetail.job_title || 'Job'}`);
    
    return jobDetail;

  } catch (error: unknown) {
    console.error(`Error scraping job detail ${jobUrl}:`, error instanceof Error ? error.message : 'Unknown error');
    
    // Return minimal data instead of mock
    const jobId = extractJobIdFromUrl(jobUrl);
    return {
      job_title: 'Job Position',
      company_name: 'Company',
      company_logo: '',
      location: 'Location not specified',
      posted_date: 'Recently',
      applicants: '',
      description: 'Failed to extract description',
      job_id: jobId,
      requirements: [],
      benefits: [],
      skills: [],
    };
  }
}

// Batch scrape multiple job details
export async function batchScrapeJobDetails(jobListings: LinkedInJobListing[], maxJobs: number = 50): Promise<LinkedInJobDetail[]> {
  const jobDetails: LinkedInJobDetail[] = [];
  const jobsToScrape = jobListings.slice(0, maxJobs);
  
  console.log(`🔄 Starting batch scrape of ${jobsToScrape.length} jobs...`);
  
  for (let i = 0; i < jobsToScrape.length; i++) {
    const listing = jobsToScrape[i];
    console.log(`(${i + 1}/${jobsToScrape.length}) Scraping: ${listing.job_title}`);
    
    try {
      // Progressive delay
      const baseDelay = 2000;
      const randomDelay = Math.random() * 3000;
      const progressiveDelay = i * 500;
      const totalDelay = baseDelay + randomDelay + progressiveDelay;
      
      await delay(totalDelay);
      
      const detail = await scrapeLinkedInJobDetail(listing.job_url);
      
      // Merge listing data with detail
      const mergedDetail: LinkedInJobDetail = {
        ...detail,
        job_id: listing.job_id || detail.job_id,
        data_entity_urn: listing.data_entity_urn,
        job_title: listing.job_title || detail.job_title,
        company_name: listing.company_name || detail.company_name,
        company_logo: listing.company_logo || detail.company_logo,
        location: listing.location || detail.location,
        posted_date: listing.posted_date || detail.posted_date,
        applicants: listing.applicants || detail.applicants,
      };
      
      jobDetails.push(mergedDetail);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to scrape ${listing.job_url}:`, errorMessage);
      // Add minimal data for failed scrapes
      jobDetails.push({
        job_title: listing.job_title || 'Job',
        company_name: listing.company_name || 'Company',
        company_logo: listing.company_logo,
        location: listing.location || 'Location not specified',
        posted_date: listing.posted_date || 'Recently',
        applicants: listing.applicants || '',
        description: 'Failed to extract full description',
        job_id: listing.job_id,
        requirements: [],
        benefits: [],
        skills: [],
      });
    }
  }
  
  console.log(`✅ Completed batch scrape. Processed ${jobDetails.length}/${jobsToScrape.length} jobs`);
  return jobDetails;
}

// Convert LinkedInJobDetail to JobScrapedData format
export function convertToJobScrapedData(detail: LinkedInJobDetail, listing: LinkedInJobListing): Partial<JobScrapedData> {
  return {
    url: listing.job_url,
    job_title: detail.job_title || listing.job_title,
    company_name: detail.company_name || listing.company_name,
    company_url: detail.company_url,
    company_logo: detail.company_logo || listing.company_logo,
    location: detail.location || listing.location,
    job_type: detail.job_type,
    posted_date: parsePostedDate(detail.posted_date || listing.posted_date),
    description: detail.description,
    requirements: detail.requirements?.join('\n'),
    skills: detail.skills,
    salary: detail.salary,
    experience: detail.experience_level,
    job_id: detail.job_id || listing.job_id,
    source: 'linkedin',
    status: 'completed',
    is_active: true,
    scraped_at: new Date(),
    work_from: detail.work_from,
    hr_name: detail.hr_name,
    hr_linkedin: detail.hr_linkedin,
    review: detail.review,
    company_rating: detail.company_rating,
    visa_sponsorship: detail.visa_sponsorship,
    relocation_assistance: detail.relocation_assistance,
    metadata: {
      data_entity_urn: listing.data_entity_urn,
      data_reference_id: listing.data_reference_id,
      data_tracking_id: listing.data_tracking_id,
      source_url: listing.job_url,
    }
  };
}

// Helper function to parse posted date
function parsePostedDate(dateString: string): Date | null {
  if (!dateString) return new Date();
  
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
  
  // Default to current date
  return new Date();
}