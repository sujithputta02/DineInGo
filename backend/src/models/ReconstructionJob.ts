import mongoose, { Document, Schema } from 'mongoose';

export type ReconstructionStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ReconstructionAssetQuality = 
  | 'verified-asset' 
  | 'reconstructed-model' 
  | 'illustrative-model' 
  | 'representative-preview' 
  | 'photo-fallback';

export interface IReconstructionDimensions {
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
}

export interface IReconstructionJob extends Document {
  jobId: string;
  userId: string;
  dishName: string;
  imageUrl?: string;
  status: ReconstructionStatus;
  progress: number;
  provider: 'hf-triposr' | 'triposr' | 'meshy' | 'tripo3d' | 'illustrative-calibrated' | 'unconfigured';
  modelUrl?: string;
  assetQuality: ReconstructionAssetQuality;
  dimensions?: IReconstructionDimensions;
  contactPlaneAligned: boolean;
  metadata?: Record<string, any>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReconstructionJobSchema: Schema = new Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  dishName: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  provider: {
    type: String,
    enum: ['hf-triposr', 'triposr', 'meshy', 'tripo3d', 'illustrative-calibrated', 'unconfigured'],
    default: 'unconfigured'
  },
  modelUrl: {
    type: String
  },
  assetQuality: {
    type: String,
    enum: ['verified-asset', 'reconstructed-model', 'illustrative-model', 'representative-preview', 'photo-fallback'],
    default: 'photo-fallback'
  },
  dimensions: {
    widthMeters: { type: Number },
    heightMeters: { type: Number },
    depthMeters: { type: Number }
  },
  contactPlaneAligned: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

export const ReconstructionJob = mongoose.model<IReconstructionJob>('ReconstructionJob', ReconstructionJobSchema);
