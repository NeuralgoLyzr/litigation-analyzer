import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import ProcessStatus from '../../../../utils/processStatus';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the ID from params
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Check if it's a valid MongoDB ObjectId
    let status;
    if (mongoose.Types.ObjectId.isValid(id)) {
      // Fetch by MongoDB ID
      status = await ProcessStatus.findById(id).lean();
    } else {
      // It might be a custom ID format, try to fetch by other means
      // For example, if you have another field to query by like externalId
      status = await ProcessStatus.findOne({ externalId: id }).lean();
    }

    if (!status) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error fetching process status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 