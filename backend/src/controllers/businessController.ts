import { Request, Response } from 'express';
import { Business, IBusiness } from '../models/Business';
import { Booking } from '../models/Booking';
import mongoose from 'mongoose';
import { uploadCloud as upload } from '../config/cloudinary';
import path from 'path';
import fs from 'fs';

// Helper function to get full image URL
const getImageUrl = (imagePath: string | undefined, req: Request): string => {
  if (!imagePath) return '/images/placeholder-food.svg';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  if (imagePath.startsWith('/images/')) {
    return imagePath;
  }
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${imagePath}`;
};

// Default menu items for businesses without menus
const getDefaultMenuItems = (cuisines: string[]) => {
  const defaultItems = [
    {
      id: 'default-1',
      name: 'House Special',
      description: 'Our signature dish prepared with fresh ingredients',
      price: 350,
      category: 'Main Course',
      image: '/images/placeholder-food.svg',
      isVegetarian: false,
      isSpicy: false,
      isPopular: true
    },
    {
      id: 'default-2',
      name: 'Vegetarian Delight',
      description: 'A delicious vegetarian option made with seasonal vegetables',
      price: 280,
      category: 'Main Course',
      image: '/images/placeholder-food.svg',
      isVegetarian: true,
      isSpicy: false,
      isPopular: true
    },
    {
      id: 'default-3',
      name: 'Appetizer Platter',
      description: 'A selection of our finest appetizers',
      price: 200,
      category: 'Starters',
      image: '/images/placeholder-food.svg',
      isVegetarian: false,
      isSpicy: false,
      isPopular: false
    },
    {
      id: 'default-4',
      name: 'Fresh Salad',
      description: 'Crisp greens with our house dressing',
      price: 150,
      category: 'Salads',
      image: '/images/placeholder-food.svg',
      isVegetarian: true,
      isSpicy: false,
      isPopular: false
    },
    {
      id: 'default-5',
      name: 'Dessert Special',
      description: 'Sweet ending to your meal',
      price: 120,
      category: 'Desserts',
      image: '/images/placeholder-food.svg',
      isVegetarian: true,
      isSpicy: false,
      isPopular: false
    },
    {
      id: 'default-6',
      name: 'Refreshing Beverage',
      description: 'Cool and refreshing drink',
      price: 80,
      category: 'Beverages',
      image: '/images/placeholder-food.svg',
      isVegetarian: true,
      isSpicy: false,
      isPopular: false
    }
  ];

  // Customize based on cuisine
  if (cuisines.includes('Indian') || cuisines.includes('North Indian')) {
    defaultItems[0].name = 'Butter Chicken';
    defaultItems[0].description = 'Tender chicken in a rich, creamy tomato-based curry';
    defaultItems[1].name = 'Paneer Tikka';
    defaultItems[1].description = 'Grilled cottage cheese marinated in spices';
    defaultItems[3].name = 'Tandoori Roti';
    defaultItems[3].description = 'Whole wheat bread baked in tandoor';
    defaultItems[3].category = 'Breads';
    defaultItems[3].price = 40;
  } else if (cuisines.includes('Italian')) {
    defaultItems[0].name = 'Margherita Pizza';
    defaultItems[0].description = 'Classic pizza with tomato sauce and mozzarella';
    defaultItems[1].name = 'Pasta Alfredo';
    defaultItems[1].description = 'Creamy pasta with parmesan sauce';
  } else if (cuisines.includes('Chinese')) {
    defaultItems[0].name = 'Kung Pao Chicken';
    defaultItems[0].description = 'Spicy stir-fried chicken with peanuts';
    defaultItems[1].name = 'Vegetable Fried Rice';
    defaultItems[1].description = 'Wok-fried rice with mixed vegetables';
  }

  return defaultItems;
};

// Unified business transformation helper
const transformBusinessData = (business: any, req: Request): any => {
  const isRestaurant = business.type === 'restaurant' || business.type === 'both';

  // Base transformation
  const transformed: any = {
    id: business._id.toString(),
    name: business.name,
    type: business.type,
    description: business.description,
    status: business.status,
    ownerId: business.ownerId,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,

    // Location handling
    locationData: business.locationData,
    location: business.location, // The string
    address: typeof business.locationData?.address === 'string'
      ? business.locationData.address
      : typeof business.location === 'string'
        ? business.location
        : business.locationData?.city && business.locationData?.state
          ? `${business.locationData.city}, ${business.locationData.state}`
          : 'Address not available',

    // Images
    image: getImageUrl(business.thumbnail || business.coverImage, req),
    thumbnail: getImageUrl(business.thumbnail, req),
    coverImage: getImageUrl(business.coverImage, req),

    // Pricing
    basePrice: business.basePrice || 100,
    normalCost: business.normalCost !== undefined ? business.normalCost : (business.basePrice || 25.00),
    peakTimeCost: business.peakTimeCost !== undefined ? business.peakTimeCost : 50.00,
    priceLevel: Math.ceil((business.basePrice || 100) / 100),
    tierPricing: business.tierPricing,

    // Content
    cuisine: business.cuisine || [],
    menu: (business.menu && business.menu.length > 0) ? business.menu.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || `Delicious ${item.name}`,
      price: item.price,
      category: item.category,
      image: item.image || '/images/placeholder-food.svg',
      isVegetarian: item.isVegetarian || false,
      isSpicy: item.isSpicy || false,
      isPopular: item.isPopular || false
    })) : [],

    // Capacity & Booking
    capacity: business.capacity || 0,
    bookingType: business.bookingType,

    // Configurations
    slotMode: business.slotMode,
    weeklySchedule: business.weeklySchedule,
    dailySlots: business.dailySlots,

    // Event specific
    eventType: business.eventType,
    duration: business.duration,

    // Layout
    floorPlan: business.floorPlan,
    seatingLayout: business.seatingLayout,

    // Stats
    rating: business.rating || 4.0,
    sentimentScore: business.sentimentScore !== undefined ? business.sentimentScore : 0,
    sentimentRating: business.sentimentRating !== undefined ? business.sentimentRating : 4.0,
    totalBookings: business.totalBookings || 0,
    revenue: business.revenue || 0,
    utilizationRate: business.utilizationRate || 0
  };

  // Derive timeSlots for Restaurants if not explicitly provided
  if (isRestaurant) {
    if (business.dailySlots && business.dailySlots.length > 0) {
      transformed.timeSlots = business.dailySlots.map((slot: any) => ({
        id: slot.id,
        name: slot.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: slot.type === 'morning' || slot.type === 'afternoon' ? 'lunch' : 'dinner',
        available: slot.available,
        maxCapacity: slot.maxCapacity
      }));
    } else if (business.weeklySchedule) {
      // Create a single slot based on today's operating hours if available
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = days[new Date().getDay()];
      const todaySchedule = business.weeklySchedule[today];

      if (todaySchedule && todaySchedule.isOpen) {
        transformed.timeSlots = [{
          id: `weekly-today`,
          name: 'Regular Hours',
          startTime: todaySchedule.openTime,
          endTime: todaySchedule.closeTime,
          type: 'lunch', // Default
          available: true,
          maxCapacity: business.capacity || 50
        }];
      } else {
        transformed.timeSlots = business.timeSlots || [];
      }
    } else {
      transformed.timeSlots = business.timeSlots || [];
    }
  } else {
    // Events use their timeSlots directly
    transformed.timeSlots = business.timeSlots || [];
  }

  // Compatibility mapping for Dashboard (location key as object)
  transformed.displayLocation = transformed.location; // Keep string as displayLocation
  transformed.location = business.locationData || {
    city: typeof business.location === 'string' ? business.location.split(',')[0]?.trim() || 'Unknown' : 'Unknown',
    state: typeof business.location === 'string' ? business.location.split(',')[1]?.trim() || 'Unknown' : 'Unknown',
    country: 'India',
    latitude: business.locationData?.latitude,
    longitude: business.locationData?.longitude
  };

  return transformed;
};

// Default time slots for businesses without time slots
const getDefaultTimeSlots = () => {
  return [
    // Lunch slots
    { id: 'lunch-1', name: '11:30 AM', startTime: '11:30', endTime: '12:30', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-2', name: '12:00 PM', startTime: '12:00', endTime: '13:00', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-3', name: '12:30 PM', startTime: '12:30', endTime: '13:30', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-4', name: '1:00 PM', startTime: '13:00', endTime: '14:00', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-5', name: '1:30 PM', startTime: '13:30', endTime: '14:30', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-6', name: '2:00 PM', startTime: '14:00', endTime: '15:00', type: 'lunch', available: true, maxCapacity: 50 },

    // Dinner slots
    { id: 'dinner-1', name: '6:00 PM', startTime: '18:00', endTime: '19:00', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-2', name: '6:30 PM', startTime: '18:30', endTime: '19:30', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-3', name: '7:00 PM', startTime: '19:00', endTime: '20:00', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-4', name: '7:30 PM', startTime: '19:30', endTime: '20:30', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-5', name: '8:00 PM', startTime: '20:00', endTime: '21:00', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-6', name: '8:30 PM', startTime: '20:30', endTime: '21:30', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-7', name: '9:00 PM', startTime: '21:00', endTime: '22:00', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-8', name: '9:30 PM', startTime: '21:30', endTime: '22:30', type: 'dinner', available: true, maxCapacity: 50 }
  ];
};

// Export the Cloudinary upload middleware directly
export { upload };

// Get all active businesses (for public dashboard)
export const getAllBusinesses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, location, cuisine, sortBy } = req.query;

    const query: any = {
      status: 'active' // Only show active/deployed businesses
    };

    // Filter by business type if specified
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by location if specified
    if (location) {
      query.$or = [
        { 'location': { $regex: location, $options: 'i' } },
        { 'locationData.city': { $regex: location, $options: 'i' } },
        { 'locationData.state': { $regex: location, $options: 'i' } }
      ];
    }

    // Filter by cuisine for restaurants
    if (cuisine && (type === 'restaurant' || type === 'both' || !type)) {
      query.cuisine = { $in: [cuisine] };
    }

    let sortObj: any = { createdAt: -1 };
    if (sortBy === 'sentiment') {
      sortObj = { sentimentScore: -1 };
    }

    const businesses = await Business.find(query)
      .select('name location locationData type description thumbnail coverImage cuisine menu slotMode weeklySchedule dailySlots timeSlots rating sentimentScore sentimentRating basePrice status ownerId createdAt updatedAt capacity eventType duration bookingType floorPlan seatingLayout totalBookings revenue utilizationRate')
      .sort(sortObj)
      .lean();

    console.log(`Fetched ${businesses.length} businesses for public display`);

    // Transform businesses using unified helper
    const transformedBusinesses = businesses.map(business => transformBusinessData(business, req));

    res.json({ data: transformedBusinesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching businesses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new business
export const createBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== CREATE BUSINESS CALLED ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Has files:', !!req.files);
    
    let businessData: Partial<IBusiness>;

    // Handle FormData (with file uploads) or JSON data
    if (req.body.data) {
      // FormData with files
      businessData = JSON.parse(req.body.data);
      console.log('Parsed from FormData');
    } else {
      // Regular JSON data
      businessData = req.body;
      console.log('Using direct body');
    }

    console.log('Business name:', businessData.name);
    console.log('Business type:', businessData.type);
    console.log('Has seatingLayout:', !!businessData.seatingLayout);
    console.log('Has startDate:', !!businessData.startDate);
    console.log('Has endDate:', !!businessData.endDate);
    
    if (businessData.seatingLayout) {
      console.log('SeatingLayout keys:', Object.keys(businessData.seatingLayout));
    }

    businessData = {
      ...businessData,
      status: 'draft',
      totalBookings: 0,
      revenue: 0,
      rating: 0,
      utilizationRate: 0
    };

    // Handle file uploads - using Cloudinary's path which provides the full URL
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.thumbnail && files.thumbnail[0]) {
        businessData.thumbnail = files.thumbnail[0].path;
      }
      if (files.coverImage && files.coverImage[0]) {
        businessData.coverImage = files.coverImage[0].path;
      }
    }

    console.log('Creating business document...');
    const business = new Business(businessData);
    await business.save();
    console.log('Business saved with ID:', business._id);

    res.status(201).json({ data: transformBusinessData(business, req) });
  } catch (error: any) {
    console.error('Error creating business:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      console.error('Validation errors:', validationErrors);
      res.status(400).json({
        message: 'Validation error',
        errors: validationErrors
      });
      return;
    }

    res.status(500).json({
      message: 'Error creating business',
      error: error.message
    });
  }
};

// Get all businesses for an owner
export const getOwnerBusinesses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = req.params;
    const { status, type } = req.query;

    const query: any = { ownerId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    const businesses = await Business.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const transformedBusinesses = businesses.map(b => transformBusinessData(b, req));

    res.json({ data: transformedBusinesses });
  } catch (error) {
    console.error('Error fetching owner businesses:', error);
    res.status(500).json({ message: 'Error fetching businesses' });
  }
};

// Get a specific business
export const getBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);

    if (!business) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }

    // Debug logging to see what's actually in the database
    console.log('Raw business data from MongoDB:', {
      id: business._id,
      name: business.name,
      type: business.type,
      timeSlots: business.timeSlots,
      timeSlotsLength: business.timeSlots?.length || 0,
      dailySlots: business.dailySlots,
      dailySlotsLength: business.dailySlots?.length || 0,
      menu: business.menu?.length || 0,
      floorPlan: !!business.floorPlan,
      seatingLayout: !!business.seatingLayout
    });

    // Transform business using unified helper
    const transformedBusiness = transformBusinessData(business, req);

    console.log('Transformed business data sent to frontend:', {
      id: transformedBusiness.id,
      name: transformedBusiness.name,
      location: transformedBusiness.location,
      hasLocationData: !!transformedBusiness.locationData,
      type: transformedBusiness.type,
      timeSlotsLength: transformedBusiness.timeSlots?.length || 0
    });

    res.json({ data: transformedBusiness });
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ message: 'Error fetching business' });
  }
};

// Update a business
export const updateBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('=== UPDATE BUSINESS CALLED ===');
    console.log('Business ID:', id);
    console.log('Request body keys:', Object.keys(req.body));
    
    let updateData: any;

    // Handle FormData (with file uploads) or JSON data
    if (req.body.data) {
      // FormData with files
      updateData = JSON.parse(req.body.data);
      console.log('Parsed from FormData');
    } else {
      // Regular JSON data
      updateData = req.body;
      console.log('Using direct body');
    }

    console.log('Update data:', {
      name: updateData.name,
      location: updateData.location,
      type: updateData.type,
      hasSeatingLayout: !!updateData.seatingLayout,
      hasStartDate: !!updateData.startDate,
      hasEndDate: !!updateData.endDate,
      startDate: updateData.startDate,
      endDate: updateData.endDate
    });
    
    if (updateData.seatingLayout) {
      console.log('SeatingLayout keys:', Object.keys(updateData.seatingLayout));
      if (updateData.seatingLayout.eventConfig) {
        console.log('Has eventConfig wrapper');
        console.log('EventConfig keys:', Object.keys(updateData.seatingLayout.eventConfig));
      }
    }

    updateData.updatedAt = new Date();

    // Handle file uploads - using Cloudinary's path which provides the full URL
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.thumbnail && files.thumbnail[0]) {
        updateData.thumbnail = files.thumbnail[0].path;
      }
      if (files.coverImage && files.coverImage[0]) {
        updateData.coverImage = files.coverImage[0].path;
      }
    }

    console.log('Updating business in database...');
    const business = await Business.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!business) {
      console.log('Business not found');
      res.status(404).json({ message: 'Business not found' });
      return;
    }

    console.log('Business updated successfully');
    console.log('Saved startDate:', business.startDate);
    console.log('Saved endDate:', business.endDate);
    console.log('Saved seatingLayout exists:', !!business.seatingLayout);

    res.json({ data: transformBusinessData(business, req) });
  } catch (error: any) {
    console.error('Error updating business:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      console.error('Validation errors:', validationErrors);
      res.status(400).json({
        message: 'Validation error',
        errors: validationErrors
      });
      return;
    }

    res.status(500).json({
      message: 'Error updating business',
      error: error.message
    });
  }
};

// Delete a business
export const deleteBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if business exists
    const business = await Business.findById(id);
    if (!business) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }

    // Check if business has active bookings
    const activeBookings = await Booking.countDocuments({
      businessId: id,
      status: { $in: ['confirmed', 'pending'] },
      date: { $gte: new Date() }
    });

    if (activeBookings > 0) {
      res.status(400).json({
        message: 'Cannot delete business with active bookings. Please cancel or complete all active bookings first.',
        activeBookings
      });
      return;
    }

    // Start a transaction to ensure all deletions succeed or fail together
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete all bookings associated with this business (past bookings)
      await Booking.deleteMany({ businessId: id }, { session });

      // Delete the business
      await Business.findByIdAndDelete(id, { session });

      // Commit the transaction
      await session.commitTransaction();

      res.json({
        message: 'Business and all associated data deleted successfully',
        deletedBusiness: business.name
      });
    } catch (transactionError) {
      // Rollback the transaction on error
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({
      message: 'Error deleting business',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Validate business configuration
export const validateBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);

    if (!business) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }

    const errors: string[] = [];

    // Basic validation
    if (!business.name?.trim()) errors.push('Business name is required');
    if (!business.location?.trim()) errors.push('Location is required');
    // Make thumbnail optional for now
    // if (!business.thumbnail) errors.push('Thumbnail image is required');
    if (!business.basePrice || business.basePrice <= 0) errors.push('Base price must be greater than 0');

    // Restaurant validation
    if (business.type === 'restaurant' || business.type === 'both') {
      if (!business.cuisine || business.cuisine.length === 0) {
        errors.push('At least one cuisine type is required for restaurants');
      }

      // Check time slots based on slot mode
      if (business.slotMode === 'weekly') {
        if (!business.weeklySchedule) {
          errors.push('Weekly schedule is required for restaurants using weekly slot mode');
        } else {
          const hasOpenDays = Object.values(business.weeklySchedule).some((day: any) => day.isOpen);
          if (!hasOpenDays) {
            errors.push('Restaurant must be open at least one day per week');
          }
        }
      } else if (business.slotMode === 'daily') {
        if (!business.dailySlots || business.dailySlots.length === 0) {
          errors.push('Daily slots are required for restaurants using daily slot mode');
        } else {
          const hasActiveSlots = business.dailySlots.some((slot: any) => slot.available);
          if (!hasActiveSlots) {
            errors.push('At least one daily time slot must be active');
          }
        }
      }

      // Floor plan validation for seat-based restaurants
      if (business.bookingType === 'seat-based' && !business.floorPlan) {
        errors.push('Floor plan is required for seat-based restaurants');
      }
    }

    // Event validation
    if (business.type === 'event' || business.type === 'both') {
      if (!business.eventType) errors.push('Event type is required for events');
      if (!business.capacity || business.capacity <= 0) {
        errors.push('Event capacity must be greater than 0');
      }
      if (!business.duration || business.duration <= 0) {
        errors.push('Event duration must be greater than 0');
      }
      if (!business.timeSlots || business.timeSlots.length === 0) {
        errors.push('At least one time slot is required for events');
      }

      // Seating layout validation for seat-based events
      if (business.bookingType === 'seat-based' && !business.seatingLayout) {
        errors.push('Seating layout is required for seat-based events');
      }
    }

    const isValid = errors.length === 0;

    res.json({
      isValid,
      errors,
      businessId: business._id,
      canDeploy: isValid
    });
  } catch (error) {
    console.error('Error validating business:', error);
    res.status(500).json({ message: 'Error validating business' });
  }
};

// Deploy business (make it live)
export const deployBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // First validate the business
    const business = await Business.findById(id);
    if (!business) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }

    // Run validation
    const errors: string[] = [];
    if (!business.name?.trim()) errors.push('Business name is required');
    if (!business.location?.trim()) errors.push('Location is required');
    if (!business.thumbnail) errors.push('Thumbnail image is required');

    if (errors.length > 0) {
      res.status(400).json({
        message: 'Business validation failed',
        errors,
        canDeploy: false
      });
      return;
    }

    // Deploy the business
    business.status = 'active';
    business.updatedAt = new Date();
    await business.save();

    res.json({
      message: 'Business deployed successfully',
      business,
      isLive: true
    });
  } catch (error) {
    console.error('Error deploying business:', error);
    res.status(500).json({ message: 'Error deploying business' });
  }
};

// Pause/Resume business
export const toggleBusinessStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);

    if (!business) {
      res.status(404).json({ message: 'Business not found' });
      return;
    }

    // Toggle between active and paused
    business.status = business.status === 'active' ? 'paused' : 'active';
    business.updatedAt = new Date();
    await business.save();

    res.json({
      message: `Business ${business.status === 'active' ? 'resumed' : 'paused'} successfully`,
      business,
      status: business.status
    });
  } catch (error) {
    console.error('Error toggling business status:', error);
    res.status(500).json({ message: 'Error updating business status' });
  }
};

// Get business analytics
export const getBusinessAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    let dateFilter: Date;
    switch (period) {
      case '7d':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const analytics = await Booking.aggregate([
      {
        $match: {
          businessId: id,
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageBookingValue: { $avg: '$amount' },
          totalSeats: { $sum: '$seats' }
        }
      }
    ]);

    const result = analytics[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      completedBookings: 0,
      averageBookingValue: 0,
      totalSeats: 0
    };

    // Calculate rates
    result.confirmationRate = result.totalBookings > 0 ?
      Math.round((result.confirmedBookings / result.totalBookings) * 100) : 0;
    result.cancellationRate = result.totalBookings > 0 ?
      Math.round((result.cancelledBookings / result.totalBookings) * 100) : 0;
    result.completionRate = result.totalBookings > 0 ?
      Math.round((result.completedBookings / result.totalBookings) * 100) : 0;

    // Get peak hours
    const peakHours = await Booking.aggregate([
      {
        $match: {
          businessId: id,
          status: 'confirmed',
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: '$time',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 3
      }
    ]);

    result.peakHours = peakHours.map(ph => ph._id);

    res.json(result);
  } catch (error) {
    console.error('Error fetching business analytics:', error);
    res.status(500).json({ message: 'Error fetching business analytics' });
  }
};

// Get business dashboard data
export const getBusinessDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = req.params;

    // Get all businesses for the owner
    const businesses = await Business.find({ ownerId }).lean();

    // Get recent bookings across all businesses
    const businessIds = businesses.map(b => b._id.toString());
    const recentBookings = await Booking.find({
      businessId: { $in: businessIds }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate metrics for each business from booking data
    const businessesWithMetrics = await Promise.all(businesses.map(async (business) => {
      // Get all bookings for this business
      const bookings = await Booking.find({ businessId: business._id.toString() }).lean();

      // Calculate total bookings
      const totalBookings = bookings.length;

      // Calculate revenue (only from confirmed bookings)
      const revenue = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      // Calculate utilization rate
      // Total seats booked from confirmed bookings
      const totalSeatsBooked = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.seats || 0), 0);

      // Utilization = (seats booked / capacity) * 100
      const capacity = business.capacity || 0;
      const utilizationRate = capacity > 0
        ? Math.min(Math.round((totalSeatsBooked / capacity) * 100), 100)
        : 0;

      return {
        ...business,
        totalBookings,
        revenue,
        utilizationRate,
        thumbnail: getImageUrl(business.thumbnail, req),
        coverImage: getImageUrl(business.coverImage, req)
      };
    }));

    // Calculate overall stats
    const totalBusinesses = businessesWithMetrics.length;
    const activeBusinesses = businessesWithMetrics.filter(b => b.status === 'active').length;
    const totalRevenue = businessesWithMetrics.reduce((sum, b) => sum + (b.revenue || 0), 0);
    const averageRating = businessesWithMetrics.length > 0 ?
      businessesWithMetrics.reduce((sum, b) => sum + (b.rating || 0), 0) / businessesWithMetrics.length : 0;

    // Get today's bookings
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayBookings = await Booking.countDocuments({
      businessId: { $in: businessIds },
      date: { $gte: todayStart, $lt: todayEnd }
    });

    // Get this month's bookings
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthBookings = await Booking.countDocuments({
      businessId: { $in: businessIds },
      date: { $gte: monthStart }
    });

    res.json({
      businesses: businessesWithMetrics,
      recentBookings,
      stats: {
        totalBusinesses,
        activeBusinesses,
        totalRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        todayBookings,
        monthBookings
      }
    });
  } catch (error) {
    console.error('Error fetching business dashboard:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

// Get dashboard analytics with time-series data
export const getDashboardAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = req.params;
    const { period = '30d' } = req.query;

    // Calculate date filter based on period
    let dateFilter: Date;
    let days: number;
    switch (period) {
      case '7d':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        days = 7;
        break;
      case '30d':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
        break;
      case '90d':
        dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        days = 90;
        break;
      default:
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
    }

    // Get all businesses for the owner
    const businesses = await Business.find({ ownerId }).lean();
    const businessIds = businesses.map(b => b._id.toString());

    if (businessIds.length === 0) {
      // Return empty analytics if no businesses
      res.json({
        bookingTrends: [],
        revenueData: [],
        peakHours: [],
        summary: {
          totalBookings: 0,
          totalRevenue: 0,
          averageBookingValue: 0,
          confirmationRate: 0
        }
      });
      return;
    }

    // Get booking trends (daily aggregation)
    const bookingTrends = await Booking.aggregate([
      {
        $match: {
          businessId: { $in: businessIds },
          date: { $gte: dateFilter },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          bookings: '$count',
          revenue: '$revenue'
        }
      }
    ]);

    // Fill in missing dates with zero values
    const filledTrends = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(dateFilter.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const existing = bookingTrends.find(t => t.date === dateStr);
      filledTrends.push({
        date: dateStr,
        bookings: existing?.bookings || 0,
        revenue: existing?.revenue || 0
      });
    }

    // Get peak hours analysis
    const peakHours = await Booking.aggregate([
      {
        $match: {
          businessId: { $in: businessIds },
          date: { $gte: dateFilter },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$time',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          _id: 0,
          time: '$_id',
          bookings: '$count'
        }
      }
    ]);

    // Get summary statistics
    const summary = await Booking.aggregate([
      {
        $match: {
          businessId: { $in: businessIds },
          date: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          confirmedBookings: {
            $sum: { $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = summary[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      confirmedBookings: 0
    };

    res.json({
      bookingTrends: filledTrends,
      revenueData: filledTrends,
      peakHours,
      summary: {
        totalBookings: stats.totalBookings,
        totalRevenue: Math.round(stats.totalRevenue || 0),
        averageBookingValue: stats.totalBookings > 0
          ? Math.round((stats.totalRevenue || 0) / stats.totalBookings)
          : 0,
        confirmationRate: stats.totalBookings > 0
          ? Math.round((stats.confirmedBookings / stats.totalBookings) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
};

// Legacy methods for backward compatibility
export const registerOwner = async (req: Request, res: Response): Promise<void> => {
  // This can redirect to user registration or handle business owner specific logic
  res.status(200).json({ message: 'Owner registration handled by user system' });
};

export const getMyRestaurants = async (req: Request, res: Response): Promise<void> => {
  // Redirect to getOwnerBusinesses with restaurant filter
  req.query.type = 'restaurant';
  await getOwnerBusinesses(req, res);
};

export const createRestaurant = async (req: Request, res: Response): Promise<void> => {
  // Set type to restaurant and call createBusiness
  req.body.type = 'restaurant';
  await createBusiness(req, res);
};

export const updateRestaurant = async (req: Request, res: Response): Promise<void> => {
  // Redirect to updateBusiness
  await updateBusiness(req, res);
};