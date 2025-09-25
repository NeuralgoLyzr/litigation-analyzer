'use client';

import React, { useState } from 'react';
import { trainActiveLitigationRag } from '../../utils/clientCookies';

interface TrainRagButtonProps {
  buttonText?: string;
  className?: string;
  originalText?: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

const TrainRagButton: React.FC<TrainRagButtonProps> = ({
  buttonText = 'Train RAG',
  className = 'px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700',
  originalText,
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await trainActiveLitigationRag(originalText);
      if (onSuccess) {
        onSuccess(result.message);
      }
    } catch (error) {
      console.error('Error training RAG:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to train RAG');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      className={className} 
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
          <span>Training...</span>
        </div>
      ) : (
        buttonText
      )}
    </button>
  );
};

export default TrainRagButton; 