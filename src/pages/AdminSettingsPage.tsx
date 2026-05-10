import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    arMenus: {
      enabled: boolean;
      showIfDisabled: boolean;
      mode: string;
      caption: string;
      sticker: string;
    };
    preOrders: {
      enabled: boolean;
      showIfDisabled: boolean;
      mode: string;
      caption: string;
      sticker: string;
    };
    events: {
      enabled: boolean;
      showIfDisabled: boolean;
      mode: string;
      caption: string;
      sticker: string;
    };
    waitlist: {
      enabled: boolean;
      showIfDisabled: boolean;
      mode: string;
      caption: string;
      sticker: string;
    };
  };
}

function AdminSettingsPage() {
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
      arMenus: {
        enabled: true,
        showIfDisabled: true,
        mode: 'development',
        caption: 'Under development, stay tuned for more updates!',
        sticker: 'dino_dev'
      },
      preOrders: {
        enabled: true,
        showIfDisabled: true,
        mode: 'development',
        caption: 'Under development, stay tuned for more updates!',
        sticker: 'dino_dev'
      },
      events: {
        enabled: true,
        showIfDisabled: true,
        mode: 'development',
        caption: 'Under development, stay tuned for more updates!',
        sticker: 'dino_dev'
      },
      waitlist: {
        enabled: true,
        showIfDisabled: true,
        mode: 'development',
        caption: 'Under development, stay tuned for more updates!',
        sticker: 'dino_dev'
      },
    },
  });

  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState<{key: string, label: string} | null>(null);

  const API_URL = API_CONFIG.BASE_URL;

  useEffect(() => {
    fetchSettings();

    // Socket.IO for real-time updates
    const socket = (window as any).io?.(API_URL);
    if (socket) {
      socket.on('settingsUpdated', (data: any) => {
        setSettings(data.settings);
        toast.info(`Settings updated by ${data.updatedBy}`, {
          autoClose: 3000,
        });
      });

      socket.on('settingUpdated', (data: any) => {
        setSettings((prev) => ({
          ...prev,
          [data.key]: data.value,
        }));
        toast.info(`${data.key} updated by ${data.updatedBy}`, {
          autoClose: 2000,
        });
      });

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

  const handleToggleChange = async (key: string, value: any, isFlag: boolean = false) => {
    if (isFlag) {
      const currentFlag = (settings.featureFlags as any)[key];
      const updatedFlag = { ...currentFlag, enabled: value };

      setSettings(prev => ({
        ...prev,
        featureFlags: {
          ...prev.featureFlags,
          [key]: updatedFlag
        }
      }));

      try {
        await adminApi.updateSingleSetting('featureFlags', {
          ...settings.featureFlags,
          [key]: updatedFlag
        });
      } catch (error) {
        console.error('Error updating feature flag:', error);
        setSettings(prev => ({
          ...prev,
          featureFlags: {
            ...prev.featureFlags,
            [key]: currentFlag
          }
        }));
        toast.error('Failed to update feature flag');
      }
    } else {
      setSettings((prev) => ({ ...prev, [key]: value }));
      try {
        await adminApi.updateSingleSetting(key, value);
      } catch (error) {
        console.error('Error updating setting:', error);
        setSettings((prev) => ({ ...prev, [key]: !value }));
        toast.error('Failed to update setting');
      }
    }
  };

  const handleSaveAndBroadcast = async (featureKey: string, featureLabel: string) => {
    setIsBroadcasting(true);
    try {
      await adminApi.updateSingleSetting('featureFlags', settings.featureFlags);
      const flag = (settings.featureFlags as any)[featureKey];
      await adminApi.sendNotification({
        title: `🚀 ${featureLabel} Update`,
        message: flag.enabled 
          ? `Exciting news! ${featureLabel} is now live for all users. Explore it today!`
          : `We're working on ${featureLabel}! ${flag.caption}`,
        type: 'info',
        targetType: 'all'
      });
      toast.success('Settings updated and broadcast sent to all users!');
      setEditingFeature(null);
      setShowBroadcastConfirm(null);
    } catch (error) {
      console.error('Failed to save and broadcast:', error);
      toast.error('Failed to complete the update and broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleFeatureChange = async (featureKey: string, property: string, value: any) => {
    const currentFlag = (settings.featureFlags as any)[featureKey];
    const updatedFlag = { ...currentFlag, [property]: value };

    setSettings(prev => ({
      ...prev,
      featureFlags: {
        ...prev.featureFlags,
        [featureKey]: updatedFlag
      }
    }));

    try {
      await adminApi.updateSingleSetting('featureFlags', {
        ...settings.featureFlags,
        [featureKey]: updatedFlag
      });
    } catch (error) {
      console.error('Error updating feature property:', error);
      setSettings(prev => ({
        ...prev,
        featureFlags: {
          ...prev.featureFlags,
          [featureKey]: currentFlag
        }
      }));
      toast.error(`Failed to update ${property}`);
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
                </div>
              )}

              {/* Email Settings */}
              {activeTab === 'email' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Email Configuration</h2>
                    <p className="text-gray-500 mb-6">Configure email service and templates</p>
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
                    {Object.entries({
                      arMenus: 'AR Experience (Menu)',
                      preOrders: 'Pre-Order Engine',
                      events: 'Events & Guestlist',
                      waitlist: 'Universal Waitlist'
                    }).map(([key, label]) => {
                      const flag = (settings.featureFlags as any)[key];
                      const isEditing = editingFeature === key;
                      return (
                        <div key={key} className={`p-5 rounded-2xl border transition-all ${
                          isEditing ? 'bg-white border-emerald-500 shadow-xl ring-4 ring-emerald-50' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-xl ${flag.enabled ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                                <ToggleLeft className={flag.enabled ? 'text-emerald-600' : 'text-slate-400'} size={24} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{label}</p>
                                <p className="text-xs text-slate-500 font-medium">
                                  {flag.enabled ? 'LIVE IN PRODUCTION' : 'DISABLED / IN DEVELOPMENT'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {!isEditing ? (
                                <button
                                  onClick={() => setEditingFeature(key)}
                                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                  <Wrench size={14} />
                                  Edit Details
                                </button>
                              ) : (
                                <button
                                  onClick={() => setEditingFeature(null)}
                                  className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-2"
                                >
                                  Cancel
                                </button>
                              )}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={flag.enabled}
                                  onChange={(e) => handleToggleChange(key, e.target.checked, true)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                              </label>
                            </div>
                          </div>

                          {isEditing && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="pt-4 border-t border-slate-100 space-y-6"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                                    Visibility
                                  </label>
                                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <input
                                      type="checkbox"
                                      id={`show-${key}`}
                                      checked={flag.showIfDisabled}
                                      onChange={(e) => handleFeatureChange(key, 'showIfDisabled', e.target.checked)}
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <label htmlFor={`show-${key}`} className="text-sm text-slate-700 font-bold cursor-pointer">
                                      Show in UI while disabled
                                    </label>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                                    Phase Mode
                                  </label>
                                  <select
                                    value={flag.mode}
                                    onChange={(e) => handleFeatureChange(key, 'mode', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                  >
                                    <option value="development">Under Development</option>
                                    <option value="testing">Testing Mode</option>
                                    <option value="maintenance">Scheduled Maintenance</option>
                                    <option value="coming_soon">Coming Soon</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                                  Update Message (Custom Caption)
                                </label>
                                <textarea
                                  value={flag.caption}
                                  onChange={(e) => handleFeatureChange(key, 'caption', e.target.value)}
                                  placeholder="What should users see?"
                                  rows={2}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                                />
                              </div>

                              <div className="flex items-center justify-between gap-4 pt-4">
                                <div className="flex-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Selected Sticker</p>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      { id: 'dino_dev', label: 'Dev' },
                                      { id: 'dino_test', label: 'Test' },
                                      { id: 'dino_maint', label: 'Maint' },
                                      { id: 'dino_soon', label: 'Soon' }
                                    ].map((sticker) => (
                                      <button
                                        key={sticker.id}
                                        onClick={() => handleFeatureChange(key, 'sticker', sticker.id)}
                                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                                          flag.sticker === sticker.id
                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-400'
                                        }`}
                                      >
                                        {sticker.label.toUpperCase()}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setShowBroadcastConfirm({key, label})}
                                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2"
                                >
                                  <Bell size={16} />
                                  Save & Notify Users
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showBroadcastConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBroadcastConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                  <Bell className="text-emerald-600 animate-bounce" size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Broadcast Update?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  This will send an instant alert to **ALL users** about the {showBroadcastConfirm.label} update. Are you sure you want to proceed?
                </p>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <button
                    onClick={() => setShowBroadcastConfirm(null)}
                    className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Just Save
                  </button>
                  <button
                    onClick={() => handleSaveAndBroadcast(showBroadcastConfirm.key, showBroadcastConfirm.label)}
                    disabled={isBroadcasting}
                    className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isBroadcasting ? <RefreshCw className="animate-spin" size={18} /> : 'Send & Alert'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminSettingsPage;
