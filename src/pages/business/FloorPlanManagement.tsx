import React, { useState, useEffect } from 'react';
import {
    Map as MapIcon,
    ArrowLeft,
    Eye,
    Building2,
    ChevronRight,
    Search,
    Filter,
    Music,
    Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { businessApi } from '../../services/api';
import FloorPlanDesigner from '../../components/FloorPlanDesigner';

interface Business {
    id: string;
    _id?: string;
    name: string;
    type: 'restaurant' | 'event' | 'both';
    location: any;
    thumbnail?: string;
}

const FloorPlanManagement: React.FC = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                setLoading(true);
                const response = await businessApi.getOwnerBusinesses();
                const businessData = Array.isArray(response) ? response : (response.businesses || response.data || []);
                setBusinesses(businessData);
            } catch (error) {
                console.error('Error fetching businesses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBusinesses();
    }, []);

    const getLocationString = (location: any) => {
        if (typeof location === 'string') return location;
        if (location && typeof location === 'object') {
            const parts = [
                location.address,
                location.area,
                location.city,
                location.state
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : 'Location not set';
        }
        return 'Location not set';
    };

    const filteredBusinesses = businesses.filter(biz =>
        biz.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getLocationString(biz.location).toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedBusinessId) {
        return (
            <div className="h-full flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSelectedBusinessId(null)}
                        className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors font-medium"
                    >
                        <ArrowLeft size={20} />
                        Back to Gallery
                    </button>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-slate-800">
                            {businesses.find(b => (b.id || b._id) === selectedBusinessId)?.name}
                        </h2>
                        <p className="text-sm text-slate-500 capitalize">
                            {businesses.find(b => (b.id || b._id) === selectedBusinessId)?.type} Floor Plan
                        </p>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <FloorPlanDesigner
                        businessId={selectedBusinessId}
                        readOnly={true}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Floor Plans</h1>
                    <p className="text-slate-500 mt-1">View and manage layouts for your businesses</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search businesses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none w-64 shadow-sm"
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : filteredBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredBusinesses.map((biz) => {
                            const id = biz.id || biz._id;
                            return (
                                <motion.div
                                    key={id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full"
                                >
                                    {/* Decoration */}
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        {biz.type === 'restaurant' ? (
                                            <Utensils size={120} />
                                        ) : (
                                            <Music size={120} />
                                        )}
                                    </div>

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                                <Building2 size={24} />
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${biz.type === 'restaurant'
                                                ? 'bg-orange-50 text-orange-600'
                                                : 'bg-indigo-50 text-indigo-600'
                                                }`}>
                                                {biz.type}
                                            </span>
                                        </div>

                                        <div className="mb-6 flex-1">
                                            <h3 className="text-xl font-bold text-slate-800 mb-2 truncate">{biz.name}</h3>
                                            <p className="text-slate-500 text-sm line-clamp-2">{getLocationString(biz.location)}</p>
                                        </div>

                                        <button
                                            onClick={() => id && setSelectedBusinessId(id)}
                                            className="w-full mt-auto flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:bg-emerald-600 transition-all group/btn"
                                        >
                                            <Eye size={18} />
                                            View Floor Plan
                                            <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="p-4 bg-slate-50 text-slate-300 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <MapIcon size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">No businesses found</h2>
                    <p className="text-slate-500 mt-2">Try adjusting your search filters</p>
                </div>
            )}
        </div>
    );
};

export default FloorPlanManagement;
