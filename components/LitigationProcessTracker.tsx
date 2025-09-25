import React, { useState, useEffect } from 'react';
import ProcessStatusTracker from './ui/process-status-tracker';
import { useJobStatusPoller } from '../utils/jobStatusPoller';
import { checkProcessStatus } from '../utils/clientCookies';

interface LitigationProcessTrackerProps {
  statusId?: string;
  jobId?: string;
  onComplete?: (documentId: string, ragId: string) => void;
  onError?: (error: string) => void;
}

interface AnalysisResult {
  shortResponse: Record<string, unknown>;
  longResponse: Record<string, unknown>;
  processedFiles: Array<{
    fileName: string;
    pageCount: number;
    textLength: number;
  }>;
}

const LitigationProcessTracker: React.FC<LitigationProcessTrackerProps> = ({
  statusId,
  jobId,
  onComplete,
  onError
}) => {
  const [error, setError] = useState<string | null>(null);
  const hasStatusId = Boolean(statusId);
  const hasJobId = Boolean(jobId);

  // Always initialize hooks, but use null values for conditional cases
  const jobPollingOptions = hasJobId ? {
    jobId: jobId || '',
    onComplete: (results: AnalysisResult[]) => {
      if (results && results.length > 0 && onComplete) {
        // In this case we don't have document/RAG IDs directly
        // You may need to fetch them or handle differently
        onComplete('job-based-doc-id', 'job-based-rag-id');
      }
    },
    onError: (errorMsg: string) => {
      setError(errorMsg);
      if (onError) onError(errorMsg);
    }
  } : null;
  
  // Initialize hook unconditionally with null options
  const jobStatus = useJobStatusPoller(
    jobPollingOptions || { jobId: '', onComplete: undefined, onError: undefined }
  );

  // Function to check status when using MongoDB tracking
  useEffect(() => {
    if (!hasStatusId || !statusId) return;
    
    const checkInitialStatus = async () => {
      try {
        const { status: processStatus } = await checkProcessStatus(statusId);
        
        // If process is already completed or failed, update accordingly
        if (processStatus.status === 'completed' && processStatus.documentId && processStatus.ragId) {
          if (onComplete) {
            onComplete(processStatus.documentId, processStatus.ragId);
          }
        } else if (processStatus.status === 'failed') {
          if (processStatus.error && onError) {
            onError(processStatus.error);
          }
          setError(processStatus.error || 'Process failed');
        }
      } catch (err) {
        console.error('Error checking initial process status:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        if (onError) onError(errorMessage);
      }
    };

    checkInitialStatus();
  }, [statusId, hasStatusId, onComplete, onError]);

  // Update error state based on job status when using job storage
  useEffect(() => {
    if (hasJobId && jobStatus && jobStatus.error) {
      setError(jobStatus.error);
    }
  }, [hasJobId, jobStatus]);

  return (
    <div>
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}
      
      {hasStatusId && statusId && !error && (
        <ProcessStatusTracker 
          statusId={statusId}
          onComplete={onComplete}
          onError={(err) => {
            setError(err);
            if (onError) onError(err);
          }}
        />
      )}
      
      {hasJobId && jobId && !error && jobStatus && (
        <div className="w-full p-4 bg-white rounded-lg shadow-sm">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">
                {jobStatus.status === 'processing' ? 'Processing document...' : 
                 jobStatus.status === 'completed' ? 'Document analysis complete' :
                 'Processing failed'}
              </h3>
              <span className="text-xs font-semibold">
                {jobStatus.status === 'completed' ? '100%' : 
                 jobStatus.status === 'failed' ? 'Failed' : 
                 'Processing...'}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  jobStatus.status === 'completed' ? 'bg-green-500' : 
                  jobStatus.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                }`} 
                style={{width: jobStatus.status === 'completed' ? '100%' : '50%'}}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {!hasStatusId && !hasJobId && (
        <div className="p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg">
          No tracking method available. Please provide statusId or jobId.
        </div>
      )}
    </div>
  );
};

export default LitigationProcessTracker; 