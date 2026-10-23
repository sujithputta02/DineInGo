import mongoose, { Document, Schema } from 'mongoose';

export interface IVariant {
  key: string;            // 'control' | 'variant_b'
  name: string;           // e.g. 'Variant A (Static Hero CTA)'
  description: string;
  trafficAllocation: number; // percentage, e.g. 50
  exposures: number;
  conversions: number;
}

export interface IExperiment extends Document {
  experimentId: string;
  name: string;
  description: string;
  funnelStage: string;    // 'Stage 1 -> 2' | 'Stage 3 -> 4' | 'Stage 4 -> 5'
  hypothesis: string;
  primaryMetric: string;
  status: 'active' | 'paused' | 'concluded';
  variants: IVariant[];
  targetSampleSize: number;
  startDate: Date;
  concludedDate?: Date;
  winner?: string;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IVariant>({
  key: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  trafficAllocation: { type: Number, default: 50 },
  exposures: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
}, { _id: false });

const experimentSchema = new Schema<IExperiment>({
  experimentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  funnelStage: { type: String, required: true },
  hypothesis: { type: String, required: true },
  primaryMetric: { type: String, required: true },
  status: { type: String, enum: ['active', 'paused', 'concluded'], default: 'active' },
  variants: { type: [variantSchema], default: [] },
  targetSampleSize: { type: Number, default: 1000 },
  startDate: { type: Date, default: Date.now },
  concludedDate: { type: Date },
  winner: { type: String },
}, {
  timestamps: true,
});

export const Experiment = mongoose.model<IExperiment>('Experiment', experimentSchema);
