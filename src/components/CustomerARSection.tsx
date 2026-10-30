import React, { useState, useMemo } from 'react';
import {
  UtensilsCrossed,
  Scan,
  Sparkles,
  Share2,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Flame,
  Building2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ARViewer } from './ARViewer';
import { QRCodeModal } from './QRCodeModal';
import ARMenuSection from './ARMenuSection';
import {
  DEMO_MENU_ITEMS,
  resolveDishModel,
  type ResolvableDish
} from '../services/arModelService';
import { useNavigate } from 'react-router-dom';

export interface CustomerARSectionProps {
  isDarkMode: boolean;
  language: string;
  translations: any;
  menuItems?: any[];
  isLoading?: boolean;
  restaurantName?: string;
  tableNumber?: string | number;
  userPreferences?: any;
}

export const CustomerARSection: React.FC<CustomerARSectionProps> = ({
  isDarkMode,
  language,
  translations,
  menuItems = [],
  isLoading = false,
  restaurantName = "L'Étoile Brasserie",
  tableNumber,
  userPreferences = null
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'3d-menu' | 'vision-scanner'>('3d-menu');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Use provided dishes or fall back to curated verified demo dishes with real 3D models
  const effectiveDishes: ResolvableDish[] = useMemo(() => {
    if (menuItems && menuItems.length > 0) {
      return menuItems;
    }
    return DEMO_MENU_ITEMS;
  }, [menuItems]);

  // Selected dish ID state
  const [selectedDishId, setSelectedDishId] = useState<string>(() => {
    return effectiveDishes[0]?._id || effectiveDishes[0]?.id || 'demo-dish-soup';
  });

  // Active dish
  const activeDish: ResolvableDish = useMemo(() => {
    return (
      effectiveDishes.find((d) => (d._id || d.id) === selectedDishId) ||
      effectiveDishes[0] ||
      DEMO_MENU_ITEMS[0]
    );
  }, [effectiveDishes, selectedDishId]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    effectiveDishes.forEach((d) => {
      const cat = d.categoryName || d.category;
      if (cat && typeof cat === 'string') set.add(cat);
    });
    return ['all', ...Array.from(set)];
  }, [effectiveDishes]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    if (selectedCategory === 'all') return effectiveDishes;
    return effectiveDishes.filter(
      (d) => (d.categoryName || d.category) === selectedCategory
    );
  }, [effectiveDishes, selectedCategory]);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/ar-demo${selectedDishId ? `?dish=${selectedDishId}` : ''}`
    : 'https://dineingo.com/ar-demo';

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-white' : 'text-gray-900'} font-['Outfit',sans-serif]`}>
      
      {/* Top Banner / Mode Switcher Header */}
      <div className={`p-6 rounded-[2.5rem] border backdrop-blur-2xl transition-all ${
        isDarkMode
          ? 'bg-zinc-900/60 border-white/10 shadow-2xl shadow-purple-950/20'
          : 'bg-white/80 border-gray-200/80 shadow-xl'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Header Title & Status */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <Sparkles size={11} className="text-purple-400" />
                WebAR & AI Vision Intelligence
              </span>
              {tableNumber && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  Table {tableNumber}
                </span>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>{restaurantName}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-zinc-800 text-gray-300 border border-white/10">
                Interactive AR Menu
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>Explore realistic 3D dish twins, calibrate tabletop AR, and analyze nutritional composition.</span>
            </p>
          </div>

          {/* Action Controls & Tab Switcher */}
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            
            {/* Tab Switcher Pills */}
            <div className={`p-1.5 rounded-2xl flex items-center gap-1 border ${
              isDarkMode ? 'bg-zinc-950/70 border-white/10' : 'bg-gray-100 border-gray-200'
            }`}>
              <button
                onClick={() => setActiveTab('3d-menu')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                  activeTab === '3d-menu'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                    : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                }`}
              >
                <UtensilsCrossed size={14} />
                <span>3D / AR Menu</span>
              </button>

              <button
                onClick={() => setActiveTab('vision-scanner')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                  activeTab === 'vision-scanner'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                    : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                }`}
              >
                <Scan size={14} />
                <span>Vision Scanner</span>
              </button>
            </div>

            {/* Share Modal Trigger */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-all flex items-center justify-center hover:scale-105"
              title="Share Table AR Experience"
              aria-label="Share Table AR Experience"
            >
              <Share2 size={16} />
            </button>

            {/* Public Demo Link */}
            <button
              onClick={() => navigate('/ar-demo')}
              className="hidden sm:flex p-3 rounded-2xl bg-zinc-800/60 hover:bg-zinc-700 text-gray-300 hover:text-white border border-white/10 transition-all items-center gap-1.5 text-xs font-bold"
              title="Open Fullscreen AR Showcase"
            >
              <ExternalLink size={14} />
              <span>Showcase</span>
            </button>

          </div>
        </div>
      </div>

      {/* TAB 1: 3D / AR Menu Interactive Catalog */}
      {activeTab === '3d-menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive 3D Model Viewer */}
          <div className="lg:col-span-7 flex flex-col gap-4 sticky top-6">
            <div className="h-[460px] sm:h-[540px] w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black">
              <ARViewer
                dish={activeDish}
                showDetailsOverlay={true}
                autoRotateDefault={true}
                userPreferences={userPreferences}
              />
            </div>
            
            <div className="flex items-center justify-between px-2 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Smartphone size={13} className="text-purple-400" />
                <span>On Android (Chrome) or iOS (Safari), tap <strong>View in Your Space</strong> for tabletop AR.</span>
              </span>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="text-purple-400 hover:text-purple-300 font-bold underline flex items-center gap-1"
              >
                <Share2 size={12} /> Mobile QR
              </button>
            </div>
          </div>

          {/* Right Column: Menu Dishes Catalog & Category Filter */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Category Selector Pills */}
            {categories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                        : isDarkMode
                          ? 'bg-zinc-900/80 text-gray-400 hover:text-white border border-white/5'
                          : 'bg-white text-gray-600 hover:text-black border border-gray-200'
                    }`}
                  >
                    {cat === 'all' ? 'All Dishes' : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Dishes List */}
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredDishes.map((dish) => {
                const dishId = dish._id || dish.id;
                const isSelected = (activeDish._id || activeDish.id) === dishId;
                const resolution = resolveDishModel(dish);

                return (
                  <div
                    key={dishId}
                    onClick={() => setSelectedDishId(dishId)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-purple-950/30 border-purple-500/50 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30'
                          : 'bg-purple-50/70 border-purple-400 shadow-md ring-1 ring-purple-400'
                        : isDarkMode
                          ? 'bg-zinc-900/60 border-white/5 hover:bg-zinc-800/60 hover:border-white/10'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/* Dish Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-950 border border-white/10 shrink-0 relative">
                      <img
                        src={dish.image || '/images/default-dish.jpg'}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/default-dish.jpg';
                        }}
                      />
                      {resolution.hasModel && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black animate-pulse" />
                      )}
                    </div>

                    {/* Dish Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-purple-400' : isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {dish.name}
                        </h4>
                        <span className="text-sm font-black text-emerald-400 shrink-0">
                          ${typeof dish.price === 'number' ? dish.price.toFixed(2) : dish.price}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        {dish.description}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1.5">
                        <span className="font-medium">{dish.categoryName || dish.category || 'General'}</span>
                        {dish.calories && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-gray-400">
                              <Flame size={10} className="text-amber-400" />
                              {dish.calories} cal
                            </span>
                          </>
                        )}
                        {resolution.hasModel && (
                          <>
                            <span>•</span>
                            <span className="text-purple-400 font-bold flex items-center gap-0.5">
                              <Sparkles size={10} />
                              3D AR Ready
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chevron Indicator */}
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isSelected ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'
                    }`}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: Vision Scanner (Local ML & Hybrid Cloud Intelligence) */}
      {activeTab === 'vision-scanner' && (
        <ARMenuSection
          isDarkMode={isDarkMode}
          language={language}
          translations={translations}
          menuItems={effectiveDishes}
          isLoading={isLoading}
        />
      )}

      {/* Share Table Experience QR Modal */}
      <QRCodeModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={shareUrl}
        title="Share 3D Menu with Table Guests"
        subtitle={`Let friends at your table explore ${restaurantName}'s menu in 3D and place dishes in real AR.`}
      />

    </div>
  );
};

export default CustomerARSection;

