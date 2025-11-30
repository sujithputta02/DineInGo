import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  userId: string;
  eventId?: string;
  restaurantId?: string;
  type: 'event' | 'restaurant';
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
  },
  eventId: {
    type: String,
    required: false,
    validate: {
      validator: function(this: IFavorite, value: string) {
        // If type is event, eventId must be provided
        if (this.type === 'event' && !value) {
          return false;
        }
        return true;
      },
      message: 'Event ID is required when type is event'
    }
  },
  restaurantId: {
    type: String,
    required: false,
    validate: {
      validator: function(this: IFavorite, value: string) {
        // If type is restaurant, restaurantId must be provided
        if (this.type === 'restaurant' && !value) {
          return false;
        }
        return true;
      },
      message: 'Restaurant ID is required when type is restaurant'
    }
  },
  type: {
    type: String,
    enum: ['event', 'restaurant'],
    required: [true, 'Type is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save validation hook
favoriteSchema.pre('save', function(next) {
  if (this.type === 'event' && !this.eventId) {
    next(new Error('Event ID is required when type is event'));
  } else if (this.type === 'restaurant' && !this.restaurantId) {
    next(new Error('Restaurant ID is required when type is restaurant'));
  } else {
    next();
  }
});

// Create compound unique indexes to prevent duplicate favorites
// Only index the fields that are actually used for each type
favoriteSchema.index(
  { userId: 1, eventId: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { 
      type: 'event', 
      eventId: { $type: 'string' } 
    }
  }
);

favoriteSchema.index(
  { userId: 1, restaurantId: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { 
      type: 'restaurant', 
      restaurantId: { $type: 'string' } 
    }
  }
);

// Create a non-unique index on userId for efficient queries
favoriteSchema.index({ userId: 1 });

export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);
