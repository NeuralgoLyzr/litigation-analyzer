// app/api/jobs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jobStorage } from '../../../../utils/supabase/jobStorage';


export async function GET(
  req: NextRequest,
  { params }: {  params:Promise<{ id: string }>  }
) {
    const jobId = (await params).id;
   

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  }

  try {
    const job = await jobStorage.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      project_name: job.project_name,
      created_at: job.created_at,
      updated_at: job.updated_at,
      ...(job.status === 'completed' && { results: job.results }),
      ...(job.status === 'failed' && { 
        error: job.error,
        error_code: job.error_code 
      })
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}