import mongoose, { Schema, Document } from 'mongoose';

export interface IIssueReport extends Document {
  reporterType: 'user' | 'business' | 'guest';
  reporterId?: string;
  reporterEmail: string;
  reporterName: string;
  issueType: 'bug' | 'feature_request' | 'performance' | 'security' | 'payment' | 'booking' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  browserInfo?: string;
  deviceInfo?: string;
  screenshots?: string[];
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IssueReportSchema = new Schema<IIssueReport>(
  {
    reporterType: {
      type: String,
      enum: ['user', 'business', 'guest'],
      required: true,
    },
    reporterId: {
      type: String,
    },
    reporterEmail: {
      type: String,
      required: true,
    },
    reporterName: {
      type: String,
      required: true,
    },
    issueType: {
      type: String,
      enum: ['bug', 'feature_request', 'performance', 'security', 'payment', 'booking', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    stepsToReproduce: {
      type: String,
    },
    expectedBehavior: {
      type: String,
    },
    actualBehavior: {
      type: String,
    },
    browserInfo: {
      type: String,
    },
    deviceInfo: {
      type: String,
    },
    screenshots: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'],
      default: 'open',
    },
    assignedTo: {
      type: String,
    },
    resolution: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
IssueReportSchema.index({ status: 1, createdAt: -1 });
IssueReportSchema.index({ reporterId: 1, createdAt: -1 });
IssueReportSchema.index({ issueType: 1 });
IssueReportSchema.index({ priority: 1 });

export const IssueReport = mongoose.model<IIssueReport>('IssueReport', IssueReportSchema);
