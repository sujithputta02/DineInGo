import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Trash2 } from 'lucide-react';
import { Restaurant } from '../types';

interface FavoriteRestaurantCardProps {
    restaurant: Restaurant;
    onRemove: (id: string) => void;
}

const FavoriteRestaurantCard: React.FC<FavoriteRestaurantCardProps> = ({ restaurant, onRemove }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group relative">
            <div
                onClick={() => navigate(`/restaurant/${restaurant.id || restaurant._id}`)}
                className="cursor-pointer"
            >
                <div className="h-48 relative">
                    <img
                        src={restaurant.image || '/images/placeholder-restaurant.jpg'}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-gray-800">{restaurant.rating}</span>
                    </div>
                </div>

                <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1">{restaurant.name}</h3>

                    <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                        <MapPin size={14} />
                        <span className="truncate">{restaurant.location.city}, {restaurant.location.state}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                        {restaurant.cuisine?.slice(0, 3).map((c, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-4 pb-4 flex justify-between items-center">
                <button
                    onClick={() => navigate(`/restaurant/${restaurant.id || restaurant._id}`)}
                    className="text-emerald-600 font-medium text-sm hover:underline"
                >
                    View Details
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(restaurant.id || restaurant._id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove from favorites"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

export default FavoriteRestaurantCard;
