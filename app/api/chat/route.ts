// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callLyzrAgent } from '../../../utils/LyzrApiCall';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import { cookies } from 'next/headers';

const AGENT_ID = process.env.NEXT_PUBLIC_AGENT_CHAT!;

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!AGENT_ID) {
      console.log("Agent ID is not configured");
      return NextResponse.json(
        { error: 'Agent ID is not configured' },
        { status: 500 }
      );
    }



    // Get ragId from cookies
    const cookieStore = await cookies();
    const ragId = cookieStore.get('rag_id')?.value;
    const userId = cookieStore.get('user_id')?.value;
 
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    // Connect to database and get user's API key
    await connectToDatabase();
    const user = await User.findOne({ user_id: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Use the user's API key from the database
    const userApiKey = user.api_key;
    console.log(  message,
      userApiKey,
      AGENT_ID,
      sessionId,
      ragId);
      
    // Call the Lyzr agent with the user's API key and ragId
    const response = await callLyzrAgent(
      message,
      userApiKey,
      AGENT_ID,
      sessionId,
      ragId
    );
   

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}