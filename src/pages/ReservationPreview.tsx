import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, MapPin, Calendar, Users } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getRestaurantById, getMockRestaurantById } from "../services/restaurantService";
import { getMockEventById } from "../services/event-service";
import { Restaurant, Event } from "../types";
import { DinoStepper } from "../components/DinoStepper";
import { normalizeImageUrl } from "../services/api";

// Different high-quality restaurant preview images focusing on food and atmosphere
const restaurantPreviewImages: { [key: string]: string[] } = {
  "Spice Garden": [
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe", // Authentic Indian Thali
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7", // Butter Chicken and Naan
    "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe"  // Indian Curry Spread
  ],
  "The Coastal Kitchen": [
    "https://images.unsplash.com/photo-1623341214825-9f4f963727da", // Fresh Seafood Platter
    "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58", // Grilled Fish
    "https://images.unsplash.com/photo-1534787238916-9ba6764efd4f"  // Seafood Paella
  ],
  "Biryani House": [
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8", // Hyderabadi Biryani
    "https://images.unsplash.com/photo-1606491956689-2ea866880c84", // Mutton Biryani
    "https://images.unsplash.com/photo-1642821373181-696a54913e93"  // Mixed Grill Platter
  ],
  "Pizza Paradise": [
    "https://images.unsplash.com/photo-1604382355076-af4b0eb60143", // Margherita Pizza
    "https://images.unsplash.com/photo-1513104890138-7c749659a591", // Pepperoni Pizza
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"  // Wood-fired Pizza
  ],
  "Sushi Master": [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c", // Sushi Platter
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252", // Nigiri Selection
    "https://images.unsplash.com/photo-1553621042-f6e147245754"  // Maki Rolls
  ],
  "Burger Junction": [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd", // Gourmet Burger
    "https://images.unsplash.com/photo-1550547660-d9450f859349", // Classic Cheeseburger
    "https://images.unsplash.com/photo-1610440042657-612c34d95e9f"  // Burger with Fries
  ]
};

const ReservationPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    occasion: '',
    specialRequest: ''
  });
  const [selectedMenuItems, setSelectedMenuItems] = useState<{ [key: string]: number }>({});
  const [showMenuItems, setShowMenuItems] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("dineInGoDarkMode");
    return saved === "true" ? true : false;
  });

  const time = searchParams.get('time');
  const date = searchParams.get('date');
  const guests = searchParams.get('guests');
  const type = searchParams.get('type') || 'restaurant';

  const getTotalPrice = useMemo(() => {
    console.log('getTotalPrice called with:', {
      hasRestaurant: !!restaurant,
      hasMenu: !!restaurant?.menu,
      menuLength: restaurant?.menu?.length,
      selectedItems: selectedMenuItems,
      dataReady: dataReady
    });

    if (!restaurant?.menu || Object.keys(selectedMenuItems).length === 0) {
      console.log('No restaurant menu or no selected items');
      return 0;
    }

    const total = Object.entries(selectedMenuItems).reduce((sum, [itemId, count]) => {
      // Try to find the item in the menu
      const item = restaurant.menu?.find(m => String(m.id) === String(itemId));

      if (!item) {
        console.warn(`Item not found in menu: ${itemId}`);
        console.log('Available menu items:', restaurant.menu?.map(m => ({ id: m.id, name: m.name })));
        return sum;
      }

      const itemPrice = Number(item.price) || 0;
      const itemTotal = itemPrice * count;
      console.log(`Item ${itemId}: ${item.name} - Price: ${itemPrice}, Count: ${count}, Total: ${itemTotal}`);
      return sum + itemTotal;
    }, 0);

    console.log('Total price calculated:', total);
    return total;
  }, [restaurant?.menu, selectedMenuItems]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setDataReady(false);
        if (id) {
          if (type === 'restaurant') {
            // Parse selected menu items from URL first
            const items = searchParams.getAll('items');
            console.log('URL items parameter:', items); // Debug log
            const menuItems: { [key: string]: number } = {};
            items.forEach(item => {
              const [itemId, count] = item.split(':');
              if (itemId && count) {
                menuItems[itemId] = parseInt(count, 10);
              }
            });
            console.log('Parsed menu items:', menuItems); // Debug log
            setSelectedMenuItems(menuItems);

            // Try to load the restaurant by ID first
            let restaurantData = await getRestaurantById(id);
            console.log('Restaurant data loaded by ID:', restaurantData); // Debug log
            console.log('Restaurant menu:', restaurantData?.menu); // Debug log
            console.log('Restaurant ID requested:', id, 'Restaurant ID loaded:', restaurantData?.id); // Debug log

            // Check if the selected menu items exist in this restaurant
            const missingItems = Object.keys(menuItems).filter(itemId =>
              !restaurantData?.menu?.some((item: any) => item.id === itemId)
            );

            if (missingItems.length > 0) {
              console.log('Missing items in current restaurant:', missingItems);
              // Try to find the correct restaurant by searching through mock restaurants
              // This is a fallback for when menu items from mock restaurants are selected
              // but we're viewing a business restaurant
              for (let restaurantId = 1; restaurantId <= 6; restaurantId++) {
                const testRestaurant = await getMockRestaurantById(restaurantId.toString());
                const allItemsFound = Object.keys(menuItems).every(itemId =>
                  testRestaurant?.menu?.some((item: any) => item.id === itemId)
                );
                if (allItemsFound) {
                  console.log(`Found correct mock restaurant: ${testRestaurant?.name} (ID: ${restaurantId})`);
                  restaurantData = testRestaurant;
                  break;
                }
              }
            }

            setRestaurant(restaurantData);
            setEvent(null);
            setDataReady(true);
          } else if (type === 'event') {
            const eventData = await getMockEventById(id);
            setEvent(eventData);
            setRestaurant(null);
            setDataReady(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, type, searchParams]);

  // Debug effect to track state changes
  useEffect(() => {
    console.log('Component state updated:', {
      restaurant: restaurant?.name,
      selectedMenuItems,
      dataReady,
      totalPrice: getTotalPrice
    });
  }, [restaurant, selectedMenuItems, dataReady, getTotalPrice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prepare query params with all form data
    const queryParams = new URLSearchParams(searchParams);
    Object.entries(formData).forEach(([key, value]) => {
      if (value) queryParams.set(key, value);
    });
    if (date) queryParams.set('date', date);
    if (time) queryParams.set('time', time);
    if (guests) queryParams.set('guests', guests);

    // Add selected menu items to query params
    searchParams.getAll('items').forEach(item => {
      queryParams.append('items', item);
    });

    if (type === 'restaurant') {
      navigate(`/restaurant/${id}/table-selection?${queryParams.toString()}`);
    } else {
      // For events, use the same reservation page but with type=event
      queryParams.set('type', 'event');
      if (event) {
        queryParams.set('eventName', event.title);
        queryParams.set('eventCategory', event.category);
        queryParams.set('eventPrice', event.price?.toString() || '');
        queryParams.set('eventOrganizer', event.organizer || '');
        queryParams.set('eventImage', event.imageUrl);
      }
      // Use the same reservation page for both restaurants and events
      navigate(`/restaurant/${id}/reservation?${queryParams.toString()}`);
    }
  };

  const sendEmail = async (data: any) => {
    try {
      const response = await fetch('/api/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const handleTimeSlotClick = (time: string) => {
    const queryParams = new URLSearchParams();
    if (time) queryParams.set('time', time);
    if (date) queryParams.set('date', date);
    if (guests) queryParams.set('guests', guests);
    navigate(`/restaurant/${id}/menu?${queryParams.toString()}`);
  };

  if (loading || (!restaurant && !event)) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Check if we have restaurant data for restaurant type
  if (type === 'restaurant' && !restaurant) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading restaurant data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Hero Section with Image Gallery */}
      <div className="relative h-[400px] md:h-[500px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 gap-2">
          {type === 'restaurant' && restaurant && restaurantPreviewImages[restaurant.name]?.slice(0, 4).map((image, index) => (
            <div key={index} className={`relative overflow-hidden ${index === 0 ? 'col-span-2 row-span-2' : 'hidden md:block'}`}>
              <img
                src={image}
                alt={`${restaurant.name} ambiance ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
              />
            </div>
          ))}
          {type === 'event' && event && (
            <div className="col-span-4 row-span-2 h-full">
              <img
                src={normalizeImageUrl(event.imageUrl)}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
        <div className="absolute bottom-8 left-8 right-8 z-20 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            {type === 'restaurant' && restaurant && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  {restaurant.cuisine?.map((c, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">{c}</span>
                  ))}
                </div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-none">{restaurant.name}</h1>
                <div className="flex items-center gap-3 group cursor-pointer"
                  onClick={() => {
                    if (restaurant?.address) {
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          restaurant.address || `${restaurant.location.city}, ${restaurant.location.state}`
                        )}`,
                        '_blank'
                      );
                    }
                  }}>
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                    <MapPin size={16} className="text-white" />
                  </div>
                  <p className="text-sm font-bold opacity-80 group-hover:text-emerald-400 transition-colors">
                    {restaurant?.address || `${restaurant?.location.city}, ${restaurant?.location.state}`}
                  </p>
                </div>
              </>
            )}
            {type === 'event' && event && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">{event.category}</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-none">{event.title}</h1>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <Calendar size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-bold">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <Users size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-bold">{event.registeredCount}/{event.capacity} Registered</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Back Navigation */}
      <div className="absolute top-6 left-6 z-30 flex items-center gap-2">
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (date) params.set('date', date);
            if (time) params.set('time', time);
            if (guests) params.set('guests', guests);
            navigate(`/restaurant/${id}/menu?${params.toString()}`);
          }}
          className={`flex items-center gap-3 px-6 py-3 backdrop-blur-xl rounded-[2rem] shadow-2xl transition-all font-black uppercase tracking-widest text-[10px] active:scale-95 border-2 ${
            isDarkMode ? 'bg-black/60 border-white/10 text-white hover:bg-black/80' : 'bg-white/90 border-transparent text-gray-700 hover:bg-white'
          }`}
        >
          <ArrowLeft size={18} />
          <span>Back to Menu</span>
        </button>
      </div>

      {/* Location Preview */}
      {type === 'restaurant' && restaurant && (
        <div className="absolute top-4 right-4 z-30">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              restaurant?.address || `${restaurant?.location.city}, ${restaurant?.location.state}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm hover:bg-white transition-colors group"
          >
            <MapPin size={20} className="text-gray-700 group-hover:text-emerald-500" />
            <span className="text-gray-700 font-medium group-hover:text-emerald-500">View on Map</span>
          </a>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className={`rounded-[3rem] shadow-2xl p-8 md:p-12 border-2 transition-all ${
          isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className={`text-3xl md:text-4xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {type === 'restaurant' ? 'Reservation Preview' : 'Event Registration'}
              </h2>
              <p className={`text-sm font-bold uppercase tracking-widest opacity-60 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Verify your mission details</p>
            </div>
            {/* Dino Progress Tracker */}
            <div className="w-full md:w-auto">
              <DinoStepper currentStep={2} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h3 className={`text-lg font-black uppercase tracking-widest pb-4 border-b-2 flex items-center gap-3 ${
                  isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-50'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Primary Contact
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full p-4 rounded-2xl font-bold transition-all border-2 outline-none ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-500/50' 
                          : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-emerald-500/50'
                      }`}
                      placeholder="e.g. Maverick Mitchell"
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full p-4 rounded-2xl font-bold transition-all border-2 outline-none ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-500/50' 
                          : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-emerald-500/50'
                      }`}
                      placeholder="e.g. maverick@topgun.com"
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className={`w-full p-4 rounded-2xl font-bold transition-all border-2 outline-none ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-500/50' 
                          : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-emerald-500/50'
                      }`}
                      placeholder="+91 XXXXX XXXXX"
                      required
                    />
                  </div>
                  {type === 'restaurant' && (
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Occasion (Optional)</label>
                      <select
                        name="occasion"
                        value={formData.occasion}
                        onChange={handleInputChange}
                        className={`w-full p-4 rounded-2xl font-bold transition-all border-2 outline-none appearance-none ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-500/50' 
                            : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-emerald-500/50'
                        }`}
                      >
                        <option value="">Select Occasion</option>
                        <option value="birthday">Birthday Celebration</option>
                        <option value="anniversary">Anniversary Dinner</option>
                        <option value="date">Romantic Rendezvous</option>
                        <option value="business">Corporate Strategic Meeting</option>
                        <option value="other">Other Special Event</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className={`text-lg font-black uppercase tracking-widest pb-4 border-b-2 flex items-center gap-3 ${
                  isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-50'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Manifest Details
                </h3>
                <div className={`grid grid-cols-2 gap-4 p-6 rounded-[2rem] border-2 transition-all ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Date</p>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{date}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Time Slot</p>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{time}</p>
                  </div>
                  {type === 'restaurant' && (
                    <div className="col-span-2">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Guests Count</p>
                      <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{guests} Personnel</p>
                    </div>
                  )}
                  {type === 'event' && event && (
                    <>
                      <div className="col-span-2 mt-2 pt-2 border-t border-gray-500/10">
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Organizer</p>
                        <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{event.organizer}</p>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 px-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Special Mission Intel (Optional)</label>
                  <textarea
                    name="specialRequest"
                    value={formData.specialRequest}
                    onChange={handleInputChange}
                    className={`w-full p-4 rounded-2xl font-bold transition-all border-2 outline-none h-40 resize-none ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-500/50' 
                        : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-emerald-500/50'
                    }`}
                    placeholder="Enter special requirements or dietary restrictions..."
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-start cursor-pointer group">
                    <div className="relative mt-1">
                      <input type="checkbox" className="peer sr-only" required />
                      <div className={`w-5 h-5 rounded-md border-2 transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 ${
                        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      }`} />
                      <svg className="absolute inset-0 w-5 h-5 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={`ml-3 text-xs font-bold leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      I certify that the information provided is correct and I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Terms of Engagement</a>
                      {' '}and{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Privacy Protocol</a>.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Selected Menu Items */}
            {Object.keys(selectedMenuItems).length > 0 ? (
              <div className={`mt-12 pt-12 border-t-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-50'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <h3 className={`text-xl font-black uppercase tracking-widest flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    Provisioning Manifest
                  </h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className={`px-6 py-4 rounded-2xl border-2 font-black ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <p className={`text-[10px] uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Total Valuation</p>
                      <p className={`text-2xl text-emerald-500 font-black`}>₹{getTotalPrice}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMenuItems(!showMenuItems)}
                      className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 active:scale-95 ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600' 
                          : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{showMenuItems ? 'Consolidate' : 'Expand'} Provisions</span>
                      <svg
                        className={`w-4 h-4 transform transition-transform duration-300 ${showMenuItems ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={4}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500 overflow-hidden ${
                  showMenuItems ? 'opacity-100 max-h-[2000px] mb-8' : 'opacity-0 max-h-0'
                }`}>
                  {Object.entries(selectedMenuItems).map(([itemId, count]) => {
                    const item = restaurant?.menu?.find(m => m.id === itemId);
                    return (
                      <div key={itemId} className={`flex items-center gap-6 p-4 rounded-[2rem] border-2 transition-all group ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-emerald-500/30' : 'bg-white border-gray-50 hover:border-emerald-500/30 shadow-sm'
                      }`}>
                        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-500/10">
                          {item ? (
                            <img
                              src={normalizeImageUrl(item.image)}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                e.currentTarget.src = 'https://placehold.co/100x100?text=Food';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-gray-400">?</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-black text-lg truncate mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item?.name || `Item ${itemId}`}
                          </h4>
                          <div className="flex items-center gap-4">
                            <span className={`px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-black`}>{count}X</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              ₹{item?.price || 0} unit
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{(item?.price || 0) * count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`mt-12 pt-12 border-t-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-50'}`}>
                <div className={`rounded-3xl p-12 text-center border-2 border-dashed transition-all ${
                  isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-emerald-500 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No Provisions Selected</h3>
                  <p className={`text-sm font-bold opacity-60 mb-8 max-w-xs mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Your equipment list is empty. Would you like to add items before proceeding?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (date) params.set('date', date);
                      if (time) params.set('time', time);
                      if (guests) params.set('guests', guests);
                      navigate(`/restaurant/${id}/menu?${params.toString()}`);
                    }}
                    className="group relative bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 px-10 rounded-full transition-all active:scale-95 overflow-hidden"
                  >
                    <span>Back to Armoury</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-12">
              <button
                type="submit"
                className="group relative bg-black hover:bg-gray-900 text-white font-black uppercase tracking-widest text-sm py-5 px-16 rounded-[2rem] transition-all shadow-2xl active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-4">
                  Confirm Engagement
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReservationPreview;