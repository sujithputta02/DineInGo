import { connectToDatabase } from '../utils/mongodb';
import { ObjectId } from 'mongodb';

interface User {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL: string | null;
  lastLogin: Date;
  createdAt: Date;
  emailVerified: boolean;
}

export async function createUser(userData: User) {
  let db;
  try {
    db = await connectToDatabase();
    const users = db.collection('users');

    // Check if user already exists
    const existingUser = await users.findOne({ 
      $or: [
        { uid: userData.uid },
        { email: userData.email }
      ]
    });

    if (existingUser) {
      if (existingUser.uid === userData.uid) {
        // Update the existing user's data
        const result = await users.updateOne(
          { uid: userData.uid },
          { 
            $set: {
              ...userData,
              lastLogin: new Date()
            }
          }
        );
        return { ...existingUser, ...userData, lastLogin: new Date() };
      }
      throw new Error('User with this email already exists');
    }

    // Insert new user
    const result = await users.insertOne({
      ...userData,
      lastLogin: new Date(),
      createdAt: new Date(),
      _id: new ObjectId()
    });

    return { ...userData, _id: result.insertedId };
  } catch (error) {
    console.error('Error in createUser:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create user');
  }
}

export async function updateUser(uid: string, updateData: Partial<User>) {
  let db;
  try {
    db = await connectToDatabase();
    const users = db.collection('users');

    const result = await users.findOneAndUpdate(
      { uid },
      { 
        $set: { 
          ...updateData,
          lastLogin: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error('User not found');
    }

    return result;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update user');
  }
}

export async function getUser(uid: string) {
  let db;
  try {
    db = await connectToDatabase();
    const users = db.collection('users');

    const user = await users.findOne({ uid });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    console.error('Error in getUser:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch user');
  }
}

export async function deleteUser(uid: string) {
  let db;
  try {
    db = await connectToDatabase();
    const users = db.collection('users');

    const result = await users.deleteOne({ uid });
    if (result.deletedCount === 0) {
      throw new Error('User not found');
    }
    return result;
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete user');
  }
} 