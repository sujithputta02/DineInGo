import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ARMenuSection from '../components/ARMenuSection';
import { menuApi, bookingsApi } from '../services/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

const ARMenuPage: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [restaurantName, setRestaurantName] = useState('');
    const [isDarkMode] = useState(() => localStorage.getItem('dineInGoDarkMode') === 'true');

    useEffect(() => {
        const loadMenuData = async () => {
            try {
                setIsLoading(true);

                // If we have a bookingId, get the restaurant/businessId from it
                if (bookingId) {
                    const booking = await bookingsApi.getById(bookingId);
                    const businessId = booking.businessId?._id || booking.businessId || booking.restaurantId?._id || booking.restaurantId;
                    setRestaurantName(booking.restaurantName || booking.businessName || 'the restaurant');

                    if (businessId) {
                        const fullMenu = await menuApi.getFullMenu(businessId);
                        // Flatten categories into a single list of items for the AR scanner
                        const allItems = fullMenu.categories.flatMap((cat: any) =>
                            cat.items.map((item: any) => ({
                                ...item,
                                categoryName: cat.name
                            }))
                        );
                        setMenuItems(allItems);
                    }
                } else {
                    toast.error('Session not found. Please check in again.');
                    navigate('/dashboard');
                }
            } catch (error) {
                console.error('Error loading AR menu:', error);
                toast.error('Failed to load menu data. Showing demo mode.');
            } finally {
                setIsLoading(false);
            }
        };

        loadMenuData();
    }, [bookingId, navigate]);

    // Simple translations object for ARMenuSection
    const translations = {
        arMenu: 'AR Interactive Menu',
        arExperience: `Exploring ${restaurantName}`,
        nutritionInfo: 'Nutrition',
        ingredients: 'Ingredients',
        scanMenu: 'Scan Your Dish',
        cookingMethod: 'Cooking Method'
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white font-['Outfit']">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                <p className="text-xl font-medium">Synchronizing AR Experience...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Top Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="px-4 py-2 bg-purple-600/20 backdrop-blur-md rounded-full border border-purple-500/30">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">AR SECURE SESSION</span>
                </div>
                <div className="w-12 h-12" /> {/* Spacer */}
            </div>

            <ARMenuSection
                isDarkMode={true}
                language="english"
                translations={translations}
                // @ts-ignore - we'll update the component to accept items
                menuItems={menuItems}
            />
        </div>
    );
};

export default ARMenuPage;
