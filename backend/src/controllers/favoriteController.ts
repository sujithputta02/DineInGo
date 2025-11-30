import { Request, Response } from 'express';
import { Favorite } from '../models/Favorite';

// Get user's favorites
export const getUserFavorites = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    console.log('=== GET USER FAVORITES ===');
    console.log('User ID:', userId);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const favorites = await Favorite.find({ userId });
    console.log('Found favorites:', favorites.length);
    console.log('Favorites data:', JSON.stringify(favorites, null, 2));
    
    // Transform favorites into the format expected by frontend
    const restaurantIds: string[] = [];
    const eventIds: string[] = [];
    
    favorites.forEach(fav => {
      console.log('Processing favorite:', {
        type: fav.type,
        restaurantId: fav.restaurantId,
        eventId: fav.eventId
      });
      
      if (fav.type === 'restaurant' && fav.restaurantId) {
        console.log('Adding restaurant ID:', fav.restaurantId);
        restaurantIds.push(fav.restaurantId);
      } else if (fav.type === 'event' && fav.eventId) {
        console.log('Adding event ID:', fav.eventId);
        eventIds.push(fav.eventId);
      }
    });
    
    console.log('Transformed favorites:', { restaurantIds, eventIds });
    
    res.status(200).json({
      success: true,
      favorites,
      restaurantIds,
      eventIds
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Toggle favorite (add or remove)
export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const { userId, eventId, restaurantId, type } = req.body;
    
    console.log('=== TOGGLE FAVORITE REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Parsed values:', { userId, eventId, restaurantId, type });
    
    if (!userId || !type) {
      console.error('Missing required fields:', { userId: !!userId, type: !!type });
      return res.status(400).json({
        success: false,
        message: 'User ID and type are required'
      });
    }
    
    if (type === 'event' && !eventId) {
      console.error('Event ID missing for event favorite');
      return res.status(400).json({
        success: false,
        message: 'Event ID is required for event favorites'
      });
    }
    
    if (type === 'restaurant' && !restaurantId) {
      console.error('Restaurant ID missing for restaurant favorite');
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID is required for restaurant favorites'
      });
    }
    
    // Check if favorite already exists
    const query: any = { userId, type };
    if (eventId) query.eventId = eventId;
    if (restaurantId) query.restaurantId = restaurantId;
    
    console.log('Searching for existing favorite with query:', JSON.stringify(query, null, 2));
    
    const existingFavorite = await Favorite.findOne(query);
    console.log('Existing favorite found:', existingFavorite ? 'Yes' : 'No');
    
    if (existingFavorite) {
      // Remove favorite
      console.log('Removing favorite with ID:', existingFavorite._id);
      await Favorite.deleteOne({ _id: existingFavorite._id });
      
      console.log('✓ Successfully removed from favorites');
      
      return res.status(200).json({
        success: true,
        message: 'Removed from favorites',
        action: 'removed'
      });
    } else {
      // Add favorite
      console.log('Creating new favorite with data:', { userId, eventId, restaurantId, type });
      
      // Build the favorite object, only including the relevant ID field
      const favoriteData: any = {
        userId,
        type
      };
      
      if (type === 'event' && eventId) {
        favoriteData.eventId = eventId;
      } else if (type === 'restaurant' && restaurantId) {
        favoriteData.restaurantId = restaurantId;
      }
      
      console.log('Favorite data to save:', favoriteData);
      
      const newFavorite = new Favorite(favoriteData);
      
      console.log('Saving new favorite to database...');
      await newFavorite.save();
      
      console.log('✓ Successfully added to favorites with ID:', newFavorite._id);
      
      return res.status(200).json({
        success: true,
        message: 'Added to favorites',
        action: 'added',
        favorite: newFavorite
      });
    }
  } catch (error) {
    console.error('=== ERROR IN TOGGLE FAVORITE ===');
    console.error('Error type:', error instanceof Error ? error.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Check for specific MongoDB errors
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        console.error('Validation error details:', error);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        console.error('MongoDB error details:', error);
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: error.message
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to toggle favorite',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Remove favorite
export const removeFavorite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const favorite = await Favorite.findByIdAndDelete(id);
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Favorite removed successfully'
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove favorite',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
