import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
    businessId: mongoose.Types.ObjectId;
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
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
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
    status: { type: String, enum: ['published', 'hidden'], default: 'published' }
}, {
    timestamps: true
});

// Compound index for unique review per booking
reviewSchema.index({ bookingId: 1, userId: 1 }, { unique: true, sparse: true });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
