import mongoose, { Schema, Document } from 'mongoose';

export interface ITranslation extends Document {
  key: string;
  language: string;
  value: string;
  isAutomatic: boolean;
  updatedAt: Date;
}

const TranslationSchema: Schema = new Schema({
  key: { type: String, required: true },
  language: { type: String, required: true },
  value: { type: String, required: true },
  isAutomatic: { type: Boolean, default: false },
}, { 
  timestamps: true 
});

// Compound index to ensure uniqueness per key-language pair
TranslationSchema.index({ key: 1, language: 1 }, { unique: true });

export default mongoose.model<ITranslation>('Translation', TranslationSchema);
