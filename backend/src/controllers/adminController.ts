import { Request, Response } from 'express';
import { Admin, AdminOTP } from '../models/Admin';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Booking } from '../models/Booking';
import Notification from '../models/Notification';
import UserNotification from '../models/UserNotification';
import BusinessNotification from '../models/BusinessNotification';
import AllUserNotification from '../models/AllUserNotification';
import NotificationStats from '../models/NotificationStats';
import { getSystemSettings } from '../models/SystemSettings';
import * as crypto from 'crypto';
import { generateAdminToken } from '../middleware/adminAuth';
import { SecurityLog } from '../models/SecurityLog';
import BlockedIP from '../models/BlockedIP';
import { EarlyAccess } from '../models/EarlyAccess';
import { emailService } from '../services/emailService';

// Super admin email (DineInGo owner)
const SUPER_ADMIN_EMAIL = 'sujithputta02@gmail.com';

// Initialize super admin on first run
export const initializeSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await Admin.findOne({ email: SUPER_ADMIN_EMAIL });
    if (!existingSuperAdmin) {
      await Admin.create({
        email: SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        isActive: true,
        addedBy: 'system'
      });
      console.log('✓ Super admin initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
};

// Generate 6-digit OTP
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP email (legacy wrapper for backward compatibility within this file)
const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  return emailService.sendAdminOTPEmail(email, otp);
};

export const requestAdminOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if email is a valid admin
    const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true });
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. You are not authorized as an admin.' 
      });
    }

    // Check if account is locked
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      console.log('Admin account is locked');
      return res.status(423).json({ 
        success: false, 
        message: 'Account is temporarily locked due to multiple failed attempts. Please try again later.' 
      });
    }

    // Clear any old OTP records for this email first
    await AdminOTP.deleteMany({ email: email.toLowerCase() });

    // Generate and save OTP
    const otp = generateOTP();
    
    await AdminOTP.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send OTP email (non-blocking)
    sendOTPEmail(email, otp).catch(err => 
      console.error('Failed to send admin OTP email:', err)
    );
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully. Check your email.'
    });

  } catch (error) {
    console.error('Error requesting admin OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Verify OTP and login
export const verifyAdminOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, timezone } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    // Check if account is locked
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (admin && admin.lockUntil && admin.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((admin.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
        locked: true,
        lockUntil: admin.lockUntil
      });
    }

    // Find valid OTP
    const otpRecord = await AdminOTP.findOne({
      email: email.toLowerCase(),
      otp,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      // Increment failed attempts for the admin
      if (admin) {
        admin.loginAttempts += 1;
        const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'Unknown';
        const { logFailedLogin } = await import('../middleware/adminAuditLog');

        if (admin.loginAttempts >= 5) {
          admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
          await admin.save();
          
          await logFailedLogin(email.toLowerCase(), ipAddress, 'Account locked due to 5 failed attempts');

          // Log to Universal Security Log
          await SecurityLog.create({
            portal: 'admin',
            eventType: 'failed_login',
            severity: 'high',
            details: `Admin account ${email} locked after 5 failed OTP attempts.`,
            ip: String(ipAddress),
            userAgent: req.headers['user-agent'],
            path: req.path
          });

          return res.status(423).json({
            success: false,
            message: 'Account locked due to too many failed attempts. Try again in 15 minutes.',
            locked: true,
            lockUntil: admin.lockUntil
          });
        } else {
          await admin.save();
          
          await logFailedLogin(email.toLowerCase(), ipAddress, `Invalid OTP (${admin.loginAttempts}/5 attempts)`);

          // Log to Universal Security Log
          await SecurityLog.create({
            portal: 'admin',
            eventType: 'failed_login',
            severity: 'medium',
            details: `Invalid OTP attempt for ${email} (${admin.loginAttempts}/5 attempts)`,
            ip: String(ipAddress),
            userAgent: req.headers['user-agent'],
            path: req.path
          });
        }
      }

      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired OTP',
        attemptsRemaining: admin ? 5 - admin.loginAttempts : undefined
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Update admin login info
    if (admin) {
      admin.lastLogin = new Date();
      admin.loginAttempts = 0; // Reset failed attempts
      admin.lockUntil = undefined; // Remove lock
      if (timezone) admin.timezone = timezone;
      await admin.save();
    }

    // Generate JWT token (4 hours expiration)
    const token = generateAdminToken(admin!.email, admin!.role);

    // Send login notification email (non-blocking)
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
    sendLoginNotificationEmail(admin!.email, admin!.lastLogin!, ipAddress, timezone || admin?.timezone).catch(err => 
      console.error('Failed to send login notification:', err)
    );

    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      tokenExpiresIn: '4h',
      admin: {
        email: admin?.email,
        role: admin?.role,
        lastLogin: admin?.lastLogin
      }
    });

  } catch (error) {
    console.error('Error verifying admin OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get all admins (only for super admin)
export const getAdmins = async (req: Request, res: Response) => {
  try {
    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated admin's data
    
    const admins = await Admin.find({}, { 
      email: 1, 
      role: 1, 
      isActive: 1, 
      addedBy: 1, 
      createdAt: 1, 
      lastLogin: 1 
    }).sort({ createdAt: -1 });

    const settings = await getSystemSettings();

    res.json({ 
      success: true, 
      admins,
      totalCount: admins.length,
      maxAdmins: settings.maxAdmins
    });

  } catch (error) {
    console.error('Error getting admins:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Add new admin (only for super admin)
export const addAdmin = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated super admin's data

    // Get max admins from settings
    const settings = await getSystemSettings();
    const MAX_ADMINS = settings.maxAdmins;

    // Check admin limit
    const currentAdminCount = await Admin.countDocuments({ isActive: true });
    if (currentAdminCount >= MAX_ADMINS) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum admin limit reached (${MAX_ADMINS}). Please remove an admin before adding a new one.` 
      });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered as an admin.' 
      });
    }

    // Create new admin
    const newAdmin = await Admin.create({
      email: email.toLowerCase(),
      role: 'admin',
      isActive: true,
      addedBy: req.admin!.email
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email).catch(err => 
      console.error('Failed to send admin welcome email:', err)
    );

    res.json({ 
      success: true, 
      message: 'Admin added successfully',
      admin: {
        email: newAdmin.email,
        role: newAdmin.role,
        addedBy: newAdmin.addedBy,
        createdAt: newAdmin.createdAt
      }
    });

  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Send login notification email to admin (wrapper)
const sendLoginNotificationEmail = async (email: string, loginTime: Date, ipAddress?: string, timezone?: string): Promise<boolean> => {
  return emailService.sendAdminLoginNotificationEmail(email, loginTime, ipAddress, timezone);
};

// Send welcome email (wrapper)
const sendWelcomeEmail = async (email: string): Promise<boolean> => {
  return emailService.sendUserWelcomeEmail(email, 'New Admin');
};

// Remove admin (only for super admin)
export const removeAdmin = async (req: Request, res: Response) => {
  try {
    const { adminEmail } = req.body;

    if (!adminEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin email is required' 
      });
    }

    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated super admin's data

    // Prevent removing super admin
    if (adminEmail.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot remove the super admin.' 
      });
    }

    // Remove admin
    const removedAdmin = await Admin.findOneAndDelete({ 
      email: adminEmail.toLowerCase(),
      role: 'admin' // Only allow removing regular admins
    });

    if (!removedAdmin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found or cannot be removed.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Admin removed successfully'
    });

  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get admin dashboard stats
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    // Admin is already verified by middleware, get from req.admin
    const adminEmail = req.admin?.email;

    if (!adminEmail) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Get real-time statistics
    const [
      totalUsers,
      activeUsers,
      totalBusinesses,
      activeBusinesses,
      totalBookings,
      todayBookings,
      pendingBusinesses,
      recentUsers,
      recentBookings,
      monthlyStats
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $ne: 'admin' } }), // Active users (non-admin)
      Business.countDocuments(),
      Business.countDocuments({ status: 'active' }),
      Booking.countDocuments(),
      Booking.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Business.countDocuments({ status: 'draft' }), // Pending businesses
      User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).limit(5).select('name displayName email createdAt role'),
      Booking.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name displayName email').populate('businessId', 'name'),
      getMonthlyStats()
    ]);

    // Calculate revenue (mock calculation - you can implement real revenue logic)
    const totalRevenue = totalBookings * 25; // Average booking value
    const monthlyRevenue = todayBookings * 25 * 30; // Estimated monthly

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalBusinesses,
        activeBusinesses,
        totalBookings,
        todayBookings,
        pendingBusinesses,
        totalRevenue,
        monthlyRevenue,
        systemHealth: 98.5,
        responseTime: Math.floor(Math.random() * 200) + 100
      },
      recentActivity: [
        ...recentUsers.map(user => ({
          id: user._id,
          type: 'user_signup',
          user: user.displayName || user.name || user.email,
          time: getTimeAgo(user.createdAt),
          status: user.role === 'admin' ? 'inactive' : 'success'
        })),
        ...recentBookings.map(booking => ({
          id: booking._id,
          type: 'booking_made',
          user: (booking.userId as any)?.displayName || (booking.userId as any)?.name || 'Unknown User',
          business: (booking.businessId as any)?.name || 'Unknown Business',
          time: getTimeAgo(booking.createdAt),
          status: booking.status || 'pending'
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10),
      monthlyStats
    });

  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get monthly statistics for charts
const getMonthlyStats = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyData = await Promise.all([
    // Users by month
    User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    // Businesses by month
    Business.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    // Bookings by month
    Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);

  // Format data for charts
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const users = monthlyData[0].find(item => item._id.year === year && item._id.month === month)?.count || 0;
    const businesses = monthlyData[1].find(item => item._id.year === year && item._id.month === month)?.count || 0;
    const bookings = monthlyData[2].find(item => item._id.year === year && item._id.month === month)?.count || 0;

    chartData.push({
      name: months[month - 1],
      users,
      businesses,
      revenue: bookings * 25 // Mock revenue calculation
    });
  }

  return chartData;
};

// Helper function to get time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  return `${diffInDays} days ago`;
};

// Get all users for admin management
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;

    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== 'all') {
      // Use role to determine active/inactive status
      if (status === 'active') {
        query.role = { $ne: 'admin' };
      } else {
        query.role = 'admin';
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('displayName name email phoneNumber role createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalUsers / Number(limit)),
        totalUsers,
        hasNext: skip + Number(limit) < totalUsers,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get all businesses for admin management
export const getAllBusinesses = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;

    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'locationData.city': { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== 'all') {
      if (status === 'pending') {
        query.status = 'draft';
      } else if (status === 'active') {
        query.status = 'active';
      } else {
        query.status = 'paused';
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [businesses, totalBusinesses] = await Promise.all([
      Business.find(query)
        .select('name ownerId locationData status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Business.countDocuments(query)
    ]);

    res.json({
      success: true,
      businesses,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalBusinesses / Number(limit)),
        totalBusinesses,
        hasNext: skip + Number(limit) < totalBusinesses,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Error getting businesses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Toggle user status
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Toggle user role between customer and admin (as a way to activate/deactivate)
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    user.role = newRole;
    await user.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('userStatusChanged', {
        userId: user._id,
        isActive: newRole !== 'admin',
        name: user.displayName || user.name,
        email: user.email
      });
    }

    res.json({
      success: true,
      message: `User ${newRole !== 'admin' ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.displayName || user.name,
        email: user.email,
        isActive: newRole !== 'admin'
      }
    });

  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Toggle business status
export const toggleBusinessStatus = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.body;

    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found' 
      });
    }

    // Toggle business status between active and paused
    const newStatus = business.status === 'active' ? 'paused' : 'active';
    business.status = newStatus;
    await business.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('businessStatusChanged', {
        businessId: business._id,
        isActive: newStatus === 'active',
        status: newStatus,
        name: business.name,
        ownerId: business.ownerId
      });
    }

    res.json({
      success: true,
      message: `Business ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      business: {
        id: business._id,
        name: business.name,
        ownerId: business.ownerId,
        isActive: newStatus === 'active',
        status: newStatus
      }
    });

  } catch (error) {
    console.error('Error toggling business status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Send notification to users
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { title, message, type = 'info', targetType = 'all', targetIds = [] } = req.body;

    // Admin is already verified by middleware
    const adminEmail = req.admin?.email;
    if (!adminEmail) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and message are required' 
      });
    }

    // Determine recipients and notification model based on target type
    let recipients: string[] = [];
    let NotificationModel: any;
    
    if (targetType === 'all') {
      // Send to all non-admin users (customers + business owners)
      const users = await User.find({ role: { $ne: 'admin' } }).select('uid');
      recipients = users.map((user: any) => user.uid);
      NotificationModel = AllUserNotification;
      console.log(`Found ${recipients.length} users for "all" target (customers + business owners)`);
    } else if (targetType === 'users') {
      // Send to customers only
      const users = await User.find({ role: 'customer' }).select('uid');
      recipients = users.map((user: any) => user.uid);
      NotificationModel = UserNotification;
      console.log(`Found ${recipients.length} customers`);
    } else if (targetType === 'businesses') {
      // Send to business owners only
      const users = await User.find({ role: 'owner' }).select('uid');
      recipients = users.map((user: any) => user.uid);
      NotificationModel = BusinessNotification;
      console.log(`Found ${recipients.length} business owners`);
    } else if (targetIds && targetIds.length > 0) {
      // Send to specific users - use AllUserNotification for custom targets
      recipients = targetIds;
      NotificationModel = AllUserNotification;
      console.log(`Sending to ${recipients.length} specific users`);
    }

    if (recipients.length === 0) {
      console.log('No recipients found for notification');
      return res.json({
        success: true,
        message: 'No recipients found for the selected target',
        recipientCount: 0
      });
    }

    console.log(`Creating notifications for ${recipients.length} recipients`);
    console.log('Target type:', targetType);
    console.log('Notification type:', type);
    console.log('Using collection:', NotificationModel.collection.name);
    console.log('Sample recipient UIDs:', recipients.slice(0, 3));

    // Create individual notifications for each recipient in the appropriate collection
    const notifications = recipients.map((userId: string) => ({
      userId,
      title,
      message,
      type,
      isRead: false,
      sentBy: adminEmail,
      createdAt: new Date()
    }));

    const result = await NotificationModel.insertMany(notifications);
    console.log(`Successfully created ${result.length} notifications in ${NotificationModel.collection.name}`);

    // Record notification stats
    await NotificationStats.create({
      date: new Date(),
      targetType,
      notificationType: type,
      recipientCount: recipients.length,
      title,
      sentBy: adminEmail
    });
    console.log('Notification stats recorded');

    // Emit real-time notification to all connected clients
    const io = req.app.get('io');
    if (io) {
      // Emit to specific users
      recipients.forEach((userId: string) => {
        io.to(`user_${userId}`).emit('newNotification', {
          title,
          message,
          type,
          targetType,
          createdAt: new Date()
        });
      });
      
      // Also emit a general notification event
      io.emit('adminNotification', {
        title,
        message,
        type,
        targetType,
        recipientCount: recipients.length,
        sentBy: adminEmail,
        sentAt: new Date()
      });
      
      console.log('Real-time notifications emitted via Socket.IO');
    }

    res.json({
      success: true,
      message: `Notification sent to ${recipients.length} ${targetType === 'all' ? 'users' : targetType}`,
      recipientCount: recipients.length,
      targetType
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Toggle admin status (only for super admin)
export const toggleAdminStatus = async (req: Request, res: Response) => {
  try {
    const { adminEmail } = req.body;

    if (!adminEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin email is required' 
      });
    }

    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated super admin's data

    // Prevent toggling super admin
    if (adminEmail.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot modify super admin status.' 
      });
    }

    const admin = await Admin.findOne({ email: adminEmail.toLowerCase(), role: 'admin' });
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found.' 
      });
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('adminStatusChanged', {
        adminEmail: admin.email,
        isActive: admin.isActive,
        changedBy: req.admin!.email
      });
    }

    res.json({ 
      success: true, 
      message: `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
      admin: {
        email: admin.email,
        isActive: admin.isActive
      }
    });

  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};


// Get notification statistics
export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    // Get today's notifications count
    const todayCount = await NotificationStats.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$recipientCount' } } }
    ]);

    // Get this week's notifications count
    const weekCount = await NotificationStats.aggregate([
      { $match: { createdAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$recipientCount' } } }
    ]);

    // Get total notifications count
    const totalCount = await NotificationStats.aggregate([
      { $group: { _id: null, total: { $sum: '$recipientCount' } } }
    ]);

    // Get recent notifications
    const recentNotifications = await NotificationStats.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title targetType notificationType recipientCount sentBy createdAt');

    res.json({
      success: true,
      stats: {
        today: todayCount[0]?.total || 0,
        week: weekCount[0]?.total || 0,
        total: totalCount[0]?.total || 0
      },
      recent: recentNotifications
    });

  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update max admins capacity (only for super admin)
export const updateMaxAdmins = async (req: Request, res: Response) => {
  try {
    const { maxAdmins } = req.body;

    if (!maxAdmins || typeof maxAdmins !== 'number' || maxAdmins < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid max admins number is required (minimum 1)' 
      });
    }

    // Get current admin count
    const currentAdminCount = await Admin.countDocuments({ isActive: true });
    
    if (maxAdmins < currentAdminCount) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot set max admins to ${maxAdmins}. You currently have ${currentAdminCount} active admins. Please remove some admins first.` 
      });
    }

    // Update settings
    const settings = await getSystemSettings();
    settings.maxAdmins = maxAdmins;
    await settings.save();

    res.json({ 
      success: true, 
      message: `Admin capacity updated to ${maxAdmins} successfully`,
      maxAdmins: settings.maxAdmins
    });

  } catch (error) {
    console.error('Error updating max admins:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * UNIVERSAL SECURITY: Get security stats for the dashboard
 */
export const getSecurityStats = async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Initial values
    let totalLogs = 0;
    let last24h = 0;
    let blockedIps: any[] = [];
    let criticalThreats = 0;
    let portalStats: any[] = [];
    let severityStats: any[] = [];

    // Safety checks for SecurityLog model
    if (!SecurityLog) {
      console.error('CRITICAL: SecurityLog model is NOT loaded!');
      return res.status(500).json({ success: false, message: 'Security System monitor offline' });
    }

    try {
      const results = await Promise.all([
        SecurityLog.countDocuments({}).catch(() => 0),
        SecurityLog.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } }).catch(() => 0),
        SecurityLog.distinct('ip', { eventType: 'blocked_ip' }).catch(() => []),
        SecurityLog.countDocuments({ severity: 'critical' }).catch(() => 0)
      ]);
      
      totalLogs = results[0];
      last24h = results[1];
      blockedIps = results[2];
      criticalThreats = results[3];
    } catch (e) {
      console.error('Error in primary security stats:', e);
    }

    const blockedIpsCount = Array.isArray(blockedIps) ? blockedIps.length : 0;

    try {
      // Breakdown by portal (last 7 days)
      portalStats = await SecurityLog.aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$portal', count: { $sum: 1 } } }
      ]).catch(() => []);
    } catch (e) {
      console.error('Error in portalStats aggregation:', e);
    }

    try {
      // Severity breakdown
      severityStats = await SecurityLog.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]).catch(() => []);
    } catch (e) {
      console.error('Error in severityStats aggregation:', e);
    }

    res.json({
      success: true,
      stats: {
        total: totalLogs,
        last24h,
        blockedIpsCount,
        criticalThreats,
        portals: Array.isArray(portalStats) ? portalStats : [],
        severity: Array.isArray(severityStats) ? severityStats : []
      }
    });

  } catch (error: any) {
    console.error('CRITICAL: Error fetching security stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch security stats'
    });
  }
};

/**
 * UNIVERSAL SECURITY: Get all currently blocked IPs
 */
export const getBlockedIPs = async (req: Request, res: Response) => {
  try {
    const blockedIPs = await BlockedIP.find({ isActive: true }).sort({ blockedAt: -1 });
    res.json({
      success: true,
      blockedIPs
    });
  } catch (error) {
    console.error('Error fetching blocked IPs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blocked IPs' });
  }
};

/**
 * UNIVERSAL SECURITY: Manually unblock an IP
 */
export const unblockIP = async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.body;
    if (!ipAddress) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }

    const result = await BlockedIP.findOneAndUpdate(
      { ipAddress },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'IP not found in blacklist' });
    }

    // Log the unblock action
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'IP_UNBLOCKED',
      severity: 'medium',
      details: `IP ${ipAddress} was manually unblocked by admin.`,
      ip: req.ip || '127.0.0.1',
      userId: (req as any).admin?.email
    });

    res.json({
      success: true,
      message: `IP ${ipAddress} unblocked successfully`
    });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ success: false, message: 'Failed to unblock IP' });
  }
};

/**
 * UNIVERSAL SECURITY: Manually block an IP
 */
export const blockIP = async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason = 'Manual block by admin' } = req.body;
    if (!ipAddress) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }

    // Check if already blocked
    const existing = await BlockedIP.findOne({ ipAddress, isActive: true });
    if (existing) {
      return res.status(400).json({ success: false, message: 'IP is already blocked' });
    }

    // Create or update block
    await BlockedIP.findOneAndUpdate(
      { ipAddress },
      { 
        isActive: true, 
        reason, 
        blockedBy: (req as any).admin?.email || 'system_admin',
        blockedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Log the block action
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'IP_BLOCKED_MANUAL',
      severity: 'high',
      details: `IP ${ipAddress} was manually blocked by admin. Reason: ${reason}`,
      ip: ipAddress,
      userId: (req as any).admin?.email
    });

    res.json({
      success: true,
      message: `IP ${ipAddress} has been blacklisted.`
    });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({ success: false, message: 'Failed to block IP' });
  }
};

/**
 * UNIVERSAL SECURITY: Get security logs with filtering
 */
export const getSecurityLogs = async (req: Request, res: Response) => {
  try {
    const { portal, eventType, severity, page = 1, limit = 50, since } = req.query;
    const query: any = {};

    if (portal) query.portal = portal;
    if (eventType) query.eventType = eventType;
    if (severity) query.severity = severity;
    if (since) query.timestamp = { $gte: new Date(since as string) };

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      SecurityLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SecurityLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: skip + Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch security logs' });
  }
};

/**
 * WAITLIST: Get waitlist statistics
 */
export const getWaitlistStats = async (req: Request, res: Response) => {
  try {
    const [
      total, 
      users, 
      businesses, 
      pending, 
      contacted,
      sentCount,
      deliveredCount,
      softBounceCount,
      hardBounceCount,
      failedCount
    ] = await Promise.all([
      EarlyAccess.countDocuments({}),
      EarlyAccess.countDocuments({ userType: 'user' }),
      EarlyAccess.countDocuments({ userType: 'business' }),
      EarlyAccess.countDocuments({ status: { $in: ['pending', null, undefined] } }),
      EarlyAccess.countDocuments({ status: 'contacted' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'sent' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'delivered' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'soft_bounce' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'hard_bounce' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'failed' })
    ]);
    
    // Get last 10 PENDING signups for the quick overview
    // Sort by joinedAt or createdAt to handle both schema versions
    const recentSignups = await EarlyAccess.find({ status: { $in: ['pending', null, undefined] } })
      .sort({ createdAt: -1, joinedAt: -1 })
      .limit(10);

    // Get last 10 email attempt results (excluding "sent" for noise reduction)
    const recentFailures = await EarlyAccess.find({ 
      lastEmailStatus: { $in: ['soft_bounce', 'hard_bounce', 'failed'] } 
    })
      .sort({ lastAttemptAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        total,
        users,
        businesses,
        pending,
        contacted,
        emailDelivery: {
          sent: sentCount,
          delivered: deliveredCount,
          softBounces: softBounceCount,
          hardBounces: hardBounceCount,
          failures: failedCount
        }
      },
      recentSignups,
      recentFailures
    });
  } catch (error) {
    console.error('Error fetching waitlist stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch waitlist stats' });
  }
};

/**
 * WAITLIST: Send broadcast email to waitlist
 */
export const sendWaitlistBroadcast = async (req: Request, res: Response) => {
  try {
    const { subject, html, targetType, onlyPending, targetIds } = req.body; // targetType: 'all', 'user', 'business', onlyPending: boolean, targetIds: string[]

    if (!subject || !html) {
      return res.status(400).json({ success: false, message: 'Subject and content are required' });
    }

    const query: any = {};
    
    // 1. Suppression Logic: Exclude bounces and failures by default unless specifically retrying chosen IDs
    if (!targetIds || targetIds.length === 0) {
      // Treat missing lastEmailStatus as eligible (not_sent)
      query.$or = [
        { lastEmailStatus: { $nin: ['hard_bounce', 'soft_bounce', 'failed'] } },
        { lastEmailStatus: { $exists: false } }
      ];
      
      if (onlyPending) {
        query.status = { $in: ['pending', null, undefined] };
      }
    } else {
      // If targeting specific IDs, use those
      query._id = { $in: targetIds };
    }

    if (targetType && targetType !== 'all') {
      query.userType = targetType;
    }

    // Get recipients
    let recipients = await EarlyAccess.find(query).select('email userType');

    // 2. Deduplication Logic: If an email is in both, prefer Business variant to avoid double-mailing
    if (targetType === 'all' && (!targetIds || targetIds.length === 0)) {
      const emailMap = new Map();
      recipients.forEach(r => {
        const existing = emailMap.get(r.email);
        if (!existing || (existing.userType === 'user' && r.userType === 'business')) {
          emailMap.set(r.email, r);
        }
      });
      recipients = Array.from(emailMap.values());
    }

    const emailList = recipients.map(r => r.email);

    if (emailList.length === 0) {
      return res.status(400).json({ success: false, message: 'No eligible recipients found' });
    }

    // Log the security event for mass mailing
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'mass_email_broadcast',
      severity: 'medium',
      details: `Admin broadcast initiated for ${emailList.length} recipients. Subject: ${subject}`,
      ip: req.ip || 'internal',
      userAgent: req.headers['user-agent'],
      path: req.path,
      userId: (req as any).admin?.email
    });

    // Send broadcast asynchronously
    const runBroadcast = async () => {
      try {
        let results: Array<{ email: string, status: string, error?: string }> = [];

        if (targetType === 'all' && (!targetIds || targetIds.length === 0)) {
          // Use deduplicated recipients list we already calculated
          const userEmails = recipients.filter(r => r.userType === 'user').map(r => r.email);
          const businessEmails = recipients.filter(r => r.userType === 'business').map(r => r.email);

          if (userEmails.length > 0) {
            const userResults = await emailService.sendBroadcastEmail(userEmails, subject, html, 'user');
            results.push(...userResults);
          }

          if (businessEmails.length > 0) {
            const businessResults = await emailService.sendBroadcastEmail(businessEmails, subject, html, 'business');
            results.push(...businessResults);
          }
        } else {
          // For specific targetType or targetIds, send with appropriate template
          const effectiveType = targetType === 'all' ? 'user' : (targetType as 'user' | 'business');
          results = await emailService.sendBroadcastEmail(emailList, subject, html, effectiveType);
        }

        // Process results and update each document individually for precise tracking
        const updatePromises = results.map(async (res) => {
          const updateData: any = {
            lastEmailStatus: res.status,
            lastAttemptAt: new Date(),
            $push: {
              emailHistory: {
                subject,
                status: res.status,
                timestamp: new Date(),
                error: res.error
              }
            }
          };

          if (res.error) {
            updateData.lastEmailError = res.error;
          }

          // Also update general status if sent successfully
          if (res.status === 'sent') {
            updateData.status = 'contacted';
          }

          return EarlyAccess.updateOne({ email: res.email }, updateData);
        });

        await Promise.all(updatePromises);
        
        const successCount = results.filter(r => r.status === 'sent').length;
        const bounceCount = results.filter(r => r.status === 'soft_bounce' || r.status === 'hard_bounce').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`Broadcast completed. Results: ${successCount} sent, ${bounceCount} bounced, ${failedCount} failed`);
        
        // Log final resolution in security logs
        await SecurityLog.create({
          portal: 'admin',
          eventType: 'mass_email_broadcast',
          severity: 'low',
          details: `Broadcast completed. Success: ${successCount}, Bounces: ${bounceCount}, Failures: ${failedCount}`,
          ip: 'internal',
          userId: 'system'
        });

      } catch (err) {
        console.error('Error during async broadcast:', err);
      }
    };

    runBroadcast();

    res.json({
      success: true,
      message: `Broadcast initiated for ${emailList.length} recipients. You can monitor the progress in the Waitlist section.`,
      recipientCount: emailList.length
    });

  } catch (error) {
    console.error('Error sending waitlist broadcast:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate broadcast' });
  }
};

/**
 * WAITLIST: Get all waitlist signups with pagination and filtering
 */
export const getWaitlistSignups = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all', userType = 'all' } = req.query;

    const query: any = {};
    
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }
    
    if (status !== 'all') {
      if (status === 'pending') {
        query.status = { $in: ['pending', null, undefined] };
      } else if (status === 'contacted') {
        query.status = 'contacted';
      } else if (status === 'converted') {
        query.status = 'converted';
      } else if (status === 'new_user') {
        query.status = { $in: ['pending', null, undefined] };
        query.userType = 'user';
      } else if (status === 'new_business') {
        query.status = { $in: ['pending', null, undefined] };
        query.userType = 'business';
      } else if (status === 'soft_bounce') {
        query.lastEmailStatus = 'soft_bounce';
      } else if (status === 'hard_bounce') {
        query.lastEmailStatus = 'hard_bounce';
      }
    }

    if (userType !== 'all' && !query.userType) {
      query.userType = userType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [signups, total] = await Promise.all([
      EarlyAccess.find(query)
        .sort({ createdAt: -1, joinedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      EarlyAccess.countDocuments(query)
    ]);

    res.json({
      success: true,
      signups,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        hasNext: skip + Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching waitlist signups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch waitlist signups' });
  }
};

/**
 * WAITLIST: Manually update signup status
 */
export const updateWaitlistStatus = async (req: Request, res: Response) => {
  try {
    const { id, emailStatus, generalStatus } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID is required' });
    }

    const updateData: any = {
      lastAttemptAt: new Date(),
    };

    if (emailStatus) {
      updateData.lastEmailStatus = emailStatus;
    }

    if (generalStatus) {
      updateData.status = generalStatus;
    }

    const entry = await EarlyAccess.findByIdAndUpdate(
      id,
      { 
        $set: updateData,
        $push: {
          emailHistory: {
            subject: 'Manual Status Update',
            status: emailStatus || 'updated',
            timestamp: new Date(),
            error: 'Updated manually by admin'
          }
        }
      },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      entry
    });

  } catch (error) {
    console.error('Error updating waitlist status:', error);
    res.status(500).json({ success: false, message: 'Failed to update waitlist status' });
  }
};
