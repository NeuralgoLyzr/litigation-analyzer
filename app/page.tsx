"use client"

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { completeOnboarding } from "@/utils/auth";
import HomePage from "../components/heroComp";

export default function Home() {
  const { isAuthenticated, isLoading, isOnboarded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated and already onboarded, redirect to account-creation
    if (!isLoading && isAuthenticated && isOnboarded) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, isOnboarded, router]);

  // Silent onboarding for new users
  useEffect(() => {
    async function handleAutoOnboarding() {
      if (isAuthenticated && !isOnboarded) {
        console.log("Auto-completing onboarding for new user");
        const success = await completeOnboarding();
        if (success) {
          router.push('/');
        }
      }
    }
    
    if (!isLoading) {
      handleAutoOnboarding();
    }
  }, [isAuthenticated, isOnboarded, isLoading, router]);

  // Just render the original home page
  return (
    <div className="overflow-auto">
      <HomePage />
    </div>
  );
}
