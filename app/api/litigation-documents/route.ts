import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import LitigationDoc from '../../../models/LitigationDoc';

export async function GET(req: NextRequest) {
  try {
    // Get userId from URL param or query
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Fetch all litigation documents for the user
    const documents = await LitigationDoc.find({ userId })
      .sort({ created_at: -1 }) // Sort by newest first
      .select('-litigationResponse.longResponse -litigationResponse.shortResponse') // Don't return the full responses in the list
      .lean();

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching litigation documents:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 