import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { emailService } from '../services/emailService';
import { analyzeSentiment } from '../utils/sentimentAnalyzer';
import mongoose from 'mongoose';

/**
 * Recalculates and updates rolling average sentiment ratings for a business/event
 */
const updateBusinessSentimentAndRating = async (businessId: string, isEvent: boolean) => {
    try {
        console.log(`[SentimentUpdate] Recalculating scores for business ID: ${businessId}, isEvent: ${isEvent}`);
        const matchCondition = isEvent 
            ? { eventId: new mongoose.Types.ObjectId(businessId), status: 'published' }
            : { businessId: new mongoose.Types.ObjectId(businessId), status: 'published' };
        
        const reviews = await Review.find(matchCondition);
        if (reviews.length === 0) {
            console.log('[SentimentUpdate] No reviews found, setting default neutral scores');
            await Business.findByIdAndUpdate(businessId, {
                rating: 0,
                sentimentScore: 0,
                sentimentRating: 4.0
            });
            return;
        }

        let totalRatingSum = 0;
        let totalReviewsCount = 0;
        let totalSentimentSum = 0;

        for (const r of reviews) {
            totalRatingSum += r.rating;
            totalSentimentSum += r.sentimentScore || 0;
            totalReviewsCount++;

            if (r.subReviews && r.subReviews.length > 0) {
                for (const sub of r.subReviews) {
                    totalRatingSum += sub.rating;
                    const subSentiment = analyzeSentiment(sub.comment);
                    totalSentimentSum += subSentiment;
                    totalReviewsCount++;
                }
            }
        }

        const averageRating = totalRatingSum / totalReviewsCount;
        const averageSentiment = totalSentimentSum / totalReviewsCount;
        const sentimentRating = 3.0 + (averageSentiment * 2.0); // Map [-1, 1] to [1, 5]

        console.log(`[SentimentUpdate] Computed: Avg Rating = ${averageRating}, Avg Sentiment = ${averageSentiment}, Sentiment Rating = ${sentimentRating}`);

        await Business.findByIdAndUpdate(businessId, {
            rating: Math.round(averageRating * 10) / 10,
            sentimentScore: Math.round(averageSentiment * 100) / 100,
            sentimentRating: Math.round(sentimentRating * 10) / 10
        });

        // Sync legacy Restaurant collection if compiled and exists
        try {
            const RestaurantModel = mongoose.model('Restaurant');
            if (RestaurantModel) {
                const business = await Business.findById(businessId);
                if (business) {
                    await RestaurantModel.findOneAndUpdate(
                        { name: business.name },
                        {
                            rating: Math.round(averageRating * 10) / 10,
                            sentimentScore: Math.round(averageSentiment * 100) / 100,
                            sentimentRating: Math.round(sentimentRating * 10) / 10
                        }
                    );
                    console.log(`[SentimentUpdate] Synced legacy Restaurant collection: ${business.name}`);
                }
            }
        } catch (e) {
            // Suppress error if model or restaurant is not found
        }
    } catch (error) {
        console.error('[SentimentUpdate] Error updating business sentiment:', error);
    }
};

/**
 * Get all reviews for a business
 */
export const getBusinessReviews = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;

        if (!mongoose.isValidObjectId(businessId)) {
            console.error('[ReviewController] Invalid businessId:', businessId);
            return res.status(400).json({ message: 'Invalid business ID format' });
        }

        // Check if this business is an event by looking at the Business collection
        const business = await Business.findById(businessId);

        let reviews;
        if (business && (business.type === 'event' || business.type === 'both')) {
            console.log('[ReviewController] Fetching event reviews for:', businessId);
            // For events, look for reviews with eventId
            reviews = await Review.find({
                eventId: new mongoose.Types.ObjectId(businessId)
            }).sort({ createdAt: -1 });
        } else {
            console.log('[ReviewController] Fetching business reviews for:', businessId);
            // For regular businesses, look for reviews with businessId
            reviews = await Review.find({
                businessId: new mongoose.Types.ObjectId(businessId)
            }).sort({ createdAt: -1 });
        }

        // Populate reviews with up-to-date user profile information (displayName and photoURL) from User collection
        const userIds = [...new Set(reviews.map(r => r.userId))];
        const users = await User.find({ uid: { $in: userIds } });
        const userMap = new Map(users.map(u => [u.uid, u]));

        const populatedReviews = reviews.map(r => {
            const reviewObj = r.toObject();
            const user = userMap.get(r.userId);
            if (user) {
                reviewObj.userName = user.displayName || user.name || reviewObj.userName;
                reviewObj.userPhoto = user.photoURL || reviewObj.userPhoto;
            }
            return reviewObj;
        });

        res.json(populatedReviews);
    } catch (error: any) {
        console.error('[ReviewController] Error in getBusinessReviews:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch reviews' });
    }
};

/**
 * Get all reviews by a user
 */
export const getUserReviews = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        // Populate both business and event details
        const reviews = await Review.find({ userId })
            .sort({ createdAt: -1 })
            .populate('businessId', 'name thumbnail location')
            .populate('eventId', 'name thumbnail location');
        res.json(reviews);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Add a new review (Customer side)
 */
export const addReview = async (req: Request, res: Response) => {
    try {
        console.log('[ReviewController] New review submission received');
        
        // Try to get businessId from params first, then body
        const businessIdRaw = req.params.businessId || req.body.businessId;

        if (!businessIdRaw) {
            console.error('[ReviewController] Missing businessId');
            return res.status(400).json({ message: 'Business ID is required' });
        }

        if (!mongoose.isValidObjectId(businessIdRaw)) {
            console.error('[ReviewController] Invalid businessId format:', businessIdRaw);
            return res.status(400).json({ message: 'Invalid business ID format' });
        }

        let { userId, userName, userPhoto, rating, comment, bookingId, images: bodyImages } = req.body;
        
        console.log(`[ReviewController] Processing review for business: ${businessIdRaw}, user: ${userId}`);

        // Handle file uploads
        let uploadedImages: string[] = [];
        if (req.files && Array.isArray(req.files)) {
            console.log(`[ReviewController] Found ${req.files.length} uploaded files`);
            uploadedImages = (req.files as Express.Multer.File[]).map(file => file.path);
        }

        // Handle existing images (from bodyImages)
        let finalImages: string[] = [];
        if (typeof bodyImages === 'string') {
            try {
                finalImages = JSON.parse(bodyImages);
            } catch (e) {
                finalImages = [];
            }
        } else if (Array.isArray(bodyImages)) {
            finalImages = bodyImages;
        }

        // Combine uploaded and existing
        finalImages = [...finalImages, ...uploadedImages];
        console.log(`[ReviewController] Total images for review: ${finalImages.length}`);

        console.log('[ReviewController] Saving review to database...');
        
        // Fetch business to determine if it's an event or business
        const business = await Business.findById(businessIdRaw);
        if (!business) {
            console.error('[ReviewController] Business not found:', businessIdRaw);
            return res.status(404).json({ message: 'Business not found' });
        }

        const isEvent = business.type === 'event' || business.type === 'both';

        // Check if there is an existing review by the same user for this entity
        const existingReview = await Review.findOne({
            userId,
            businessId: !isEvent ? new mongoose.Types.ObjectId(businessIdRaw) : undefined,
            eventId: isEvent ? new mongoose.Types.ObjectId(businessIdRaw) : undefined
        });

        if (existingReview) {
            console.log('[ReviewController] Existing review found. Appending sub-review...');
            if (!existingReview.subReviews) {
                existingReview.subReviews = [];
            }
            existingReview.subReviews.push({
                rating: Number(rating),
                comment,
                images: finalImages,
                createdAt: new Date()
            });

            await existingReview.save();
            console.log('[ReviewController] Sub-review appended successfully, parent ID:', existingReview._id);

            // Trigger overall rating and sentiment updates
            await updateBusinessSentimentAndRating(businessIdRaw, isEvent);

            // Send email notifications
            try {
                console.log('[ReviewController] Triggering email notifications for sub-review...');
                const user = await User.findOne({ uid: userId });

                if (user && business) {
                    // Notify user: their review was submitted
                    await emailService.sendReviewSubmissionEmail({
                        to: user.email,
                        userName: user.displayName || user.name,
                        businessName: business.name,
                        rating,
                        comment
                    });

                    // Notify business owner: a new review was received
                    const owner = await User.findOne({ uid: business.ownerId });
                    if (owner && owner.email) {
                        await emailService.sendNewReviewAlertEmail({
                            to: owner.email,
                            ownerName: owner.displayName || owner.name || business.name,
                            userName: user.displayName || user.name || 'A customer',
                            businessName: business.name,
                            rating,
                            comment
                        });
                    }
                    console.log('[ReviewController] Emails sent successfully');
                }
            } catch (emailError) {
                console.error('[ReviewController] Failed to send review email:', emailError);
            }

            return res.status(200).json(existingReview);
        }
        
        const sentimentVal = analyzeSentiment(comment);
        const review = new Review({
            businessId: !isEvent ? new mongoose.Types.ObjectId(businessIdRaw) : undefined,
            eventId: isEvent ? new mongoose.Types.ObjectId(businessIdRaw) : undefined,
            entityType: isEvent ? 'event' : 'business',
            userId,
            userName,
            userPhoto,
            rating,
            comment,
            sentimentScore: sentimentVal,
            bookingId: bookingId && mongoose.isValidObjectId(bookingId) ? new mongoose.Types.ObjectId(bookingId) : undefined,
            images: finalImages,
            likes: [],
            dislikes: []
        });

        await review.save();
        console.log('[ReviewController] Review saved successfully, ID:', review._id);

        // Recalculate business rolling ratings and sentiment scores
        await updateBusinessSentimentAndRating(businessIdRaw, isEvent);

        // Send email notifications
        try {
            console.log('[ReviewController] Triggering email notifications...');
            const user = await User.findOne({ uid: userId });

            if (user && business) {
                // Notify user: their review was submitted
                await emailService.sendReviewSubmissionEmail({
                    to: user.email,
                    userName: user.displayName || user.name,
                    businessName: business.name,
                    rating,
                    comment
                });

                // Notify business owner: a new review was received
                const owner = await User.findOne({ uid: business.ownerId });
                if (owner && owner.email) {
                    await emailService.sendNewReviewAlertEmail({
                        to: owner.email,
                        ownerName: owner.displayName || owner.name || business.name,
                        userName: user.displayName || user.name || 'A customer',
                        businessName: business.name,
                        rating,
                        comment
                    });
                }
                console.log('[ReviewController] Emails sent successfully');
            } else {
                console.warn(`[ReviewController] Skipping emails - User found: ${!!user}, Business found: ${!!business}`);
            }
        } catch (emailError) {
            console.error('[ReviewController] Failed to send review email:', emailError);
            // Continue without failing the request
        }

        res.status(201).json(review);
    } catch (error: any) {
        console.error('[ReviewController] CRITICAL ERROR in addReview:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already reviewed this booking' });
        }
        res.status(500).json({ 
            message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : error.message,
            error: process.env.NODE_ENV === 'production' ? undefined : error.stack
        });
    }
};

/**
 * Reply to a review (Owner side)
 */
export const replyToReview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        const review = await Review.findByIdAndUpdate(
            id,
            { reply: { text, repliedAt: new Date() } },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Send email notification to user about the reply
        try {
            const user = await User.findOne({ uid: review.userId });
            const business = await Business.findById(review.businessId);

            if (user && business) {
                await emailService.sendReplyNotificationEmail({
                    to: user.email,
                    userName: user.displayName || user.name,
                    businessName: business.name,
                    replyText: text
                });
            }
        } catch (emailError) {
            console.error('Failed to send reply notification email:', emailError);
        }

        res.json(review);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update a review (User side)
 */
export const updateReview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        let { rating, comment, images: bodyImages } = req.body;

        // Handle file uploads
        let uploadedImages: string[] = [];
        if (req.files && Array.isArray(req.files)) {
            uploadedImages = (req.files as Express.Multer.File[]).map(file => file.path);
        }

        // Handle existing images and potential deletions
        let finalImages: string[] = [];
        if (typeof bodyImages === 'string') {
            try {
                finalImages = JSON.parse(bodyImages);
            } catch (e) {
                finalImages = [];
            }
        } else if (Array.isArray(bodyImages)) {
            finalImages = bodyImages;
        }

        // Combine with new uploads
        finalImages = [...finalImages, ...uploadedImages];

        const sentimentScore = analyzeSentiment(comment);

        let review = await Review.findByIdAndUpdate(
            id,
            { rating, comment, images: finalImages, sentimentScore, updatedAt: new Date() },
            { new: true }
        );

        if (!review) {
            // Check if this id belongs to a sub-review of an existing review document
            const parentReview = await Review.findOne({ "subReviews._id": id });
            if (parentReview && parentReview.subReviews) {
                // Find and update the sub-review in the array using cast to any
                const subReview = (parentReview.subReviews as any).id(id);
                if (subReview) {
                    subReview.rating = Number(rating);
                    subReview.comment = comment;
                    subReview.images = finalImages;
                    await parentReview.save();
                    
                    const targetId = parentReview.businessId || parentReview.eventId;
                    if (targetId) {
                        await updateBusinessSentimentAndRating(targetId.toString(), parentReview.entityType === 'event');
                    }
                    return res.json(parentReview);
                }
            }
            return res.status(404).json({ message: 'Review not found' });
        }

        const targetId = review.businessId || review.eventId;
        if (targetId) {
            await updateBusinessSentimentAndRating(targetId.toString(), review.entityType === 'event');
        }

        res.json(review);
    } catch (error: any) {
        console.error('Error in updateReview:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update a reply (Owner side)
 */
export const updateReply = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (!review.reply) {
            return res.status(400).json({ message: 'No reply exists to update' });
        }

        review.reply.text = text;
        await review.save();

        res.json(review);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Delete a reply (Owner side)
 */
export const deleteReply = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const review = await Review.findByIdAndUpdate(
            id,
            { $unset: { reply: 1 } },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json({ message: 'Reply deleted successfully', review });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Delete or hide a review
 */
export const deleteReview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const review = await Review.findByIdAndDelete(id);
        if (!review) {
            // Check if this id belongs to a sub-review
            const parentReview = await Review.findOne({ "subReviews._id": id });
            if (parentReview) {
                // Remove the sub-review from the array using cast to any
                (parentReview.subReviews as any).pull({ _id: id });
                await parentReview.save();
                
                const targetId = parentReview.businessId || parentReview.eventId;
                if (targetId) {
                    await updateBusinessSentimentAndRating(targetId.toString(), parentReview.entityType === 'event');
                }
                return res.json({ message: 'Sub-review deleted successfully', review: parentReview });
            }
            return res.status(404).json({ message: 'Review not found' });
        }

        const targetId = review.businessId || review.eventId;
        if (targetId) {
            await updateBusinessSentimentAndRating(targetId.toString(), review.entityType === 'event');
        }

        res.json({ message: 'Review deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get average rating for a business
 */
export const getBusinessRatingStats = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;

        // Check if this business is an event
        const business = await Business.findById(businessId);

        let matchCondition;
        if (business && (business.type === 'event' || business.type === 'both')) {
            // For events, match eventId
            matchCondition = {
                eventId: new mongoose.Types.ObjectId(businessId),
                status: 'published'
            };
        } else {
            // For regular businesses, match businessId
            matchCondition = {
                businessId: new mongoose.Types.ObjectId(businessId),
                status: 'published'
            };
        }

        const stats = await Review.aggregate([
            { $match: matchCondition },
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                averageRating: { $avg: '$rating' },
                                totalReviews: { $sum: 1 }
                            }
                        }
                    ],
                    distribution: [
                        {
                            $group: {
                                _id: '$rating',
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        const summary = stats[0].summary[0] || { averageRating: 0, totalReviews: 0 };
        const distributionRaw = stats[0].distribution || [];

        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        distributionRaw.forEach((d: any) => {
            ratingDistribution[d._id] = d.count;
        });

        res.json({
            averageRating: summary.averageRating || 0,
            totalReviews: summary.totalReviews || 0,
            ratingDistribution
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get all reviews for an event
 */
export const getEventReviews = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        console.log('Fetching reviews for event:', eventId);
        
        const reviews = await Review.find({
            eventId: new mongoose.Types.ObjectId(eventId),
            entityType: 'event'
        }).sort({ createdAt: -1 });
        
        console.log(`Found ${reviews.length} reviews`);
        
        // Enhance reviews with user profile photos if missing
        const enhancedReviews = await Promise.all(reviews.map(async (review) => {
            const reviewObj = review.toObject();
            
            // If userPhoto is missing or empty, try to fetch from User collection
            if (!reviewObj.userPhoto || reviewObj.userPhoto === '') {
                try {
                    const user = await User.findOne({ uid: reviewObj.userId });
                    if (user) {
                        // Try multiple fields in order of preference
                        reviewObj.userPhoto = user.photoURL || user.currentAvatar || user.profilePicture?.data?.toString() || '';
                        console.log(`Enhanced review ${reviewObj._id} with user photo from User collection`);
                    }
                } catch (userError) {
                    console.error('Error fetching user photo:', userError);
                }
            }
            
            return reviewObj;
        }));
        
        res.json(enhancedReviews);
    } catch (error: any) {
        console.error('Error in getEventReviews:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Add a review for an event
 */
export const addEventReview = async (req: Request, res: Response) => {
    try {
        const eventIdRaw = req.params.eventId || req.body.eventId;

        console.log('=== addEventReview START ===');
        console.log('eventId:', eventIdRaw);
        console.log('Request body keys:', Object.keys(req.body));
        console.log('Request files:', req.files ? (req.files as any[]).length : 0);

        if (!eventIdRaw) {
            console.log('ERROR: Event ID is missing');
            return res.status(400).json({ success: false, message: 'Event ID is required' });
        }

        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(eventIdRaw)) {
            console.log('ERROR: Invalid event ID format:', eventIdRaw);
            return res.status(400).json({ success: false, message: 'Invalid event ID format' });
        }

        let { userId, userName, userPhoto, rating, comment, bookingId, images: bodyImages } = req.body;

        console.log('Parsed fields:', { userId, userName, userPhoto: userPhoto ? 'provided' : 'missing', rating, comment: comment?.substring(0, 50) });

        // If userPhoto is missing, try to fetch from User collection
        if (!userPhoto || userPhoto === '') {
            console.log('UserPhoto missing, fetching from User collection...');
            try {
                const user = await User.findOne({ uid: userId });
                if (user) {
                    // Try multiple fields in order of preference
                    userPhoto = user.photoURL || user.currentAvatar || user.profilePicture?.data?.toString() || '';
                    console.log('Fetched userPhoto from User collection:', userPhoto ? 'found' : 'not found');
                }
            } catch (userError) {
                console.error('Error fetching user photo:', userError);
            }
        }

        // Handle file uploads
        let uploadedImages: string[] = [];
        if (req.files && Array.isArray(req.files)) {
            uploadedImages = (req.files as Express.Multer.File[]).map(file => file.path);
            console.log('Uploaded images:', uploadedImages.length);
        }

        // Handle existing images
        let finalImages: string[] = [];
        if (typeof bodyImages === 'string') {
            try {
                finalImages = JSON.parse(bodyImages);
            } catch (e) {
                console.log('Failed to parse bodyImages string');
                finalImages = [];
            }
        } else if (Array.isArray(bodyImages)) {
            finalImages = bodyImages;
        }

        // Combine uploaded and existing
        finalImages = [...finalImages, ...uploadedImages];
        console.log('Final images count:', finalImages.length);

        // Validate required fields
        if (!userId) {
            console.log('ERROR: User ID is missing');
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        if (!userName) {
            console.log('ERROR: User name is missing');
            return res.status(400).json({ success: false, message: 'User name is required' });
        }
        if (!rating || rating < 1 || rating > 5) {
            console.log('ERROR: Invalid rating:', rating);
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }
        if (!comment || !comment.trim()) {
            console.log('ERROR: Comment is missing or empty');
            return res.status(400).json({ success: false, message: 'Comment is required' });
        }

        console.log('All validations passed, checking for existing review...');

        // Check if user has already reviewed this event
        const existingReview = await Review.findOne({
            eventId: new mongoose.Types.ObjectId(eventIdRaw),
            userId: userId
        });

        if (existingReview) {
            console.log('User has already reviewed this event, appending sub-review:', existingReview._id);

            if (!existingReview.subReviews) {
                existingReview.subReviews = [];
            }
            existingReview.subReviews.push({
                rating: Number(rating),
                comment,
                images: finalImages,
                createdAt: new Date()
            });

            await existingReview.save();
            console.log('Sub-review saved successfully');

            // Send email notification for sub-review
            try {
                const user = await User.findOne({ uid: userId });
                const event = await Business.findById(eventIdRaw);

                if (user && event) {
                    // Notify user: their review was submitted
                    await emailService.sendReviewSubmissionEmail({
                        to: user.email,
                        userName: user.displayName || user.name,
                        businessName: event.name,
                        rating,
                        comment
                    });

                    // Notify event organizer: a new review was received
                    const owner = await User.findOne({ uid: event.ownerId });
                    if (owner && owner.email) {
                        await emailService.sendNewReviewAlertEmail({
                            to: owner.email,
                            ownerName: owner.displayName || owner.name || event.name,
                            userName: user.displayName || user.name || 'A customer',
                            businessName: event.name,
                            rating,
                            comment
                        });
                    }
                }
            } catch (emailError) {
                console.error('Failed to send sub-review email:', emailError);
            }

            console.log('=== addEventReview END (sub-review) ===');
            return res.status(200).json({ success: true, data: existingReview });
        }

        console.log('Creating new review...');

        const review = new Review({
            eventId: new mongoose.Types.ObjectId(eventIdRaw),
            entityType: 'event',
            userId,
            userName,
            userPhoto: userPhoto || '',
            rating: Number(rating),
            comment: comment.trim(),
            bookingId: bookingId ? new mongoose.Types.ObjectId(bookingId) : undefined,
            images: finalImages,
            likes: [],
            dislikes: [],
            status: 'published'
        });

        console.log('Review object created, attempting to save...');
        
        try {
            await review.save();
            console.log('New review saved successfully:', review._id);
        } catch (saveError: any) {
            console.error('Error saving review to database:', saveError);
            
            // Check for duplicate key error
            if (saveError.code === 11000) {
                console.error('Duplicate key error - user already reviewed this event');
                return res.status(400).json({
                    success: false,
                    message: 'You have already reviewed this event'
                });
            }
            
            // Re-throw other errors to be caught by outer catch
            throw saveError;
        }

        // Send email notifications
        try {
            console.log('Attempting to send email notifications...');
            const user = await User.findOne({ uid: userId });
            const event = await Business.findById(eventIdRaw);

            console.log('User found:', !!user, 'Event found:', !!event);

            if (user && event) {
                // Notify user: their review was submitted
                try {
                    await emailService.sendReviewSubmissionEmail({
                        to: user.email,
                        userName: user.displayName || user.name,
                        businessName: event.name,
                        rating,
                        comment
                    });
                    console.log('Review submission email sent to user');
                } catch (userEmailError) {
                    console.error('Failed to send review submission email to user:', userEmailError);
                }

                // Notify event organizer: a new review was received
                try {
                    const owner = await User.findOne({ uid: event.ownerId });
                    if (owner && owner.email) {
                        await emailService.sendNewReviewAlertEmail({
                            to: owner.email,
                            ownerName: owner.displayName || owner.name || event.name,
                            userName: user.displayName || user.name || 'A customer',
                            businessName: event.name,
                            rating,
                            comment
                        });
                        console.log('New review alert email sent to owner');
                    }
                } catch (ownerEmailError) {
                    console.error('Failed to send new review alert email to owner:', ownerEmailError);
                }
            } else {
                console.log('Skipping email notifications - user or event not found');
            }
        } catch (emailError) {
            console.error('Failed to send review email (outer catch):', emailError);
            // Don't fail the request if email fails
        }

        console.log('=== addEventReview END (new review) ===');
        return res.status(201).json({ success: true, data: review });
    } catch (error: any) {
        console.error('Error in addEventReview:', error);
        console.error('Error stack:', error.stack);
        
        if (error.code === 11000) {
            console.error('Duplicate key error details:', error.keyPattern, error.keyValue);
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this event',
                details: error.keyPattern
            });
        }
        
        return res.status(500).json({ 
            success: false,
            message: error.message || 'Failed to submit review',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get average rating for an event
 */
export const getEventRatingStats = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const stats = await Review.aggregate([
            {
                $match: {
                    eventId: new mongoose.Types.ObjectId(eventId),
                    entityType: 'event',
                    status: 'published'
                }
            },
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                averageRating: { $avg: '$rating' },
                                totalReviews: { $sum: 1 }
                            }
                        }
                    ],
                    distribution: [
                        {
                            $group: {
                                _id: '$rating',
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        const summary = stats[0].summary[0] || { averageRating: 0, totalReviews: 0 };
        const distributionRaw = stats[0].distribution || [];

        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        distributionRaw.forEach((d: any) => {
            ratingDistribution[d._id] = d.count;
        });

        res.json({
            averageRating: summary.averageRating || 0,
            totalReviews: summary.totalReviews || 0,
            ratingDistribution
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


// Like a review
export const likeReview = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Initialize arrays if they don't exist
        if (!review.likes) review.likes = [];
        if (!review.dislikes) review.dislikes = [];

        // Remove from dislikes if present
        review.dislikes = review.dislikes.filter(id => id !== userId);

        // Toggle like
        if (review.likes.includes(userId)) {
            review.likes = review.likes.filter(id => id !== userId);
        } else {
            review.likes.push(userId);
        }

        await review.save();

        res.status(200).json({
            likes: review.likes,
            dislikes: review.dislikes,
            likesCount: review.likes.length,
            dislikesCount: review.dislikes.length
        });
    } catch (error: any) {
        console.error('Error liking review:', error);
        res.status(500).json({ message: error.message });
    }
};

// Dislike a review
export const dislikeReview = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Initialize arrays if they don't exist
        if (!review.likes) review.likes = [];
        if (!review.dislikes) review.dislikes = [];

        // Remove from likes if present
        review.likes = review.likes.filter(id => id !== userId);

        // Toggle dislike
        if (review.dislikes.includes(userId)) {
            review.dislikes = review.dislikes.filter(id => id !== userId);
        } else {
            review.dislikes.push(userId);
        }

        await review.save();

        res.status(200).json({
            likes: review.likes,
            dislikes: review.dislikes,
            likesCount: review.likes.length,
            dislikesCount: review.dislikes.length
        });
    } catch (error: any) {
        console.error('Error disliking review:', error);
        res.status(500).json({ message: error.message });
    }
};
