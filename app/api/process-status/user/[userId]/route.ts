import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/mongodb';
import { getLatestProcessStatus } from '../../../../../utils/processStatus';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Get the latest status for this user
    const status = await getLatestProcessStatus(userId);

    if (!status) {
      return NextResponse.json({ error: 'No status found for this user' }, { status: 404 });
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error fetching user process status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 