import { Request, Response } from 'express';
import { Report } from '../models/Report';
import { Booking } from '../models/Booking';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Restaurant } from '../models/Restaurant';
import { Event } from '../models/Event';
import mongoose from 'mongoose';

// Generate Admin Platform Report
export const generateAdminReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reportType } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    let reportData: any = {};

    switch (reportType) {
      case 'platform_overview':
        reportData = await generatePlatformOverview(start, end);
        break;
      case 'revenue':
        reportData = await generateRevenueReport(start, end);
        break;
      case 'user_growth':
        reportData = await generateUserGrowthReport(start, end);
        break;
      case 'booking_analytics':
        reportData = await generateBookingAnalytics(start, end);
        break;
      default:
        reportData = await generatePlatformOverview(start, end);
    }

    const report = await Report.create({
      reportType: 'admin',
      title: `Admin ${reportType} Report`,
      description: `Generated for ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      category: 'system',
      data: reportData,
      dateRange: { start, end },
      generatedBy: 'admin',
      status: 'completed',
    });

    // Emit socket event for real-time update
    const io = (req.app as any).get('io');
    if (io) {
      io.emit('reportGenerated', {
        reportId: report._id,
        reportType: 'admin',
        title: report.title,
      });
    }

    res.json({
      success: true,
      report: report,
      data: reportData,
    });
  } catch (error) {
    console.error('Error generating admin report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Generate Business Report
export const generateBusinessReport = async (req: Request, res: Response) => {
  try {
    const { businessId, startDate, endDate, reportType } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    let reportData: any = {};

    switch (reportType) {
      case 'bookings':
        reportData = await generateBusinessBookingReport(businessId, start, end);
        break;
      case 'revenue':
        reportData = await generateBusinessRevenueReport(businessId, start, end);
        break;
      case 'customer_insights':
        reportData = await generateCustomerInsights(businessId, start, end);
        break;
      case 'performance':
        reportData = await generateBusinessPerformance(businessId, start, end);
        break;
      default:
        reportData = await generateBusinessBookingReport(businessId, start, end);
    }

    const report = await Report.create({
      reportType: 'business',
      businessId,
      title: `Business ${reportType} Report`,
      description: `Generated for ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      category: 'business_performance',
      data: reportData,
      dateRange: { start, end },
      generatedBy: businessId,
      status: 'completed',
    });

    // Emit socket event for real-time update
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`business_${businessId}`).emit('reportGenerated', {
        reportId: report._id,
        reportType: 'business',
        title: report.title,
      });
    }

    res.json({
      success: true,
      report: report,
      data: reportData,
    });
  } catch (error) {
    console.error('Error generating business report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Generate User Report
export const generateUserReport = async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate, reportType } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    let reportData: any = {};

    switch (reportType) {
      case 'booking_history':
        reportData = await generateUserBookingHistory(userId, start, end);
        break;
      case 'spending':
        reportData = await generateUserSpendingReport(userId, start, end);
        break;
      case 'activity':
        reportData = await generateUserActivityReport(userId, start, end);
        break;
      default:
        reportData = await generateUserBookingHistory(userId, start, end);
    }

    const report = await Report.create({
      reportType: 'user',
      userId,
      title: `My ${reportType} Report`,
      description: `Generated for ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      category: 'user_activity',
      data: reportData,
      dateRange: { start, end },
      generatedBy: userId,
      status: 'completed',
    });

    // Emit socket event for real-time update
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`user_${userId}`).emit('reportGenerated', {
        reportId: report._id,
        reportType: 'user',
        title: report.title,
      });
    }

    res.json({
      success: true,
      report: report,
      data: reportData,
    });
  } catch (error) {
    console.error('Error generating user report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get Reports
export const getReports = async (req: Request, res: Response) => {
  try {
    const { reportType, userId, businessId, limit = 10 } = req.query;

    const query: any = {};
    if (reportType) query.reportType = reportType;
    if (userId) query.userId = userId;
    if (businessId) query.businessId = businessId;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Helper Functions for Report Generation

async function generatePlatformOverview(start: Date, end: Date) {
  const [
    totalUsers,
    newUsers,
    totalBusinesses,
    newBusinesses,
    totalBookings,
    newBookings,
    totalRevenue,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Business.countDocuments(),
    Business.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Booking.countDocuments(),
    Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: 'confirmed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]),
  ]);

  // Daily breakdown
  const dailyStats = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        bookings: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    summary: {
      totalUsers,
      newUsers,
      totalBusinesses,
      newBusinesses,
      totalBookings,
      newBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
    },
    dailyStats,
  };
}

async function generateRevenueReport(start: Date, end: Date) {
  const revenueByBusiness = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: 'confirmed',
      },
    },
    {
      $group: {
        _id: '$restaurantId',
        totalRevenue: { $sum: '$totalAmount' },
        bookingCount: { $sum: 1 },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 },
  ]);

  const revenueByMonth = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: 'confirmed',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m', date: '$createdAt' },
        },
        revenue: { $sum: '$totalAmount' },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    revenueByBusiness,
    revenueByMonth,
  };
}

async function generateUserGrowthReport(start: Date, end: Date) {
  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        newUsers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return { userGrowth };
}

async function generateBookingAnalytics(start: Date, end: Date) {
  const bookingsByStatus = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const peakHours = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$time',
        bookings: { $sum: 1 },
      },
    },
    { $sort: { bookings: -1 } },
    { $limit: 10 },
  ]);

  return {
    bookingsByStatus,
    peakHours,
  };
}

async function generateBusinessBookingReport(businessId: string, start: Date, end: Date) {
  const bookings = await Booking.aggregate([
    {
      $match: {
        restaurantId: businessId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
      },
    },
  ]);

  const dailyBookings = await Booking.aggregate([
    {
      $match: {
        restaurantId: businessId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        bookings: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    bookings,
    dailyBookings,
  };
}

async function generateBusinessRevenueReport(businessId: string, start: Date, end: Date) {
  const revenue = await Booking.aggregate([
    {
      $match: {
        restaurantId: businessId,
        createdAt: { $gte: start, $lte: end },
        status: 'confirmed',
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        averageBookingValue: { $avg: '$totalAmount' },
        totalBookings: { $sum: 1 },
      },
    },
  ]);

  return revenue[0] || { totalRevenue: 0, averageBookingValue: 0, totalBookings: 0 };
}

async function generateCustomerInsights(businessId: string, start: Date, end: Date) {
  const topCustomers = await Booking.aggregate([
    {
      $match: {
        restaurantId: businessId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$userId',
        bookingCount: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
      },
    },
    { $sort: { bookingCount: -1 } },
    { $limit: 10 },
  ]);

  return { topCustomers };
}

async function generateBusinessPerformance(businessId: string, start: Date, end: Date) {
  const performance = await Booking.aggregate([
    {
      $match: {
        restaurantId: businessId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $facet: {
        statusBreakdown: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ],
        timeSlotPopularity: [
          {
            $group: {
              _id: '$time',
              bookings: { $sum: 1 },
            },
          },
          { $sort: { bookings: -1 } },
        ],
        partySize: [
          {
            $group: {
              _id: '$partySize',
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  return performance[0];
}

async function generateUserBookingHistory(userId: string, start: Date, end: Date) {
  const bookings = await Booking.find({
    userId,
    createdAt: { $gte: start, $lte: end },
  })
    .sort({ createdAt: -1 })
    .populate('restaurantId', 'name location');

  const stats = await Booking.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    bookings,
    stats,
  };
}

async function generateUserSpendingReport(userId: string, start: Date, end: Date) {
  const spending = await Booking.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: start, $lte: end },
        status: 'confirmed',
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$totalAmount' },
        averageSpending: { $avg: '$totalAmount' },
        bookingCount: { $sum: 1 },
      },
    },
  ]);

  const monthlySpending = await Booking.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: start, $lte: end },
        status: 'confirmed',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m', date: '$createdAt' },
        },
        spent: { $sum: '$totalAmount' },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    summary: spending[0] || { totalSpent: 0, averageSpending: 0, bookingCount: 0 },
    monthlySpending,
  };
}

async function generateUserActivityReport(userId: string, start: Date, end: Date) {
  const favoriteRestaurants = await Booking.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$restaurantId',
        visits: { $sum: 1 },
      },
    },
    { $sort: { visits: -1 } },
    { $limit: 5 },
  ]);

  return {
    favoriteRestaurants,
  };
}
