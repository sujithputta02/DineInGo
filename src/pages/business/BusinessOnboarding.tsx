import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Upload,
  ChefHat,
  Users,
  Utensils,
  Music,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Plus,
  X,
  Clock
} from 'lucide-react';
import { businessApi } from '../../services/api';
import BusinessLocationSelector from '../../components/BusinessLocationSelector';
import FloorPlanDesigner from '../../components/FloorPlanDesigner';
import EventSeatingDesigner from '../../components/EventSeatingDesigner';

// Types for business onboarding
type BusinessType = 'restaurant' | 'event' | 'both';
type BookingType = 'seat-based' | 'slot-based';

interface BusinessDetails {
  name: string;
  location: string;
  locationData?: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
    latitude: number;
    longitude: number;
  };
  type: BusinessType;
  description: string;
  thumbnail: File | string | null;
  coverImage: File | string | null;
}

interface RestaurantConfig {
  cuisine: string[];
  menu: MenuItem[];
  weeklySchedule: WeeklySchedule;
  bookingType: BookingType;
  slotMode: 'weekly' | 'daily'; // New option to choose between weekly schedule or daily slots
  dailySlots: DaySlot[]; // Daily time slots (morning, afternoon, evening, night)
}

interface EventConfig {
  eventType: string;
  capacity: number;
  duration: number;
  bookingType: BookingType;
  timeSlots: TimeSlot[];
  startDate?: string;
  endDate?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number | string;
  category: string;
  description: string;
  available: boolean;
}

interface WeeklySchedule {
  [key: string]: DaySchedule;
}

interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks?: TimeBreak[]; // For lunch breaks, etc.
}

interface TimeBreak {
  startTime: string;
  endTime: string;
  name: string; // e.g., "Lunch Break"
}

interface DaySlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'morning' | 'afternoon' | 'evening' | 'night';
  maxCapacity: number;
  available: boolean;
}

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'lunch' | 'dinner' | 'event';
  available: boolean;
  maxCapacity: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const BusinessOnboarding: React.FC = () => {
  console.log('BusinessOnboarding component rendering');
  
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isEditMode = location.pathname.includes('/edit/');
  const isViewMode = location.pathname.includes('/view/');
  const isReadOnly = isViewMode;

  console.log('BusinessOnboarding state:', { id, isEditMode, isViewMode, pathname: location.pathname });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(id || null);
  const [floorPlanData, setFloorPlanData] = useState<any>(null);
  const [seatingLayoutData, setSeatingLayoutData] = useState<any>(null);

  // Layout design state - moved outside of conditional rendering
  const [activeDesigner, setActiveDesigner] = useState<'floor' | 'seating' | null>(null);

  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>({
    name: '',
    location: '',
    locationData: undefined,
    type: 'restaurant',
    description: '',
    thumbnail: null,
    coverImage: null
  });

  const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig>({
    cuisine: [],
    menu: [],
    weeklySchedule: {
      monday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
      tuesday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
      wednesday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
      thursday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
      friday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
      saturday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
      sunday: { isOpen: true, openTime: '12:00', closeTime: '00:00' }
    },
    bookingType: 'seat-based',
    slotMode: 'weekly',
    dailySlots: [
      { id: 'morning', name: 'Morning', startTime: '08:00', endTime: '12:00', type: 'morning', maxCapacity: 50, available: true },
      { id: 'afternoon', name: 'Afternoon', startTime: '12:00', endTime: '17:00', type: 'afternoon', maxCapacity: 60, available: true },
      { id: 'evening', name: 'Evening', startTime: '17:00', endTime: '21:00', type: 'evening', maxCapacity: 80, available: true },
      { id: 'night', name: 'Night', startTime: '21:00', endTime: '01:00', type: 'night', maxCapacity: 40, available: true }
    ]
  });

  const [eventConfig, setEventConfig] = useState<EventConfig>({
    eventType: '',
    capacity: 0,
    duration: 0,
    bookingType: 'seat-based',
    timeSlots: [],
    startDate: '',
    endDate: ''
  });

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: false,
    errors: []
  });

  // Load business data in edit/view mode
  useEffect(() => {
    if ((isEditMode || isViewMode) && id) {
      loadBusinessData(id);
    }
  }, [isEditMode, isViewMode, id]);

  // Auto-validate when reaching step 4
  useEffect(() => {
    if (currentStep === 4 && validation.errors.length === 0 && !validation.isValid) {
      validateBusiness();
    }
  }, [currentStep]);

  const loadBusinessData = async (businessId: string) => {
    try {
      setLoading(true);
      const result = await businessApi.getById(businessId);
      const business = result.data || result;

      console.log('Business data loaded from API:', {
        name: business.name,
        locationType: typeof business.location,
        hasLocationData: !!business.locationData,
        type: business.type,
        dailySlots: business.dailySlots?.length,
        timeSlots: business.timeSlots?.length,
        weeklySchedule: !!business.weeklySchedule
      });

      // Populate business details
      // Ensure name and location are strings for UI inputs
      const locationStr = typeof business.location === 'string'
        ? business.location
        : business.location?.city && business.location?.state
          ? `${business.location.city}, ${business.location.state}`
          : business.location?.address || business.locationData?.address || '';

      console.log('Final location string for state:', locationStr);

      setBusinessDetails({
        name: String(business.name || ''),
        location: locationStr,
        locationData: business.locationData,
        type: business.type || 'restaurant',
        description: business.description || '',
        thumbnail: business.thumbnail || null,
        coverImage: business.coverImage || null
      });

      // Populate restaurant config
      if (business.type === 'restaurant' || business.type === 'both') {
        const hasWeeklySchedule = business.weeklySchedule && Object.keys(business.weeklySchedule).length > 0;
        const hasDailySlots = business.dailySlots && business.dailySlots.length > 0;

        setRestaurantConfig({
          cuisine: business.cuisine || [],
          menu: business.menu || [],
          weeklySchedule: hasWeeklySchedule ? business.weeklySchedule : {
            monday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
            tuesday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
            wednesday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
            thursday: { isOpen: true, openTime: '12:00', closeTime: '23:30' },
            friday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
            saturday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
            sunday: { isOpen: true, openTime: '12:00', closeTime: '00:00' }
          },
          bookingType: business.bookingType || 'seat-based',
          slotMode: business.slotMode || 'weekly',
          dailySlots: hasDailySlots ? business.dailySlots : [
            { id: 'morning', name: 'Morning', startTime: '08:00', endTime: '12:00', type: 'morning', maxCapacity: 50, available: true },
            { id: 'afternoon', name: 'Afternoon', startTime: '12:00', endTime: '17:00', type: 'afternoon', maxCapacity: 60, available: true },
            { id: 'evening', name: 'Evening', startTime: '17:00', endTime: '21:00', type: 'evening', maxCapacity: 80, available: true },
            { id: 'night', name: 'Night', startTime: '21:00', endTime: '01:00', type: 'night', maxCapacity: 40, available: true }
          ]
        });
      }

      // Populate event config
      if (business.type === 'event' || business.type === 'both') {
        setEventConfig({
          eventType: business.eventType || '',
          capacity: business.capacity || 0,
          duration: business.duration || 0,
          bookingType: business.bookingType || 'seat-based',
          timeSlots: business.timeSlots || [],
          startDate: business.startDate ? new Date(business.startDate).toISOString().split('T')[0] : '',
          endDate: business.endDate ? new Date(business.endDate).toISOString().split('T')[0] : ''
        });
      }

      // Load layout data
      if (business.floorPlan) {
        setFloorPlanData(business.floorPlan);
      }
      if (business.seatingLayout) {
        setSeatingLayoutData(business.seatingLayout);
      }

    } catch (error) {
      console.error('Error loading business data:', error);
      alert('Error loading business data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Business Details', icon: Building2 },
    { id: 2, title: 'Configuration', icon: ChefHat },
    { id: 3, title: 'Layout Design', icon: MapPin },
    { id: 4, title: 'Validation', icon: CheckCircle },
    { id: 5, title: 'Deploy', icon: ArrowRight }
  ];

  const cuisineOptions = [
    'Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese',
    'Mediterranean', 'American', 'French', 'Korean', 'Vietnamese', 'Other'
  ];

  const eventTypes = [
    'Conference', 'Wedding', 'Concert', 'Workshop', 'Birthday Party',
    'Corporate Event', 'Festival', 'Exhibition', 'Seminar', 'Other'
  ];

  // Save business data to backend
  const saveBusiness = async () => {
    try {
      setLoading(true);

      // Defensive check for required fields before saving
      // Ensure we are working with strings to avoid TypeErrors
      const nameStr = String(businessDetails.name || '').trim();
      const locationStr = String(businessDetails.location || '').trim();

      if (!nameStr || !locationStr) {
        console.error('Attempted to save business with missing name or location', { nameStr, locationStr });
        // Try to recover if we have an ID but empty details
        if ((isEditMode || isViewMode) && businessId) {
          await loadBusinessData(businessId);
          return; // Stop current save attempt and retry after reload
        }
      }

      const businessData = {
        name: businessDetails.name,
        location: businessDetails.location,
        locationData: businessDetails.locationData,
        type: businessDetails.type,
        description: businessDetails.description,
        basePrice: 100, // Default base price
        bookingType: businessDetails.type === 'restaurant' ? restaurantConfig.bookingType : eventConfig.bookingType,

        // Images - include File objects if present
        ...(businessDetails.thumbnail && { thumbnail: businessDetails.thumbnail }),
        ...(businessDetails.coverImage && { coverImage: businessDetails.coverImage }),

        // Layout data
        floorPlan: floorPlanData,
        seatingLayout: seatingLayoutData,

        // Restaurant specific
        ...(businessDetails.type === 'restaurant' || businessDetails.type === 'both') && {
          cuisine: restaurantConfig.cuisine,
          menu: restaurantConfig.menu.map(item => ({
            ...item,
            price: Number(item.price) || 0
          })),
          slotMode: restaurantConfig.slotMode,
          weeklySchedule: restaurantConfig.slotMode === 'weekly' ? restaurantConfig.weeklySchedule : undefined,
          dailySlots: restaurantConfig.slotMode === 'daily' ? restaurantConfig.dailySlots : undefined
        },

        // Event specific
        ...(businessDetails.type === 'event' || businessDetails.type === 'both') && {
          eventType: eventConfig.eventType,
          capacity: eventConfig.capacity,
          duration: eventConfig.duration,
          timeSlots: eventConfig.timeSlots,
          startDate: eventConfig.startDate ? new Date(eventConfig.startDate) : undefined,
          endDate: eventConfig.endDate ? new Date(eventConfig.endDate) : undefined
        },

        // Tier pricing defaults
        tierPricing: {
          standard: { price: 100, defaultCapacity: 50 },
          premium: { price: 200, defaultCapacity: 30 },
          vip: { price: 500, defaultCapacity: 20 }
        }
      };

      let result;
      if (businessId) {
        // Update existing business
        result = await businessApi.update(businessId, businessData);
        console.log('Business update result:', result);
      } else {
        // Create new business
        result = await businessApi.create(businessData);
        console.log('Business create result:', result);
        const newId = result.data?._id || result.data?.id || result._id || result.id;
        if (newId) setBusinessId(newId);
      }

      console.log('Business saved successfully', {
        id: businessId || (result.data?._id || result.data?.id || result._id || result.id),
        name: businessDetails.name
      });

      console.log('Business saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving business:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Validate business configuration
  const validateBusiness = async (): Promise<ValidationResult> => {
    if (!businessId) {
      return { isValid: false, errors: ['Business must be saved first'] };
    }

    try {
      setLoading(true);
      const result = await businessApi.validate(businessId);
      setValidation(result);
      return result;
    } catch (error) {
      console.error('Error validating business:', error);
      const fallbackValidation = performClientSideValidation();
      setValidation(fallbackValidation);
      return fallbackValidation;
    } finally {
      setLoading(false);
    }
  };

  // Client-side validation fallback
  const performClientSideValidation = (): ValidationResult => {
    const errors: string[] = [];

    // Basic validation
    if (!businessDetails.name.trim()) errors.push('Business name is required');
    if (!businessDetails.location.trim()) errors.push('Location is required');
    // Make thumbnail optional for now - can be uploaded later
    // if (!businessDetails.thumbnail) errors.push('Thumbnail image is required');

    // Restaurant validation
    if (businessDetails.type === 'restaurant' || businessDetails.type === 'both') {
      if (restaurantConfig.cuisine.length === 0) errors.push('At least one cuisine type is required');

      if (restaurantConfig.slotMode === 'weekly') {
        // Check if at least one day is open
        const hasOpenDays = Object.values(restaurantConfig.weeklySchedule).some(day => day.isOpen);
        if (!hasOpenDays) errors.push('Restaurant must be open at least one day per week');
      } else if (restaurantConfig.slotMode === 'daily') {
        // Check if at least one slot is available
        const hasActiveSlots = restaurantConfig.dailySlots.some(slot => slot.available);
        if (!hasActiveSlots) errors.push('At least one daily time slot must be active');
      }

      // Floor plan validation for seat-based restaurants
      if (restaurantConfig.bookingType === 'seat-based' && !floorPlanData) {
        errors.push('Floor plan is required for seat-based restaurants. Please design your floor plan in the Layout Design step.');
      }
    }

    // Event validation
    if (businessDetails.type === 'event' || businessDetails.type === 'both') {
      if (!eventConfig.eventType) errors.push('Event type is required');
      if (eventConfig.capacity <= 0) errors.push('Event capacity must be greater than 0');
      if (eventConfig.duration <= 0) errors.push('Event duration must be greater than 0');
      if (!eventConfig.startDate) errors.push('Event start date is required');
      if (!eventConfig.endDate) errors.push('Event end date is required');
      
      // Validate date range
      if (eventConfig.startDate && eventConfig.endDate) {
        const start = new Date(eventConfig.startDate);
        const end = new Date(eventConfig.endDate);
        if (end < start) {
          errors.push('Event end date cannot be before start date');
        }
      }
      
      if (eventConfig.timeSlots.length === 0) errors.push('At least one time slot is required for events');

      // Seating layout validation for seat-based events
      if (eventConfig.bookingType === 'seat-based' && !seatingLayoutData) {
        errors.push('Seating layout is required for seat-based events. Please design your seating layout in the Layout Design step.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Deploy business
  const deployBusiness = async () => {
    if (!businessId) {
      alert('Business must be saved first');
      return;
    }

    try {
      setLoading(true);
      const result = await businessApi.deploy(businessId);
      console.log('Business deployed successfully:', result);

      // Redirect to business dashboard
      window.location.href = '/business/dashboard';
    } catch (error) {
      console.error('Error deploying business:', error);
      alert('Failed to deploy business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Business Details
  const renderBusinessDetails = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Create Your Business</h2>
        <p className="text-slate-600">Let's start with the basic details of your restaurant or event</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Business Name *</label>
            <input
              type="text"
              value={businessDetails.name}
              onChange={isReadOnly ? undefined : (e) => setBusinessDetails(prev => ({ ...prev, name: e.target.value }))}
              readOnly={isReadOnly}
              className={`w-full px-4 py-3 border border-slate-300 rounded-lg ${isReadOnly
                ? 'bg-slate-50 cursor-not-allowed'
                : 'focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              placeholder="Enter your business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Location *</label>
            <BusinessLocationSelector
              onLocationSelect={(locationData) => {
                setBusinessDetails(prev => ({
                  ...prev,
                  location: `${locationData.city}, ${locationData.state}`,
                  locationData: locationData
                }));
              }}
              onInputChange={(value) => {
                setBusinessDetails(prev => ({
                  ...prev,
                  location: value
                }));
              }}
              initialLocation={businessDetails.location}
              initialLocationData={businessDetails.locationData}
              placeholder="Enter your business location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Business Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'restaurant', label: 'Restaurant', icon: Utensils },
                { value: 'event', label: 'Event', icon: Music },
                { value: 'both', label: 'Both', icon: Building2 }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={isReadOnly ? undefined : () => setBusinessDetails(prev => ({ ...prev, type: value as BusinessType }))}
                  disabled={isReadOnly}
                  className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${businessDetails.type === value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : isReadOnly
                      ? 'border-slate-300 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'border-slate-300 hover:border-slate-400'
                    }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={businessDetails.description}
              onChange={isReadOnly ? undefined : (e) => setBusinessDetails(prev => ({ ...prev, description: e.target.value }))}
              readOnly={isReadOnly}
              rows={4}
              className={`w-full px-4 py-3 border border-slate-300 rounded-lg ${isReadOnly
                ? 'bg-slate-50 cursor-not-allowed'
                : 'focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
              placeholder="Describe your business..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Thumbnail Image <span className="text-slate-500 text-xs">(Optional)</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-slate-400" />
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBusinessDetails(prev => ({
                    ...prev,
                    thumbnail: e.target.files?.[0] || null
                  }))}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className="cursor-pointer text-emerald-600 hover:text-emerald-500 font-medium"
                >
                  Upload thumbnail
                </label>
                <p className="text-slate-500 text-sm mt-1">PNG, JPG up to 10MB</p>
                <p className="text-slate-400 text-xs mt-1">You can upload this later if needed</p>
                {businessDetails.thumbnail && (
                  <p className="text-emerald-600 text-sm mt-1">
                    ✓ {typeof businessDetails.thumbnail === 'string'
                      ? businessDetails.thumbnail.split('/').pop()
                      : businessDetails.thumbnail.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2: Configuration
  const renderConfiguration = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Configure Your Business</h2>
        <p className="text-slate-600">Set up your menu, pricing, and booking preferences</p>
      </div>

      {(businessDetails.type === 'restaurant' || businessDetails.type === 'both') && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Utensils size={20} />
            Restaurant Configuration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cuisine Types</label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {cuisineOptions.map(cuisine => (
                  <button
                    key={cuisine}
                    onClick={() => {
                      setRestaurantConfig(prev => ({
                        ...prev,
                        cuisine: prev.cuisine.includes(cuisine)
                          ? prev.cuisine.filter(c => c !== cuisine)
                          : [...prev.cuisine, cuisine]
                      }));
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${restaurantConfig.cuisine.includes(cuisine)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 hover:border-slate-400'
                      }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">Menu Items</label>
                <button
                  type="button"
                  onClick={() => {
                    const newMenuItem = {
                      id: `menu-${Date.now()}`,
                      name: '',
                      price: 0,
                      category: 'Main Course',
                      description: '',
                      available: true
                    };
                    setRestaurantConfig(prev => ({
                      ...prev,
                      menu: [...prev.menu, newMenuItem]
                    }));
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={16} />
                  Add Menu Item
                </button>
              </div>

              {restaurantConfig.menu.length > 0 ? (
                <div className="space-y-3">
                  {restaurantConfig.menu.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            setRestaurantConfig(prev => {
                              const updatedMenu = [...prev.menu];
                              updatedMenu[index] = { ...item, name: newName };
                              return { ...prev, menu: updatedMenu };
                            });
                          }}
                          className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Item name"
                        />
                        <select
                          value={item.category}
                          onChange={(e) => {
                            const newCategory = e.target.value;
                            setRestaurantConfig(prev => {
                              const updatedMenu = [...prev.menu];
                              updatedMenu[index] = { ...item, category: newCategory };
                              return { ...prev, menu: updatedMenu };
                            });
                          }}
                          className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="Starters">Starters</option>
                          <option value="Main Course">Main Course</option>
                          <option value="Desserts">Desserts</option>
                          <option value="Beverages">Beverages</option>
                          <option value="Sides">Sides</option>
                          <option value="Breads">Breads</option>
                        </select>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRestaurantConfig(prev => {
                              const updatedMenu = [...prev.menu];
                              // Allow empty string to exist in state for better UX
                              const newPrice = val === '' ? '' : parseInt(val);
                              if (newPrice !== '' && isNaN(newPrice as number)) return prev;
                              updatedMenu[index] = { ...item, price: newPrice };
                              return { ...prev, menu: updatedMenu };
                            });
                          }}
                          className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Price (₹)"
                          min="0"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.available}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setRestaurantConfig(prev => {
                                const updatedMenu = [...prev.menu];
                                updatedMenu[index] = { ...item, available: isChecked };
                                return { ...prev, menu: updatedMenu };
                              });
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-slate-600">Available</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRestaurantConfig(prev => ({
                            ...prev,
                            menu: prev.menu.filter((_, i) => i !== index)
                          }));
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove item"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-slate-200">
                  <ChefHat className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p>No menu items added yet</p>
                  <p className="text-sm">Add menu items to showcase your offerings</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Booking Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRestaurantConfig(prev => ({ ...prev, bookingType: 'seat-based' }))}
                  className={`p-4 border rounded-lg text-left transition-colors ${restaurantConfig.bookingType === 'seat-based'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-300 hover:border-slate-400'
                    }`}
                >
                  <div className="font-medium text-slate-800">Seat-Based</div>
                  <div className="text-sm text-slate-600 mt-1">Customers choose specific tables/seats with time slots</div>
                </button>
                <button
                  onClick={() => setRestaurantConfig(prev => ({ ...prev, bookingType: 'slot-based' }))}
                  className={`p-4 border rounded-lg text-left transition-colors ${restaurantConfig.bookingType === 'slot-based'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-300 hover:border-slate-400'
                    }`}
                >
                  <div className="font-medium text-slate-800">Slot-Based</div>
                  <div className="text-sm text-slate-600 mt-1">Customers book time slots only (no specific tables)</div>
                </button>
              </div>
            </div>

            {/* Time Slot Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Time Slot Configuration</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRestaurantConfig(prev => ({ ...prev, slotMode: 'weekly' }))}
                  className={`p-4 border rounded-lg text-left transition-colors ${restaurantConfig.slotMode === 'weekly'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-300 hover:border-slate-400'
                    }`}
                >
                  <div className="font-medium text-slate-800">Weekly Schedule</div>
                  <div className="text-sm text-slate-600 mt-1">Different hours for each day of the week</div>
                </button>
                <button
                  onClick={() => setRestaurantConfig(prev => ({ ...prev, slotMode: 'daily' }))}
                  className={`p-4 border rounded-lg text-left transition-colors ${restaurantConfig.slotMode === 'daily'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-300 hover:border-slate-400'
                    }`}
                >
                  <div className="font-medium text-slate-800">Daily Time Slots</div>
                  <div className="text-sm text-slate-600 mt-1">Morning, Afternoon, Evening, Night slots</div>
                </button>
              </div>
            </div>

            {/* Restaurant Weekly Schedule Configuration */}
            {restaurantConfig.slotMode === 'weekly' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">Weekly Operating Hours</label>
                  <button
                    type="button"
                    onClick={() => {
                      // Copy Monday's schedule to all days
                      const mondaySchedule = restaurantConfig.weeklySchedule.monday;
                      const newSchedule = { ...restaurantConfig.weeklySchedule };
                      Object.keys(newSchedule).forEach(day => {
                        if (day !== 'monday') {
                          newSchedule[day] = { ...mondaySchedule };
                        }
                      });
                      setRestaurantConfig(prev => ({ ...prev, weeklySchedule: newSchedule }));
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    Copy Monday to All
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(restaurantConfig.weeklySchedule).map(([day, schedule]) => (
                    <div key={day}>
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="w-24">
                          <span className="font-medium text-slate-800 capitalize">{day}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={schedule.isOpen}
                            onChange={(e) => {
                              const newSchedule = { ...restaurantConfig.weeklySchedule };
                              newSchedule[day] = { ...schedule, isOpen: e.target.checked };
                              setRestaurantConfig(prev => ({ ...prev, weeklySchedule: newSchedule }));
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-slate-600">Open</span>
                        </div>

                        {schedule.isOpen && (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={schedule.openTime}
                                onChange={(e) => {
                                  const newSchedule = { ...restaurantConfig.weeklySchedule };
                                  newSchedule[day] = { ...schedule, openTime: e.target.value };
                                  setRestaurantConfig(prev => ({ ...prev, weeklySchedule: newSchedule }));
                                }}
                                className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                              <span className="text-slate-500">to</span>
                              <input
                                type="time"
                                value={schedule.closeTime}
                                onChange={(e) => {
                                  const newSchedule = { ...restaurantConfig.weeklySchedule };
                                  newSchedule[day] = { ...schedule, closeTime: e.target.value };
                                  setRestaurantConfig(prev => ({ ...prev, weeklySchedule: newSchedule }));
                                }}
                                className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const newSchedule = { ...restaurantConfig.weeklySchedule };
                                if (!newSchedule[day].breaks) {
                                  newSchedule[day] = {
                                    ...newSchedule[day],
                                    breaks: [{ startTime: '15:00', endTime: '17:00', name: 'Afternoon Break' }]
                                  };
                                } else {
                                  newSchedule[day] = { ...newSchedule[day], breaks: [] };
                                }
                                setRestaurantConfig(prev => ({ ...prev, weeklySchedule: newSchedule }));
                              }}
                              className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
                            >
                              {schedule.breaks?.length ? 'Remove Break' : 'Add Break'}
                            </button>
                          </>
                        )}

                        {!schedule.isOpen && (
                          <span className="text-sm text-slate-500 italic">Closed</span>
                        )}
                      </div>

                      {/* Break times */}
                      {schedule.isOpen && schedule.breaks?.map((breakTime, breakIndex) => (
                        <div key={breakIndex} className="ml-28 flex items-center gap-2 p-2 bg-orange-50 rounded border-l-2 border-orange-200">
                          <span className="text-xs text-orange-700 font-medium">Break:</span>
                          <input
                            type="text"
                            value={breakTime.name}
                            onChange={(e) => {
                              const newSchedule = { ...restaurantConfig.weeklySchedule };
                              const newBreaks = [...(newSchedule[day].breaks || [])];
                              newBreaks[breakIndex] = { ...breakTime, name: e.target.value };
                              newSchedule[day] = { ...newSchedule[day], breaks: newBreaks };
                              setRestaurantConfig(prev => ({ ...prev, weeklySchedule: newSchedule }));
                            }}
                            className="px-2 py-1 text-xs border border-orange-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Break name"
                          />
                          <input
                            type="time"
                            value={breakTime.startTime}
                            onChange={(e) => {
                              const newSchedule = { ...restaurantConfig.weeklySchedule };
                              const newBreaks = [...(newSchedule[day].breaks || [])];
                              newBreaks[breakIndex] = { ...breakTime, startTime: e.target.value };
                              newSchedule[day] = { ...newSchedule[day], breaks: newBreaks };
                              setRestaurantConfig(prev => ({ ...prev, weeklySchedule: newSchedule }));
                            }}
                            className="px-2 py-1 text-xs border border-orange-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                          />
                          <span className="text-xs text-orange-600">to</span>
                          <input
                            type="time"
                            value={breakTime.endTime}
                            onChange={(e) => {
                              const newSchedule = { ...restaurantConfig.weeklySchedule };
                              const newBreaks = [...(newSchedule[day].breaks || [])];
                              newBreaks[breakIndex] = { ...breakTime, endTime: e.target.value };
                              newSchedule[day] = { ...newSchedule[day], breaks: newBreaks };
                              setRestaurantConfig(prev => ({ ...prev, weeklySchedule: newSchedule }));
                            }}
                            className="px-2 py-1 text-xs border border-orange-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                    <div className="text-blue-700 text-sm">
                      <p className="font-medium">Weekly Operating Hours:</p>
                      <ul className="mt-1 space-y-1">
                        <li>• Set different hours for each day of the week</li>
                        <li>• Add breaks for lunch/afternoon closures</li>
                        <li>• Use 24-hour format (00:00 for midnight)</li>
                        <li>• Customers can only book during open hours</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Restaurant Daily Slots Configuration */}
            {restaurantConfig.slotMode === 'daily' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">Daily Time Slots</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newSlot: DaySlot = {
                        id: `custom-${Date.now()}`,
                        name: 'Custom Slot',
                        startTime: '10:00',
                        endTime: '14:00',
                        type: 'afternoon',
                        maxCapacity: 50,
                        available: true
                      };
                      setRestaurantConfig(prev => ({
                        ...prev,
                        dailySlots: [...prev.dailySlots, newSlot]
                      }));
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus size={16} />
                    Add Custom Slot
                  </button>
                </div>

                <div className="space-y-3">
                  {restaurantConfig.dailySlots.map((slot, index) => (
                    <div key={slot.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={slot.name}
                          onChange={(e) => {
                            const updatedSlots = [...restaurantConfig.dailySlots];
                            updatedSlots[index] = { ...slot, name: e.target.value };
                            setRestaurantConfig(prev => ({ ...prev, dailySlots: updatedSlots }));
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Slot name"
                        />
                      </div>

                      <div className="w-32">
                        <select
                          value={slot.type}
                          onChange={(e) => {
                            const updatedSlots = [...restaurantConfig.dailySlots];
                            updatedSlots[index] = { ...slot, type: e.target.value as 'morning' | 'afternoon' | 'evening' | 'night' };
                            setRestaurantConfig(prev => ({ ...prev, dailySlots: updatedSlots }));
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                          <option value="evening">Evening</option>
                          <option value="night">Night</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => {
                            const updatedSlots = [...restaurantConfig.dailySlots];
                            updatedSlots[index] = { ...slot, startTime: e.target.value };
                            setRestaurantConfig(prev => ({ ...prev, dailySlots: updatedSlots }));
                          }}
                          className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => {
                            const updatedSlots = [...restaurantConfig.dailySlots];
                            updatedSlots[index] = { ...slot, endTime: e.target.value };
                            setRestaurantConfig(prev => ({ ...prev, dailySlots: updatedSlots }));
                          }}
                          className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          value={slot.maxCapacity}
                          onChange={(e) => {
                            const updatedSlots = [...restaurantConfig.dailySlots];
                            updatedSlots[index] = { ...slot, maxCapacity: parseInt(e.target.value) || 0 };
                            setRestaurantConfig(prev => ({ ...prev, dailySlots: updatedSlots }));
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Capacity"
                          min="1"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={slot.available}
                          onChange={(e) => {
                            const updatedSlots = [...restaurantConfig.dailySlots];
                            updatedSlots[index] = { ...slot, available: e.target.checked };
                            setRestaurantConfig(prev => ({ ...prev, dailySlots: updatedSlots }));
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-slate-600">Active</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updatedSlots = restaurantConfig.dailySlots.filter((_, i) => i !== index);
                          setRestaurantConfig(prev => ({ ...prev, dailySlots: updatedSlots }));
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove slot"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                    <div className="text-blue-700 text-sm">
                      <p className="font-medium">Daily Time Slots:</p>
                      <ul className="mt-1 space-y-1">
                        <li>• <strong>Morning:</strong> Typically 8:00 AM - 12:00 PM</li>
                        <li>• <strong>Afternoon:</strong> Typically 12:00 PM - 5:00 PM</li>
                        <li>• <strong>Evening:</strong> Typically 5:00 PM - 9:00 PM</li>
                        <li>• <strong>Night:</strong> Typically 9:00 PM - 1:00 AM</li>
                        <li>• Same slots apply to all days of the week</li>
                        <li>• Customers book specific time slots</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(businessDetails.type === 'event' || businessDetails.type === 'both') && (
        <div className="bg-slate-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Music size={20} />
            Event Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Event Type</label>
              <select
                value={eventConfig.eventType}
                onChange={(e) => setEventConfig(prev => ({ ...prev, eventType: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select event type</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Expected Capacity</label>
              <input
                type="number"
                value={eventConfig.capacity || ''}
                onChange={(e) => setEventConfig(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter expected capacity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date *</label>
              <input
                type="date"
                value={eventConfig.startDate || ''}
                onChange={(e) => setEventConfig(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date *</label>
              <input
                type="date"
                value={eventConfig.endDate || ''}
                onChange={(e) => setEventConfig(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                min={eventConfig.startDate || new Date().toISOString().split('T')[0]}
              />
              {eventConfig.startDate && eventConfig.endDate && (
                <p className="text-xs text-emerald-600 mt-1">
                  {(() => {
                    const start = new Date(eventConfig.startDate);
                    const end = new Date(eventConfig.endDate);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return days === 1 ? 'Single-day event' : `${days}-day event`;
                  })()}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Duration (hours)</label>
              <input
                type="number"
                value={eventConfig.duration || ''}
                onChange={(e) => setEventConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Event duration"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Booking Type</label>
              <select
                value={eventConfig.bookingType}
                onChange={(e) => setEventConfig(prev => ({ ...prev, bookingType: e.target.value as BookingType }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="seat-based">Seat-Based (Choose specific seats with time slots)</option>
                <option value="slot-based">Slot-Based (Registration only with time slots)</option>
              </select>
            </div>
          </div>

          {/* Event Time Slots Configuration */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-slate-700">Event Time Slots</label>
              <button
                type="button"
                onClick={() => {
                  const newSlot: TimeSlot = {
                    id: `slot-${Date.now()}`,
                    name: `Show ${eventConfig.timeSlots.length + 1}`,
                    startTime: '19:00',
                    endTime: '21:00',
                    type: 'event',
                    available: true,
                    maxCapacity: eventConfig.capacity || 100
                  };
                  setEventConfig(prev => ({
                    ...prev,
                    timeSlots: [...prev.timeSlots, newSlot]
                  }));
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus size={16} />
                Add Time Slot
              </button>
            </div>

            <div className="space-y-3">
              {eventConfig.timeSlots.map((slot, index) => (
                <div key={slot.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={slot.name}
                      onChange={(e) => {
                        const updatedSlots = [...eventConfig.timeSlots];
                        updatedSlots[index] = { ...slot, name: e.target.value };
                        setEventConfig(prev => ({ ...prev, timeSlots: updatedSlots }));
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Show name"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => {
                        const updatedSlots = [...eventConfig.timeSlots];
                        updatedSlots[index] = { ...slot, startTime: e.target.value };
                        setEventConfig(prev => ({ ...prev, timeSlots: updatedSlots }));
                      }}
                      className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span className="text-slate-500">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => {
                        const updatedSlots = [...eventConfig.timeSlots];
                        updatedSlots[index] = { ...slot, endTime: e.target.value };
                        setEventConfig(prev => ({ ...prev, timeSlots: updatedSlots }));
                      }}
                      className="px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={slot.maxCapacity}
                      onChange={(e) => {
                        const updatedSlots = [...eventConfig.timeSlots];
                        updatedSlots[index] = { ...slot, maxCapacity: parseInt(e.target.value) || 0 };
                        setEventConfig(prev => ({ ...prev, timeSlots: updatedSlots }));
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Capacity"
                      min="1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedSlots = eventConfig.timeSlots.filter((_, i) => i !== index);
                      setEventConfig(prev => ({ ...prev, timeSlots: updatedSlots }));
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove time slot"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {eventConfig.timeSlots.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p>No time slots configured</p>
                  <p className="text-sm">Add time slots for your event shows/sessions</p>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                <div className="text-blue-700 text-sm">
                  <p className="font-medium">Time Slots for Events:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• <strong>Seat-based:</strong> Customers choose specific seats for a particular show time</li>
                    <li>• <strong>Slot-based:</strong> Customers register for a time slot without choosing specific seats</li>
                    <li>• Each time slot can have different capacity limits</li>
                    <li>• Multiple shows per day are supported</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 3: Layout Design
  const renderLayoutDesign = () => {
    if (activeDesigner === 'floor') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Floor Plan Designer</h2>
            <button
              onClick={() => setActiveDesigner(null)}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Back to Layout Options
            </button>
          </div>
          <div className="h-[600px] rounded-lg overflow-hidden border border-slate-200">
            <FloorPlanDesigner
              businessId={businessId || undefined}
              onSave={(floorPlan) => {
                setFloorPlanData(floorPlan);
                console.log('Floor plan saved:', floorPlan);
              }}
            />
          </div>
        </div>
      );
    }

    if (activeDesigner === 'seating') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Event Seating Designer</h2>
            <button
              onClick={() => setActiveDesigner(null)}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Back to Layout Options
            </button>
          </div>
          <div className="h-[600px] rounded-lg overflow-hidden border border-slate-200">
            <EventSeatingDesigner
              businessId={businessId || undefined}
              initialData={seatingLayoutData}
              onSave={(seatingLayout) => {
                setSeatingLayoutData(seatingLayout);
                console.log('Seating layout saved:', seatingLayout);
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Design Your Layout</h2>
          <p className="text-slate-600">Create your seating arrangement and pricing structure</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(businessDetails.type === 'restaurant' || businessDetails.type === 'both') && (
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Utensils size={20} />
                Restaurant Layout
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-2">Layout Designer</div>
                  <button
                    onClick={() => setActiveDesigner('floor')}
                    className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin size={16} />
                    Open Floor Plan Designer
                  </button>
                  {floorPlanData && (
                    <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Floor plan saved ({floorPlanData.floors?.length || 0} floors, {floorPlanData.metadata?.totalTables || 0} tables)
                    </div>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  • Design multiple floors<br />
                  • Place tables and chairs<br />
                  • Add features (entrance, bar, etc.)<br />
                  • Rotate and customize elements
                </div>
              </div>
            </div>
          )}

          {(businessDetails.type === 'event' || businessDetails.type === 'both') && (
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Music size={20} />
                Event Layout
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-2">Seating Designer</div>
                  <button
                    onClick={() => setActiveDesigner('seating')}
                    className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users size={16} />
                    Open Event Seating Designer
                  </button>
                  {seatingLayoutData && (
                    <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Seating layout saved ({
                        seatingLayoutData.sections?.length || 
                        seatingLayoutData.eventConfig?.seatingLayout?.sections?.length || 
                        seatingLayoutData.eventConfig?.concertAreas?.length ||
                        0
                      } sections)
                    </div>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  • Row-based seating<br />
                  • Individual seat placement<br />
                  • Registration areas<br />
                  • Tier-based pricing
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div>
              <div className="font-medium text-blue-800">Layout Design Tips</div>
              <div className="text-blue-700 text-sm mt-1">
                • Use the layout designers to create your seating arrangements<br />
                • Set custom prices for different zones and seat types<br />
                • Add features like entrances, windows, and reception areas<br />
                • Rotate elements to fit your space perfectly<br />
                • Save your designs before proceeding to validation
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 4: Validation
  const renderValidation = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Validation & Review</h2>
          <p className="text-slate-600">Let's make sure everything is set up correctly</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Business Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-medium">{businessDetails.name || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Location:</span>
                  <div className="text-right">
                    <span className="font-medium">{businessDetails.location || 'Not set'}</span>
                    {businessDetails.locationData && (
                      <div className="text-xs text-slate-500 mt-1">
                        PIN: {businessDetails.locationData.pincode || 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Type:</span>
                  <span className="font-medium capitalize">{businessDetails.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Thumbnail:</span>
                  <span className={`font-medium ${businessDetails.thumbnail ? 'text-green-600' : 'text-red-600'}`}>
                    {businessDetails.thumbnail ? 'Uploaded' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>

            {(businessDetails.type === 'restaurant' || businessDetails.type === 'both') && (
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Restaurant Config</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cuisines:</span>
                    <span className="font-medium">{restaurantConfig.cuisine.length} selected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Booking Type:</span>
                    <span className="font-medium capitalize">{restaurantConfig.bookingType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Slot Mode:</span>
                    <span className="font-medium capitalize">{restaurantConfig.slotMode}</span>
                  </div>

                  {restaurantConfig.slotMode === 'weekly' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Operating Days:</span>
                        <span className="font-medium">
                          {Object.values(restaurantConfig.weeklySchedule).filter(day => day.isOpen).length} days/week
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        <div className="font-medium mb-1">Weekly Schedule:</div>
                        {Object.entries(restaurantConfig.weeklySchedule).map(([day, schedule]) => (
                          <div key={day} className="flex justify-between">
                            <span className="capitalize">{day}:</span>
                            <span>
                              {schedule.isOpen
                                ? `${schedule.openTime} - ${schedule.closeTime}${schedule.breaks?.length ? ' (with breaks)' : ''}`
                                : 'Closed'
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {restaurantConfig.slotMode === 'daily' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Daily Slots:</span>
                        <span className="font-medium">
                          {restaurantConfig.dailySlots.filter(slot => slot.available).length} active
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        <div className="font-medium mb-1">Time Slots:</div>
                        {restaurantConfig.dailySlots.filter(slot => slot.available).map(slot => (
                          <div key={slot.id} className="flex justify-between">
                            <span>{slot.name}:</span>
                            <span>{slot.startTime} - {slot.endTime} ({slot.maxCapacity} capacity)</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {(businessDetails.type === 'event' || businessDetails.type === 'both') && (
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Event Config</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Type:</span>
                    <span className="font-medium">{eventConfig.eventType || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Capacity:</span>
                    <span className="font-medium">{eventConfig.capacity || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Duration:</span>
                    <span className="font-medium">{eventConfig.duration || 0} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Booking Type:</span>
                    <span className="font-medium capitalize">{eventConfig.bookingType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Time Slots:</span>
                    <span className="font-medium">{eventConfig.timeSlots.length} configured</span>
                  </div>
                  {eventConfig.timeSlots.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      {eventConfig.timeSlots.map(slot => (
                        <div key={slot.id}>
                          {slot.name}: {slot.startTime} - {slot.endTime} ({slot.maxCapacity} capacity)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={`rounded-lg p-6 ${validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className={`font-semibold mb-4 ${validation.isValid ? 'text-green-800' : 'text-red-800'}`}>
                Validation Status
              </h3>
              {validation.isValid ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle size={20} />
                  <span>All requirements met! Ready to deploy.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-red-700 font-medium mb-2">
                    Please fix the following issues to proceed:
                  </div>
                  {validation.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 text-red-700 bg-red-100 p-3 rounded-lg">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium">{error}</div>
                        {error.includes('Floor plan is required') && (
                          <div className="text-xs text-red-600 mt-1">
                            Go back to Step 3 (Layout Design) and use the Floor Plan Designer to create your restaurant layout.
                          </div>
                        )}
                        {error.includes('Seating layout is required') && (
                          <div className="text-xs text-red-600 mt-1">
                            Go back to Step 3 (Layout Design) and use the Event Seating Designer to create your event seating arrangement.
                          </div>
                        )}
                        {error.includes('cuisine type') && (
                          <div className="text-xs text-red-600 mt-1">
                            Go back to Step 2 (Configuration) and select at least one cuisine type for your restaurant.
                          </div>
                        )}
                        {error.includes('time slot') && (
                          <div className="text-xs text-red-600 mt-1">
                            Go back to Step 2 (Configuration) and configure your restaurant's operating hours or time slots.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                      <div className="text-blue-700 text-sm">
                        <div className="font-medium">Quick Tips:</div>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• Thumbnail image is optional and can be uploaded later</li>
                          <li>• Use the "Previous" button to go back and fix any issues</li>
                          <li>• All changes are automatically saved as you progress</li>
                          <li>• Layout designs are required only for seat-based booking types</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={async () => {
                    await saveBusiness();
                    await validateBusiness();
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Validating...' : 'Re-validate'}
                </button>

                {!validation.isValid && (
                  <button
                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Go Back to Fix Issues
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 5: Deploy
  const renderDeploy = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isEditMode ? 'Update Your Business' : 'Deploy Your Business'}
        </h2>
        <p className="text-slate-600">
          {isEditMode
            ? 'Your business updates are ready to be saved!'
            : 'Your business is ready to go live on DineInGo!'
          }
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            {isEditMode ? 'Ready to Update!' : 'Ready to Deploy!'}
          </h3>
          <p className="text-green-700 text-sm mb-6">
            {isEditMode
              ? 'Your business configuration updates are complete and validated. Click update to save changes.'
              : 'Your business configuration is complete and validated. Click deploy to make it live.'
            }
          </p>
          <button
            onClick={deployBusiness}
            disabled={loading}
            className="w-full py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? (isEditMode ? 'Updating...' : 'Deploying...') : (isEditMode ? 'Update Business' : 'Deploy Business')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderBusinessDetails();
      case 2: return renderConfiguration();
      case 3: return renderLayoutDesign();
      case 4: return renderValidation();
      case 5: return renderDeploy();
      default: return renderBusinessDetails();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return businessDetails.name.trim() && businessDetails.location.trim();
      case 2:
        if (businessDetails.type === 'restaurant' || businessDetails.type === 'both') {
          if (restaurantConfig.cuisine.length === 0) return false;

          if (restaurantConfig.slotMode === 'weekly') {
            const hasOpenDays = Object.values(restaurantConfig.weeklySchedule).some(day => day.isOpen);
            if (!hasOpenDays) return false;
          } else if (restaurantConfig.slotMode === 'daily') {
            const hasActiveSlots = restaurantConfig.dailySlots.some(slot => slot.available);
            if (!hasActiveSlots) return false;
          }
        }
        if (businessDetails.type === 'event' || businessDetails.type === 'both') {
          if (!eventConfig.eventType || eventConfig.capacity <= 0) return false;
          if (eventConfig.timeSlots.length === 0) return false;
        }
        return true;
      case 3:
        return true; // Layout design is optional for now
      case 4:
        return validation.isValid;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 || currentStep === 2) {
      // Save business data when moving from step 1 or 2
      try {
        await saveBusiness();
      } catch (error) {
        alert('Failed to save business data. Please try again.');
        return;
      }
    }

    if (currentStep === 3) {
      // Save business data and validate when moving to step 4
      try {
        await saveBusiness();
        setCurrentStep(4);
        // Automatically run validation when reaching step 4
        setTimeout(async () => {
          await validateBusiness();
        }, 500);
        return;
      } catch (error) {
        alert('Failed to save business data. Please try again.');
        return;
      }
    }

    if (currentStep === 4) {
      // Validate before moving to deploy step
      const validationResult = await validateBusiness();
      if (!validationResult.isValid) {
        return; // Don't proceed if validation fails
      }
    }

    setCurrentStep(prev => Math.min(5, prev + 1));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {isViewMode ? 'View Business' : isEditMode ? 'Edit Business' : 'Create Your Business'}
          </h1>
          <p className="text-slate-600">
            {isViewMode
              ? 'View your business details and configuration'
              : isEditMode
                ? 'Update your business details and configuration'
                : 'Set up your restaurant or event business on DineInGo'
            }
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-4 mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                    : isActive
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg'
                      : 'border-slate-300 text-slate-400 bg-white'
                    }`}>
                    {isCompleted ? <CheckCircle size={24} /> : <Icon size={24} />}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <div className={`text-sm font-semibold ${isActive ? 'text-emerald-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                      Step {step.id}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-emerald-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-6 transition-colors duration-300 ${isCompleted ? 'bg-emerald-600' : 'bg-slate-300'
                      }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-8 md:p-12">
              {renderCurrentStep()}
            </div>
          </div>

          {/* Navigation */}
          {!isViewMode && (
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-white shadow-sm"
              >
                <ArrowLeft size={18} />
                Previous
              </button>

              <button
                onClick={handleNext}
                disabled={currentStep === 5 || !canProceed() || loading}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {currentStep === 5 ? 'Complete' : 'Next Step'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* View Mode Navigation */}
          {isViewMode && (
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-white shadow-sm"
              >
                <ArrowLeft size={18} />
                Previous
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => window.location.href = '/business/dashboard'}
                  className="flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-all duration-200 bg-white shadow-sm"
                >
                  Back to Dashboard
                </button>

                <button
                  onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                  disabled={currentStep === 5}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm font-medium"
                >
                  Next
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessOnboarding;