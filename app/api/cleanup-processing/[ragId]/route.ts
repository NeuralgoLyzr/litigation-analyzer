import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';

const LitigationDocument = mongoose.models.LitigationDocument || mongoose.model('LitigationDocument', new mongoose.Schema({
  ragId: String,
}, { collection: 'litigation_documents' }));

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ragId: string }> }
) {
  try {
    const { ragId } = await params;
    await connectToDatabase();

    await LitigationDocument.deleteOne({ ragId });

    // You might want to add more cleanup here depending on your needs
    // For example, cleaning up any temporary files, etc.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup processing' },
      { status: 500 }
    );
  }
} 