import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformSettings extends Document {
  platformName: string;
  platformEmail: string;
  platformPhone: string;
  timezone: string;
  currency: string;
  defaultLanguage: string;
  commissionRate: number;
  bookingAdvanceDays: number;
  cancellationHours: number;
  autoConfirmBookings: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: number;
  apiRateLimit: boolean;
  featureFlags: {
    arMenus: boolean;
    preOrders: boolean;
    events: boolean;
    waitlist: boolean;
  };
  updatedBy: string;
  updatedAt: Date;
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    platformName: {
      type: String,
      default: 'DineInGo',
    },
    platformEmail: {
      type: String,
      default: 'support@dineingo.com',
    },
    platformPhone: {
      type: String,
      default: '+1 (555) 123-4567',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    defaultLanguage: {
      type: String,
      default: 'english',
    },
    commissionRate: {
      type: Number,
      default: 15,
      min: 0,
      max: 100,
    },
    bookingAdvanceDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365,
    },
    cancellationHours: {
      type: Number,
      default: 24,
      min: 0,
      max: 168,
    },
    autoConfirmBookings: {
      type: Boolean,
      default: false,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    twoFactorAuth: {
      type: Boolean,
      default: true,
    },
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
    },
    apiRateLimit: {
      type: Boolean,
      default: true,
    },
    featureFlags: {
      arMenus: { type: Boolean, default: true },
      preOrders: { type: Boolean, default: true },
      events: { type: Boolean, default: true },
      waitlist: { type: Boolean, default: true },
    },
    updatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformSettings = mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema);

// Helper function to get or create settings
export const getPlatformSettings = async (): Promise<IPlatformSettings> => {
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = await PlatformSettings.create({
      updatedBy: 'system',
    });
  }
  return settings;
};
