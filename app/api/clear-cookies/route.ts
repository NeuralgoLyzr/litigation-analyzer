import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create response with Set-Cookie headers to clear cookies
    const response = NextResponse.json({ success: true, message: 'Cookies cleared' });
    
    // Add explicit Set-Cookie headers to clear cookies
    response.headers.append('Set-Cookie', 'rag_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
    response.headers.append('Set-Cookie', 'active_litigation_doc_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
    
    return response;
  } catch (error) {
    console.error('Error clearing cookies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cookies' },
      { status: 500 }
    );
  }
} 