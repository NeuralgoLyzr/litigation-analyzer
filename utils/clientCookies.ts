'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface RagInfo {
  ragId: string | undefined;
  userId: string | undefined;
  docId: string | undefined;
}

export function useRagInfo(): RagInfo & { isLoading: boolean } {
  const [ragInfo, setRagInfo] = useState<RagInfo>({
    ragId: undefined,
    userId: undefined,
    docId: undefined
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get values from cookies
    const ragId = Cookies.get('rag_id');
    const userId = Cookies.get('active_user_id');
    const docId = Cookies.get('active_litigation_doc_id');

    setRagInfo({
      ragId,
      userId,
      docId
    });
    setIsLoading(false);
  }, []);

  return { ...ragInfo, isLoading };
}

// Function to check if we have active litigation document
export function hasActiveLitigationDoc(): boolean {
  // This runs only on client side
  if (typeof window === 'undefined') return false;
  
  const ragId = Cookies.get('rag_id');
  const docId = Cookies.get('active_litigation_doc_id');
  
  return Boolean(ragId && docId);
}

// Fetch the active litigation document data if available
export async function fetchActiveLitigationDoc(): Promise<{ document: Record<string, unknown> }> {
  const docId = Cookies.get('active_litigation_doc_id');
  
  if (!docId) {
    throw new Error('No active litigation document');
  }
  
  const response = await fetch(`/api/litigation-documents/${docId}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch active litigation document');
  }
  
  return response.json();
}

// Train RAG for the active litigation document
export async function trainActiveLitigationRag(originalText?: string): Promise<{ success: boolean; message: string }> {
  const docId = Cookies.get('active_litigation_doc_id');
  
  if (!docId) {
    throw new Error('No active litigation document');
  }
  
  const response = await fetch(`/api/litigation-documents/${docId}/train`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: originalText ? JSON.stringify({ originalText }) : JSON.stringify({}),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to train RAG');
  }
  
  return {
    success: data.success,
    message: data.message
  };
}

// Add this function to ensure a user ID is available

export function ensureUserId(): string {
  // Check for user ID in cookies first
  const userId = Cookies.get('activeUserId');
  
  if (userId) {
    // If found in cookies, make sure it's also in localStorage
    localStorage.setItem('userId', userId);
    return userId;
  }
  
  // If not in cookies, check localStorage
  let storedUserId = localStorage.getItem('userId');
  
  // If not found in localStorage either, create a new one
  if (!storedUserId) {
    storedUserId = `user_${Date.now()}`;
    localStorage.setItem('userId', storedUserId);
  }
  
  return storedUserId;
}

// Add function to check process status

export async function checkProcessStatus(statusId: string): Promise<{
  status: {
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
    _id: string;
  }
}> {
  const response = await fetch(`/api/process-status/${statusId}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch process status');
  }
  
  return response.json();
}

export async function getLatestUserProcessStatus(userId: string): Promise<{
  status: {
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
    _id: string;
  }
}> {
  const response = await fetch(`/api/process-status/user/${userId}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch user process status');
  }
  
  return response.json();
}

// Add a helper function to set cookies consistently
export function setCookie(key: string, value: string): void {
  try {
    // Use simple cookie setting like in AuthProvider
    Cookies.set(key, value);
    console.log(`Cookie ${key} set successfully`);
  } catch (error) {
    console.error(`Error setting cookie ${key}:`, error);
  }
}

// Add a helper function to remove cookies consistently
export function removeCookie(key: string): void {
  try {
    // Use simple cookie removal like in AuthProvider
    Cookies.remove(key);
    console.log(`Cookie ${key} removed successfully`);
  } catch (error) {
    console.error(`Error removing cookie ${key}:`, error);
  }
} 