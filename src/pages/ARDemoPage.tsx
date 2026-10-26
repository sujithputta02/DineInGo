import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Smartphone,
  Share2,
  ArrowLeft,
  Flame,
  Clock,
  Layers,
  Eye,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  HelpCircle,
  ScanLine,
  Camera,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ARViewer } from '../components/ARViewer';
import { QRCodeModal } from '../components/QRCodeModal';
import { QRScannerModal } from '../components/QRScannerModal';
import { FoodCaptureModal } from '../components/FoodCaptureModal';
import { FoodDiaryModal } from '../components/FoodDiaryModal';
import {
  DEMO_RESTAURANT,
  DEMO_MENU_ITEMS,
  type DemoDish,
  resolveDishModel
} from '../services/arModelService';

export const ARDemoPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected dish ID tracking (synced with ?dish= query param for deep linking)
  const initialDishParam = searchParams.get('dish');
  const validInitialDish = initialDishParam && DEMO_MENU_ITEMS.some((d) => d.id === initialDishParam || d._id === initialDishParam)
    ? initialDishParam
    : DEMO_MENU_ITEMS[0].id;

  const [selectedDishId, setSelectedDishId] = useState<string>(validInitialDish);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isFoodCaptureOpen, setIsFoodCaptureOpen] = useState(false);
  const [isFoodDiaryOpen, setIsFoodDiaryOpen] = useState(false);

  // Sync selected dish ID when browser back/forward changes query param
  useEffect(() => {
    const dishParam = searchParams.get('dish');
    if (dishParam) {
      const exists = DEMO_MENU_ITEMS.some((d) => d.id === dishParam || d._id === dishParam);
      if (exists) {
        setSelectedDishId(dishParam);
      } else {
        setSelectedDishId(DEMO_MENU_ITEMS[0].id);
      }
    }
  }, [searchParams]);

  // Derive active dish
  const activeDish: DemoDish =
    DEMO_MENU_ITEMS.find((d) => d.id === selectedDishId || d._id === selectedDishId) ||
    DEMO_MENU_ITEMS[0];

  // Update query param when dish changes
  const handleSelectDish = (dish: DemoDish) => {
    setSelectedDishId(dish.id);
    setSearchParams({ dish: dish.id }, { replace: true });
  };

  // Categories
  const categories = ['all', 'Starters & Soups', 'Starters & Salads', 'Signature Mains', 'Artisanal Desserts', 'Chef Specials'];

  const filteredDishes =
    selectedCategory === 'all'
      ? DEMO_MENU_ITEMS
      : DEMO_MENU_ITEMS.filter((d) => d.categoryName === selectedCategory);

  return (
    <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif] flex flex-col selection:bg-purple-500 selection:text-white">

      {/* Top Banner: Public Showcase Notice */}
      <div className="bg-gradient-to-r from-purple-900/60 via-pink-900/40 to-black border-b border-purple-500/20 px-4 py-2.5 text-center text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-purple-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Public Interactive Demo
            </span>
            <span className="hidden sm:inline text-purple-200/70">
              — Sample dishes & real 3D assets for prospective restaurant partners
            </span>
          </div>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-bold transition-colors border border-purple-400/30 whitespace-nowrap"
          >
            <Share2 size={12} />
            <span>Scan QR / Share</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Return to DineInGo Home"
              aria-label="Return to DineInGo Home"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {DEMO_RESTAURANT.name}
                </h1>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                  Demo
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                {DEMO_RESTAURANT.cuisine} • {DEMO_RESTAURANT.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsQRScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-xs font-bold transition-all border border-white/10"
              title="Scan Table QR Code"
            >
              <ScanLine size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>

            <button
              onClick={() => setIsFoodCaptureOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-xs font-bold transition-all border border-white/10"
              title="Scan Food with Camera"
            >
              <Camera size={14} className="text-blue-400" />
              <span className="hidden sm:inline">AI Food Scan</span>
            </button>

            <button
              onClick={() => setIsFoodDiaryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-xs font-bold transition-all border border-white/10"
              title="View Daily Food Diary"
            >
              <BookOpen size={14} className="text-purple-400" />
              <span className="hidden sm:inline">Diary</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-white/10"
            >
              <Smartphone size={14} className="text-purple-400" />
              <span>Share AR</span>
            </button>
            <button
              onClick={() => navigate('/business')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/20 transition-all"
            >
              For Restaurants
            </button>
          </div>
        </div>
      </header>

      {/* Main Showcase Content: Responsive Dual-Pane */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

        {/* Left Column (Desktop) / Top Section (Mobile): 3D AR Viewer */}
        <div className="w-full lg:w-7/12 flex flex-col gap-4 sticky lg:top-24">
          <div className="w-full h-[440px] sm:h-[520px] lg:h-[580px]">
            <ARViewer
              dish={activeDish}
              showDetailsOverlay={true}
              autoRotateDefault={true}
            />
          </div>

          {/* Quick Notice Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-start gap-3 text-xs text-gray-400">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-gray-200 font-bold mb-0.5">Interactive 3D & Augmented Reality</p>
              <p className="leading-relaxed text-[11px]">
                On mobile devices, tap <strong className="text-white">View in Real AR</strong> to scale and position this dish directly onto your physical tabletop. On desktop, click and drag to inspect textures from 360°.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (Desktop) / Bottom Section (Mobile): Dish Selector & Catalog */}
        <div className="w-full lg:w-5/12 flex flex-col gap-4">

          {/* Category Filter Pills */}
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
                {cat === 'all' ? 'All Sample Dishes' : cat}
              </button>
            ))}
          </div>

          {/* Dish List Grid */}
          <div className="flex flex-col gap-3">
            {filteredDishes.map((dish) => {
              const isSelected = dish.id === activeDish.id;
              const resolution = resolveDishModel(dish);

              return (
                <div
                  key={dish.id}
                  onClick={() => handleSelectDish(dish)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center gap-4 group ${
                    isSelected
                      ? 'bg-zinc-900/90 border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                      : 'bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/70'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-zinc-800">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
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
                      <span className="text-xs font-black text-emerald-400 shrink-0">
                        ${dish.price.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-2">
                      {dish.description}
                    </p>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="text-gray-400 font-semibold">{dish.categoryName}</span>
                      <span>•</span>
                      <span>{dish.calories} cal</span>
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

                  {/* Active Indicator Chevron */}
                  <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'text-purple-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Business Pitch Banner */}
          <div className="mt-4 p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950/40 border border-purple-500/20 space-y-3">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-wider">
              <Building2 size={16} />
              Restaurant Partner Experience
            </div>
            <h4 className="text-base font-black text-white">
              Deliver immersive AR previews to your diners
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              DineInGo lets restaurants upload 3D models or automatically pair dishes with verified culinary digital twins to boost guest ordering confidence and table turnover.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => navigate('/business')}
                className="px-4 py-2 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-all"
              >
                Learn More
              </button>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all border border-white/10"
              >
                Share Demo
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-gray-500">
        <p>
          DineInGo Augmented Reality Demonstration • Sample data only • No real transactions or bookings occur in this mode.
        </p>
      </footer>

      {/* QR Code / Share Modal */}
      <QRCodeModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={typeof window !== 'undefined' ? `${window.location.origin}/ar-demo?dish=${selectedDishId}` : 'https://dineingo.app/ar-demo'}
        title="Experience AR On Your Phone"
        subtitle="Scan with your iPhone or Android camera to immediately preview this dish in real-world Augmented Reality."
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />

      {/* AI Food Capture Modal */}
      <FoodCaptureModal
        isOpen={isFoodCaptureOpen}
        onClose={() => setIsFoodCaptureOpen(false)}
      />

      {/* Food Diary Modal */}
      <FoodDiaryModal
        isOpen={isFoodDiaryOpen}
        onClose={() => setIsFoodDiaryOpen(false)}
        onOpenCapture={() => setIsFoodCaptureOpen(true)}
      />

    </div>
  );
};

export default ARDemoPage;
