import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that require authentication
const protectedPaths = [
  '/',
  '/ocr-processing',
  '/mareva-injunction',
  '/completed',
  '/pdf-insights-chat'
];

// List of paths that are accessible without authentication
const publicPaths = [
  '/',
  '/api/auth'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if path is protected
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    const userId = request.cookies.get('user_id')?.value;
    const token = request.cookies.get('token')?.value;

    // If no user ID or token, redirect to home
    if (!userId || !token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes that don't require auth
     * 2. /_next (static files)
     * 3. /fonts (static files)
     * 4. /favicon.ico, /robots.txt (static files)
     */
    '/((?!api/(?!auth)|_next/static|_next/image|fonts/|favicon.ico|robots.txt).*)',
  ],
}; 