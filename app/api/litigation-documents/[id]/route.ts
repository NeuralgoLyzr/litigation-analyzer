import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import LitigationDoc from '../../../../models/LitigationDoc';
import { storeRagInfoInCookies } from '../../../actions/cookie-actions';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid document ID is required' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Fetch the specific litigation document
    const document = await LitigationDoc.findById(id).lean();

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Store the necessary info in cookies for client use
    await storeRagInfoInCookies(
      document.ragId,
      document.userId,
      id
    );

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching litigation document:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid document ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const document = await LitigationDoc.findByIdAndDelete(id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting litigation document:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 