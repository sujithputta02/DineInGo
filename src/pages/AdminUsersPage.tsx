import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  UserX,
  Mail,
  Phone,
  Calendar,
  Eye,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  LogIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { adminApi } from '../utils/adminApi';

interface User {
  _id: string;
  uid: string;
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

interface GhostDurationModalProps {
  ghostDuration: number;
  setGhostDuration: (val: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}

interface PaginationControlsProps {
  pagination: Pagination | null;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

interface UserCardProps {
  user: User;
  activeGhostUid: string | null;
  actionLoading: string | null;
  onToggleStatus: (userId: string) => void;
  onGhostLogin: (user: User) => void;
}

function GhostDurationModal({ 
  ghostDuration, 
  setGhostDuration, 
  onClose, 
  onConfirm 
}: GhostDurationModalProps) {
  return (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-slate-100"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
          <Clock size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Ghost Session</h3>
          <p className="text-sm text-slate-500 font-medium">Set surveillance duration</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Duration</label>
            <span className="text-2xl font-black text-purple-600 font-mono">{ghostDuration}m</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="20" 
            step="1" 
            value={ghostDuration}
            onChange={(e) => setGhostDuration(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
            <span>5 Mins</span>
            <span>20 Mins</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 italic text-xs text-slate-500">
          Note: You will be automatically logged out when the timer expires for security purposes.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
          >
            Start Ghosting
          </button>
        </div>
      </div>
    </motion.div>
  </div>
  );
}

const getStatusBadge = (user: User, activeGhostUid: string | null) => {
  const isCurrentlyGhosted = activeGhostUid === user.uid;
  
  if (isCurrentlyGhosted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-purple-600 text-white rounded-full animate-pulse shadow-lg shadow-purple-500/20">
        <Clock size={12} className="animate-spin-slow" />
        Active Ghost
      </span>
    );
  }

  if (user.role !== 'admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        <CheckCircle size={12} />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
      <AlertTriangle size={12} />
      Inactive
    </span>
  );
};

function PaginationControls({ 
  pagination, 
  currentPage, 
  setCurrentPage 
}: PaginationControlsProps) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];
    const { totalPages } = pagination;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => {
            setCurrentPage(i);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
            currentPage === i
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500 ring-offset-2'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pb-8">
      <div className="text-sm text-slate-500 font-medium">
        Showing <span className="text-slate-900">{(pagination.currentPage - 1) * 20 + 1}</span> to{' '}
        <span className="text-slate-900">
          {Math.min(pagination.currentPage * 20, pagination.totalUsers)}
        </span>{' '}
        of <span className="text-slate-900">{pagination.totalUsers}</span> users
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
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          {renderPageNumbers()}
        </div>

        <button
          onClick={() => {
            if (pagination.hasNext) {
              setCurrentPage(prev => prev + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          disabled={!pagination.hasNext}
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

function UserCard({ 
  user, 
  activeGhostUid, 
  actionLoading, 
  onToggleStatus, 
  onGhostLogin 
}: UserCardProps) {
  return (
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
          <p className="text-sm text-slate-600 truncate max-w-[150px]">{user.email}</p>
        </div>
      </div>
      {getStatusBadge(user, activeGhostUid)}
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
        <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
      </div>
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => onToggleStatus(user._id)}
        disabled={actionLoading === user._id}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          user.role !== 'admin'
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        } disabled:opacity-50`}
      >
        {user.role !== 'admin' ? 'Deactivate' : 'Activate'}
      </button>
      <button
        onClick={() => onGhostLogin(user)}
        disabled={actionLoading === user._id || activeGhostUid === user.uid}
        className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
          activeGhostUid === user.uid 
            ? 'bg-purple-600 text-white shadow-inner ring-2 ring-purple-400' 
            : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
        title={activeGhostUid === user.uid ? "Ghosting session active" : "Ghost Login"}
      >
        <LogIn size={14} className={activeGhostUid === user.uid ? "text-white" : "text-blue-400"} />
        <span className="hidden sm:inline">{activeGhostUid === user.uid ? 'Active' : 'Ghost'}</span>
      </button>
      <button className="px-3 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
        <Eye size={14} />
      </button>
    </div>
  </motion.div>
  );
}

function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeGhostUid, setActiveGhostUid] = useState<string | null>(null);
  const [isGhostModalOpen, setIsGhostModalOpen] = useState(false);
  const [selectedUserForGhost, setSelectedUserForGhost] = useState<User | null>(null);
  const [ghostDuration, setGhostDuration] = useState(20);

  useEffect(() => {
    const checkGhost = () => {
      const userDataRaw = localStorage.getItem('userData');
      if (userDataRaw) {
        try {
          const userData = JSON.parse(userDataRaw);
          if (userData.impersonated) {
            setActiveGhostUid(userData.uid);
            return;
          }
        } catch (e) {
          console.error('Failed to parse userData for ghost check');
        }
      }
      setActiveGhostUid(null);
    };

    checkGhost();
    const interval = setInterval(checkGhost, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGhostLogin = (user: User) => {
    setSelectedUserForGhost(user);
    setIsGhostModalOpen(true);
  };

  const confirmGhostLogin = async () => {
    if (!selectedUserForGhost) return;
    
    try {
      setActionLoading(selectedUserForGhost._id);
      setIsGhostModalOpen(false);
      
      const data = await adminApi.impersonateUser(selectedUserForGhost._id);
      
      if (data.success) {
        toast.success(`Generating ${ghostDuration}m Ghost Session for ${selectedUserForGhost.displayName || selectedUserForGhost.email}...`);
        const encodedUser = encodeURIComponent(JSON.stringify(data.user));
        const impersonateUrl = `/auth/impersonate?token=${data.token}&user=${encodedUser}&duration=${ghostDuration}`;
        window.open(impersonateUrl, '_blank');
      } else {
        toast.error(data.message || 'Failed to generate impersonation token');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Ghost Login');
    } finally {
      setActionLoading(null);
      setSelectedUserForGhost(null);
    }
  };

  useEffect(() => {
    const newSocket = io(API_CONFIG.BASE_URL);
    setSocket(newSocket);

    newSocket.on('userStatusChanged', (data) => {
      console.log('User status changed:', data);
      setUsers(prev => prev.map(user => 
        user._id === data.userId 
          ? { ...user, role: data.isActive ? 'customer' : 'admin' }
          : user
      ));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    loadUsers();
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
        toast.success(data.message || 'User status updated');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
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

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <form onSubmit={(e) => { e.preventDefault(); loadUsers(); }} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl outline-none"
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter size={16} />
              Filter
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <UserCard 
              key={user._id} 
              user={user} 
              activeGhostUid={activeGhostUid}
              actionLoading={actionLoading}
              onToggleStatus={handleToggleUserStatus}
              onGhostLogin={handleGhostLogin}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto text-slate-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No users found</h3>
        </div>
      )}

      <PaginationControls 
        pagination={pagination} 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      
      <AnimatePresence>
        {isGhostModalOpen && (
          <GhostDurationModal 
            ghostDuration={ghostDuration}
            setGhostDuration={setGhostDuration}
            onClose={() => setIsGhostModalOpen(false)}
            onConfirm={confirmGhostLogin}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsersPage;