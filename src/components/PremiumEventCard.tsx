import React from "react";
import { motion } from "framer-motion";
import { Calendar, Heart, MapPin, Clock, Users, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Event as AppEvent } from "../types";
import { normalizeImageUrl } from "../services/api";

interface PremiumEventCardProps {
  event: AppEvent;
  isDarkMode: boolean;
  isFavorite: boolean;
  onToggleFavorite: (event: any) => void;
  index: number;
}

export const PremiumEventCard: React.FC<PremiumEventCardProps> = ({
  event,
  isDarkMode,
  isFavorite,
  onToggleFavorite,
  index,
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{
        y: -12,
        perspective: 1000,
        rotateX: -2,
        transition: { duration: 0.4, ease: "easeOut" },
      }}
      className={`group relative ${isDarkMode ? "bg-zinc-900/60" : "bg-white"} rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 cursor-pointer border-2 ${
        isDarkMode
          ? "border-zinc-800 hover:border-purple-500/50"
          : "border-gray-50 hover:border-purple-200"
      }`}
      onClick={() => navigate(`/event/${event._id || event.id}/register`)}
    >
      {/* Card Reflection Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000" />

      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 transition-opacity group-hover:opacity-60" />
        <img
          src={normalizeImageUrl(event.imageUrl)}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />

        {/* Price Badge */}
        <div className="absolute top-5 left-5 z-20">
          <div className="bg-purple-600/90 backdrop-blur-xl border border-white/20 text-white font-black text-xs px-4 py-2 rounded-2xl shadow-2xl tracking-wider">
            ₹{event.price}
          </div>
        </div>

        {/* Date Ribbon */}
        <div className="absolute bottom-5 left-5 z-20">
          <div className="bg-white/15 backdrop-blur-xl border border-white/20 text-white px-4 py-2 rounded-2xl flex items-center shadow-2xl">
            <Calendar
              size={14}
              className="mr-2 text-purple-300"
            />
            <span className="text-xs font-black uppercase tracking-tighter">
              {event.date}
            </span>
          </div>
        </div>

        {/* Favorite Button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: -10 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-5 right-5 z-20 p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 hover:bg-rose-500/20 transition-all shadow-2xl group/btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(event);
          }}
        >
          <Heart
            size={20}
            className={`transition-all ${
              isFavorite
                ? "fill-rose-500 text-rose-500 scale-110 shadow-glow"
                : "text-white"
            }`}
          />
        </motion.button>
      </div>

      <div className="p-8 relative">
        {/* Decorative Glyph */}
        <div className="absolute -bottom-2 right-4 text-8xl font-black text-purple-500/[0.04] select-none pointer-events-none italic transform rotate-6">
          EV
        </div>

        <div className="flex justify-between items-start mb-6">
          <h3
            className={`text-3xl font-black leading-[1.1] tracking-tighter line-clamp-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            } group-hover:text-purple-500 transition-colors`}
          >
            {event.title}
          </h3>
        </div>

        <div className="space-y-4 mb-8">
          <div
            className={`flex items-center gap-3 text-sm font-bold ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <MapPin size={16} />
            </div>
            <span className="line-clamp-1">
              {typeof event.location === "string"
                ? event.location
                : `${(event.location as any).city}, ${(event.location as any).state}`}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div
              className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              <Clock size={14} className="text-purple-500" />
              {event.time}
            </div>
            <div
              className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              <Users size={14} className="text-purple-500" />
              {event.category || "Gathering"}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-dashed border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-black uppercase tracking-widest ${
                isDarkMode ? "text-purple-400" : "text-purple-600"
              }`}
            >
              Claim Spot
            </span>
            <Sparkles
              size={14}
              className="text-yellow-400 animate-pulse"
            />
          </div>
          <div
            className={`w-12 h-12 rounded-2xl bg-purple-600 text-white shadow-xl flex items-center justify-center transform group-hover:translate-x-1 group-hover:scale-110 transition-all duration-300`}
          >
            <ArrowRight size={20} strokeWidth={3} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
