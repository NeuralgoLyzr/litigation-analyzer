/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { checkProcessStatus } from '../../utils/clientCookies';

interface ProcessStatusTrackerProps {
  statusId: string;
  pollingInterval?: number;
  maxAttempts?: number;
  onComplete?: (documentId: string, ragId: string) => void;
  onError?: (error: string) => void;
}

const ProcessStatusTracker: React.FC<ProcessStatusTrackerProps> = ({
  statusId,
  pollingInterval = 2000, // Default 2 seconds
  maxAttempts = 120, // Default 4 minutes (at 2-second intervals)
  onComplete,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(8);
  const [description, setDescription] = useState('Starting process...');
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  
  // Using refs to track polling state
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(true);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset polling state when statusId changes
    isPollingRef.current = true;
    
    // Start polling
    const pollStatus = async () => {
      // Stop polling if max attempts reached or if we're no longer polling
      if (!isPollingRef.current || attempts >= maxAttempts) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      try {
        const { status: processStatus } = await checkProcessStatus(statusId);
        
        setCurrentStep(processStatus.currentStep);
        setTotalSteps(processStatus.totalSteps);
        setDescription(processStatus.stepDescription);
        setStatus(processStatus.status);
        setAttempts(prev => prev + 1);
        
        // Handle completed status
        if (processStatus.status === 'completed') {
          isPollingRef.current = false;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (onComplete && processStatus.documentId && processStatus.ragId) {
            onComplete(processStatus.documentId, processStatus.ragId);
          }
        }
        
        // Handle failed status
        if (processStatus.status === 'failed') {
          isPollingRef.current = false;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (processStatus.error) {
            setError(processStatus.error);
            if (onError) onError(processStatus.error);
          }
        }
      } catch (err) {
        console.error('Error checking process status:', err);
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        
        // Only stop polling on certain errors, not transient ones
        if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
          isPollingRef.current = false;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (onError) onError(errorMessage);
        }
      }
    };

    // Initial poll
    pollStatus();
    
    // Set up interval for polling
    intervalRef.current = setInterval(pollStatus, pollingInterval);
    
    // Cleanup on unmount
    return () => {
      isPollingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [statusId, pollingInterval, maxAttempts, onComplete, onError]);

  const getProgressPercentage = () => {
    return Math.round((currentStep / totalSteps) * 100);
  };

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">{description}</h3>
          <span className="text-xs font-semibold">
            {status === 'completed' ? 'Complete' : status === 'failed' ? 'Failed' : `${getProgressPercentage()}%`}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              status === 'completed' ? 'bg-green-500' : 
              status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
            }`} 
            style={{width: `${getProgressPercentage()}%`}}
          ></div>
        </div>
        
        <div className="text-xs text-gray-500">
          Step {currentStep} of {totalSteps}
        </div>
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessStatusTracker; 