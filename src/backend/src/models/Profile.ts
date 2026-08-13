import mongoose, { Schema, Document } from 'mongoose';

export interface IProfile extends Document {
  uid: string;
  displayName: string;
  fullName: string;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  avatarUrl: string;
  avatars: string[];
  currentAvatar: string;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>({
  uid: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
  },
  avatarUrl: { type: String, default: '' },
  avatars: { type: [String], default: [] },
  currentAvatar: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IProfile>('Profile', ProfileSchema); 