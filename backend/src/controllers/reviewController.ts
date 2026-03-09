import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { emailService } from '../services/emailService';
import mongoose from 'mongoose';

/**
 * Get all reviews for a business
 */
export const getBusinessReviews = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;

        // Check if this business is an event by looking at the Business collection
        const business = await Business.findById(businessId);

        let reviews;
        if (business && (business.type === 'event' || business.type === 'both')) {
            // For events, look for reviews with eventId
            reviews = await Review.find({
                eventId: new mongoose.Types.ObjectId(businessId)
            }).sort({ createdAt: -1 });
        } else {
            // For regular businesses, look for reviews with businessId
            reviews = await Review.find({
                businessId: new mongoose.Types.ObjectId(businessId)
            }).sort({ createdAt: -1 });
        }

        res.json(reviews);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
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
        // Try to get businessId from params first, then body
        const businessIdRaw = req.params.businessId || req.body.businessId;

        if (!businessIdRaw) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        const { userId, userName, userPhoto, rating, comment, bookingId, images } = req.body;

        const review = new Review({
            businessId: new mongoose.Types.ObjectId(businessIdRaw),
            userId,
            userName,
            userPhoto,
            rating,
            comment,
            bookingId: bookingId ? new mongoose.Types.ObjectId(bookingId) : undefined,
            images: images || [],
            likes: [],
            dislikes: []
        });

        await review.save();

        // Send email notifications
        try {
            const user = await User.findOne({ uid: userId });
            const business = await Business.findById(businessIdRaw);

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
            }
        } catch (emailError) {
            console.error('Failed to send review email:', emailError);
            // Continue without failing the request
        }

        res.status(201).json(review);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already reviewed this booking' });
        }
        res.status(500).json({ message: error.message });
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
        const { rating, comment } = req.body;

        const review = await Review.findByIdAndUpdate(
            id,
            { rating, comment, updatedAt: new Date() },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json(review);
    } catch (error: any) {
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
            return res.status(404).json({ message: 'Review not found' });
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
        const reviews = await Review.find({
            eventId: new mongoose.Types.ObjectId(eventId),
            entityType: 'event'
        }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Add a review for an event
 */
export const addEventReview = async (req: Request, res: Response) => {
    try {
        const eventIdRaw = req.params.eventId || req.body.eventId;

        console.log('addEventReview called with eventId:', eventIdRaw);
        console.log('Request body:', req.body);

        if (!eventIdRaw) {
            return res.status(400).json({ message: 'Event ID is required' });
        }

        const { userId, userName, userPhoto, rating, comment, bookingId, images } = req.body;

        // Validate required fields
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        if (!userName) {
            return res.status(400).json({ message: 'User name is required' });
        }
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }
        if (!comment || !comment.trim()) {
            return res.status(400).json({ message: 'Comment is required' });
        }

        // Check if user has already reviewed this event
        const existingReview = await Review.findOne({
            eventId: new mongoose.Types.ObjectId(eventIdRaw),
            userId: userId
        });

        if (existingReview) {
            console.log('User has already reviewed this event, updating existing review:', existingReview._id);

            // Update the existing review instead of creating a new one
            existingReview.rating = rating;
            existingReview.comment = comment;
            existingReview.userPhoto = userPhoto;
            existingReview.userName = userName;

            await existingReview.save();

            return res.status(200).json({
                message: 'Review updated successfully',
                review: existingReview
            });
        }

        const review = new Review({
            eventId: new mongoose.Types.ObjectId(eventIdRaw),
            entityType: 'event',
            userId,
            userName,
            userPhoto,
            rating,
            comment,
            bookingId: bookingId ? new mongoose.Types.ObjectId(bookingId) : undefined,
            images: images || [],
            likes: [],
            dislikes: []
        });

        await review.save();

        // Send email notifications
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
            console.error('Failed to send review email:', emailError);
        }

        res.status(201).json(review);
    } catch (error: any) {
        console.error('Error in addEventReview:', error);
        if (error.code === 11000) {
            console.error('Duplicate key error details:', error.keyPattern, error.keyValue);
            return res.status(400).json({
                message: 'You have already reviewed this event',
                details: error.keyPattern
            });
        }
        res.status(500).json({ message: error.message });
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
