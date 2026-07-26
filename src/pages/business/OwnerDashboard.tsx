import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../config/api';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, MapPin, Star, Utensils, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

// Replace with env var in real usage
const API_URL = API_CONFIG.BASE_URL;

interface Restaurant {
    _id: string;
    name: string;
    address: string;
    cuisine: string[];
    rating: number;
    sentimentScore?: number;
    sentimentRating?: number;
    image: string;
}

const OwnerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const storedUser = sessionStorage.getItem('userData');
                if (!storedUser) {
                    navigate('/business/businessLogin');
                    return;
                }

                const user = JSON.parse(storedUser);
                setUserData(user);

                const response = await axios.get<{ success: boolean; data: Restaurant[] }>(`${API_URL}/api/v1/business/restaurants/${user.uid}`);
                if (response.data.success) {
                    setRestaurants(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching restaurants:', error);
                toast.error('Failed to load your restaurants');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRestaurants();
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="px-3 sm:px-4 md:px-0 max-w-7xl mx-auto py-4 sm:py-6 md:py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-xs sm:text-sm md:text-base text-slate-500">Welcome back, {userData?.displayName || 'Owner'}</p>
                </div>
                <Link
                    to="/business/onboarding"
                    className="w-full sm:w-auto bg-emerald-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                >
                    <Plus size={18} className="sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline">Add Restaurant</span><span className="xs:hidden">Add</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
                <div className="bg-slate-900 text-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-xl shadow-slate-200">
                    <div className="relative z-10">
                        <h3 className="text-slate-400 text-xs sm:text-sm font-medium mb-1 line-clamp-1">Total Revenue</h3>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-black">$12,450</p>
                        <span className="text-emerald-400 text-[10px] sm:text-xs font-bold flex items-center gap-1 mt-2 bg-emerald-400/10 px-2 py-1 rounded-lg w-fit">↑ 12% vs last month</span>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                        <DollarSign size={80} className="sm:w-[100px] sm:h-[100px]" />
                    </div>
                </div>
                <div className="bg-white border border-slate-100 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm">
                    <h3 className="text-slate-500 text-xs sm:text-sm font-medium mb-1 line-clamp-1">Active Reservations</h3>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">24</p>
                    <span className="text-slate-400 text-[10px] sm:text-xs mt-2 block font-medium">For today</span>
                </div>
                <div className="bg-white border border-slate-100 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm">
                    <h3 className="text-slate-500 text-xs sm:text-sm font-medium mb-1 line-clamp-1">Total Restaurants</h3>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">{restaurants.length}</p>
                    <span className="text-slate-400 text-[10px] sm:text-xs mt-2 block font-medium">Active locations</span>
                </div>
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Your Restaurants</h2>

            {restaurants.length === 0 ? (
                <div className="text-center py-12 sm:py-16 md:py-20 bg-white rounded-2xl sm:rounded-3xl border border-dashed border-slate-300">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Utensils size={24} className="sm:w-8 sm:h-8" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Restaurants Yet</h3>
                    <p className="text-sm sm:text-base text-slate-500 mb-4 sm:mb-6 max-w-md mx-auto px-4">
                        Get started by registering your first restaurant. It only takes a few minutes to set up.
                    </p>
                    <Link
                        to="/business/onboarding"
                        className="bg-emerald-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium hover:bg-emerald-700 transition-colors inline-block"
                    >
                        Register First Restaurant
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Add New Card (Mini) */}
                    <Link
                        to="/business/onboarding"
                        className="border-2 border-dashed border-slate-300 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center p-6 sm:p-8 hover:border-emerald-500 hover:bg-emerald-50 transition-all group min-h-[250px] sm:min-h-[300px]"
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-colors">
                            <Plus size={20} className="sm:w-6 sm:h-6" />
                        </div>
                        <span className="text-sm sm:text-base font-medium text-slate-500 group-hover:text-emerald-600 text-center">Add Another Location</span>
                    </Link>

                    {/* Restaurant Cards */}
                    {restaurants.map((restaurant) => (
                        <motion.div
                            key={restaurant._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 group relative"
                        >
                        <div className="h-36 sm:h-40 md:h-48 overflow-hidden relative">
                                <img
                                    src={API_CONFIG.getAssetUrl(restaurant.image) || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070"}
                                    alt={restaurant.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm border border-slate-100">
                                    <Star size={10} className="text-yellow-400 fill-current" />
                                    {restaurant.rating.toFixed(1)}
                                </div>
                            </div>
                            <div className="p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 line-clamp-1">{restaurant.name}</h3>
                                <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm mb-3 sm:mb-4">
                                    <MapPin size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span className="truncate">{restaurant.address}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                                    {restaurant.cuisine.slice(0, 3).map((c, i) => (
                                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] sm:text-xs rounded-md">{c}</span>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <Link to={`/business/manage/${restaurant._id}`} className="flex-1 bg-slate-900 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors text-center">
                                        <span className="hidden xs:inline">Manage Restaurant</span><span className="xs:hidden">Manage</span>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OwnerDashboard;
