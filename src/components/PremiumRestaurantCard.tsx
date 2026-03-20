import React from "react";
import { motion } from "framer-motion";
import { Star, Heart, MapPin, Users, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { normalizeImageUrl } from "../services/api";

interface Restaurant {
  id: string;
  name: string;
  location: {
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  rating: number;
  image: string;
  cuisine?: string[];
  priceLevel?: number;
  address?: string;
  photos?: string[];
  openNow?: boolean;
  averageRating?: number | string | null;
}

interface PremiumRestaurantCardProps {
  restaurant: Restaurant;
  isDarkMode: boolean;
  isFavorite: boolean;
  isOpen: boolean;
  onToggleFavorite: (restaurant: any) => void;
  index: number;
  showDinoPick?: boolean;
}

export const PremiumRestaurantCard: React.FC<PremiumRestaurantCardProps> = ({
  restaurant,
  isDarkMode,
  isFavorite,
  isOpen,
  onToggleFavorite,
  index,
  showDinoPick,
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{
        y: -12,
        perspective: 1000,
        rotateX: 2,
        transition: { duration: 0.4, ease: "easeOut" },
      }}
      className={`group relative ${isDarkMode ? "bg-zinc-900/60" : "bg-white"} rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 cursor-pointer border-2 ${
        isDarkMode
          ? "border-zinc-800 hover:border-emerald-500/50"
          : "border-gray-50 hover:border-emerald-200"
      }`}
      onClick={() => navigate(`/restaurant/${restaurant.id}`)}
    >
      {/* Card Reflection Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000" />

      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 transition-opacity group-hover:opacity-60" />
        <img
          src={normalizeImageUrl(restaurant.image)}
          alt={restaurant.name}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />

        {/* Top Badges Layer */}
        <div className="absolute top-5 inset-x-5 z-20 flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="bg-black/40 backdrop-blur-xl border border-white/20 text-white px-3 py-1.5 rounded-2xl flex items-center shadow-2xl">
              <span className="text-yellow-400 mr-2 text-sm drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
                ★
              </span>
              <span className="font-black text-sm tracking-tight">
                {restaurant.averageRating ?? restaurant.rating}
              </span>
            </div>

            {showDinoPick && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl border border-white/20"
              >
                <Sparkles size={12} className="text-yellow-300" />
                Dino's Pick
              </motion.div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
            className={`p-3 rounded-2xl backdrop-blur-xl border transition-all shadow-2xl ${
              isFavorite
                ? "bg-emerald-500 border-emerald-400 text-white"
                : "bg-black/40 border-white/20 text-white hover:bg-emerald-500/20"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(restaurant);
            }}
          >
            <Heart
              size={20}
              className={isFavorite ? "fill-white" : ""}
            />
          </motion.button>
        </div>
      </div>

      <div className="p-8 relative">
        {/* Decorative background number/letter */}
        <span className="absolute -bottom-4 -right-2 text-9xl font-black text-emerald-500/[0.03] select-none pointer-events-none italic">
          {index + 1}
        </span>

        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  isDarkMode ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                {restaurant.cuisine?.[0] || "Culinary site"}
              </span>
            </div>
            <h3
              className={`text-3xl font-black leading-none tracking-tighter ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {restaurant.name}
            </h3>
          </div>
          <div
            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
              isOpen
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : "bg-rose-500/10 border-rose-500/20 text-rose-500"
            }`}
          >
            {isOpen ? "Active" : "Dormant"}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <MapPin size={16} />
            </div>
            <span className="line-clamp-1">
              {restaurant.location.city}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Users size={16} />
            </div>
            <span>
              {restaurant.priceLevel
                ? "$".repeat(restaurant.priceLevel)
                : "Medium"}{" "}
              Pack
            </span>
          </div>
        </div>

        <div className="pt-6 border-t border-dashed border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <span
            className={`text-sm font-bold ${
              isDarkMode ? "text-emerald-400" : "text-emerald-600"
            }`}
          >
            View Details
          </span>
          <div
            className={`w-10 h-10 rounded-full border-2 transform group-hover:translate-x-1 group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center justify-center ${
              isDarkMode ? "border-zinc-700 text-gray-500" : "border-gray-100 text-gray-400"
            }`}
          >
            <ArrowRight size={18} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
