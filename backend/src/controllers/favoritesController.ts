import { Request, Response } from 'express';
import { User } from '../models/User';
import mongoose from 'mongoose';

export const addFavorite = async (req: Request, res: Response) => {
    try {
        const { userId, restaurantId } = req.body;

        if (!userId || !restaurantId) {
            return res.status(400).json({ message: 'User ID and Restaurant ID are required' });
        }

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if restaurant is already in favorites
        if (user.favorites && user.favorites.includes(restaurantId)) {
            return res.status(400).json({ message: 'Restaurant already in favorites' });
        }

        // Add to favorites
        if (!user.favorites) {
            user.favorites = [];
        }
        user.favorites.push(restaurantId);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Added to favorites',
            favorites: user.favorites
        });
    } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const removeFavorite = async (req: Request, res: Response) => {
    try {
        const { userId, restaurantId } = req.params;

        if (!userId || !restaurantId) {
            return res.status(400).json({ message: 'User ID and Restaurant ID are required' });
        }

        const user = await User.findOne({ uid: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove from favorites
        if (user.favorites) {
            user.favorites = user.favorites.filter(id => id.toString() !== restaurantId);
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: 'Removed from favorites',
            favorites: user.favorites
        });
    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getFavorites = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const user = await User.findOne({ uid: userId }).populate('favorites');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            favorites: user.favorites || []
        });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
