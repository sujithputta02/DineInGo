import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Staff } from '../models/Staff';
import { Shift } from '../models/Shift';
import { Promotion } from '../models/Promotion';
import { Campaign } from '../models/Campaign';
import { Review } from '../models/Review';
import mongoose from 'mongoose';

/**
 * SECURITY: Business Owner Role Guard
 * Verifies that the requester is a registered business owner or admin
 * Checks both MongoDB user record AND Firebase token role
 * 
 * SPECIAL CASE: Allows first-time business creation for any authenticated user
 */
export const verifyBusinessOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = (req as any).user;
    if (!requester) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required.' });
    }

    // Check Firebase token role first
    const tokenRole = requester.role;
    const isOwnerByToken = tokenRole === 'owner' || tokenRole === 'admin' || tokenRole === 'super_admin';
    
    // Check MongoDB user record
    const user = await User.findOne({ uid: requester.uid });
    const isOwnerByDB = user && (user.role === 'owner' || user.role === 'admin' || user.isAdmin);

    // ✅ SPECIAL CASE: Allow first-time business creation
    // If this is a POST request (creating new business), allow any authenticated user
    // After creation, they will become an owner
    const isCreatingBusiness = req.method === 'POST' && !req.params.id && !req.params.businessId;
    
    if (isCreatingBusiness) {
      console.log(`[BusinessAuth] Allowing first-time business creation for user ${requester.uid}`);
      (req as any).userData = user;
      return next();
    }

    // For all other operations (update, delete, etc.), require owner role
    if (!isOwnerByToken && !isOwnerByDB) {
      console.warn(`[BusinessAuth] Access denied for user ${requester.uid}:`, {
        tokenRole,
        dbRole: user?.role,
        isAdmin: user?.isAdmin,
        method: req.method,
        path: req.path
      });
      return res.status(403).json({ success: false, message: 'Access Denied: Business owner role required.' });
    }

    (req as any).userData = user;
    next();
  } catch (error) {
    console.error('Error in verifyBusinessOwner middleware:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * SECURITY: Business Ownership Verification
 * Verifies that the requesting user owns the specific business being requested/modified
 */
export const verifyBusinessAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = (req as any).user;
    if (!requester) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required.' });
    }

    const businessId = req.params.businessId || req.params.id;
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Bad Request: Business ID is missing.' });
    }

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ success: false, message: 'Invalid Business ID format.' });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const user = await User.findOne({ uid: requester.uid });
    const isOwner = business.ownerId === requester.uid;
    const isAdmin = user && (user.role === 'admin' || user.isAdmin);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access Denied: You do not own this business.' });
    }

    next();
  } catch (error) {
    console.error('Error in verifyBusinessAccess middleware:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * SECURITY: Resource Ownership Verification
 * Verifies ownership of sub-resources (Staff, Shifts, Promotions, Campaigns)
 */
export const verifyResourceAccess = (modelName: 'Staff' | 'Shift' | 'Promotion' | 'Campaign' | 'Review') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requester = (req as any).user;
      if (!requester) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required.' });
      }

      const resourceId = req.params.id;
      if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing resource ID.' });
      }

      let businessId: any;
      if (modelName === 'Staff') {
        const doc = await Staff.findById(resourceId);
        businessId = doc?.businessId;
      } else if (modelName === 'Shift') {
        const doc = await Shift.findById(resourceId);
        businessId = doc?.businessId;
      } else if (modelName === 'Promotion') {
        const doc = await Promotion.findById(resourceId);
        businessId = doc?.businessId;
      } else if (modelName === 'Campaign') {
        const doc = await Campaign.findById(resourceId);
        businessId = doc?.businessId;
      } else if (modelName === 'Review') {
        const doc = await Review.findById(resourceId);
        businessId = doc?.businessId || doc?.eventId; // event reviews are also owned by the business
      }

      if (!businessId) {
        return res.status(404).json({ success: false, message: `${modelName} resource not found.` });
      }

      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({ success: false, message: 'Associated business not found.' });
      }

      const user = await User.findOne({ uid: requester.uid });
      const isOwner = business.ownerId === requester.uid;
      const isAdmin = user && (user.role === 'admin' || user.isAdmin);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Access Denied: You do not own this business.' });
      }

      next();
    } catch (error) {
      console.error(`Error in verifyResourceAccess (${modelName}):`, error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
};
