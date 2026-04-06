import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { useNavigate } from 'react-router-dom';
import {
  Bug,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  RefreshCw,
  Shield,
  Zap,
  CreditCard,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { adminApi } from '../utils/adminApi';

function AdminIssueReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [issueReports, setIssueReports] = useState<any[]>([]);
  const [issueStats, setIssueStats] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [filter, setFilter] = useState({
    status: '',
    issueType: '',
    priority: '',
  });

  const API_URL = API_CONFIG.BASE_URL;

  useEffect(() => {
    fetchIssueReports();
    fetchIssueStats();

    // Socket.IO for real-time updates
    const socket = (window as any).io?.(API_URL);
    if (socket) {
      socket.on('newIssueReport', (data: any) => {
        toast.info(`New ${data.priority} priority issue: ${data.title}`);
        fetchIssueReports();
        fetchIssueStats();
      });

      return () => socket.disconnect();
    }
  }, [filter]);

  const fetchIssueReports = async () => {
    try {
      const data = await adminApi.getIssueReports({
        status: filter.status,
        issueType: filter.issueType,
        priority: filter.priority,
      });
      if (data.success) {
        setIssueReports(data.issueReports);
      }
    } catch (error) {
      console.error('Error fetching issue reports:', error);
    } finally {
      setLoading(false);
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
        setSelectedIssue(null);
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

  const getIssueIcon = (issueType: string) => {
    switch (issueType) {
      case 'bug':
        return <Bug className="w-5 h-5 text-red-600" />;
      case 'performance':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      case 'security':
        return <Shield className="w-5 h-5 text-purple-600" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'booking':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'feature_request':
        return <HelpCircle className="w-5 h-5 text-indigo-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
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
              <Bug className="w-6 h-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Issue Reports</h1>
            </div>
            <button
              onClick={() => {
                fetchIssueReports();
                fetchIssueStats();
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {issueStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{issueStats.total}</p>
              <p className="text-sm text-gray-500">Total Issues</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{issueStats.open}</p>
              <p className="text-sm text-gray-500">Open Issues</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{issueStats.critical}</p>
              <p className="text-sm text-gray-500">Critical Issues</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {issueStats.byStatus?.find((s: any) => s._id === 'resolved')?.count || 0}
              </p>
              <p className="text-sm text-gray-500">Resolved</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type</label>
              <select
                value={filter.issueType}
                onChange={(e) => setFilter({ ...filter, issueType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="bug">Bug</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="payment">Payment</option>
                <option value="booking">Booking</option>
                <option value="feature_request">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Issue Reports List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Issue Reports ({issueReports.length})
          </h2>
          
          {issueReports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No issue reports found</p>
          ) : (
            <div className="space-y-3">
              {issueReports.map((issue) => (
                <div
                  key={issue._id}
                  onClick={() => setSelectedIssue(issue)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getIssueIcon(issue.issueType)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{issue.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                            {issue.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                            {issue.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {issue.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Reporter: {issue.reporterName}</span>
                          <span>Type: {issue.issueType.replace('_', ' ')}</span>
                          <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getIssueIcon(selectedIssue.issueType)}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedIssue.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedIssue.priority)}`}>
                        {selectedIssue.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedIssue.status)}`}>
                        {selectedIssue.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedIssue.description}</p>
              </div>

              {selectedIssue.stepsToReproduce && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Steps to Reproduce</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedIssue.stepsToReproduce}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedIssue.expectedBehavior && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Expected Behavior</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedIssue.expectedBehavior}</p>
                  </div>
                )}
                {selectedIssue.actualBehavior && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Actual Behavior</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedIssue.actualBehavior}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Reporter</p>
                  <p className="font-medium text-gray-900">{selectedIssue.reporterName}</p>
                  <p className="text-gray-600">{selectedIssue.reporterEmail}</p>
                </div>
                <div>
                  <p className="text-gray-500">Reported On</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedIssue.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedIssue.browserInfo && (
                <div className="text-sm">
                  <p className="text-gray-500">Browser Info</p>
                  <p className="text-gray-700 font-mono text-xs">{selectedIssue.browserInfo}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => updateIssueStatus(selectedIssue._id, 'in_progress')}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => updateIssueStatus(selectedIssue._id, 'resolved')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => updateIssueStatus(selectedIssue._id, 'closed')}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminIssueReportsPage;
