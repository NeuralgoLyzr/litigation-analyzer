/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useDispatch } from 'react-redux';
import { completeOnboarding } from '@/store/onboardingSlice';
import { Loader2 } from 'lucide-react';

interface TokenData {
  user_id: string;
  api_key: string;
}

interface UserData {
  user_id: string;
  is_onboarded: boolean;
  is_new_user?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  isNewUser: boolean;
  userId: string | null;
  token: string | null;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const dispatch = useDispatch();

  const checkAuth = async () => {
    try {
      if (typeof window === 'undefined') return;

      setIsAuthChecking(true);
      console.log("Checking auth...");
      const { default: lyzr } = await import('lyzr-agent');

      const tokenData = (await lyzr.getKeys()) as unknown as TokenData[];
      console.log("Token data:", tokenData);

      if (tokenData && tokenData[0]) {
        Cookies.set('user_id', tokenData[0].user_id);
        Cookies.set('token', tokenData[0].api_key);

        try {
          console.log("Calling auth API...");
          const response = await fetch('/api/auth');
          const data = await response.json();
          console.log("Auth API response:", data);

          if (data.success) {
            setIsAuthenticated(true);
            setUserId(tokenData[0].user_id);
            setToken(tokenData[0].api_key);
            
            const userData = data.user as UserData;
            setIsOnboarded(userData.is_onboarded);
            setIsNewUser(userData.is_new_user || false);
            
            // Sync database isOnboarded state to Redux
            if (userData.is_onboarded) {
              dispatch(completeOnboarding());
            }

            // Redirect new users or non-onboarded users to onboarding
            if (userData.is_new_user || !userData.is_onboarded) {
              console.log("Redirecting to onboarding");
              router.push('/onboarding');
            }
          } else {
            console.log("Auth API returned error");
            handleAuthFailure();
          }
        } catch (error) {
          console.error("Error calling auth API:", error);
          handleAuthFailure();
        }
      } else {
        console.log("No token data found");
        handleAuthFailure();
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      handleAuthFailure();
    } finally {
      setIsLoading(false);
      setIsAuthChecking(false);
    }
  };

  const handleAuthFailure = () => {
    console.log("Handling auth failure");
    setIsAuthenticated(false);
    setUserId(null);
    setToken(null);
    setIsOnboarded(false);
    setIsNewUser(false);
    Cookies.remove('user_id');
    Cookies.remove('token');
    
    // Only redirect if not already on the home page
    router.push('/');
  };

  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') return;

      try {
        console.log("Initializing lyzr agent");
        const { default: lyzr } = await import('lyzr-agent');
        await lyzr.init('pk_c14a2728e715d9ea67bf');
        
        // Subscribe to auth state changes
        const unsubscribe = lyzr.onAuthStateChange((isAuthenticated) => {
          console.log("Auth state changed:", isAuthenticated);
          if (isAuthenticated) {
            checkAuth();
          } else {
            handleAuthFailure();
          }
        });

        // Initial auth check
        await checkAuth();

        return () => unsubscribe();
      } catch (err) {
        console.error('Init failed:', err);
        setIsLoading(false);
        setIsAuthChecking(false);
      }
    };

    init();
  }, []);

  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Authenticating...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, isOnboarded, isNewUser, userId, token, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
} 