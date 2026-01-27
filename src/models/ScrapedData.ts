import mongoose, { Types } from 'mongoose';

// Define the interface for document
export interface IScrapedData extends mongoose.Document {
  url: string;
  job_title?: string;
  company_name?: string;
  company_url?: string;
  location?: string;
  job_type?: string;
  work_from?: string;
  posted_date?: Date;
  notice_period?: string;
  salary?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  min_experience?: number;
  max_experience?: number;
  experience?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  skills?: string[];
  skill_text?: string;
  benefits?: string[];
  benefits_text?: string;
  applied_number?: number;
  application_count?: number;
  application_deadline?: Date;
  hr_name?: string;
  hr_linkedin?: string;
  hr_email?: string;
  hr_phone?: string;
  contact_number?: string;
  tl_name?: string;
  tl_position?: string;
  review?: string;
  company_rating?: number;
  review_count?: number;
  past_applicants_opinion?: string;
  success_rate?: number;
  interview_experience?: string;
  source?: string;
  source_website?: string;
  job_id?: string;
  reference_id?: string;
  status?: 'pending' | 'completed' | 'failed' | 'expired' | 'closed' | 'active';
  is_active?: boolean;
  is_verified?: boolean;
  is_remote?: boolean;
  scraped_at?: Date;
  last_updated?: Date;
  scrape_duration?: number;
  category?: string;
  industry?: string;
  department?: string;
  education_required?: string;
  visa_sponsorship?: boolean;
  relocation_assistance?: boolean;
  views_count?: number;
  saves_count?: number;
  shares_count?: number;
  raw_html?: string;
  metadata?: Record<string, unknown>;
  additional_info?: Record<string, unknown>;
  company_logo?: string;
  images?: string[];
  
  // Virtual fields
  salary_range?: string;
  experience_range?: string;
  days_since_posted?: number | null;
  
  // Methods
  markAsExpired(): Promise<IScrapedData>;
  incrementApplicationCount(): Promise<IScrapedData>;
}

// Define the interface for static methods
interface IScrapedDataModel extends mongoose.Model<IScrapedData> {
  findActiveJobs(): Promise<IScrapedData[]>;
  searchJobs(query: string, filters?: JobSearchFilters): Promise<IScrapedData[]>;
}

// Define filter interface for search
interface JobSearchFilters {
  location?: string;
  job_type?: string;
  category?: string;
  industry?: string;
  min_salary?: number;
  max_salary?: number;
  min_experience?: number;
  max_experience?: number;
  is_remote?: boolean;
  visa_sponsorship?: boolean;
  company_name?: string;
  posted_after?: Date;
}

const ScrapedDataSchema = new mongoose.Schema<IScrapedData, IScrapedDataModel>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    job_title: {
      type: String,
      trim: true,
      index: true,
    },
    company_name: {
      type: String,
      trim: true,
    },
    company_url: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    job_type: {
      type: String,
      trim: true,
    },
    work_from: {
      type: String,
      trim: true,
    },
    posted_date: {
      type: Date,
      index: true,
    },
    notice_period: {
      type: String,
      trim: true,
    },
    salary: {
      type: String,
      trim: true,
    },
    salary_min: {
      type: Number,
    },
    salary_max: {
      type: Number,
    },
    salary_currency: {
      type: String,
      trim: true,
      default: 'USD',
    },
    min_experience: {
      type: Number,
    },
    max_experience: {
      type: Number,
    },
    experience: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    responsibilities: {
      type: String,
      trim: true,
    },
    requirements: {
      type: String,
      trim: true,
    },
    skills: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    skill_text: {
      type: String,
      trim: true,
    },
    benefits: [{
      type: String,
      trim: true,
    }],
    benefits_text: {
      type: String,
      trim: true,
    },
    applied_number: {
      type: Number,
      default: 0,
    },
    application_count: {
      type: Number,
      default: 0,
    },
    application_deadline: {
      type: Date,
    },
    hr_name: {
      type: String,
      trim: true,
    },
    hr_linkedin: {
      type: String,
      trim: true,
    },
    hr_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    hr_phone: {
      type: String,
      trim: true,
    },
    contact_number: {
      type: String,
      trim: true,
    },
    tl_name: {
      type: String,
      trim: true,
    },
    tl_position: {
      type: String,
      trim: true,
    },
    review: {
      type: String,
      trim: true,
    },
    company_rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    review_count: {
      type: Number,
      default: 0,
    },
    past_applicants_opinion: {
      type: String,
      trim: true,
    },
    success_rate: {
      type: Number,
      min: 0,
      max: 100,
    },
    interview_experience: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      index: true,
    },
    source_website: {
      type: String,
      trim: true,
    },
    job_id: {
      type: String,
      trim: true,
      index: true,
    },
    reference_id: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'expired', 'closed', 'active'],
      default: 'pending',
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    is_remote: {
      type: Boolean,
      default: false,
    },
    scraped_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
    scrape_duration: {
      type: Number,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    industry: {
      type: String,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    education_required: {
      type: String,
      trim: true,
    },
    visa_sponsorship: {
      type: Boolean,
      default: false,
    },
    relocation_assistance: {
      type: Boolean,
      default: false,
    },
    views_count: {
      type: Number,
      default: 0,
    },
    saves_count: {
      type: Number,
      default: 0,
    },
    shares_count: {
      type: Number,
      default: 0,
    },
    raw_html: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    additional_info: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    company_logo: {
      type: String,
      trim: true,
    },
    images: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Single field indexes
ScrapedDataSchema.index({ company_name: 1 });
ScrapedDataSchema.index({ location: 1 });
ScrapedDataSchema.index({ job_type: 1 });
ScrapedDataSchema.index({ status: 1 });
ScrapedDataSchema.index({ is_active: 1 });
ScrapedDataSchema.index({ scraped_at: -1 });
ScrapedDataSchema.index({ posted_date: -1 });

// Compound indexes
ScrapedDataSchema.index({ location: 1, job_type: 1 });
ScrapedDataSchema.index({ company_name: 1, is_active: 1 });
ScrapedDataSchema.index({ status: 1, scraped_at: -1 });
ScrapedDataSchema.index({ is_active: 1, posted_date: -1 });
ScrapedDataSchema.index({ category: 1, location: 1 });
ScrapedDataSchema.index({ min_experience: 1, max_experience: 1 });

// Text index for search
ScrapedDataSchema.index({
  job_title: 'text',
  company_name: 'text',
  description: 'text',
  skills: 'text',
  location: 'text',
}, {
  name: 'job_search_index',
  weights: {
    job_title: 10,
    company_name: 5,
    description: 3,
    skills: 8,
    location: 4,
  }
});

// Virtual fields
ScrapedDataSchema.virtual('salary_range').get(function(this: IScrapedData) {
  if (this.salary_min && this.salary_max) {
    return `${this.salary_min} - ${this.salary_max} ${this.salary_currency || 'USD'}`;
  }
  return this.salary || 'Not specified';
});

ScrapedDataSchema.virtual('experience_range').get(function(this: IScrapedData) {
  if (this.min_experience && this.max_experience) {
    return `${this.min_experience} - ${this.max_experience} years`;
  }
  return this.experience || 'Not specified';
});

ScrapedDataSchema.virtual('days_since_posted').get(function(this: IScrapedData) {
  if (!this.posted_date) return null;
  const posted = new Date(this.posted_date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - posted.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
ScrapedDataSchema.methods.markAsExpired = async function(this: IScrapedData): Promise<IScrapedData> {
  this.status = 'expired';
  this.is_active = false;
  this.last_updated = new Date();
  return this.save();
};

ScrapedDataSchema.methods.incrementApplicationCount = async function(this: IScrapedData): Promise<IScrapedData> {
  this.application_count = (this.application_count || 0) + 1;
  this.last_updated = new Date();
  return this.save();
};

// Static methods
ScrapedDataSchema.statics.findActiveJobs = function(): Promise<IScrapedData[]> {
  return this.find({ is_active: true, status: 'completed' });
};

ScrapedDataSchema.statics.searchJobs = function(query: string, filters: JobSearchFilters = {}): Promise<IScrapedData[]> {
  // Create search query object
  const searchQuery: Record<string, unknown> = {
    is_active: true,
    status: 'completed',
  };

  // Apply filters
  if (filters.location) {
    searchQuery.location = { $regex: filters.location, $options: 'i' };
  }
  if (filters.job_type) {
    searchQuery.job_type = filters.job_type;
  }
  if (filters.category) {
    searchQuery.category = filters.category;
  }
  if (filters.industry) {
    searchQuery.industry = filters.industry;
  }
  if (filters.is_remote !== undefined) {
    searchQuery.is_remote = filters.is_remote;
  }
  if (filters.visa_sponsorship !== undefined) {
    searchQuery.visa_sponsorship = filters.visa_sponsorship;
  }
  if (filters.company_name) {
    searchQuery.company_name = { $regex: filters.company_name, $options: 'i' };
  }
  if (filters.posted_after) {
    searchQuery.posted_date = { $gte: filters.posted_after };
  }
  
  // Salary range filter
  if (filters.min_salary || filters.max_salary) {
    const salaryFilter: Record<string, unknown> = {};
    if (filters.min_salary) {
      salaryFilter.salary_min = { $gte: filters.min_salary };
    }
    if (filters.max_salary) {
      salaryFilter.salary_max = { $lte: filters.max_salary };
    }
    searchQuery.$or = [
      salaryFilter,
      { salary_min: null, salary_max: null }
    ];
  }
  
  // Experience range filter
  if (filters.min_experience || filters.max_experience) {
    const experienceFilter: Record<string, unknown> = {};
    if (filters.min_experience) {
      experienceFilter.max_experience = { $gte: filters.min_experience };
    }
    if (filters.max_experience) {
      experienceFilter.min_experience = { $lte: filters.max_experience };
    }
    searchQuery.$or = [
      experienceFilter,
      { min_experience: null, max_experience: null }
    ];
  }
  
  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  // In Mongoose 9+, just pass the query object directly
  return this.find(searchQuery)
    .sort({ posted_date: -1 })
    .select('-raw_html -metadata -additional_info');
};

// Create and export the model
const ScrapedData = mongoose.models.ScrapedData as IScrapedDataModel || 
  mongoose.model<IScrapedData, IScrapedDataModel>('ScrapedData', ScrapedDataSchema);

export default ScrapedData;