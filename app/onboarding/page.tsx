"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { completeOnboarding } from "@/utils/auth";

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isOnboarded } = useAuth();
  
  // Auto-complete onboarding and redirect
  useEffect(() => {
    async function handleOnboarding() {
      if (!isLoading && isAuthenticated && !isOnboarded) {
        console.log("Auto-completing onboarding...");
        const success = await completeOnboarding();
        if (success) {
          console.log("Onboarding completed, redirecting...");
          router.push('/');
        }
      } else if (!isLoading && isAuthenticated && isOnboarded) {
        // Already onboarded, redirect back
        router.push('/');
      } else if (!isLoading && !isAuthenticated) {
        // Not authenticated, redirect to home
        router.push('/');
      }
    }
    
    handleOnboarding();
  }, [isAuthenticated, isLoading, isOnboarded, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Setting up your account...</h1>
        <p className="text-gray-600">Please wait while we prepare everything for you.</p>
      </div>
    </div>
  );
} 