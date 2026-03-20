import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Plus, Minus, ShoppingCart, Calendar, Clock, Users } from 'lucide-react';
import { getRestaurantById } from '../services/restaurantService';
import type { MenuItem } from '../types';
import { DinoStepper } from '../components/DinoStepper';

export default function FoodMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("dineInGoDarkMode");
    return saved === "true" ? true : false;
  });

  // Get reservation details from URL
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const guests = searchParams.get('guests');

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (id) {
        const data = await getRestaurantById(id);
        setRestaurant(data);
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, [id]);

  const handleAddItem = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[itemId] > 1) {
        newItems[itemId]--;
      } else {
        delete newItems[itemId];
      }
      return newItems;
    });
  };

  const getTotalItems = () => {
    return Object.values(selectedItems).reduce((sum, count) => sum + count, 0);
  };

  const getTotalPrice = () => {
    return restaurant?.menu
      .filter((item: MenuItem) => selectedItems[item.id])
      .reduce((sum: number, item: MenuItem) => sum + (item.price * selectedItems[item.id]), 0) || 0;
  };

  const handleProceedToReservation = () => {
    // Convert selected items to URL parameters
    const queryParams = new URLSearchParams(searchParams);

    // Add each selected item as a separate parameter
    Object.entries(selectedItems).forEach(([itemId, quantity]) => {
      queryParams.append('items', `${itemId}:${quantity}`);
    });

    console.log('Selected items being passed:', selectedItems); // Debug log
    console.log('URL parameters:', queryParams.toString()); // Debug log

    navigate(`/restaurant/${id}/preview?${queryParams.toString()}`);
  };

  const categories = ['All', ...new Set(restaurant?.menu?.map((item: MenuItem) => item.category) || [])] as string[];

  const filteredMenu = restaurant?.menu.filter((item: MenuItem) => {
    return activeCategory === 'All' || item.category === activeCategory;
  });

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-sm border-b sticky top-0 z-50 transition-all`}>
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/restaurant/${id}`)}
              className={`p-2 rounded-xl transition-colors ${
                isDarkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className={`text-xl md:text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{restaurant?.name}</h1>
          </div>
        </div>
      </div>

      {/* Reservation Details */}
      <div className={`${isDarkMode ? 'bg-emerald-950/20 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'} border-b transition-all`}>
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col gap-6">
            <div className={`flex flex-wrap items-center gap-4 md:gap-8 text-xs md:text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Calendar className="w-4 h-4" />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Clock className="w-4 h-4" />
                <span>{time}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Users className="w-4 h-4" />
                <span>{guests} {Number(guests) === 1 ? 'Guest' : 'Guests'}</span>
              </div>
            </div>

            {/* Dino Progress Tracker */}
            <DinoStepper currentStep={1} />
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Tabs */}
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2.5 rounded-2xl whitespace-nowrap font-black uppercase tracking-widest text-[10px] transition-all duration-300 border-2 active:scale-95 ${
                activeCategory === category
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                    : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        {restaurant?.menu && restaurant.menu.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
            {filteredMenu?.map((item: MenuItem) => (
              <div key={item.id} className={`group rounded-[2rem] shadow-xl overflow-hidden border-2 transition-all duration-500 hover:translate-y-[-4px] ${
                isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-50'
              }`}>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/400x250?text=Food';
                    }}
                  />
                  <div className="absolute top-4 right-4">
                    {item.isVegetarian && (
                      <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg border border-green-500 shadow-lg">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className={`font-black text-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</h3>
                    <span className={`font-black text-lg ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{item.price}</span>
                  </div>
                  <p className={`text-sm font-medium leading-relaxed mb-6 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-500/10">
                    <div className="flex items-center gap-4">
                      {selectedItems[item.id] ? (
                        <div className={`flex items-center gap-4 p-1 rounded-2xl border-2 transition-all ${
                          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
                        }`}>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className={`p-2 rounded-xl transition-all active:scale-95 ${
                              isDarkMode ? 'hover:bg-gray-700 text-rose-400' : 'hover:bg-white text-rose-500 shadow-sm'
                            }`}
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span className={`font-black text-lg px-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedItems[item.id]}</span>
                          <button
                            onClick={() => handleAddItem(item.id)}
                            className={`p-2 rounded-xl transition-all active:scale-95 ${
                              isDarkMode ? 'hover:bg-gray-700 text-emerald-400' : 'hover:bg-white text-emerald-500 shadow-sm'
                            }`}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddItem(item.id)}
                          className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border-2 active:scale-95 ${
                            isDarkMode 
                              ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500' 
                              : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add to Expedition</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className={`rounded-[3rem] p-12 border-4 border-dashed transition-all ${
              isDarkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-100'
            }`}>
              <h3 className={`text-2xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>The Vault is Empty</h3>
              <p className={`text-lg font-medium mb-8 max-w-md mx-auto opacity-60 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>The restaurant owner hasn't added their menu items yet. Please check back later or contact the restaurant directly.</p>
              <button
                onClick={() => navigate(`/restaurant/${id}`)}
                className="group relative bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-sm py-4 px-10 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-3">
                  <ChevronLeft className="w-5 h-5" />
                  Return to Site
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      {getTotalItems() > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t transition-all z-50 ${
          isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
        }`}>
          <div className="max-w-7xl mx-auto px-6 py-6 font-black">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-500 ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-widest opacity-60 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{getTotalItems()} items captured</p>
                  <p className={`text-2xl tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{getTotalPrice()}</p>
                </div>
              </div>
              <button
                onClick={handleProceedToReservation}
                className="group relative bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-sm py-4 px-10 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-3">
                  Proceed to Preview
                  <Plus className="w-5 h-5 rotate-45 group-hover:rotate-90 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}