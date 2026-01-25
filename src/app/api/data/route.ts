import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScrapedData from '@/models/ScrapedData';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Build query filters
    const query: any = {};
    
    // Text search
    const search = searchParams.get('search');
    if (search) {
      query.$text = { $search: search };
    }
    
    // Category filter
    const category = searchParams.get('category');
    if (category) {
      query.category = category;
    }
    
    // Location filter
    const location = searchParams.get('location');
    if (location) {
      query.location = new RegExp(location, 'i');
    }
    
    // Job type filter
    const jobType = searchParams.get('job_type');
    if (jobType) {
      query.job_type = jobType;
    }
    
    // Company filter
    const company = searchParams.get('company');
    if (company) {
      query.company_name = new RegExp(company, 'i');
    }
    
    // Status filter
    const status = searchParams.get('status');
    if (status) {
      query.status = status;
    } else {
      // Default to completed jobs
      query.status = 'completed';
    }
    
    // Active jobs filter
    const active = searchParams.get('active');
    if (active !== null) {
      query.is_active = active === 'true';
    }
    
    // Remote jobs filter
    const remote = searchParams.get('remote');
    if (remote !== null) {
      query.is_remote = remote === 'true';
    }
    
    // Experience range
    const minExp = searchParams.get('min_experience');
    const maxExp = searchParams.get('max_experience');
    if (minExp || maxExp) {
      query.$and = [];
      if (minExp) {
        query.$and.push({ 
          $or: [
            { min_experience: { $gte: parseInt(minExp) } },
            { experience: { $regex: new RegExp(`\\b${minExp}[\\+\\-]?\\s*(years?|yrs?)\\b`, 'i') } }
          ]
        });
      }
      if (maxExp) {
        query.$and.push({ 
          $or: [
            { max_experience: { $lte: parseInt(maxExp) } },
            { max_experience: { $exists: false } }
          ]
        });
      }
    }
    
    // Salary range
    const minSalary = searchParams.get('min_salary');
    const maxSalary = searchParams.get('max_salary');
    if (minSalary || maxSalary) {
      query.$or = [
        { salary_min: { $gte: minSalary ? parseInt(minSalary) : 0 } },
        { salary: { $regex: new RegExp(`${minSalary || '0'}[kK]?\\s*[-–]\\s*${maxSalary || '∞'}[kK]?`, 'i') } }
      ];
    }
    
    // Date range
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    if (fromDate || toDate) {
      query.posted_date = {};
      if (fromDate) query.posted_date.$gte = new Date(fromDate);
      if (toDate) query.posted_date.$lte = new Date(toDate);
    }
    
    // Skills filter
    const skills = searchParams.get('skills');
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim().toLowerCase());
      query.skills = { $in: skillsArray };
    }
    
    // Sort options
    const sortBy = searchParams.get('sort_by') || 'posted_date';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get total count for pagination
    const total = await ScrapedData.countDocuments(query);
    
    // Fetch data with pagination
    const jobs = await ScrapedData.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-raw_html -metadata -additional_info')
      .lean();
    
    // Get aggregation data for filters
    const companies = await ScrapedData.distinct('company_name', query);
    const locations = await ScrapedData.distinct('location', query);
    const categories = await ScrapedData.distinct('category', query);
    const jobTypes = await ScrapedData.distinct('job_type', query);
    
    // Calculate statistics
    const stats = {
      totalJobs: total,
      activeJobs: await ScrapedData.countDocuments({ ...query, is_active: true }),
      remoteJobs: await ScrapedData.countDocuments({ ...query, is_remote: true }),
      companiesCount: companies.length,
      avgSalary: null as number | null,
    };
    
    // Try to calculate average salary if data exists
    try {
      const salaryStats = await ScrapedData.aggregate([
        { $match: { salary_min: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgSalary: { $avg: '$salary_min' } } }
      ]);
      if (salaryStats.length > 0) {
        stats.avgSalary = Math.round(salaryStats[0].avgSalary);
      }
    } catch (e) {
      // Ignore salary calculation errors
    }
    
    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      filters: {
        companies: companies.filter(Boolean).slice(0, 20),
        locations: locations.filter(Boolean).slice(0, 20),
        categories: categories.filter(Boolean),
        jobTypes: jobTypes.filter(Boolean),
      },
      stats,
      query: {
        applied: Object.keys(query).length > 0 ? query : 'none',
        sort,
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { action, id, field, value } = body;
    
    if (action === 'update' && id && field) {
      const update: any = {};
      update[field] = value;
      update.last_updated = new Date();
      
      const updatedJob = await ScrapedData.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
      ).select('-raw_html -metadata -additional_info');
      
      if (!updatedJob) {
        return NextResponse.json({
          success: false,
          error: 'Job not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Job updated successfully',
        data: updatedJob
      });
    }
    
    if (action === 'bulk_update' && Array.isArray(body.ids)) {
      const { ids, updates } = body;
      
      const result = await ScrapedData.updateMany(
        { _id: { $in: ids } },
        { $set: { ...updates, last_updated: new Date() } }
      );
      
      return NextResponse.json({
        success: true,
        message: `Updated ${result.modifiedCount} jobs`,
        modifiedCount: result.modifiedCount
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action or parameters'
    }, { status: 400 });
    
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}