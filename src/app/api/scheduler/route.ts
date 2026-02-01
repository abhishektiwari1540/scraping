import { NextRequest, NextResponse } from 'next/server';
import { JaipurJobScheduler } from '@/lib/scheduler';

// Global scheduler instance
let scheduler: JaipurJobScheduler | null = null;

function getScheduler(): JaipurJobScheduler {
  if (!scheduler) {
    scheduler = new JaipurJobScheduler();
  }
  return scheduler;
}

// CORS headers
function withCors(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Handle OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// GET - Get scheduler status
export async function GET(request: NextRequest) {
  try {
    const scheduler = getScheduler();
    const status = scheduler.getStatus();
    
    return withCors(
      NextResponse.json({
        success: true,
        message: 'Scheduler status retrieved',
        data: status
      })
    );
    
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    
    return withCors(
      NextResponse.json({
        success: false,
        error: 'Failed to get scheduler status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    );
  }
}

// POST - Start scheduler or run once
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, intervalHours, maxKeywords, runOnce } = body;
    
    const scheduler = getScheduler();
    
    if (runOnce) {
      // Run scheduler once
      console.log('▶️ Running scheduler once...');
      scheduler.runScheduler(maxKeywords).catch(console.error);
      
      return withCors(
        NextResponse.json({
          success: true,
          message: 'Scheduler started for single run',
          data: scheduler.getStatus()
        })
      );
    }
    
    if (action === 'start') {
      // Start scheduler
      scheduler.start(intervalHours || 6);
      
      return withCors(
        NextResponse.json({
          success: true,
          message: `Scheduler started (runs every ${intervalHours || 6} hours)`,
          data: scheduler.getStatus()
        })
      );
    }
    
    if (action === 'stop') {
      // Stop scheduler
      scheduler.stop();
      
      return withCors(
        NextResponse.json({
          success: true,
          message: 'Scheduler stopped',
          data: scheduler.getStatus()
        })
      );
    }
    
    return withCors(
      NextResponse.json({
        success: false,
        error: 'Invalid action. Use "start", "stop", or "runOnce"'
      }, { status: 400 })
    );
    
  } catch (error) {
    console.error('Error controlling scheduler:', error);
    
    return withCors(
      NextResponse.json({
        success: false,
        error: 'Failed to control scheduler',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    );
  }
}

// PUT - Update scheduler interval
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { intervalHours } = body;
    
    if (!intervalHours || intervalHours < 1) {
      return withCors(
        NextResponse.json({
          success: false,
          error: 'Invalid interval. Must be at least 1 hour'
        }, { status: 400 })
      );
    }
    
    const scheduler = getScheduler();
    const status = scheduler.getStatus();
    
    if (status.isRunning) {
      // Stop and restart with new interval
      scheduler.stop();
      scheduler.start(intervalHours);
      
      return withCors(
        NextResponse.json({
          success: true,
          message: `Scheduler interval updated to ${intervalHours} hours`,
          data: scheduler.getStatus()
        })
      );
    } else {
      return withCors(
        NextResponse.json({
          success: true,
          message: `Scheduler interval set to ${intervalHours} hours (will use on next start)`,
          data: scheduler.getStatus()
        })
      );
    }
    
  } catch (error) {
    console.error('Error updating scheduler:', error);
    
    return withCors(
      NextResponse.json({
        success: false,
        error: 'Failed to update scheduler',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    );
  }
}