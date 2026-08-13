import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IActivity {
  type: 'signup' | 'login' | 'logout';
  timestamp: Date;
  deviceInfo?: string;
  ipAddress?: string;
  source?: string; // 'google', 'email', etc.
}

export interface IUser extends Document {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL: string | null;
  profilePicture?: {
    data: Buffer;
    contentType: string;
  };
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  locationSettings?: {
    type?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    searchRadius?: number;
  };
  avatars?: string[];
  currentAvatar?: string;
  language?: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt?: Date;
  emailVerified: boolean;
  activities: IActivity[];
  role: 'customer' | 'owner' | 'admin';
  password?: string;
  isAdmin?: boolean;
  isEarlyAccess?: boolean;
  onboardingCompleted?: boolean;
  favorites?: string[] | any[];
  timezone?: string;
}

// Add interface for static methods
interface IUserModel extends Model<IUser> {
  checkActivities(uid: string): Promise<IActivity[] | null>;
}

const activitySchema = new Schema<IActivity>({
  type: { type: String, enum: ['signup', 'login', 'logout'], required: true },
  timestamp: { type: Date, default: Date.now },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  source: { type: String }
}, { _id: false });

const userSchema = new Schema<IUser>({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  name: { type: String, required: true },
  photoURL: { type: String, default: null },
  profilePicture: {
    data: Buffer,
    contentType: String
  },
  phoneNumber: { type: String, default: '' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    zipCode: { type: String, default: '' }
  },
  locationSettings: {
    type: { type: String, default: 'manual' },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    zipCode: { type: String, default: '' },
    searchRadius: { type: Number, default: 10 }
  },
  avatars: { type: [String], default: [] },
  currentAvatar: { type: String, default: '' },
  language: { type: String, default: 'english' },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  emailVerified: { type: Boolean, default: false },
  activities: [activitySchema],
  role: { type: String, enum: ['customer', 'owner', 'admin'], default: 'customer' },
  password: { type: String },
  isAdmin: { type: Boolean, default: false },
  isEarlyAccess: { type: Boolean, default: false },
  onboardingCompleted: { type: Boolean, default: false },
  favorites: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
  timezone: { type: String, default: 'Asia/Kolkata' }
});

// Static method to log activities for a user
userSchema.statics.checkActivities = async function (uid: string): Promise<IActivity[] | null> {
  try {
    const user = await this.findOne({ uid });
    if (!user) {
      console.log(`No user found with uid: ${uid}`);
      return null;
    }

    console.log(`User ${user.email} (${uid}) has ${user.activities.length} activities:`);
    user.activities.forEach((activity: IActivity, i: number) => {
      console.log(`  ${i + 1}. ${activity.type} (${activity.source || 'unknown'}) - ${activity.timestamp}`);
    });

    return user.activities;
  } catch (error) {
    console.error('Error checking activities:', error);
    return null;
  }
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema); 