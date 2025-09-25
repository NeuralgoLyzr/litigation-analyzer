import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // Get user_id and token from cookies
    const userId = request.cookies.get('user_id')?.value;
    const token = request.cookies.get('token')?.value;

    if (!userId || !token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication failed: Missing credentials',
        error: 'Missing token or userId'
      }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    try {
      // Check if user exists in MongoDB
      const user = await User.findOne({ user_id: userId }).exec();

      if (user) {
        // Verify if token matches
        if (user.api_key === token) {
          // Update last login time
          user.updated_at = new Date();
          await user.save();
          
          return NextResponse.json({
            success: true,
            message: 'Authentication successful',
            user: {
              user_id: user.user_id,
              is_onboarded: user.is_onboarded || false
            }
          }, { status: 200 });
        } else {
          // Update token if it doesn't match
          user.api_key = token;
          user.updated_at = new Date();
          await user.save();
          
          return NextResponse.json({
            success: true,
            message: 'Authentication successful with updated token',
            user: {
              user_id: user.user_id,
              is_onboarded: user.is_onboarded || false
            }
          }, { status: 200 });
        }
      }

      // If user doesn't exist, create new user
      const newUser = new User({
        user_id: userId,
        api_key: token,
        is_onboarded: false,
        is_new_user: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      await newUser.save();

      return NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user: {
          user_id: newUser.user_id,
          is_onboarded: false,
          is_new_user: true
        }
      }, { status: 200 });

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database operation failed',
        error: 'Internal server error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({
      success: false,
      message: 'Authentication failed',
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Add this new route to update the onboarded status
export async function PUT(req: NextRequest) {
  try {
    const userId = req.cookies.get('user_id')?.value;
    const token = req.cookies.get('token')?.value;
    
    if (!userId || !token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    await connectToDatabase();
    
    const { is_onboarded } = await req.json();
    
    const updatedUser = await User.findOneAndUpdate(
      { user_id: userId },
      { $set: { is_onboarded, updated_at: new Date() } },
      { new: true }
    ).exec();
    
    if (!updatedUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      user: {
        user_id: updatedUser.user_id,
        is_onboarded: updatedUser.is_onboarded
      }
    });
  } catch (error) {
    console.error('Auth API update error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 