import { NextResponse } from 'next/server';
import { checkDatabaseHealth, getStatistics, cleanupOldData } from '@/utils/dbUtils';

export async function GET() {
  try {
    const [health, stats] = await Promise.all([
      checkDatabaseHealth(),
      getStatistics()
    ]);
    
    // Cleanup old data in background (optional)
    cleanupOldData(30).catch(console.error);
    
    return NextResponse.json({
      success: true,
      health,
      stats,
      server: {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';