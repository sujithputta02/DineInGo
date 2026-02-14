import { Request, Response } from 'express';
import { UserPreference } from '../models/UserPreference';

export const getUserPreference = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const preferences = await UserPreference.findOne({ userId });

        if (!preferences) {
            res.json({
                success: true,
                data: null
            });
            return;
        }

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        res.status(500).json({ success: false, message: 'Error fetching preferences' });
    }
};

export const upsertUserPreference = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, cuisines, dietaryPreferences, allergens, averageSpend, lastMood } = req.body;

        if (!userId) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }

        const preferences = await UserPreference.findOneAndUpdate(
            { userId },
            {
                userId,
                cuisines,
                dietaryPreferences,
                allergens,
                averageSpend,
                lastMood
            },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('Error saving user preferences:', error);
        res.status(500).json({ success: false, message: 'Error saving preferences' });
    }
};

export const updateCuisineScore = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, cuisineName, increment = 1 } = req.body;

        if (!userId || !cuisineName) {
            res.status(400).json({ success: false, message: 'User ID and Cuisine Name are required' });
            return;
        }

        const preferences = await UserPreference.findOne({ userId });

        if (!preferences) {
            // Create if not exists
            const newPrefs = new UserPreference({
                userId,
                cuisines: [{ name: cuisineName, score: increment }]
            });
            await newPrefs.save();
            res.json({ success: true, data: newPrefs });
            return;
        }

        const cuisineIndex = preferences.cuisines.findIndex(c => c.name.toLowerCase() === cuisineName.toLowerCase());

        if (cuisineIndex > -1) {
            preferences.cuisines[cuisineIndex].score = Math.min(100, preferences.cuisines[cuisineIndex].score + increment);
        } else {
            preferences.cuisines.push({ name: cuisineName, score: increment });
        }

        await preferences.save();

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('Error updating cuisine score:', error);
        res.status(500).json({ success: false, message: 'Error updating cuisine score' });
    }
};
