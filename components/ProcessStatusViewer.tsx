/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { checkProcessStatus } from '../utils/clientCookies';

interface ProcessStatusViewerProps {
  statusId: string;
}

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

const ProcessStatusViewer: React.FC<ProcessStatusViewerProps> = ({ statusId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  
  // Using refs to track polling state
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(true);
  
  // Progress percentage calculation
  const getProgressPercentage = () => {
    if (!statusData) return 0;
    return Math.round((statusData.currentStep / statusData.totalSteps) * 100);
  };

  // Polling function
  const pollStatus = async () => {
    if (!isPollingRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    try {
      const { status } = await checkProcessStatus(statusId);
      setStatusData(status);
      setLoading(false);
      
      // Stop polling if completed or failed
      if (status.status === 'completed' || status.status === 'failed') {
        isPollingRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLoading(false);
      
      // Only stop polling on certain errors, not transient ones
      if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
        isPollingRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  };

  useEffect(() => {
    // Clean up any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset polling state
    isPollingRef.current = true;
    
    // Initial poll
    pollStatus();
    
    // Set up interval for polling every 2 seconds
    intervalRef.current = setInterval(pollStatus, 2000);
    
    // Cleanup on unmount or statusId change
    return () => {
      isPollingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [statusId]);
  
  if (loading) {
    return <div className="p-4 text-center">Loading status...</div>;
  }
  
  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>;
  }
  
  if (!statusData) {
    return <div className="p-4 text-center">No status data found</div>;
  }

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col space-y-4">
        <h2 className="text-lg font-semibold">Process Status: {statusId}</h2>
        
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">{statusData.stepDescription}</h3>
          <span className="text-xs font-semibold">
            {statusData.status === 'completed' ? 'Complete' : 
             statusData.status === 'failed' ? 'Failed' : 
             `${getProgressPercentage()}%`}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              statusData.status === 'completed' ? 'bg-green-500' : 
              statusData.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
            }`} 
            style={{width: `${getProgressPercentage()}%`}}
          ></div>
        </div>
        
        <div className="text-xs text-gray-500">
          Step {statusData.currentStep} of {statusData.totalSteps}
        </div>
        
        {statusData.documentId && (
          <div className="text-xs text-gray-700">
            Document ID: {statusData.documentId}
          </div>
        )}
        
        {statusData.ragId && (
          <div className="text-xs text-gray-700">
            RAG ID: {statusData.ragId}
          </div>
        )}
        
        {statusData.error && (
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-xs">
            Error: {statusData.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessStatusViewer; 