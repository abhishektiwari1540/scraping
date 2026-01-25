import mongoose from 'mongoose';

const ScrapedDataSchema = new mongoose.Schema(
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
ScrapedDataSchema.virtual('salary_range').get(function() {
  if (this.salary_min && this.salary_max) {
    return `${this.salary_min} - ${this.salary_max} ${this.salary_currency}`;
  }
  return this.salary || 'Not specified';
});

ScrapedDataSchema.virtual('experience_range').get(function() {
  if (this.min_experience && this.max_experience) {
    return `${this.min_experience} - ${this.max_experience} years`;
  }
  return this.experience || 'Not specified';
});

ScrapedDataSchema.virtual('days_since_posted').get(function() {
  if (!this.posted_date) return null;
  const posted = new Date(this.posted_date);
  const now = new Date();
  const diffTime = Math.abs(now - posted);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// FIXED: Remove the broken pre-save middleware
// Instead, use default values in schema or handle in application logic

// Methods
ScrapedDataSchema.methods.markAsExpired = async function() {
  this.status = 'expired';
  this.is_active = false;
  this.last_updated = new Date();
  return this.save();
};

ScrapedDataSchema.methods.incrementApplicationCount = async function() {
  this.application_count += 1;
  this.last_updated = new Date();
  return this.save();
};

// Static methods
ScrapedDataSchema.statics.findActiveJobs = function() {
  return this.find({ is_active: true, status: 'completed' });
};

ScrapedDataSchema.statics.searchJobs = function(query: string, filters: any = {}) {
  const searchQuery: any = {
    ...filters,
    is_active: true,
    status: 'completed',
  };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  return this.find(searchQuery)
    .sort({ posted_date: -1 })
    .select('-raw_html -metadata -additional_info');
};

// Type definitions for static methods
interface ScrapedDataModel extends mongoose.Model<any> {
  findActiveJobs(): Promise<any[]>;
  searchJobs(query: string, filters?: any): Promise<any[]>;
}

export default mongoose.models.ScrapedData as ScrapedDataModel || 
  mongoose.model<ScrapedDataModel>('ScrapedData', ScrapedDataSchema);