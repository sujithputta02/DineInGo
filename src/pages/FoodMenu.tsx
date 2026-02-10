import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Plus, Minus, ShoppingCart, Calendar, Clock, Users } from 'lucide-react';
import { getRestaurantById } from '../services/restaurantService';
import type { MenuItem } from '../types';

export default function FoodMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [activeCategory, setActiveCategory] = useState<string>('All');

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/restaurant/${id}`)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold">{restaurant?.name}</h1>
          </div>
        </div>
      </div>

      {/* Reservation Details */}
      <div className="bg-emerald-50 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-6 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{guests} {Number(guests) === 1 ? 'Guest' : 'Guests'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                activeCategory === category
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        {restaurant?.menu && restaurant.menu.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredMenu?.map((item: MenuItem) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="object-cover rounded-lg w-full h-48"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/64x64?text=Food';
                    }}
                  />
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <span className="text-gray-600">₹{item.price}</span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedItems[item.id] ? (
                      <>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="font-medium">{selectedItems[item.id]}</span>
                        <button
                          onClick={() => handleAddItem(item.id)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleAddItem(item.id)}
                        className="flex items-center gap-1 text-emerald-500 hover:text-emerald-600"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                  {item.isVegetarian && (
                    <span className="text-green-600 text-sm">Vegetarian</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Menu Not Added Yet</h3>
              <p className="text-gray-600">The restaurant owner hasn't added their menu items yet. Please check back later or contact the restaurant directly.</p>
              <button
                onClick={() => navigate(`/restaurant/${id}`)}
                className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                Back to Restaurant Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">{getTotalItems()} items selected</p>
                <p className="font-semibold">₹{getTotalPrice()}</p>
              </div>
              <button
                onClick={handleProceedToReservation}
                className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Proceed to Reservation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}