import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/mongodb';
import LitigationDoc from '../../../../../models/LitigationDoc';
import { parseText, trainRag } from '../../../../../utils/ragApiCall';
import { jobStorage } from '../../../../../utils/jobStorage';
import mongoose from 'mongoose';

export async function POST(
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
    const document = await LitigationDoc.findById(id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Extract the necessary data for training
    const { ragId, userId } = document;
    const shortResponse = document.litigationResponse.shortResponse;
    const longResponse = document.litigationResponse.longResponse;

    // Create a job to track training progress
    const jobId = await jobStorage.createJob(`train_rag_${ragId}_${Date.now()}`);
    
    if (!jobId) {
      return NextResponse.json({ error: 'Failed to create tracking job' }, { status: 500 });
    }

    // Get original text from request body if provided
    const requestBody = await req.json().catch(() => ({}));
    const originalText = requestBody.originalText || '';

    if (!originalText && !shortResponse && !longResponse) {
      await jobStorage.updateJob(jobId, { status: 'failed', error: 'No content available for training' });
      return NextResponse.json(
        { error: 'No content available for training' }, 
        { status: 400 }
      );
    }

    // Start the training process in the background
    trainRagWithJob(ragId, userId, originalText, shortResponse, longResponse, jobId, document._id.toString())
      .catch(error => {
        console.error('Background training error:', error);
        jobStorage.updateJob(jobId, { 
          status: 'failed', 
          error: error.message || 'Unknown error'
        }).catch(console.error);
      });

    // Return immediate response with jobId for tracking
    return NextResponse.json({ 
      status: 'processing',
      message: 'RAG training started',
      document: {
        id: document._id,
        ragId
      },
      jobId
    });
  } catch (error) {
    console.error('Error starting RAG training:', error);
    return NextResponse.json(
      { error: 'Failed to start RAG training', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function trainRagWithJob(
  ragId: string,
  userId: string,
  originalText: string,
  shortResponse: Record<string, unknown>,
  longResponse: Record<string, unknown>,
  jobId: string,
  documentId: string
): Promise<void> {
  try {
    await jobStorage.updateJob(jobId, { status: 'processing' });

    // Step 1: Parse the original text if provided
    console.log("Step 1: Parsing text for RAG training");
    let parsedText = '';
    if (originalText) {
      try {
        parsedText = await parseText(originalText);
      } catch (error) {
        console.warn("Error parsing text, using original:", error);
        parsedText = originalText;
      }
    }

    // Step 2: Create training data
    console.log("Step 2: Preparing training data");
    const trainingData = [];
    
    if (parsedText) {
      trainingData.push({
        text: parsedText,
        source: `Litigation_Document_${new Date().toISOString()}`
      });
    }
    
    if (shortResponse) {
      trainingData.push({
        text: JSON.stringify(shortResponse),
        source: "Short_Litigation_Summary"
      });
    }
    
    if (longResponse) {
      trainingData.push({
        text: JSON.stringify(longResponse),
        source: "Long_Litigation_Summary"
      });
    }

    // Step 3: Train the RAG with the available data
    console.log("Step 3: Training RAG with data");
    await trainRag(ragId, trainingData);
    
    // Step 4: Update the document to indicate training is complete
    console.log("Step 4: Updating document status");
    await connectToDatabase();
    const document = await LitigationDoc.findById(documentId);
    
    if (document) {
      document.ragResponse.trained = true;
      await document.save();
    }
    
    // Update job with success result
    await jobStorage.appendResultWithStatus(
      jobId,
      [{
        documentId,
        ragId,
        trained: true,
        timestamp: new Date().toISOString()
      }],
      'completed'
    );

    console.log("RAG training completed successfully!");
  } catch (error) {
    console.error('Error during RAG training:', error);
    
    // Update the job with error
    await jobStorage.updateJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
} 