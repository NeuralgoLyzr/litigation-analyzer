/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { Button } from '@react-pdf-viewer/core';
import { LogOut } from 'lucide-react';



export function LogoutButton() {
  const { checkAuth } = useAuth();
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      // Remove cookies
      Cookies.remove('user_id');
      Cookies.remove('token');
      
      // Log out from Lyzr
      const { default: lyzr } = await import('lyzr-agent');
      await lyzr.logout();
      window.location.reload()
      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <button
    onClick={handleLogout} 
    className="flex items-center mr-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md px-5 py-2"
  
  >
    <LogOut className="h-4 w-4 my-auto mr-2" />
    <span>Logout</span>
  </button>
  );
}

export function AuthStatus() {
  const { isAuthenticated, isLoading, userId } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="flex items-center gap-4">
      {isAuthenticated && (
        <div className="flex items-center gap-4">
          <span>Logged in as: {userId}</span>
          <LogoutButton />
        </div>
      )}
    </div>
  );
} 