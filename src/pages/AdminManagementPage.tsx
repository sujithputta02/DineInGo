import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Crown,
  Ghost,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { adminApi } from '../utils/adminApi';

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Admin {
  email: string;
  role: 'super_admin' | 'admin';
  isActive: boolean;
  addedBy: string;
  createdAt: string;
  lastLogin?: string;
  permissions?: {
    canImpersonate: boolean;
  };
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [newMaxAdmins, setNewMaxAdmins] = useState(5);

  const currentAdminEmail = localStorage.getItem('adminEmail');
  const currentAdminRole = localStorage.getItem('adminRole');

  useEffect(() => {
    // Check if user is super admin
    if (currentAdminRole !== 'super_admin') {
      navigate('/admin/dashboard');
      return;
    }
    loadAdmins();
  }, [navigate, currentAdminRole, currentPage]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await adminApi.getAdmins({
        page: currentPage,
        limit: 10
      });

      setAdmins(data.admins);
      setPagination(data.pagination);
      setTotalCount(data.pagination.totalCount);
      setMaxAdmins(data.maxAdmins);
      setNewMaxAdmins(data.maxAdmins);
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

  const handleToggleGhostPermission = async (adminEmail: string) => {
    setActionLoading(`ghost-${adminEmail}`);
    setError(null);
    setSuccess(null);

    try {
      const data = await adminApi.toggleImpersonationPermission(adminEmail);
      setSuccess(data.message);
      await loadAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to update ghosting permission');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('capacity');
    setError(null);
    setSuccess(null);

    try {
      const data = await adminApi.updateMaxAdmins(newMaxAdmins);

      setSuccess(data.message);
      setMaxAdmins(newMaxAdmins);
      setShowCapacityModal(false);
      await loadAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to update admin capacity');
    } finally {
      setActionLoading(null);
    }
  };

  const AddAdminModal = React.memo(() => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="text-blue-600" size={20} />
              Add New Admin
            </h2>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-600 p-2 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleAddAdmin} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="admin@example.com"
              required
              autoFocus
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
              <div className="text-xs sm:text-sm text-blue-800">
                <p className="font-medium mb-1">Admin Limit: {totalCount}/{maxAdmins}</p>
                <p>The new admin will receive a welcome email with login instructions.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading === 'add' || !newAdminEmail || totalCount >= maxAdmins}
              className="flex-1 bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
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
      </div>
    </div>
  ));

  const CapacityModal = React.memo(() => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="text-purple-600" size={20} />
              Update Admin Capacity
            </h2>
            <button
              onClick={() => setShowCapacityModal(false)}
              className="text-slate-400 hover:text-slate-600 p-2 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleUpdateCapacity} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
              Maximum Admins
            </label>
            <input
              type="number"
              min={totalCount}
              value={newMaxAdmins}
              onChange={(e) => setNewMaxAdmins(parseInt(e.target.value))}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
              required
              autoFocus
            />
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-purple-600 mt-0.5 flex-shrink-0" size={16} />
              <div className="text-xs sm:text-sm text-purple-800">
                <p className="font-medium mb-1">Current: {totalCount} active admins</p>
                <p>You can only set the capacity to {totalCount} or higher.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={() => setShowCapacityModal(false)}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading === 'capacity' || newMaxAdmins < totalCount}
              className="flex-1 bg-purple-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {actionLoading === 'capacity' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Updating...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Update Capacity
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  ));

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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
            <Shield className="text-red-600" size={24} />
            <span className="sm:inline">Admin Team Management</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage DineInGo administrator access</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={loadAdmins}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors text-sm flex-1 sm:flex-initial"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={totalCount >= maxAdmins}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex-1 sm:flex-initial"
          >
            <Plus size={16} />
            Add Admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="text-blue-600" size={18} />
              <span className="text-xs sm:text-sm font-medium text-slate-600">Total Admins</span>
            </div>
            <button
              onClick={() => setShowCapacityModal(true)}
              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
              title="Update capacity"
            >
              Edit Limit
            </button>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">Maximum: {maxAdmins}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <CheckCircle className="text-green-600" size={18} />
            <span className="text-xs sm:text-sm font-medium text-slate-600">Active Admins</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {admins.filter(a => a.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Crown className="text-yellow-600" size={18} />
            <span className="text-xs sm:text-sm font-medium text-slate-600">Super Admins</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">
            {admins.filter(a => a.role === 'super_admin').length}
          </p>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
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
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700"
          >
            <CheckCircle size={16} />
            <span className="font-medium">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Admin Team Members</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {admins.map((admin) => (
            <div key={admin.email} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                    admin.role === 'super_admin' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}>
                    {admin.role === 'super_admin' ? <Crown size={18} /> : admin.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{admin.email}</h4>
                      {admin.role === 'super_admin' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full whitespace-nowrap">
                          Super Admin
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                        admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {admin.permissions?.canImpersonate && (
                         <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                           <Ghost size={10} /> Trusted Ghost
                         </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-slate-500">
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
                        <span className="truncate">By: {admin.addedBy}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {admin.role !== 'super_admin' && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleToggleStatus(admin.email)}
                      disabled={actionLoading === admin.email}
                      className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        admin.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      } disabled:opacity-50`}
                    >
                      {actionLoading === admin.email ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mx-auto" />
                      ) : admin.isActive ? (
                        'Deactivate'
                      ) : (
                        'Activate'
                      )}
                    </button>

                    {/* Delegation Toggle */}
                    <button
                      onClick={() => handleToggleGhostPermission(admin.email)}
                      disabled={actionLoading === `ghost-${admin.email}`}
                      title={admin.permissions?.canImpersonate ? "Revoke Ghost Privilege" : "Deputize for Ghosting"}
                      className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        admin.permissions?.canImpersonate
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      } disabled:opacity-50 flex items-center justify-center gap-1.5`}
                    >
                      {actionLoading === `ghost-${admin.email}` ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mx-auto" />
                      ) : (
                        <>
                          <Ghost size={14} className={admin.permissions?.canImpersonate ? 'animate-bounce' : ''} />
                          <span className="hidden lg:inline">{admin.permissions?.canImpersonate ? 'Deputized' : 'Deputize'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRemoveAdmin(admin.email)}
                      disabled={actionLoading === admin.email}
                      className="px-3 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-500 font-medium">
                Showing <span className="text-slate-900">{(pagination.currentPage - 1) * 10 + 1}</span> to{' '}
                <span className="text-slate-900">
                  {Math.min(pagination.currentPage * 10, pagination.totalCount)}
                </span>{' '}
                of <span className="text-slate-900">{pagination.totalCount}</span> admins
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (pagination.hasPrev) {
                      setCurrentPage(prev => prev - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={!pagination.hasPrev}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                        pagination.currentPage === page
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (pagination.hasNext) {
                      setCurrentPage(prev => prev + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={!pagination.hasNext}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {admins.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No admins found</h3>
            <p className="mt-1 text-sm text-slate-500">Start by adding your first admin team member.</p>
          </div>
        )}
      </div>

      {showAddModal && <AddAdminModal />}
      {showCapacityModal && <CapacityModal />}
    </div>
  );
};

export default AdminManagementPage;