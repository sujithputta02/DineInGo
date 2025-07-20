import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { connectToDatabase } from '@/lib/mongodb';

// Define the expected request body type
interface UpdateUserRequest {
  userId: string;
  updates: {
    displayName?: string;
    name?: string;
    phoneNumber?: string;
    photoURL?: string | null;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
    locationSettings?: Record<string, any>;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify the user is authenticated
    const token = await getToken({ req });
    
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Parse the request body
    const { userId, updates } = req.body as UpdateUserRequest;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify the user is updating their own profile
    if (token.sub !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Prepare the update object
    const updateDoc: Record<string, any> = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update the user in the database
    const result = await db.collection('users').updateOne(
      { _id: userId },
      { 
        $set: updateDoc,
        $setOnInsert: { 
          createdAt: new Date(),
          email: token.email || null,
          emailVerified: token.email_verified || false,
        },
      },
      { upsert: true }
    );

    // If it's a new document, update the _id to match the userId
    if (result.upsertedCount > 0) {
      await db.collection('users').updateOne(
        { _id: userId },
        { $set: { _id: userId } }
      );
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: result 
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
