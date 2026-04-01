import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Globe,
  Mail,
  DollarSign,
  Calendar,
  Shield,
  Bell,
  Database,
  BarChart3,
  Save,
  RefreshCw,
  Wrench,
  Lock,
  CreditCard,
  FileText,
  Image,
  Clock,
  AlertCircle,
  ToggleLeft
} from 'lucide-react';
import { toast } from 'react-toastify';
import { adminApi } from '../utils/adminApi';

interface PlatformSettings {
  platformName: string;
  platformEmail: string;
  platformPhone: string;
  timezone: string;
  currency: string;
  defaultLanguage: string;
  commissionRate: number;
  bookingAdvanceDays: number;
  cancellationHours: number;
  autoConfirmBookings: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  twoFactorAuth?: boolean;
  sessionTimeout?: number;
  apiRateLimit?: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  featureFlags: {
    arMenus: boolean;
    preOrders: boolean;
    events: boolean;
    waitlist: boolean;
  };
}

const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('platform');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'DineInGo',
    platformEmail: 'support@dineingo.com',
    platformPhone: '+1 (555) 123-4567',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    defaultLanguage: 'english',
    commissionRate: 15,
    bookingAdvanceDays: 30,
    cancellationHours: 24,
    autoConfirmBookings: false,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    twoFactorAuth: true,
    sessionTimeout: 30,
    apiRateLimit: true,
    maintenanceMode: false,
    maintenanceMessage: '',
    featureFlags: {
      arMenus: true,
      preOrders: true,
      events: true,
      waitlist: true,
    },
  });

  const API_URL = API_CONFIG.BASE_URL;

  useEffect(() => {
    fetchSettings();

    // Socket.IO for real-time updates
    const socket = (window as any).io?.(API_URL);
    if (socket) {
      // Listen for settings updates from other admins
      socket.on('settingsUpdated', (data: any) => {
        setSettings(data.settings);
        toast.info(`Settings updated by ${data.updatedBy}`, {
          autoClose: 3000,
        });
      });

      // Listen for individual setting updates
      socket.on('settingUpdated', (data: any) => {
        setSettings((prev) => ({
          ...prev,
          [data.key]: data.value,
        }));
        toast.info(`${data.key} updated by ${data.updatedBy}`, {
          autoClose: 2000,
        });
      });

      // Listen for settings reset
      socket.on('settingsReset', (data: any) => {
        setSettings(data.settings);
        toast.warning('Settings have been reset to default');
      });

      return () => socket.disconnect();
    }
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSettings();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'platform', name: 'Platform', icon: Globe },
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'payment', name: 'Payment', icon: DollarSign },
    { id: 'booking', name: 'Booking', icon: Calendar },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'beta', name: 'Beta Flags', icon: ToggleLeft },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await adminApi.updateSettings({
        ...settings,
        updatedBy: localStorage.getItem('adminEmail') || 'admin',
      });
      
      if (data.success) {
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Real-time update for individual settings (like toggles)
  const handleToggleChange = async (key: string, value: boolean, isFlag: boolean = false) => {
    // URL or Nested Key handling
    if (isFlag) {
      setSettings(prev => ({
        ...prev,
        featureFlags: {
          ...prev.featureFlags,
          [key]: value
        }
      }));

      try {
        await adminApi.updateSingleSetting('featureFlags', {
          ...settings.featureFlags,
          [key]: value
        });
      } catch (error) {
        console.error('Error updating feature flag:', error);
        setSettings(prev => ({
          ...prev,
          featureFlags: {
            ...prev.featureFlags,
            [key]: !value
          }
        }));
        toast.error('Failed to update feature flag');
      }
    } else {
      // Optimistic update
      setSettings((prev) => ({ ...prev, [key]: value }));

      try {
        await adminApi.updateSingleSetting(key, value);
      } catch (error) {
        console.error('Error updating setting:', error);
        // Revert on error
        setSettings((prev) => ({ ...prev, [key]: !value }));
        toast.error('Failed to update setting');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <Settings className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-50 text-emerald-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-6">

              {/* Platform Settings */}
              {activeTab === 'platform' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Configuration</h2>
                    <p className="text-gray-500 mb-6">Manage your platform's basic information and settings</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={settings.platformName}
                        onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={settings.platformEmail}
                        onChange={(e) => setSettings({ ...settings, platformEmail: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Support Phone
                      </label>
                      <input
                        type="tel"
                        value={settings.platformPhone}
                        onChange={(e) => setSettings({ ...settings, platformPhone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={settings.currency}
                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Language
                      </label>
                      <select
                        value={settings.defaultLanguage}
                        onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                        <option value="tamil">Tamil</option>
                        <option value="kannada">Kannada</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Settings */}
              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Payment & Commission</h2>
                    <p className="text-gray-500 mb-6">Configure payment gateways and commission rates</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.commissionRate}
                        onChange={(e) => setSettings({ ...settings, commissionRate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Commission charged on each booking
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Payment Gateway Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">Stripe</p>
                              <p className="text-sm text-gray-500">Credit/Debit Cards</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">PayPal</p>
                              <p className="text-sm text-gray-500">PayPal Payments</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                            Inactive
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Settings */}
              {activeTab === 'booking' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Configuration</h2>
                    <p className="text-gray-500 mb-6">Manage booking rules and policies</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Advance Booking Days
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.bookingAdvanceDays}
                        onChange={(e) => setSettings({ ...settings, bookingAdvanceDays: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        How many days in advance users can book
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cancellation Window (Hours)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="168"
                        value={settings.cancellationHours}
                        onChange={(e) => setSettings({ ...settings, cancellationHours: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Minimum hours before booking to allow cancellation
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Auto-Confirm Bookings</p>
                        <p className="text-sm text-gray-500">Automatically confirm bookings without business approval</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.autoConfirmBookings}
                          onChange={(e) => handleToggleChange('autoConfirmBookings', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Security Settings</h2>
                    <p className="text-gray-500 mb-6">Configure security and access control</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">Security Notice</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            These settings affect platform security. Changes should be made carefully.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Enabled
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Session Timeout</p>
                          <p className="text-sm text-gray-500">Auto-logout after 30 minutes of inactivity</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">API Rate Limiting</p>
                          <p className="text-sm text-gray-500">Limit API requests to prevent abuse</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Settings */}
              {activeTab === 'email' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Email Configuration</h2>
                    <p className="text-gray-500 mb-6">Configure email service and templates</p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Email Service Status</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Email service is configured and operational
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Settings</h2>
                    <p className="text-gray-500 mb-6">Manage notification preferences</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-500">Send email notifications to users</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.emailNotifications !== false}
                          onChange={(e) => handleToggleChange('emailNotifications', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Push Notifications</p>
                        <p className="text-sm text-gray-500">Send push notifications to mobile devices</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.pushNotifications !== false}
                          onChange={(e) => handleToggleChange('pushNotifications', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Beta Feature Flags */}
              {activeTab === 'beta' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Beta Feature Flags</h2>
                    <p className="text-gray-500 mb-6 font-medium text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      DANGER ZONE: Disabling these features affects ALL users in real-time.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-200 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900">AR Experience (Menu)</p>
                        <p className="text-sm text-slate-500">Toggle Augmented Reality menus globally</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.featureFlags.arMenus}
                          onChange={(e) => handleToggleChange('arMenus', e.target.checked, true)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-200 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900">Pre-Order Engine</p>
                        <p className="text-sm text-slate-500">Toggle food pre-ordering capability</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.featureFlags.preOrders}
                          onChange={(e) => handleToggleChange('preOrders', e.target.checked, true)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-200 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900">Events & Guestlist</p>
                        <p className="text-sm text-slate-500">Toggle global events booking system</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.featureFlags.events}
                          onChange={(e) => handleToggleChange('events', e.target.checked, true)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-200 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900">Universal Waitlist</p>
                        <p className="text-sm text-slate-500">Toggle public waitlist registrations</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.featureFlags.waitlist}
                          onChange={(e) => handleToggleChange('waitlist', e.target.checked, true)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
