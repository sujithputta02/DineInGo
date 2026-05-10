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
import EventSeatingViewer from '../../components/EventSeatingViewer';
import IndividualSeatingChart from '../../components/IndividualSeatingChart';

const EventLayoutViewerWrapper: React.FC<{ businessId: string }> = ({ businessId }) => {
    const [bizData, setBizData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBiz = async () => {
            try {
                setLoading(true);
                const res = await businessApi.getById(businessId);
                setBizData(res.data || res);
            } catch (err) {
                console.error("Failed to load business details for floor plan", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBiz();
    }, [businessId]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading layout...</div>;
    }

    if (!bizData) {
        return <div className="p-8 text-center text-red-500">Failed to load business data.</div>;
    }

    const isEvent = bizData.type === 'event' || bizData.type === 'both';

    if (isEvent && bizData.seatingLayout) {
        // Normalize seating layout in case it's nested
        const layout = bizData.seatingLayout.eventConfig?.seatingLayout || bizData.seatingLayout;
        const areas = bizData.seatingLayout.eventConfig?.concertAreas || bizData.seatingLayout.areas || [];
        const individualSeats = bizData.seatingLayout.eventConfig?.individualSeats || layout.seats || [];

        if (areas.length > 0) {
            return (
                <div className="p-8 bg-slate-50 overflow-auto h-full w-full">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Area Layout Preview</h3>
                    <EventSeatingViewer seatingLayout={{ areas, seats: individualSeats, rows: layout.rows, columns: layout.columns }} />
                </div>
            );
        } else if (individualSeats.length > 0) {
            return (
                <div className="p-8 bg-slate-50 overflow-auto h-full w-full">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Seating Chart Preview</h3>
                    {layout.seats && layout.seats[0] && 'x' in layout.seats[0] && 'y' in layout.seats[0] ? (
                        <IndividualSeatingChart seats={individualSeats} selectedSeatIds={[]} onSeatClick={() => { }} />
                    ) : (
                        <div className="bg-gray-950 rounded-lg p-4">
                            <div className="text-center text-white mb-6 font-bold tracking-[0.5em] border-b border-gray-800 pb-2">STAGE</div>
                            <div className="flex flex-col gap-2 relative">
                                <div className="absolute inset-0 grid" style={{ gridTemplateRows: `repeat(${layout.rows || 10}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${layout.columns || 10}, minmax(0, 1fr))` }}>
                                    {/* Placeholder grid to align seats */}
                                </div>
                                <div className="relative">
                                    {individualSeats.map((seat: any) => (
                                        <div key={seat.id} className="absolute w-8 h-8 flex items-center justify-center text-xs font-bold rounded cursor-default border-2 border-slate-500 bg-slate-600/30 text-white" style={{ left: `${seat.x}%`, top: `${seat.y}%`, transform: 'translate(-50%, -50%)' }}>
                                            {seat.rowLabel}{seat.number}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
    }

    // Default to restaurant FloorPlanner
    return <FloorPlanDesigner businessId={businessId} readOnly={true} />;
};

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
            <div className="h-full flex flex-col space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <button
                        onClick={() => setSelectedBusinessId(null)}
                        className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors font-semibold text-sm sm:text-base"
                    >
                        <ArrowLeft size={18} />
                        Back to Gallery
                    </button>
                    <div className="text-left sm:text-right">
                        <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                            {businesses.find(b => (b.id || b._id) === selectedBusinessId)?.name}
                        </h2>
                        <p className="text-[10px] sm:text-sm font-black text-emerald-600 uppercase tracking-widest">
                            {businesses.find(b => (b.id || b._id) === selectedBusinessId)?.type} Floor Plan
                        </p>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden min-h-[500px] sm:min-h-[600px] flex flex-col">
                    <EventLayoutViewerWrapper businessId={selectedBusinessId} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Floor Plans</h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium">View and manage layouts for your businesses</p>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search businesses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full lg:w-64 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm font-medium"
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
