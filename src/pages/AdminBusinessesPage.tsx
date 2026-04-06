import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { motion } from 'framer-motion';
import {
  Building2,
  Search,
  Filter,
  MapPin,
  Calendar,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Shield
} from 'lucide-react';
import io from 'socket.io-client';
import { adminApi } from '../utils/adminApi';

interface Business {
  _id: string;
  name: string;
  ownerId: string;
  locationData?: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  status: 'active' | 'paused' | 'draft';
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalBusinesses: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Module-level component — must NOT be inside AdminBusinessesPage to avoid Vite TDZ error
function BusinessCard({ business, actionLoading, onToggleStatus }: { 
  business: Business; 
  actionLoading: string | null;
  onToggleStatus: (id: string) => void;
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (business: Business) => {
    if (business.status === 'draft') {
      return (<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full"><Clock size={12} />Pending</span>);
    } else if (business.status === 'active') {
      return (<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"><CheckCircle size={12} />Active</span>);
    } else {
      return (<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"><AlertTriangle size={12} />Paused</span>);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {business.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{business.name}</h3>
            <p className="text-sm text-slate-600">Owner ID: {business.ownerId}</p>
          </div>
        </div>
        {getStatusBadge(business)}
      </div>

      <div className="space-y-2 mb-4">
        {business.locationData?.address && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={14} />
            <span>{[business.locationData.city, business.locationData.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={14} />
          <span>Registered {formatDate(business.createdAt)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onToggleStatus(business._id)}
          disabled={actionLoading === business._id}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            business.status === 'active'
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          } disabled:opacity-50`}
        >
          {actionLoading === business._id ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : business.status === 'active' ? (
            <Shield size={14} />
          ) : (
            <CheckCircle size={14} />
          )}
          {business.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
        <button className="px-3 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
          <Eye size={14} />
        </button>
      </div>
    </motion.div>
  );
}

const AdminBusinessesPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(API_CONFIG.BASE_URL);

    // Load initial data
    loadBusinesses();

    // Set up real-time listeners
    newSocket.on('businessStatusChanged', (data) => {
      console.log('Business status changed:', data);
      // Update the business in the list
      setBusinesses(prev => prev.map(business => 
        business._id === data.businessId 
          ? { ...business, status: data.status }
          : business
      ));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentPage, searchTerm, statusFilter]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getBusinesses({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        status: statusFilter
      });

      if (data.success) {
        setBusinesses(data.businesses);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBusinessStatus = async (businessId: string) => {
    try {
      setActionLoading(businessId);
      const data = await adminApi.toggleBusinessStatus(businessId);
      
      if (data.success) {
        // Update will be handled by socket event
        console.log('Business status updated:', data.message);
      } else {
        alert(data.message || 'Failed to update business status');
      }
    } catch (error: any) {
      console.error('Error toggling business status:', error);
      alert(error.message || 'Failed to update business status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadBusinesses();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Building2 className="text-purple-600" size={32} />
            Business Management
          </h1>
          <p className="text-slate-600 mt-1">
            Manage registered businesses and their status
            {pagination && (
              <span className="ml-2">• {pagination.totalBusinesses} total businesses</span>
            )}
          </p>
        </div>
        <button 
          onClick={loadBusinesses}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
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
                placeholder="Search businesses by name, email, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Businesses</option>
              <option value="pending">Pending Approval</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Filter size={16} />
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Businesses Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading businesses...</p>
          </div>
        </div>
      ) : businesses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <BusinessCard key={business._id} business={business} actionLoading={actionLoading} onToggleStatus={handleToggleBusinessStatus} />
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Building2 className="mx-auto text-slate-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No businesses found</h3>
          <p className="text-slate-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No businesses have registered yet'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminBusinessesPage;