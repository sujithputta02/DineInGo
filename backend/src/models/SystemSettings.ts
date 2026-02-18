import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceStartedAt?: Date;
  maintenanceStartedBy?: string;
  allowedAdminEmails: string[];
  estimatedEndTime?: Date;
  maxAdmins: number;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: 'We are currently performing scheduled maintenance. We\'ll be back shortly!',
    },
    maintenanceStartedAt: {
      type: Date,
    },
    maintenanceStartedBy: {
      type: String,
    },
    allowedAdminEmails: {
      type: [String],
      default: [],
    },
    estimatedEndTime: {
      type: Date,
    },
    maxAdmins: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);

// Helper function to get or create settings
export const getSystemSettings = async (): Promise<ISystemSettings> => {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({
      maintenanceMode: false,
      maintenanceMessage: 'We are currently performing scheduled maintenance. We\'ll be back shortly!',
      maxAdmins: 5,
    });
  }
  return settings;
};
