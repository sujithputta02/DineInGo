import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Review } from './src/models/Review';
import { User } from './src/models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}

async function updateReviewPhotos() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all reviews without userPhoto
    const reviews = await Review.find({
      $or: [
        { userPhoto: { $exists: false } },
        { userPhoto: '' },
        { userPhoto: null }
      ]
    });

    console.log(`Found ${reviews.length} reviews without photos`);

    let updated = 0;
    for (const review of reviews) {
      try {
        // Find the user
        const user = await User.findOne({ uid: review.userId });
        
        if (user) {
          // Get photo from user profile
          const userPhoto = user.photoURL || user.currentAvatar || '';
          
          if (userPhoto) {
            review.userPhoto = userPhoto;
            await review.save();
            updated++;
            console.log(`Updated review ${review._id} with photo: ${userPhoto.substring(0, 50)}...`);
          } else {
            console.log(`No photo found for user ${review.userId}`);
          }
        } else {
          console.log(`User not found: ${review.userId}`);
        }
      } catch (error) {
        console.error(`Error updating review ${review._id}:`, error);
      }
    }

    console.log(`\nUpdated ${updated} out of ${reviews.length} reviews`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateReviewPhotos();
