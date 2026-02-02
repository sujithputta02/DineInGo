import mongoose from 'mongoose';
import { User } from '../src/models/User';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyModelStorage = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/DineInGo';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Create a dummy image buffer
        const dummyImageBuffer = Buffer.from('Here is some fake image data', 'utf-8');
        const dummyContentType = 'image/png';
        const testUid = 'test_verifier_' + Date.now();

        // Create a user with profile picture
        const user = new User({
            uid: testUid,
            email: `test_${Date.now()}@example.com`,
            displayName: 'Test Verifier',
            name: 'Test Verifier',
            profilePicture: {
                data: dummyImageBuffer,
                contentType: dummyContentType
            }
        });

        await user.save();
        console.log(`User created with UID: ${testUid}`);

        // Retrieve the user
        const retrievedUser = await User.findOne({ uid: testUid });

        if (!retrievedUser) {
            throw new Error('User not found');
        }

        if (!retrievedUser.profilePicture) {
            throw new Error('Profile picture field is missing');
        }

        const retrievedBuffer = retrievedUser.profilePicture.data;
        if (retrievedBuffer.equals(dummyImageBuffer)) {
            console.log('✅ SUCCESS: Retrieved buffer matches original buffer.');
        } else {
            console.error('❌ FAILURE: Retrieved buffer does not match.');
        }

        console.log('Content Type:', retrievedUser.profilePicture.contentType);

        // Cleanup
        await User.deleteOne({ uid: testUid });
        console.log('Test user deleted');

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

verifyModelStorage();
