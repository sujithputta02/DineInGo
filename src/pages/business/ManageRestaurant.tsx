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

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div></div>;
    if (!restaurant) return <div className="p-8 text-center text-slate-500">Restaurant not found or you do not have permission to view it.</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <button
                onClick={() => {
                    const u = JSON.parse(sessionStorage.getItem('userData') || '{}');
                    const token = createSession(u.uid || 'temp');
                    navigate(`/business/app/dashboard/${token}`);
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium transition-colors"
            >
                <ArrowLeft size={20} /> Back to Dashboard
            </button>

            {!restaurant.isPublished && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Info className="text-amber-600 shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-amber-900">Restaurant is Unpublished</h3>
                            <p className="text-amber-700 text-sm">Customers cannot see this restaurant yet. Complete your setup and publish when ready.</p>
                        </div>
                    </div>
                    <button
                        onClick={handlePublish}
                        className="bg-amber-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-amber-700 transition shadow-sm shrink-0 whitespace-nowrap"
                    >
                        Publish Now
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
                <img
                    src={restaurant.image || "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070"}
                    alt={restaurant.name}
                    className="w-32 h-32 rounded-2xl object-cover shadow-sm bg-slate-100"
                />
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">{restaurant.name}</h1>
                    <p className="text-slate-500 flex items-center gap-2"><Map size={16} /> {restaurant.address}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">Open</span>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">Rating: {restaurant.rating}</span>
                        {restaurant.isPublished && (
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">Published</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-8 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-4 font-medium flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Info size={18} /> Overview
                </button>
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`px-6 py-4 font-medium flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'menu' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <MenuIcon size={18} /> Menu Management
                </button>
                <button
                    onClick={() => setActiveTab('floorplan')}
                    className={`px-6 py-4 font-medium flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'floorplan' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Map size={18} /> Floor Plan
                </button>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-slate-500 text-sm font-bold uppercase mb-2">Total Bookings</h3>
                            <p className="text-4xl font-bold text-slate-900">0</p> {/* Placeholder for now */}
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-slate-500 text-sm font-bold uppercase mb-2">Today's Revenue</h3>
                            <p className="text-4xl font-bold text-emerald-600">$0</p> {/* Placeholder for now */}
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-slate-500 text-sm font-bold uppercase mb-2">Views (30d)</h3>
                            <p className="text-4xl font-bold text-blue-600">0</p> {/* Placeholder for now */}
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
