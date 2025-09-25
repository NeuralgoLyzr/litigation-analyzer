'use client';

import { useState, useEffect, useRef } from 'react';

interface JobPollerOptions<T> {
  jobId: string;
  pollingInterval?: number;
  maxAttempts?: number;
  onComplete?: (result: T[]) => void;
  onError?: (error: string) => void;
}

interface JobStatus<T> {
  status: 'processing' | 'completed' | 'failed';
  results?: T[];
  error?: string;
}

export function useJobStatusPoller<T = Record<string, unknown>>({
  jobId,
  pollingInterval = 2000, // 2 seconds
  maxAttempts = 120, // 4 minutes at 2-second intervals
  onComplete,
  onError
}: JobPollerOptions<T>) {
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [results, setResults] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(true);

  // Function to fetch job status
  const fetchJobStatus = async (): Promise<JobStatus<T>> => {
    const response = await fetch(`/api/jobs/${jobId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch job status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      status: data.status,
      results: data.results,
      error: data.error
    };
  };

  useEffect(() => {
    // Start polling for job status
    const pollJobStatus = async () => {
      // Stop polling if max attempts reached or if we're no longer polling
      if (!isPollingRef.current || attempts >= maxAttempts) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      try {
        const jobStatus = await fetchJobStatus();
        setAttempts(prev => prev + 1);
        
        // Update state based on job status
        setStatus(jobStatus.status);
        
        if (jobStatus.results) {
          setResults(jobStatus.results);
        }
        
        if (jobStatus.error) {
          setError(jobStatus.error);
        }
        
        // Handle completed status
        if (jobStatus.status === 'completed') {
          isPollingRef.current = false;
          setIsLoading(false);
          if (onComplete && jobStatus.results) {
            onComplete(jobStatus.results);
          }
        }
        
        // Handle failed status
        if (jobStatus.status === 'failed') {
          isPollingRef.current = false;
          setIsLoading(false);
          if (onError && jobStatus.error) {
            onError(jobStatus.error);
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        isPollingRef.current = false;
        setIsLoading(false);
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        if (onError) onError(errorMessage);
      }
    };

    // Initial poll
    pollJobStatus();
    
    // Set up interval for polling
    intervalRef.current = setInterval(pollJobStatus, pollingInterval);
    
    // Cleanup on unmount
    return () => {
      isPollingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [jobId, pollingInterval, maxAttempts, onComplete, onError, attempts]);

  return {
    status,
    results,
    error,
    isLoading
  };
} 