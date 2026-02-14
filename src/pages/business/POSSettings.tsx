import React, { useState, useEffect } from 'react';
import { Link2, CheckCircle, XCircle, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { businessApi } from '../../services/api';
import { toast } from 'react-toastify';

interface POSIntegration {
    provider: string;
    webhookUrl: string;
    isActive: boolean;
    syncStatus: string;
    lastSync?: Date;
    settings: {
        autoSyncOrders: boolean;
        syncInterval: number;
        mapOrdersToReservations: boolean;
    };
}

const POSSettings: React.FC = () => {
    const [integration, setIntegration] = useState<POSIntegration | null>(null);
    const [loading, setLoading] = useState(true);
    const [showConnectForm, setShowConnectForm] = useState(false);
    const [formData, setFormData] = useState({
        provider: 'square',
        apiKey: '',
        apiSecret: '',
        webhookSecret: ''
    });
    const [syncing, setSyncing] = useState(false);

    const businessId = localStorage.getItem('selectedBusinessId') || '';

    useEffect(() => {
        loadIntegration();
    }, []);

    const loadIntegration = async () => {
        try {
            setLoading(true);
            const data = await businessApi.getPOSIntegration(businessId);
            setIntegration(data);
        } catch (error: any) {
            if (error.response?.status !== 404) {
                console.error('Error loading POS integration:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            await businessApi.connectPOS({
                businessId,
                ...formData
            });
            toast.success('POS system connected successfully!');
            setShowConnectForm(false);
            loadIntegration();
        } catch (error) {
            console.error('Error connecting POS:', error);
            toast.error('Failed to connect POS system');
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            await businessApi.syncPOSOrders(businessId);
            toast.success('Orders synced successfully!');
            loadIntegration();
        } catch (error) {
            console.error('Error syncing orders:', error);
            toast.error('Failed to sync orders');
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect your POS system?')) return;

        try {
            await businessApi.disconnectPOS(businessId);
            toast.success('POS system disconnected');
            setIntegration(null);
        } catch (error) {
            console.error('Error disconnecting POS:', error);
            toast.error('Failed to disconnect POS system');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'text-green-600 bg-green-100';
            case 'disconnected': return 'text-gray-600 bg-gray-100';
            case 'error': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected': return <CheckCircle size={20} />;
            case 'disconnected': return <XCircle size={20} />;
            case 'error': return <AlertCircle size={20} />;
            default: return <AlertCircle size={20} />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">POS Integration</h1>
                <p className="text-slate-600 mt-1">Connect your Point of Sale system to sync orders with reservations</p>
            </div>

            {integration ? (
                <>
                    {/* Status Card */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-900">Connection Status</h3>
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(integration.syncStatus)}`}>
                                {getStatusIcon(integration.syncStatus)}
                                {integration.syncStatus}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Provider</p>
                                <p className="text-lg font-medium text-slate-900 capitalize">{integration.provider}</p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-500 mb-1">Last Sync</p>
                                <p className="text-lg font-medium text-slate-900">
                                    {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-500 mb-1">Auto Sync</p>
                                <p className="text-lg font-medium text-slate-900">
                                    {integration.settings.autoSyncOrders ? 'Enabled' : 'Disabled'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-slate-500 mb-1">Sync Interval</p>
                                <p className="text-lg font-medium text-slate-900">
                                    {integration.settings.syncInterval} minutes
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <p className="text-sm text-slate-500 mb-2">Webhook URL</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 font-mono">
                                    {integration.webhookUrl}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(integration.webhookUrl);
                                        toast.success('Webhook URL copied!');
                                    }}
                                    className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSync}
                                disabled={syncing || !integration.isActive}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>

                            <button
                                onClick={handleDisconnect}
                                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Connect Form */}
                    {showConnectForm ? (
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900 mb-6">Connect POS System</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                                    <select
                                        value={formData.provider}
                                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="square">Square</option>
                                        <option value="toast">Toast</option>
                                        <option value="clover">Clover</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                                    <input
                                        type="text"
                                        value={formData.apiKey}
                                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter your API key"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">API Secret (Optional)</label>
                                    <input
                                        type="password"
                                        value={formData.apiSecret}
                                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter your API secret"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Webhook Secret (Optional)</label>
                                    <input
                                        type="password"
                                        value={formData.webhookSecret}
                                        onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter webhook secret"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleConnect}
                                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    Connect
                                </button>
                                <button
                                    onClick={() => setShowConnectForm(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
                            <Link2 className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">No POS System Connected</h3>
                            <p className="text-slate-600 mb-6">
                                Connect your Point of Sale system to automatically sync orders with reservations
                            </p>
                            <button
                                onClick={() => setShowConnectForm(true)}
                                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                Connect POS System
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Supported Providers */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Supported Providers</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Square', 'Toast', 'Clover', 'Custom'].map((provider) => (
                        <div key={provider} className="p-4 border border-slate-200 rounded-lg text-center">
                            <p className="font-medium text-slate-900">{provider}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default POSSettings;
