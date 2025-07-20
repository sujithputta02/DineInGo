import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import dbConnect from '../../../../server/config/db';
import User from '../../../../server/models/User';
import mongoose from 'mongoose';

// Enable debug logging
mongoose.set('debug', true);

// Log MongoDB connection status
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Present' : 'Missing');
console.log('NODE_ENV:', process.env.NODE_ENV);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log request details
  console.log('\n=== Update Request Received ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  // Set response headers
  res.setHeader('Content-Type', 'application/json');
  
  // Log MongoDB connection status
  console.log('Mongoose connection state:', mongoose.connection.readyState);

  try {
    // Verify method
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify request body
    if (!req.body) {
      console.log('No request body');
      return res.status(400).json({ error: 'Request body is required' });
    }

    const { userId, updates } = req.body;
    console.log('Parsed userId:', userId);
    console.log('Parsed updates:', updates ? 'Present' : 'Missing');

    // Verify required fields
    if (!userId || !updates) {
      console.log('Missing required fields:', { userId: !!userId, updates: !!updates });
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { userId: !!userId, updates: !!updates }
      });
    }

    // Temporarily bypass session check for debugging
    console.log('Skipping session check for debugging');
    /*
    // Verify user is authenticated
    const session = await getSession({ req });
    console.log('Session:', session ? 'Found' : 'Not found');
    
    if (!session) {
      console.log('No active session found');
      return res.status(401).json({ error: 'Unauthorized - No active session' });
    }

    // Verify the user is updating their own data
    console.log('Session user ID:', session.user?.id);
    console.log('Requested user ID:', userId);
    
    if (userId !== session.user?.id) {
      console.log('User ID mismatch');
      return res.status(403).json({ 
        error: 'Forbidden - Cannot update another user\'s data',
        sessionUserId: session.user?.id,
        requestedUserId: userId
      });
    }
    */

    try {
      // Connect to MongoDB
      console.log('\n--- Connecting to MongoDB ---');
      try {
        await dbConnect();
        console.log('MongoDB connected. Connection state:', mongoose.connection.readyState);
      } catch (dbError) {
        console.error('MongoDB connection error:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database connection failed',
          details: dbError.message
        });
      }
      
      // Check if user exists first
      const existingUser = await User.findById(userId).lean();
      console.log('Existing user found:', existingUser ? 'Yes' : 'No');
      
      if (!existingUser) {
        console.log('User not found in database');
        return res.status(404).json({ 
          success: false,
          error: 'User not found',
          userId
        });
      }
      
      // Prepare update data - ensure we only update allowed fields
      const allowedUpdates = [
        'displayName', 'name', 'phoneNumber', 'photoURL', 
        'address', 'locationSettings', 'preferences'
      ];
      
      const updateData: Record<string, any> = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updateData[key] = updates[key];
        }
      });
      
      updateData.updatedAt = new Date();
      
      console.log('\n--- Attempting Update ---');
      console.log('User ID:', userId);
      console.log('Update data:', JSON.stringify(updateData, null, 2));
      
      // Update user data with error handling
      let user;
      try {
        user = await User.findByIdAndUpdate(
          userId,
          { $set: updateData },
          { 
            new: true, 
            runValidators: true,
            context: 'query'
          }
        ).lean();
        
        if (!user) {
          console.error('User not found after update attempt');
          return res.status(404).json({
            success: false,
            error: 'User not found after update attempt'
          });
        }
        
        console.log('Update successful. Updated user:', JSON.stringify(user, null, 2));
      } catch (updateError: any) {
        console.error('Update error:', updateError);
        
        // Handle validation errors
        if (updateError.name === 'ValidationError') {
          const errors = updateError.errors 
            ? Object.values(updateError.errors).map((e: any) => ({
                field: e.path,
                message: e.message
              }))
            : [updateError.message];
            
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
          });
        }
        
        // Handle duplicate key errors
        if (updateError.code === 11000) {
          const field = Object.keys(updateError.keyPattern)[0];
          return res.status(400).json({
            success: false,
            error: 'Duplicate key error',
            details: `${field} already exists`
          });
        }
        
        // For other errors, include the error message in the response
        return res.status(500).json({
          success: false,
          error: 'Update failed',
          details: updateError.message
        });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ 
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          displayName: user.displayName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          address: user.address,
          locationSettings: user.locationSettings
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ 
        error: 'Database error',
        details: dbError.message 
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}