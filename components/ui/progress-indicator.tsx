/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { checkProcessStatus } from '../../utils/clientCookies';

interface ProgressIndicatorProps {
  statusId: string;
  onComplete?: (documentId: string, ragId: string) => void;
  onError?: (error: string) => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  statusId,
  onComplete,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(8);
  const [description, setDescription] = useState('Starting process...');
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [ragId, setRagId] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const { status: processStatus } = await checkProcessStatus(statusId);
        
        setCurrentStep(processStatus.currentStep);
        setTotalSteps(processStatus.totalSteps);
        setDescription(processStatus.stepDescription);
        setStatus(processStatus.status);
        
        if (processStatus.error) {
          setError(processStatus.error);
          if (onError) onError(processStatus.error);
          clearInterval(intervalId);
        }
        
        if (processStatus.documentId) {
          setDocumentId(processStatus.documentId);
        }
        
        if (processStatus.ragId) {
          setRagId(processStatus.ragId);
        }
        
        // If process is complete and we have the document ID and RAG ID
        if (processStatus.status === 'completed' && processStatus.documentId && processStatus.ragId) {
          if (onComplete) {
            onComplete(processStatus.documentId, processStatus.ragId);
          }
          clearInterval(intervalId);
        }
        
        // If process failed
        if (processStatus.status === 'failed') {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Error checking process status:', err);
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(intervalId);
  }, [statusId, onComplete, onError]);

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
              status === 'failed' ? 'bg-red-500' : 'bg-purple-500'
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

export default ProgressIndicator; 