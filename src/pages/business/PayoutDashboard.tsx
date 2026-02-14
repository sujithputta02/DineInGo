import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    Download,
    Calendar,
    CreditCard,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { businessApi } from '../../services/api';
import { toast } from 'react-toastify';

interface PayoutAnalytics {
    summary: {
        totalRevenue: number;
        totalFees: number;
        totalPayout: number;
        bookingCount: number;
        platformFeeRate: number;
    };
    payouts: any[];
    revenueChart: any[];
    pendingPayout: {
        amount: number;
        canRequest: boolean;
    };
}

interface BankDetails {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
}

const PayoutDashboard: React.FC = () => {
    const [analytics, setAnalytics] = useState<PayoutAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [showBankForm, setShowBankForm] = useState(false);
    const [bankDetails, setBankDetails] = useState<BankDetails>({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: ''
    });
    const [requesting, setRequesting] = useState(false);

    const ownerId = localStorage.getItem('uid') || '';

    useEffect(() => {
        loadAnalytics();
    }, [period]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const data = await businessApi.getPayoutAnalytics(ownerId, period);
            setAnalytics(data);
        } catch (error) {
            console.error('Error loading payout analytics:', error);
            toast.error('Failed to load payout data');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async () => {
        if (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
            toast.error('Please fill in all bank details');
            return;
        }

        try {
            setRequesting(true);

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(period));

            await businessApi.requestPayout({
                ownerId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                bankDetails
            });

            toast.success('Payout request submitted successfully!');
            setShowBankForm(false);
            loadAnalytics();
        } catch (error: any) {
            console.error('Error requesting payout:', error);
            toast.error(error.response?.data?.message || 'Failed to request payout');
        } finally {
            setRequesting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'processing': return 'bg-blue-100 text-blue-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} className="text-green-600" />;
            case 'processing': return <RefreshCw size={16} className="text-blue-600 animate-spin" />;
            case 'pending': return <Clock size={16} className="text-yellow-600" />;
            case 'failed': return <XCircle size={16} className="text-red-600" />;
            default: return <AlertCircle size={16} className="text-gray-600" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Payouts</h1>
                    <p className="text-slate-600 mt-1">Track your earnings and manage bank transfers</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-emerald-100 p-3 rounded-lg">
                            <DollarSign className="text-emerald-600" size={24} />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Gross Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">₹{analytics.summary.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{analytics.summary.bookingCount} bookings</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <TrendingUp className="text-orange-600" size={24} />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Platform Fees</p>
                    <p className="text-2xl font-bold text-slate-900">₹{analytics.summary.totalFees.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{(analytics.summary.platformFeeRate * 100).toFixed(0)}% commission</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <CreditCard className="text-blue-600" size={24} />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Net Payout</p>
                    <p className="text-2xl font-bold text-slate-900">₹{analytics.summary.totalPayout.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">After platform fees</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-purple-100 p-3 rounded-lg">
                            <Clock className="text-purple-600" size={24} />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Pending Payout</p>
                    <p className="text-2xl font-bold text-slate-900">₹{analytics.pendingPayout.amount.toLocaleString()}</p>
                    {analytics.pendingPayout.canRequest ? (
                        <button
                            onClick={() => setShowBankForm(true)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1"
                        >
                            Request Payout →
                        </button>
                    ) : (
                        <p className="text-xs text-slate-500 mt-1">Minimum ₹1,000 required</p>
                    )}
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Revenue Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Gross Revenue" />
                        <Line type="monotone" dataKey="netPayout" stroke="#3b82f6" strokeWidth={2} name="Net Payout" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Payout History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900">Payout History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Platform Fee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Net Payout</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {analytics.payouts.length > 0 ? (
                                analytics.payouts.map((payout) => (
                                    <tr key={payout._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                            {new Date(payout.period.startDate).toLocaleDateString()} - {new Date(payout.period.endDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            ₹{payout.grossRevenue.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            ₹{payout.platformFee.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                                            ₹{payout.netPayout.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                                                {getStatusIcon(payout.status)}
                                                {payout.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {new Date(payout.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                                        <p>No payout history yet</p>
                                        <p className="text-sm mt-1">Request your first payout when you reach the minimum amount</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bank Details Modal */}
            {showBankForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Request Payout</h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Enter your bank details to receive ₹{analytics.pendingPayout.amount.toLocaleString()}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountHolderName}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountNumber}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="1234567890"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                                <input
                                    type="text"
                                    value={bankDetails.ifscCode}
                                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="SBIN0001234"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.bankName}
                                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="State Bank of India"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowBankForm(false)}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                disabled={requesting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestPayout}
                                disabled={requesting}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                {requesting ? 'Processing...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayoutDashboard;
