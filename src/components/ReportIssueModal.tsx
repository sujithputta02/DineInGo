import React, { useState } from 'react';
import { X, AlertCircle, Bug, Zap, Shield, CreditCard, Calendar, HelpCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'user' | 'business' | 'guest';
  userId?: string;
  userEmail?: string;
  userName?: string;
}

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  userType,
  userId,
  userEmail,
  userName,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    issueType: 'bug',
    priority: 'medium',
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    reporterEmail: userEmail || '',
    reporterName: userName || '',
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const issueTypes = [
    { value: 'bug', label: 'Bug / Error', icon: Bug, color: 'text-red-600' },
    { value: 'performance', label: 'Performance Issue', icon: Zap, color: 'text-yellow-600' },
    { value: 'security', label: 'Security Concern', icon: Shield, color: 'text-purple-600' },
    { value: 'payment', label: 'Payment Issue', icon: CreditCard, color: 'text-green-600' },
    { value: 'booking', label: 'Booking Problem', icon: Calendar, color: 'text-blue-600' },
    { value: 'feature_request', label: 'Feature Request', icon: HelpCircle, color: 'text-indigo-600' },
    { value: 'other', label: 'Other', icon: AlertCircle, color: 'text-gray-600' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.reporterEmail || !formData.reporterName) {
      toast.error('Please provide your email and name');
      return;
    }

    setSubmitting(true);
    try {
      // Get browser and device info
      const browserInfo = navigator.userAgent;
      const deviceInfo = `${window.screen.width}x${window.screen.height}, ${navigator.platform}`;

      const response = await axios.post(`${API_URL}/api/issue-reports/submit`, {
        reporterType: userType,
        reporterId: userId,
        reporterEmail: formData.reporterEmail,
        reporterName: formData.reporterName,
        issueType: formData.issueType,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        stepsToReproduce: formData.stepsToReproduce,
        expectedBehavior: formData.expectedBehavior,
        actualBehavior: formData.actualBehavior,
        browserInfo,
        deviceInfo,
      });

      if ((response.data as any).success) {
        toast.success('Issue reported successfully! We\'ll look into it.');
        onClose();
        setFormData({
          issueType: 'bug',
          priority: 'medium',
          title: '',
          description: '',
          stepsToReproduce: '',
          expectedBehavior: '',
          actualBehavior: '',
          reporterEmail: userEmail || '',
          reporterName: userName || '',
        });
      }
    } catch (error) {
      console.error('Error submitting issue report:', error);
      toast.error('Failed to submit issue report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Report an Issue</h2>
              <p className="text-sm text-gray-500">Help us improve DineInGo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.reporterName}
                onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.reporterEmail}
                onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {issueTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, issueType: type.value })}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      formData.issueType === type.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${type.color}`} />
                    <p className="text-xs font-medium text-gray-700 text-center">
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {priorities.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: priority.value })}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    formData.priority === priority.value
                      ? priority.color + ' ring-2 ring-offset-2 ring-emerald-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief summary of the issue"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue in detail..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Steps to Reproduce (Optional)
            </label>
            <textarea
              value={formData.stepsToReproduce}
              onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Expected vs Actual Behavior */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Behavior (Optional)
              </label>
              <textarea
                value={formData.expectedBehavior}
                onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                placeholder="What should happen..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actual Behavior (Optional)
              </label>
              <textarea
                value={formData.actualBehavior}
                onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                placeholder="What actually happens..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportIssueModal;
