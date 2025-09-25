"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { checkProcessStatus } from '@/utils/clientCookies';
import ProcessStatusTracker from '@/components/ui/process-status-tracker';

// Define the type for status data
interface StatusData {
  _id: string;
  userId: string;
  documentId?: string;
  ragId?: string;
  status: 'processing' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
  error?: string;
  created_at: string;
  updated_at: string;
  externalId?: string;
}

export default function ProcessStatusPage() {
  const params = useParams();
  const statusId = Array.isArray(params.id) ? params.id[0] : params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusExists, setStatusExists] = useState(false);
  const [statusData, setStatusData] = useState<StatusData | null>(null);

  useEffect(() => {
    // Initial check to see if the status exists
    const checkStatus = async () => {
      try {
        const result = await checkProcessStatus(statusId);
        setStatusExists(true);
        setStatusData(result.status);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (statusId) {
      checkStatus();
    } else {
      setError('No status ID provided');
      setIsLoading(false);
    }
  }, [statusId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-gray-600">Please wait while we fetch the status.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-red-100 text-red-700 rounded-lg max-w-md">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold mb-6">Process Status</h1>
      {statusData && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Status ID: {statusId}</p>
          <p className="text-sm text-gray-600 mb-1">User ID: {statusData.userId}</p>
          {statusData.documentId && (
            <p className="text-sm text-gray-600 mb-1">Document ID: {statusData.documentId}</p>
          )}
          {statusData.ragId && (
            <p className="text-sm text-gray-600 mb-1">RAG ID: {statusData.ragId}</p>
          )}
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {statusExists && statusId ? (
          <ProcessStatusTracker 
            statusId={statusId} 
            pollingInterval={2000}
            maxAttempts={300} // 10 minutes at 2-second intervals
            onComplete={(documentId, ragId) => {
              console.log('Process completed with document ID:', documentId, 'and RAG ID:', ragId);
              // Update status data with completed info
              setStatusData(prev => prev ? {
                ...prev,
                documentId,
                ragId,
                status: 'completed'
              } : null);
            }}
            onError={(err) => {
              console.error('Process failed:', err);
              setError(err);
              // Update status data with error info
              setStatusData(prev => prev ? {
                ...prev,
                error: err,
                status: 'failed'
              } : null);
            }}
          />
        ) : (
          <p className="text-gray-600">Status not found</p>
        )}
      </div>
    </div>
  );
} 