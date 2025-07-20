import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import mongoose from 'mongoose';

// Get all restaurants
export const getAllRestaurants = async (req: Request, res: Response) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurants',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get restaurant by ID
export const getRestaurantById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID is required'
      });
    }

    let restaurant;
    
    // Check if ID is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      restaurant = await Restaurant.findById(id);
    } else {
      // If not a valid ObjectId, try to find by restaurantId field
      restaurant = await Restaurant.findOne({ restaurantId: id });
      
      // If still not found, try to find by name (fallback)
      if (!restaurant) {
        restaurant = await Restaurant.findOne({ 
          name: { $regex: new RegExp(id, 'i') } 
        });
      }
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new restaurant
export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    
    res.status(201).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create restaurant',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update restaurant
export const updateRestaurant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update restaurant',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete restaurant
export const deleteRestaurant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByIdAndDelete(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete restaurant',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search restaurants
export const searchRestaurants = async (req: Request, res: Response) => {
  try {
    const { query, cuisine } = req.query;
    
    let searchCriteria: any = {};
    
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query as string, $options: 'i' } },
        { description: { $regex: query as string, $options: 'i' } },
        { address: { $regex: query as string, $options: 'i' } }
      ];
    }
    
    if (cuisine) {
      searchCriteria.cuisine = { $regex: cuisine as string, $options: 'i' };
    }

    const restaurants = await Restaurant.find(searchCriteria).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (error) {
    console.error('Error searching restaurants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search restaurants',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 