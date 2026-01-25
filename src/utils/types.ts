// Common types for the scraper
export interface JobScrapedData {
  url: string;
  job_title?: string;
  company_name?: string;
  company_url?: string;
  company_logo?: string;
  location?: string;
  job_type?: string;
  posted_date?: Date | null;
  description?: string;
  requirements?: string;
  skills?: string[];
  salary?: string;
  experience?: string;
  job_id?: string;
  source?: string;
  status?: string;
  is_active?: boolean;
  scraped_at?: Date;
  [key: string]: any;
}