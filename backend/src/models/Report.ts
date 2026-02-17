import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reportType: 'user' | 'business' | 'admin';
  userId?: string;
  businessId?: string;
  title: string;
  description: string;
  category: 'booking' | 'revenue' | 'user_activity' | 'business_performance' | 'system' | 'custom';
  data: any;
  dateRange: {
    start: Date;
    end: Date;
  };
  generatedBy: string;
  status: 'pending' | 'completed' | 'failed';
  fileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportType: {
      type: String,
      enum: ['user', 'business', 'admin'],
      required: true,
    },
    userId: {
      type: String,
    },
    businessId: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      enum: ['booking', 'revenue', 'user_activity', 'business_performance', 'system', 'custom'],
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    dateRange: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    generatedBy: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    fileUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ReportSchema.index({ reportType: 1, createdAt: -1 });
ReportSchema.index({ userId: 1, createdAt: -1 });
ReportSchema.index({ businessId: 1, createdAt: -1 });
ReportSchema.index({ status: 1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
