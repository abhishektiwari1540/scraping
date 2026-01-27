import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScrapedData from '@/models/ScrapedData';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Received from Pipedream:', body.event);
    
    await dbConnect();
    
    // Store webhook event
    const webhookLog = new ScrapedData({
      url: 'https://eo3fx7vdzhapezn.m.pipedream.net',
      job_title: `Webhook: ${body.event}`,
      company_name: 'Pipedream',
      location: 'Webhook',
      description: JSON.stringify(body, null, 2),
      source: 'pipedream_webhook',
      status: 'completed',
      category: 'webhook',
      tags: ['pipedream', 'webhook', body.event],
      metadata: {
        event: body.event,
        timestamp: body.timestamp || new Date().toISOString(),
        source: body.source || 'unknown'
      },
      scraped_at: new Date()
    });
    
    await webhookLog.save();
    
    // Process based on event type
    switch (body.event) {
      case 'complete':
        // Update statistics or trigger other actions
        console.log('Scraping completed, total jobs:', body.summary?.totalJobsSaved);
        break;
        
      case 'progress':
        // Update progress in your database
        console.log(`Progress: ${body.progress}%`);
        break;
        
      case 'error':
        // Send alert or log error
        console.error('Scraping error:', body.error);
        break;
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${body.event} event`,
      receivedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Pipedream Webhook API',
    webhookUrl: 'https://eo3fx7vdzhapezn.m.pipedream.net',
    endpoints: {
      POST: 'Receive webhook events',
      GET: 'Get webhook info'
    }
  });
}