import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  RefreshCw,
  Filter,
  AlertCircle,
  Bug,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { adminApi } from '../utils/adminApi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function AdminReportsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analytics' | 'issues'>('analytics');
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('platform_overview');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [previousReports, setPreviousReports] = useState<any[]>([]);
  
  // Issue Reports State
  const [issueReports, setIssueReports] = useState<any[]>([]);
  const [issueStats, setIssueStats] = useState<any>(null);
  const [issueFilter, setIssueFilter] = useState({
    status: '',
    issueType: '',
    priority: '',
  });

  const API_URL = API_CONFIG.BASE_URL;

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchPreviousReports();
    } else {
      fetchIssueReports();
      fetchIssueStats();
    }
    
    // Socket.IO for real-time updates
    const socket = (window as any).io?.(API_URL);
    if (socket) {
      socket.on('reportGenerated', (data: any) => {
        if (data.reportType === 'admin') {
          toast.success(`New report generated: ${data.title}`);
          fetchPreviousReports();
        }
      });

      socket.on('newIssueReport', (data: any) => {
        toast.info(`New ${data.priority} priority issue reported: ${data.title}`);
        fetchIssueReports();
        fetchIssueStats();
      });

      return () => socket.disconnect();
    }
  }, [activeTab]);

  const fetchPreviousReports = async () => {
    try {
      const data = await adminApi.getReportsList({ reportType: 'admin', limit: 5 });
      if (data.success) {
        setPreviousReports(data.reports);
      }
    } catch (error) {
      console.error('Error fetching previous reports:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = await adminApi.generateReport({
        startDate,
        endDate,
        reportType,
      });

      if (data.success) {
        setReportData(data.data);
        toast.success('Report generated successfully');
        fetchPreviousReports();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${reportType}_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const fetchIssueReports = async () => {
    try {
      const data = await adminApi.getIssueReports({
        status: issueFilter.status,
        issueType: issueFilter.issueType,
        priority: issueFilter.priority,
      });
      if (data.success) {
        setIssueReports(data.issueReports);
      }
    } catch (error) {
      console.error('Error fetching issue reports:', error);
    }
  };

  const fetchIssueStats = async () => {
    try {
      const data = await adminApi.getIssueStats();
      if (data.success) {
        setIssueStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching issue stats:', error);
    }
  };

  const updateIssueStatus = async (issueId: string, status: string) => {
    try {
      const data = await adminApi.updateIssueStatus(issueId, status);
      if (data.success) {
        toast.success('Issue status updated');
        fetchIssueReports();
        fetchIssueStats();
      }
    } catch (error) {
      console.error('Error updating issue status:', error);
      toast.error('Failed to update issue status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 ring-2 ring-red-500';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-blue-100 text-blue-700';
      case 'low':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

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
              <FileText className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Generator */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Generate New Report
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="platform_overview">Platform Overview</option>
                <option value="revenue">Revenue Analysis</option>
                <option value="user_growth">User Growth</option>
                <option value="booking_analytics">Booking Analytics</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={generateReport}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BarChart3 className="w-4 h-4" />
                {loading ? 'Generating...' : 'Generate'}
              </button>
              {reportData && (
                <button
                  onClick={exportReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Data */}
        {reportData && (
          <>
            {/* Summary Cards */}
            {reportData.summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-emerald-600" />
                    <span className="text-sm text-green-600 font-medium">
                      +{reportData.summary.newUsers}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {reportData.summary.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Users</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                    <span className="text-sm text-green-600 font-medium">
                      +{reportData.summary.newBusinesses}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {reportData.summary.totalBusinesses.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Businesses</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-purple-600" />
                    <span className="text-sm text-green-600 font-medium">
                      +{reportData.summary.newBookings}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {reportData.summary.totalBookings.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Bookings</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${reportData.summary.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                </div>
              </div>
            )}

            {/* Charts */}
            {reportData.dailyStats && reportData.dailyStats.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Daily Bookings
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="bookings"
                        stroke="#10b981"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Daily Revenue
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* Previous Reports */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Reports
          </h2>
          
          {previousReports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No previous reports</p>
          ) : (
            <div className="space-y-3">
              {previousReports.map((report) => (
                <div
                  key={report._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{report.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString()} - {report.category}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : report.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminReportsPage;
