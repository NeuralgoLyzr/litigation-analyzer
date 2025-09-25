import { NextRequest, NextResponse } from 'next/server';
import * as pdfParse from 'pdf-parse';
import { callLyzrAgent } from '../../../utils/LyzrApiCall';
import { parseText, trainRag } from '../../../utils/ragApiCall';
import connectToDatabase from '../../../lib/mongodb';
import LitigationDoc from '../../../models/LitigationDoc';
import User from '../../../models/User';
import { storeRagInfoInCookies } from '../../actions/cookie-actions';
import { createProcessStatus, updateProcessStatus, markProcessComplete, markProcessFailed } from '../../../utils/processStatus';
import { jobStorage } from '../../../utils/jobStorage';

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const pdfFiles = formData.getAll('pdf') as File[];
    const sessionId = formData.get('sessionId') as string;
    const userId = formData.get('userId') as string;

    // Validate inputs
    if (!pdfFiles || pdfFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one PDF file is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Check if user exists in database - if not, create a new user
    let user = await User.findOne({ user_id: userId });
    
    if (!user) {
      console.log(`User ${userId} not found, creating new user`);
      // Create a new user with the provided userId
      user = new User({
        user_id: userId,
        api_key: `api_key_${Date.now()}`, // Generate a simple API key
        is_onboarded: true,
        is_new_user: true
      });
      
      await user.save();
      console.log(`Created new user with ID: ${userId}`);
    }

    // Create a process status record to track progress
    const processStatus = await createProcessStatus(userId);
    
    // Create a job in MongoDB for long polling
    const jobId = await jobStorage.createJob(`litigation_doc_${userId}_${Date.now()}`);
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Failed to create job for tracking' },
        { status: 500 }
      );
    }

    // Start background processing and return job ID
    processPdfWithRagFirst(pdfFiles, sessionId, userId, processStatus._id.toString(), jobId)
      .catch(error => {
        console.error('Background processing error:', error);
        markProcessFailed(processStatus._id.toString(), error.message || 'Unknown error').catch(console.error);
        jobStorage.updateJob(jobId, { 
          status: 'failed', 
          error: error.message || 'Unknown error'
        }).catch(console.error);
      });
    
    // Return immediate response with statusId and jobId for tracking
    return NextResponse.json({
      status: 'processing',
      message: 'PDF processing and RAG creation started',
      userId,
      statusId: processStatus._id.toString(),
      jobId
    });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function processPdfWithRagFirst(
  pdfFiles: File[],
  sessionId: string,
  userId: string,
  statusId: string,
  jobId: string
): Promise<void> {
  try {
    // Connect to the database and get the user's API key
    await connectToDatabase();
    const user = await User.findOne({ user_id: userId });
    
    if (!user) {
      throw new Error(`User ${userId} not found in database`);
    }
    
    // Use the user's API key from the database or fall back to environment variable
    const userApiKey = user.api_key || process.env.NEXT_PUBLIC_LYZR_API_KEY;
    
    if (!userApiKey) {
      throw new Error('No API key available for this user');
    }
    
    // Environment variables for agent IDs
    const AGENT_ID_1 = process.env.NEXT_PUBLIC_SHORT_SUMMARY_AGENT;
    const AGENT_ID_2 = process.env.NEXT_PUBLIC_LONG_SUMMARY_AGENT;

    if (!AGENT_ID_1 || !AGENT_ID_2) {
      throw new Error('Agent IDs are not configured');
    }

    console.log("Step 1: Processing PDF files in parallel");
    await jobStorage.updateJob(jobId, { status: "processing" });
    await updateProcessStatus(statusId, {
      currentStep: 1,
      stepDescription: 'Processing PDF files in parallel'
    });

    // Process all PDFs in parallel with better structure
    const processedFiles = await Promise.all(pdfFiles.map(async (pdfFile) => {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(buffer);
      
      // Structure the document with clear metadata
      return {
        text: pdfData.text,
        fileName: pdfFile.name,
        pageCount: pdfData.numpages,
        metadata: {
          source: pdfFile.name,
          pageCount: pdfData.numpages,
          timestamp: new Date().toISOString()
        }
      };
    }));

    // Find existing document for the first file to get RAG ID
    const fileName = pdfFiles[0].name;
    const existingDoc = await LitigationDoc.findOne({ 
      userId: userId,
      originalFileName: fileName
    }).sort({ created_at: -1 });

    if (!existingDoc) {
      throw new Error('No existing document found for this file');
    }

    // Prepare training data for each file separately
    const trainingData = await Promise.all(processedFiles.map(async (file) => {
      const parsedText = await parseText(file.text, userApiKey).catch(() => file.text);
      return {
        text: parsedText,
        source: file.fileName,
        metadata: file.metadata
      };
    }));

    // Train RAG with all processed files in parallel
    console.log("Step 2: Training RAG with all files");
    await updateProcessStatus(statusId, {
      currentStep: 2,
      stepDescription: 'Training RAG with all files',
      ragId: existingDoc.ragId
    });

    await trainRag(existingDoc.ragId, trainingData, userApiKey);

    // Combine all texts for agent analysis with proper structure
    const combinedText = processedFiles.map(file => 
      `[Document: ${file.fileName}]\nPages: ${file.pageCount}\n\n${file.text}`
    ).join('\n\n=== NEW DOCUMENT ===\n\n');

    // Get litigation analysis in parallel
    console.log("Step 3: Getting litigation analysis");
    await updateProcessStatus(statusId, {
      currentStep: 3,
      stepDescription: 'Getting litigation analysis'
    });

    const [agent1Response, agent2Response] = await Promise.all([
      callLyzrAgent(combinedText, userApiKey, AGENT_ID_1, sessionId),
      callLyzrAgent(combinedText, userApiKey, AGENT_ID_2, sessionId)
    ]);

    // Train RAG with summaries
    console.log("Step 4: Training RAG with summaries");
    await updateProcessStatus(statusId, {
      currentStep: 4,
      stepDescription: 'Training RAG with summaries'
    });

    const summaryTrainingData = [
      {
        text: JSON.stringify(agent1Response),
        source: "Short_Litigation_Summary",
        metadata: { type: "summary", agent: "short" }
      },
      {
        text: JSON.stringify(agent2Response),
        source: "Long_Litigation_Summary",
        metadata: { type: "summary", agent: "long" }
      }
    ];

    await trainRag(existingDoc.ragId, summaryTrainingData, userApiKey);

    // Update document
    existingDoc.litigationResponse = {
      shortResponse: agent1Response,
      longResponse: agent2Response
    };
    existingDoc.ragResponse.trained = true;
    existingDoc.processedFiles = processedFiles.map(file => ({
      fileName: file.fileName,
      pageCount: file.pageCount
    }));
    
    const updatedDoc = await existingDoc.save();

    // Store info in cookies
    await storeRagInfoInCookies(
      existingDoc.ragId,
      userId,
      updatedDoc._id.toString()
    );

    await markProcessComplete(statusId, updatedDoc._id.toString(), existingDoc.ragId);

    await jobStorage.appendResultWithStatus(
      jobId,
      [{
        documentId: updatedDoc._id.toString(),
        ragId: existingDoc.ragId,
        shortResponse: agent1Response,
        longResponse: agent2Response,
        processedFiles: processedFiles.map(file => ({
          fileName: file.fileName,
          pageCount: file.pageCount
        }))
      }],
      'completed'
    );

    console.log("Process completed successfully!");

  } catch (error) {
    console.error('PDF Processing or RAG Creation Error:', error);
    await markProcessFailed(statusId, error instanceof Error ? error.message : 'Unknown error');
    await jobStorage.updateJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 