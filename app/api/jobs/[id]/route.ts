import { NextRequest, NextResponse } from 'next/server';
import { jobStorage } from '../../../../utils/jobStorage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;

    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Fetch job from MongoDB storage
    const job = await jobStorage.getJob(id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Return job data
    return NextResponse.json({
      id: job.id,
      status: job.status,
      results: job.results || [],
      error: job.error || undefined,
      created_at: job.created_at,
      updated_at: job.updated_at
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 