import mongoose, { Document, Schema } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  role: 'super_admin' | 'admin';
  isActive: boolean;
  addedBy: string; // Email of the admin who added this admin
  createdAt: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  timezone?: string;
  permissions: {
    canImpersonate: boolean;
  };
}

export interface IAdminOTP extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  role: {
    type: mongoose.Schema.Types.String,
    enum: ['super_admin', 'admin'],
    default: () => 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addedBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  timezone: {
    type: mongoose.Schema.Types.String,
    default: () => 'Asia/Kolkata'
  },
  permissions: {
    canImpersonate: {
      type: Boolean,
      default: false
    }
  }
});

const AdminOTPSchema = new Schema<IAdminOTP>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  attempts: {
    type: Number,
    default: 0
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for automatic cleanup of expired OTPs
AdminOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if account is locked
AdminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

// Pre-save middleware to handle failed login attempts
AdminSchema.pre('save', function(next) {
  // If we're modifying loginAttempts and it's not being reset
  if (this.isModified('loginAttempts') && this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
  }
  next();
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
export const AdminOTP = mongoose.model<IAdminOTP>('AdminOTP', AdminOTPSchema);