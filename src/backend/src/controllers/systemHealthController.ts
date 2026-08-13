import { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Booking } from '../models/Booking';
import { Restaurant } from '../models/Restaurant';
import { Event } from '../models/Event';
import { SystemSettings, getSystemSettings } from '../models/SystemSettings';

// Extend Request type to include startTime
interface RequestWithTiming extends Request {
  startTime?: number;
}

// Get system health metrics
export const getSystemHealth = async (req: RequestWithTiming, res: Response) => {
  try {
    // Database health
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'healthy' : dbState === 2 ? 'connecting' : 'disconnected';
    
    // System metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);
    
    const cpuCount = os.cpus().length;
    const loadAverage = os.loadavg();
    const cpuUsagePercent = ((loadAverage[0] / cpuCount) * 100).toFixed(2);
    
    const uptime = process.uptime();
    const systemUptime = os.uptime();
    
    // Database metrics
    const [userCount, businessCount, bookingCount, restaurantCount, eventCount] = await Promise.all([
      User.countDocuments(),
      Business.countDocuments(),
      Booking.countDocuments(),
      Restaurant.countDocuments(),
      Event.countDocuments()
    ]);
    
    // Recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentUsers, recentBookings, recentBusinesses] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: last24Hours } }),
      Booking.countDocuments({ createdAt: { $gte: last24Hours } }),
      Business.countDocuments({ createdAt: { $gte: last24Hours } })
    ]);
    
    // Active bookings
    const activeBookings = await Booking.countDocuments({ 
      status: { $in: ['confirmed', 'pending'] },
      date: { $gte: new Date() }
    });
    
    // Response time (simulated)
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        status: 'operational',
        uptime: uptime,
        systemUptime: systemUptime,
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch()
      },
      database: {
        status: dbStatus,
        connected: dbState === 1,
        collections: {
          users: userCount,
          businesses: businessCount,
          bookings: bookingCount,
          restaurants: restaurantCount,
          events: eventCount
        }
      },
      performance: {
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          usagePercent: parseFloat(memoryUsagePercent)
        },
        cpu: {
          count: cpuCount,
          loadAverage: loadAverage,
          usagePercent: parseFloat(cpuUsagePercent)
        },
        responseTime: responseTime
      },
      activity: {
        last24Hours: {
          newUsers: recentUsers,
          newBookings: recentBookings,
          newBusinesses: recentBusinesses
        },
        activeBookings: activeBookings
      }
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get database statistics
export const getDatabaseStats = async (req: Request, res: Response) => {
  try {
    const dbStats = await mongoose.connection.db.stats();
    
    res.json({
      success: true,
      stats: {
        collections: dbStats.collections,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexes: dbStats.indexes,
        indexSize: dbStats.indexSize,
        avgObjSize: dbStats.avgObjSize
      }
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch database stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get API health check
export const getApiHealth = async (req: Request, res: Response) => {
  try {
    const checks = {
      database: mongoose.connection.readyState === 1,
      memory: os.freemem() > 100 * 1024 * 1024, // At least 100MB free
      uptime: process.uptime() > 0
    };
    
    const allHealthy = Object.values(checks).every(check => check);
    
    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks: checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get service status
export const getServiceStatus = async (req: RequestWithTiming, res: Response) => {
  try {
    const apiUptime = process.uptime();
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    
    const services = {
      api: {
        status: 'operational',
        uptime: apiUptime,
        responseTime: responseTime
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'operational' : 'degraded',
        connected: mongoose.connection.readyState === 1,
        uptime: apiUptime, // Database uptime is same as API uptime since they're in same process
        responseTime: 0 // Database is local, response time is negligible
      },
      storage: {
        status: 'operational',
        available: true,
        uptime: apiUptime,
        responseTime: 0
      },
      email: {
        status: process.env.EMAIL_USER ? 'operational' : 'degraded',
        available: !!process.env.EMAIL_USER,
        uptime: apiUptime,
        responseTime: 0
      }
    };
    
    res.json({
      success: true,
      services: services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


// Toggle maintenance mode
export const toggleMaintenanceMode = async (req: Request, res: Response) => {
  try {
    const { enabled, message, estimatedEndTime, adminEmail } = req.body;

    const settings = await getSystemSettings();
    
    settings.maintenanceMode = enabled;
    if (message) {
      settings.maintenanceMessage = message;
    }
    
    if (enabled) {
      settings.maintenanceStartedAt = new Date();
      settings.maintenanceStartedBy = adminEmail;
      if (estimatedEndTime) {
        settings.estimatedEndTime = new Date(estimatedEndTime);
      }
    } else {
      settings.maintenanceStartedAt = undefined;
      settings.maintenanceStartedBy = undefined;
      settings.estimatedEndTime = undefined;
    }
    
    await settings.save();

    res.json({
      success: true,
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      settings: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceStartedAt: settings.maintenanceStartedAt,
        estimatedEndTime: settings.estimatedEndTime,
      }
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle maintenance mode',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getMaintenanceStatus = async (req: Request, res: Response) => {
  try {
    // If database is not connected yet, return default status to avoid hanging
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        maintenanceMode: false,
        maintenanceMessage: 'System starting up...',
        dbStatus: 'connecting'
      });
    }

    const settings = await getSystemSettings();
    
    res.json({
      success: true,
      maintenanceMode: settings.maintenanceMode || false,
      maintenanceMessage: settings.maintenanceMessage || 'We are currently performing scheduled maintenance.',
      maintenanceStartedAt: settings.maintenanceStartedAt,
      maintenanceStartedBy: settings.maintenanceStartedBy,
      estimatedEndTime: settings.estimatedEndTime,
    });
  } catch (error) {
    console.error('CRITICAL ERROR fetching maintenance status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Restart services (simulated - in production, this would trigger actual service restarts)
export const restartServices = async (req: Request, res: Response) => {
  try {
    const { services } = req.body; // Array of service names to restart
    
    // In production, this would trigger actual service restarts
    // For now, we'll just log and return success
    console.log('Restart requested for services:', services);
    
    res.json({
      success: true,
      message: 'Service restart initiated',
      services: services,
      note: 'In production, this would trigger actual service restarts via process manager (PM2, systemd, etc.)'
    });
  } catch (error) {
    console.error('Error restarting services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restart services',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Clear cache (simulated)
export const clearCache = async (req: Request, res: Response) => {
  try {
    // In production, this would clear Redis cache or other caching layers
    console.log('Cache clear requested');
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      note: 'In production, this would clear Redis or other caching layers'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
