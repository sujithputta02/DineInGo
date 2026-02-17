import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Users,
  Shield,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Crown
} from 'lucide-react';
import { adminApi } from '../utils/adminApi';

interface Admin {
  email: string;
  role: 'super_admin' | 'admin';
  isActive: boolean;
  addedBy: string;
  createdAt: string;
  lastLogin?: string;
}

const AdminManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [maxAdmins, setMaxAdmins] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  const currentAdminEmail = localStorage.getItem('adminEmail');
  const currentAdminRole = localStorage.getItem('adminRole');

  useEffect(() => {
    // Check if user is super admin
    if (currentAdminRole !== 'super_admin') {
      navigate('/admin/dashboard');
      return;
    }
    loadAdmins();
  }, [navigate, currentAdminRole]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await adminApi.getAdmins();

      setAdmins(data.admins);
      setTotalCount(data.totalCount);
      setMaxAdmins(data.maxAdmins);
    } catch (err: any) {
      setError(err.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('add');
    setError(null);
    setSuccess(null);

    try {
      const data = await adminApi.addAdmin(newAdminEmail);

      setSuccess('Admin added successfully! Welcome email sent.');
      setNewAdminEmail('');
      setShowAddModal(false);
      await loadAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to add admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAdmin = async (adminEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove ${adminEmail} from the admin team?`)) {
      return;
    }

    setActionLoading(adminEmail);
    setError(null);
    setSuccess(null);

    try {
      const data = await adminApi.removeAdmin(adminEmail);

      setSuccess('Admin removed successfully');
      await loadAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to remove admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (adminEmail: string) => {
    setActionLoading(adminEmail);
    setError(null);
    setSuccess(null);

    try {
      const data = await adminApi.toggleAdminStatus(adminEmail);

      setSuccess(data.message);
      await loadAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to update admin status');
    } finally {
      setActionLoading(null);
    }
  };

  const AddAdminModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-md w-full"
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="text-blue-600" size={24} />
              Add New Admin
            </h2>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-600 p-2"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-blue-600 mt-0.5" size={16} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Admin Limit: {totalCount}/{maxAdmins}</p>
                <p>The new admin will receive a welcome email with login instructions.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading === 'add' || !newAdminEmail || totalCount >= maxAdmins}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {actionLoading === 'add' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Admin
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading admin team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="text-red-600" size={32} />
            Admin Team Management
          </h1>
          <p className="text-slate-600 mt-1">Manage DineInGo administrator access</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadAdmins}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={totalCount >= maxAdmins}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            Add Admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-600" size={20} />
            <span className="text-sm font-medium text-slate-600">Total Admins</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">Maximum: {maxAdmins}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-sm font-medium text-slate-600">Active Admins</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {admins.filter(a => a.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="text-yellow-600" size={20} />
            <span className="text-sm font-medium text-slate-600">Super Admins</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {admins.filter(a => a.role === 'super_admin').length}
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
        >
          <AlertTriangle size={16} />
          <span className="font-medium">{error}</span>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700"
        >
          <CheckCircle size={16} />
          <span className="font-medium">{success}</span>
        </motion.div>
      )}

      {/* Admin List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Admin Team Members</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {admins.map((admin) => (
            <div key={admin.email} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    admin.role === 'super_admin' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}>
                    {admin.role === 'super_admin' ? <Crown size={20} /> : admin.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{admin.email}</h4>
                      {admin.role === 'super_admin' && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Super Admin
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>Added: {new Date(admin.createdAt).toLocaleDateString()}</span>
                      </div>
                      {admin.lastLogin && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>Last login: {new Date(admin.lastLogin).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <UserPlus size={12} />
                        <span>Added by: {admin.addedBy}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {admin.role !== 'super_admin' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleStatus(admin.email)}
                      disabled={actionLoading === admin.email}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        admin.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      } disabled:opacity-50`}
                    >
                      {actionLoading === admin.email ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      ) : admin.isActive ? (
                        'Deactivate'
                      ) : (
                        'Activate'
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveAdmin(admin.email)}
                      disabled={actionLoading === admin.email}
                      className="px-3 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === admin.email ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {admins.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No admins found</h3>
            <p className="mt-1 text-sm text-slate-500">Start by adding your first admin team member.</p>
          </div>
        )}
      </div>

      {showAddModal && <AddAdminModal />}
    </div>
  );
};

export default AdminManagementPage;