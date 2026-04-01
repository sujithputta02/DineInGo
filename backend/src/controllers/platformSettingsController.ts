import { Request, Response } from 'express';
import { PlatformSettings, getPlatformSettings } from '../models/PlatformSettings';

// Get platform settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    
    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform settings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update platform settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const {
      platformName,
      platformEmail,
      platformPhone,
      timezone,
      currency,
      defaultLanguage,
      commissionRate,
      bookingAdvanceDays,
      cancellationHours,
      autoConfirmBookings,
      emailNotifications,
      pushNotifications,
      smsNotifications,
      twoFactorAuth,
      sessionTimeout,
      apiRateLimit,
      updatedBy,
    } = req.body;

    let settings = await PlatformSettings.findOne();
    
    if (!settings) {
      settings = await PlatformSettings.create({
        platformName,
        platformEmail,
        platformPhone,
        timezone,
        currency,
        defaultLanguage,
        commissionRate,
        bookingAdvanceDays,
        cancellationHours,
        autoConfirmBookings,
        emailNotifications,
        pushNotifications,
        smsNotifications,
        twoFactorAuth,
        sessionTimeout,
        apiRateLimit,
        updatedBy: updatedBy || 'admin',
      });
    } else {
      // Update existing settings
      if (platformName !== undefined) settings.platformName = platformName;
      if (platformEmail !== undefined) settings.platformEmail = platformEmail;
      if (platformPhone !== undefined) settings.platformPhone = platformPhone;
      if (timezone !== undefined) settings.timezone = timezone;
      if (currency !== undefined) settings.currency = currency;
      if (defaultLanguage !== undefined) settings.defaultLanguage = defaultLanguage;
      if (commissionRate !== undefined) settings.commissionRate = commissionRate;
      if (bookingAdvanceDays !== undefined) settings.bookingAdvanceDays = bookingAdvanceDays;
      if (cancellationHours !== undefined) settings.cancellationHours = cancellationHours;
      if (autoConfirmBookings !== undefined) settings.autoConfirmBookings = autoConfirmBookings;
      if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
      if (pushNotifications !== undefined) settings.pushNotifications = pushNotifications;
      if (smsNotifications !== undefined) settings.smsNotifications = smsNotifications;
      if (twoFactorAuth !== undefined) settings.twoFactorAuth = twoFactorAuth;
      if (sessionTimeout !== undefined) settings.sessionTimeout = sessionTimeout;
      if (apiRateLimit !== undefined) settings.apiRateLimit = apiRateLimit;
      settings.updatedBy = updatedBy || 'admin';
      
      await settings.save();
    }

    // Emit socket event for real-time update
    const io = (req.app as any).get('io');
    if (io) {
      io.emit('settingsUpdated', {
        settings: settings.toObject(),
        updatedBy: settings.updatedBy,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update platform settings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update a single setting (for real-time individual updates)
export const updateSingleSetting = async (req: Request, res: Response) => {
  try {
    const { key, value, updatedBy } = req.body;

    const settings = await getPlatformSettings();
    
    // Update the specific setting
    (settings as any)[key] = value;
    settings.updatedBy = updatedBy || 'admin';
    await settings.save();

    // Emit socket event for real-time update
    const io = (req.app as any).get('io');
    if (io) {
      io.emit('settingUpdated', {
        key,
        value,
        updatedBy: settings.updatedBy,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      key,
      value,
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Reset settings to default
export const resetSettings = async (req: Request, res: Response) => {
  try {
    const { updatedBy } = req.body;

    await PlatformSettings.deleteMany({});
    const settings = await PlatformSettings.create({
      updatedBy: updatedBy || 'admin',
    });

    // Emit socket event for real-time update
    const io = (req.app as any).get('io');
    if (io) {
      io.emit('settingsReset', {
        settings: settings.toObject(),
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Settings reset to default',
      settings,
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get only feature flags (Public endpoint for frontend)
export const getFeatureFlags = async (req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    
    res.json({
      success: true,
      flags: settings.featureFlags || {
        arMenus: true,
        preOrders: true,
        events: true,
        waitlist: true
      }
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature flags'
    });
  }
};
