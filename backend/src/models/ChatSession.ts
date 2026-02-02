import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  userId: string;
  messages: IChatMessage[];
  userContext: {
    userName?: string;
    email?: string;
    preferences?: string[];
    favoriteRestaurants?: string[];
    bookingHistory?: string[];
  };
  metadata: {
    totalMessages: number;
    lastActive: Date;
    sessionStarted: Date;
    userAgent?: string;
    ipAddress?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  role: { 
    type: String, 
    enum: ['user', 'assistant', 'system'], 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const chatSessionSchema = new Schema<IChatSession>({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  messages: [chatMessageSchema],
  userContext: {
    userName: String,
    email: String,
    preferences: [String],
    favoriteRestaurants: [String],
    bookingHistory: [String]
  },
  metadata: {
    totalMessages: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    sessionStarted: { type: Date, default: Date.now },
    userAgent: String,
    ipAddress: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
chatSessionSchema.index({ userId: 1, 'metadata.lastActive': -1 });

// Update timestamps before saving
chatSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.metadata.lastActive = new Date();
  this.metadata.totalMessages = this.messages.length;
  next();
});

export const ChatSession = mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
