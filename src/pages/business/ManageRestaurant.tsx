import React, { useState, useEffect, useRef } from 'react';
import { API_CONFIG } from '../../config/api';
import { useParams, useNavigate } from 'react-router-dom';
import { createSession } from '../../utils/sessionGuard';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ArrowLeft, Menu as MenuIcon, Map, Settings, Info } from 'lucide-react';
import BusinessMenu from './BusinessMenu';
import BusinessFloorPlan from './BusinessFloorPlan';

const API_URL = API_CONFIG.BASE_URL;

const ManageRestaurant: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'floorplan'>('overview');

    const fetchRestaurant = async () => {
        try {
            const storedUser = sessionStorage.getItem('userData');
            if (!storedUser) return;
            const user = JSON.parse(storedUser);

            // Fetch from the owner's list of restaurants
            const response = await axios.get<{ success: boolean; data: any[] }>(`${API_URL}/api/v1/business/restaurants/${user.uid}`);
            if (response.data.success) {
                // Find the specific restaurant by _id or restaurantId
                const found = response.data.data.find((r: any) => r._id === id || r.restaurantId === id);
                setRestaurant(found);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch restaurant details");
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!restaurant) return;
        try {
            await axios.put(`${API_URL}/api/v1/business/restaurant/${restaurant._id}`, {
                ownerId: restaurant.ownerId,
                isPublished: true
            });
            toast.success("Restaurant Published Successfully!");
            // Update local state to reflect change
            setRestaurant({ ...restaurant, isPublished: true });
        } catch (error: any) {
            console.error("Publish error:", error);
            toast.error(error.response?.data?.message || "Failed to publish restaurant");
        }
    };

    useEffect(() => {
        fetchRestaurant();
    }, [id]);

    if (loading) return <div className="p-4 sm:p-6 md:p-8 flex justify-center"><div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-2 sm:border-4 border-emerald-500 rounded-full border-t-transparent"></div></div>;
    if (!restaurant) return <div className="p-4 sm:p-6 md:p-8 text-center text-slate-500 text-sm sm:text-base">Restaurant not found or you do not have permission to view it.</div>;

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
            <button
                onClick={() => {
                    const u = JSON.parse(sessionStorage.getItem('userData') || '{}');
                    const token = createSession(u.uid || 'temp');
                    navigate(`/business/app/dashboard/${token}`);
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 sm:mb-6 font-medium transition-colors text-sm sm:text-base"
            >
                <ArrowLeft size={18} className="sm:w-5 sm:h-5" /> <span className="hidden xs:inline">Back to Dashboard</span><span className="xs:hidden">Back</span>
            </button>

            {!restaurant.isPublished && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                        <Info className="text-amber-600 shrink-0 mt-1 sm:w-5 sm:h-5" size={18} />
                        <div>
                            <h3 className="font-bold text-amber-900 text-sm sm:text-base">Restaurant is Unpublished</h3>
                            <p className="text-amber-700 text-xs sm:text-sm">Customers cannot see this restaurant yet. Complete your setup and publish when ready.</p>
                        </div>
                    </div>
                    <button
                        onClick={handlePublish}
                        className="bg-amber-600 text-white px-4 sm:px-6 py-2 rounded-lg sm:rounded-xl font-bold hover:bg-amber-700 transition shadow-sm shrink-0 whitespace-nowrap w-full sm:w-auto text-sm sm:text-base"
                    >
                        Publish Now
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start mb-6 sm:mb-8">
                <img
                    src={restaurant.image || "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070"}
                    alt={restaurant.name}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl object-cover shadow-sm bg-slate-100"
                />
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">{restaurant.name}</h1>
                    <p className="text-slate-500 flex items-center gap-2 text-xs sm:text-sm md:text-base"><Map size={14} className="sm:w-4 sm:h-4 flex-shrink-0" /> <span className="line-clamp-1">{restaurant.address}</span></p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                        <span className="bg-emerald-100 text-emerald-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold">Open</span>
                        <span className="bg-slate-100 text-slate-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm">Rating: {restaurant.rating}</span>
                        {restaurant.isPublished && (
                            <span className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold">Published</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 sm:mb-8 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 font-medium flex items-center gap-1.5 sm:gap-2 transition-all border-b-2 whitespace-nowrap text-xs sm:text-sm md:text-base ${activeTab === 'overview' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Info size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden xs:inline">Overview</span><span className="xs:hidden">Info</span>
                </button>
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 font-medium flex items-center gap-1.5 sm:gap-2 transition-all border-b-2 whitespace-nowrap text-xs sm:text-sm md:text-base ${activeTab === 'menu' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <MenuIcon size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden xs:inline">Menu Management</span><span className="xs:hidden">Menu</span>
                </button>
                <button
                    onClick={() => setActiveTab('floorplan')}
                    className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 font-medium flex items-center gap-1.5 sm:gap-2 transition-all border-b-2 whitespace-nowrap text-xs sm:text-sm md:text-base ${activeTab === 'floorplan' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Map size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Floor Plan</span><span className="sm:hidden">Floor</span>
                </button>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mb-1 sm:mb-2">Total Bookings</h3>
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">0</p> {/* Placeholder for now */}
                        </div>
                        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mb-1 sm:mb-2">Today's Revenue</h3>
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600">$0</p> {/* Placeholder for now */}
                        </div>
                        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm sm:col-span-2 md:col-span-1">
                            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mb-1 sm:mb-2">Views (30d)</h3>
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">0</p> {/* Placeholder for now */}
                        </div>
                    </div>
                )}

                {activeTab === 'menu' && (
                    <BusinessMenu
                        restaurantId={restaurant._id}
                        currentMenu={restaurant.menu || []}
                        onUpdate={fetchRestaurant}
                    />
                )}

                {activeTab === 'floorplan' && (
                    <BusinessFloorPlan
                        restaurantId={restaurant._id}
                        onUpdate={fetchRestaurant}
                    />
                )}
            </div>
        </div>
    );
};

export default ManageRestaurant;
