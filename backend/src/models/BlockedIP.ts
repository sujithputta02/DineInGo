/**
 * BLOCKED IP MODEL
 * Stores IP addresses that have been blocked due to suspicious activity
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IBlockedIP extends Document {
  ipAddress: string;
  reason: string;
  blockedBy: string;
  blockedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

const blockedIPSchema = new Schema<IBlockedIP>({
  ipAddress: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  blockedBy: {
    type: String,
    required: true
  },
  blockedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
});

// Index for efficient querying
blockedIPSchema.index({ ipAddress: 1, isActive: 1 });

export default mongoose.model<IBlockedIP>('BlockedIP', blockedIPSchema);
