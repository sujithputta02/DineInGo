import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Eye,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import io from 'socket.io-client';
import { adminApi } from '../utils/adminApi';

interface User {
  _id: string;
  displayName: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'customer' | 'owner' | 'admin';
  createdAt: string;
  lastLogin?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');
    setSocket(newSocket);

    // Load initial data
    loadUsers();

    // Set up real-time listeners
    newSocket.on('userStatusChanged', (data) => {
      console.log('User status changed:', data);
      // Update the user in the list
      setUsers(prev => prev.map(user => 
        user._id === data.userId 
          ? { ...user, role: data.isActive ? 'customer' : 'admin' }
          : user
      ));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentPage, searchTerm, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        status: statusFilter
      });

      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      setActionLoading(userId);
      const data = await adminApi.toggleUserStatus(userId);
      
      if (data.success) {
        // Update will be handled by socket event
        console.log('User status updated:', data.message);
      } else {
        alert(data.message || 'Failed to update user status');
      }
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert(error.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (user: User) => {
    const isActive = user.role !== 'admin';
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          <CheckCircle size={12} />
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          <AlertTriangle size={12} />
          Inactive
        </span>
      );
    }
  };

  const UserCard = ({ user }: { user: User }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{user.displayName || user.name || 'No Name'}</h3>
            <p className="text-sm text-slate-600">{user.email}</p>
          </div>
        </div>
        {getStatusBadge(user)}
      </div>

      <div className="space-y-2 mb-4">
        {user.phoneNumber && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone size={14} />
            <span>{user.phoneNumber}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} />
          <span>Joined {formatDate(user.createdAt)}</span>
        </div>
        {user.lastLogin && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock size={14} />
            <span>Last login {formatDate(user.lastLogin)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleToggleUserStatus(user._id)}
          disabled={actionLoading === user._id}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            user.role !== 'admin'
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          } disabled:opacity-50`}
        >
          {actionLoading === user._id ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : user.role !== 'admin' ? (
            <UserX size={14} />
          ) : (
            <UserCheck size={14} />
          )}
          {user.role !== 'admin' ? 'Deactivate' : 'Activate'}
        </button>
        <button className="px-3 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
          <Eye size={14} />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            User Management
          </h1>
          <p className="text-slate-600 mt-1">
            Manage platform users and their access
            {pagination && (
              <span className="ml-2">• {pagination.totalUsers} total users</span>
            )}
          </p>
        </div>
        <button 
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Filter size={16} />
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading users...</p>
          </div>
        </div>
      ) : users.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <UserCard key={user._id} user={user} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="text-sm text-slate-600">
                Showing page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto text-slate-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No users found</h3>
          <p className="text-slate-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No users have registered yet'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;