import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
    businessId?: mongoose.Types.ObjectId; // Optional for backward compatibility
    eventId?: mongoose.Types.ObjectId; // New: for event reviews
    entityType: 'business' | 'event'; // New: to distinguish between business and event reviews
    userId: string;
    userName: string;
    userPhoto?: string;
    bookingId?: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    reply?: {
        text: string;
        repliedAt: Date;
    };
    images: string[];
    status: 'published' | 'hidden';
    likes: string[]; // Array of user IDs who liked
    dislikes: string[]; // Array of user IDs who disliked
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Business', index: true }, // Events are stored in Business collection
    entityType: { type: String, enum: ['business', 'event'], required: true, default: 'business' },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userPhoto: { type: String },
    bookingId: { type: Schema.Types.ObjectId, ref: 'TableBooking' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    reply: {
        text: { type: String },
        repliedAt: { type: Date }
    },
    images: [{ type: String }],
    status: { type: String, enum: ['published', 'hidden'], default: 'published' },
    likes: { type: [String], default: [] }, // Array of user IDs
    dislikes: { type: [String], default: [] } // Array of user IDs
}, {
    timestamps: true
});

// Compound index for unique review per booking (only when bookingId is an ObjectId)
reviewSchema.index({ bookingId: 1, userId: 1 }, { 
    unique: true,
    partialFilterExpression: { bookingId: { $type: 'objectId' } }
});

// Unique index for event reviews (one review per user per event, only when eventId is an ObjectId)
reviewSchema.index({ eventId: 1, userId: 1 }, { 
    unique: true,
    partialFilterExpression: { eventId: { $type: 'objectId' } }
});

export const Review = mongoose.model<IReview>('Review', reviewSchema);
