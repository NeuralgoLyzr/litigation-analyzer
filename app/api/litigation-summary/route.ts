// utils/pdfProcessor.ts
import * as pdfParse from 'pdf-parse';
import { jobStorage } from '../../../utils/supabase/jobStorage';
import { callLyzrAgent } from '../../../utils/LyzrApiCall';
import { NextRequest, NextResponse } from 'next/server';


const LYZR_API_KEY = process.env.NEXT_PUBLIC_LYZR_API_KEY!;
const AGENT_ID_1 = process.env.NEXT_PUBLIC_SHORT_SUMMARY_AGENT!;
const AGENT_ID_2 = process.env.NEXT_PUBLIC_LONG_SUMMARY_AGENT!;




export async function POST(req: NextRequest) {
  try {
    // Check if request is multipart form data
    const formData = await req.formData();
    const pdfFiles = formData.getAll('pdf') as File[];
    const sessionId = formData.get('sessionId') as string;

    // Validate inputs
    if (!pdfFiles || pdfFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one PDF file is required' },
        { status: 400 }
      );
    }

    // Create a new job
    const projectName = `PDF Analysis - ${new Date().toISOString()}`;
    const jobId = await jobStorage.createJob(projectName);
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    // Start background processing (non-blocking)
    processPdfInBackground(jobId, pdfFiles, sessionId).catch(error => {
      console.error('Background processing error:', error);
      // The job status will be updated to 'failed' in the process function
    });

    // Return the job ID immediately
    return NextResponse.json({
      jobId,
      status: 'processing',
      message: 'PDF processing job started'
    });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


async function processPdfInBackground(
  jobId: string,
  pdfFiles: File[],
  sessionId: string
): Promise<void> {
  try {
    // Validate environment variables
    if (!LYZR_API_KEY || !AGENT_ID_1 || !AGENT_ID_2) {
      await jobStorage.updateJob(jobId, {
        status: 'failed',
        error: 'Lyzr API key or Agent IDs are not configured',
        error_code: 500
      });
      return;
    }

    // Process all PDFs in parallel and extract text
    const fileProcessingPromises = pdfFiles.map(async (pdfFile) => {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(buffer);
      return {
        text: pdfData.text,
        fileName: pdfFile.name,
        pageCount: pdfData.numpages
      };
    });

    const processedFiles = await Promise.all(fileProcessingPromises);

    // Validate if any text was extracted
    const emptyFiles = processedFiles.filter(file => !file.text || file.text.trim().length === 0);
    if (emptyFiles.length === processedFiles.length) {
      await jobStorage.updateJob(jobId, {
        status: 'failed',
        error: 'Could not extract text from any of the PDF files',
        error_code: 400
      });
      return;
    }

    // Combine all extracted text with file information
    let combinedText = "";
    const fileInfos = [];

    processedFiles.forEach((file, index) => {
      if (file.text && file.text.trim().length > 0) {
        // Add a separator between files with file information
        if (combinedText.length > 0) {
          combinedText += "\n\n--------- NEW DOCUMENT ---------\n\n";
        }

        // Add file header
        combinedText += `[Document ${index + 1}: ${file.fileName} - ${file.pageCount} pages]\n\n`;

        // Add the text content
        combinedText += file.text;

        // Store file info for the response
        fileInfos.push({
          fileName: file.fileName,
          pageCount: file.pageCount,
          textLength: file.text.length
        });
      }
    });

    // Call both agents in parallel with the combined text
    try {
      const [agent1Response, agent2Response] = await Promise.all([
        callLyzrAgent(
          combinedText,
          LYZR_API_KEY,
          AGENT_ID_1,
          sessionId
        ),
        callLyzrAgent(
          combinedText,
          LYZR_API_KEY,
          AGENT_ID_2,
          sessionId
        )
      ]);

      // Store the results and mark job as completed
      const results = [{
        shortResponse: agent1Response,
        longResponse: agent2Response,
        processedFiles: fileInfos,
        totalFiles: pdfFiles.length,
        totalTextLength: combinedText.length
      }];

      await jobStorage.appendResult(jobId, results);
      
    } catch (error) {
      console.error('Agent processing error:', error);
      await jobStorage.updateJob(jobId, {
        status: 'failed',
        error: `Agent processing error: ${error instanceof Error ? error.message : String(error)}`,
        error_code: 500
      });
    }
  } catch (error) {
    console.error('PDF Processing Error:', error);
    await jobStorage.updateJob(jobId, {
      status: 'failed',
      error: `PDF processing error: ${error instanceof Error ? error.message : String(error)}`,
      error_code: 500
    });
  }
}