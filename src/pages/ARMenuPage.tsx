import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  UtensilsCrossed,
  Scan,
  AlertCircle,
  RefreshCw,
  Share2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { menuApi, bookingsApi } from '../services/api';
import { ARViewer } from '../components/ARViewer';
import ARMenuSection from '../components/ARMenuSection';
import QRCodeModal from '../components/QRCodeModal';
import { resolveDishModel } from '../services/arModelService';

interface RestaurantMenuItem {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  modelUrl?: string;
  categoryName?: string;
  categoryId?: string;
  dietaryTags?: string[];
  allergens?: string[];
  calories?: number;
  preparationTime?: number;
  spiceLevel?: number;
  isPopular?: boolean;
}

export const ARMenuPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'3d-menu' | 'vision-scanner'>('3d-menu');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const loadMenuData = useCallback(async () => {
    if (!bookingId) {
      setError('Booking session ID is missing. Please check in via your reservation link.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch authorized booking record
      const bookingData = await bookingsApi.getById(bookingId);
      if (!bookingData) {
        throw new Error('Reservation not found. Please verify your check-in confirmation.');
      }
      setBooking(bookingData);

      const rName =
        bookingData.restaurantName ||
        bookingData.businessName ||
        bookingData.restaurantId?.name ||
        bookingData.businessId?.name ||
        'Restaurant';
      setRestaurantName(rName);

      const businessId =
        bookingData.businessId?._id ||
        bookingData.businessId ||
        bookingData.restaurantId?._id ||
        bookingData.restaurantId;

      if (!businessId) {
        throw new Error('Restaurant identifier not attached to this reservation.');
      }

      // 2. Fetch actual restaurant menu
      const fullMenuResponse = await menuApi.getFullMenu(businessId);

      // Support varied backend payload structures: { success, data: [...] } or { categories: [...] }
      const rawCategories = Array.isArray(fullMenuResponse?.data)
        ? fullMenuResponse.data
        : Array.isArray(fullMenuResponse?.categories)
          ? fullMenuResponse.categories
          : Array.isArray(fullMenuResponse)
            ? fullMenuResponse
            : [];

      const extractedItems: RestaurantMenuItem[] = [];
      const extractedCategoryNames = new Set<string>();

      rawCategories.forEach((cat: any) => {
        const catName = cat.name || 'Dishes';
        extractedCategoryNames.add(catName);

        if (Array.isArray(cat.items)) {
          cat.items.forEach((item: any) => {
            extractedItems.push({
              ...item,
              id: item._id || item.id,
              categoryName: catName
            });
          });
        }
      });

      if (extractedItems.length === 0) {
        setError(`${rName} has not published digital menu items yet. Please ask your server for a printed menu.`);
        setMenuItems([]);
        return;
      }

      setMenuItems(extractedItems);
      setCategories(['all', ...Array.from(extractedCategoryNames)]);

      // Check query param for initial dish or pick the first item
      const queryDish = searchParams.get('dish');
      const initialItem = queryDish
        ? extractedItems.find((i) => (i.id || i._id) === queryDish) || extractedItems[0]
        : extractedItems[0];

      if (initialItem) {
        setSelectedDishId(initialItem.id || initialItem._id || null);
      }
    } catch (err: any) {
      console.error('[ARMenuPage] Error loading menu:', err);
      setError(err.message || 'Unable to load restaurant menu data.');
      toast.error(err.message || 'Failed to load restaurant menu.');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, searchParams]);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  const activeDish =
    menuItems.find((i) => (i.id || i._id) === selectedDishId) || menuItems[0] || null;

  const handleSelectDish = (dish: RestaurantMenuItem) => {
    const dId = dish.id || dish._id || '';
    setSelectedDishId(dId);
    setSearchParams({ dish: dId }, { replace: true });
  };

  const filteredItems =
    selectedCategory === 'all'
      ? menuItems
      : menuItems.filter((i) => i.categoryName === selectedCategory);

  // Translations for nested ARMenuSection
  const translations = {
    arMenu: 'AR Interactive Menu',
    arExperience: `Exploring ${restaurantName}`,
    nutritionInfo: 'Nutrition',
    ingredients: 'Ingredients',
    scanMenu: 'Scan Your Dish',
    cookingMethod: 'Cooking Method'
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-['Outfit']">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-purple-400">
          Loading {restaurantName || 'Restaurant'} AR Menu...
        </p>
      </div>
    );
  }

  // Error Recovery Screen (Ensures no fake demo fallback during authorized flow)
  if (error || !activeDish) {
    return (
      <div className="min-h-screen bg-black text-white font-['Outfit'] flex flex-col">
        <header className="p-4 border-b border-white/10 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-gray-400">
            {restaurantName || 'Menu Unavailable'}
          </span>
          <div className="w-10" />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-white">Menu Unavailable</h2>
          <p className="text-xs text-gray-400 leading-relaxed">{error}</p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={loadMenuData}
              className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw size={14} />
              Retry Menu
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-white/10"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif] flex flex-col selection:bg-purple-500 selection:text-white">

      {/* Top Navigation & Mode Switcher */}
      <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Return"
              aria-label="Return"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate max-w-[200px] sm:max-w-xs">
                  {restaurantName}
                </h1>
                {booking?.tableNumber && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                    Table {booking.tableNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" />
                Verified Guest Session
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-zinc-900 border border-white/10 rounded-2xl">
              <button
                onClick={() => setActiveTab('3d-menu')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  activeTab === '3d-menu'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <UtensilsCrossed size={13} />
                <span>3D / AR Menu</span>
              </button>
              <button
                onClick={() => setActiveTab('vision-scanner')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  activeTab === 'vision-scanner'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Scan size={13} />
                <span>AI Scanner</span>
              </button>
            </div>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Share table AR experience"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Tab 1: Interactive 3D / AR Menu Experience */}
      {activeTab === '3d-menu' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* Left / Top Pane: Selected Dish AR Viewer */}
          <div className="w-full lg:w-7/12 flex flex-col gap-4 sticky lg:top-24">
            <div className="w-full h-[420px] sm:h-[500px] lg:h-[560px]">
              <ARViewer
                dish={activeDish}
                showDetailsOverlay={true}
                autoRotateDefault={true}
              />
            </div>
          </div>

          {/* Right / Bottom Pane: Restaurant Dishes Catalog */}
          <div className="w-full lg:w-5/12 flex flex-col gap-4">

            {/* Category Selector */}
            {categories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-zinc-900 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {cat === 'all' ? 'All Dishes' : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Dish Items List */}
            <div className="flex flex-col gap-3">
              {filteredItems.map((dish) => {
                const dishKey = dish.id || dish._id || dish.name;
                const isSelected = (dish.id || dish._id) === (activeDish.id || activeDish._id);
                const resolution = resolveDishModel(dish);

                return (
                  <div
                    key={dishKey}
                    onClick={() => handleSelectDish(dish)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center gap-4 group ${
                      isSelected
                        ? 'bg-zinc-900/90 border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                        : 'bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/70'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-zinc-800">
                      {dish.image ? (
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <UtensilsCrossed size={24} />
                        </div>
                      )}
                      {resolution.hasModel ? (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 text-[9px] font-black uppercase tracking-wider backdrop-blur-sm border border-purple-500/40">
                          3D
                        </span>
                      ) : (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-gray-400 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                          Photo
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-black tracking-tight truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                          {dish.name}
                        </h4>
                        {dish.price !== undefined && (
                          <span className="text-xs font-black text-emerald-400 shrink-0">
                            ${typeof dish.price === 'number' ? dish.price.toFixed(2) : dish.price}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-2">
                        {dish.description || 'Artisanal dish prepared freshly by kitchen staff.'}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="text-gray-400 font-semibold">{dish.categoryName}</span>
                        {dish.calories && (
                          <>
                            <span>•</span>
                            <span>{dish.calories} cal</span>
                          </>
                        )}
                        {resolution.hasModel && (
                          <>
                            <span>•</span>
                            <span className="text-purple-400 font-bold flex items-center gap-0.5">
                              <Sparkles size={10} />
                              AR Ready
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'text-purple-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </main>
      )}

      {/* Tab 2: AI Dish Recognition & Nutrition Scanner */}
      {activeTab === 'vision-scanner' && (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ARMenuSection
            isDarkMode={true}
            language="english"
            translations={translations}
            menuItems={menuItems}
          />
        </div>
      )}

      {/* Table Share Modal */}
      <QRCodeModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={typeof window !== 'undefined' ? `${window.location.origin}/ar-experience/${bookingId}${selectedDishId ? `?dish=${selectedDishId}` : ''}` : ''}
        title="Share 3D Menu with Table Guests"
        subtitle={`Let guests at your table explore ${restaurantName}'s menu in 3D and place dishes in AR.`}
      />

    </div>
  );
};

export default ARMenuPage;
