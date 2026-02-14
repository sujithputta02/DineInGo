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
        const reviews = await Review.find({ businessId: new mongoose.Types.ObjectId(businessId) }).sort({ createdAt: -1 });
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
        // Populate the business details to show where the review was left
        const reviews = await Review.find({ userId }).sort({ createdAt: -1 }).populate('businessId', 'name image location');
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
            images: images || []
        });

        await review.save();

        // Send email notification to user
        try {
            const user = await User.findOne({ uid: userId });
            const business = await Business.findById(businessIdRaw);

            if (user && business) {
                await emailService.sendReviewSubmissionEmail({
                    to: user.email,
                    userName: user.displayName || user.name,
                    businessName: business.name,
                    rating,
                    comment
                });
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
        const stats = await Review.aggregate([
            { $match: { businessId: new mongoose.Types.ObjectId(businessId), status: 'published' } },
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
