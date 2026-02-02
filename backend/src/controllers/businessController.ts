import { Request, Response } from 'express';
import { User, IActivity } from '../models/User';
import { Restaurant } from '../models/Restaurant';

// Helper for request info
const extractRequestInfo = (req: Request): { deviceInfo: string; ipAddress: string } => {
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress || 'Unknown IP';
    return { deviceInfo, ipAddress };
};

// Register as Owner
export const registerOwner = async (req: Request, res: Response): Promise<void> => {
    try {
        const { uid, email, displayName, name, photoURL } = req.body;

        if (!uid || !email) {
            res.status(400).json({ message: 'Missing uid or email' });
            return;
        }

        // Check if user exists
        let user = await User.findOne({ uid });
        if (user) {
            // If user exists, upgrade to owner if not already? 
            // Or just login. For now, let's treat this as "ensure owner role"
            if (user.role !== 'owner' && user.role !== 'admin') {
                user.role = 'owner';
                await user.save();
            }
            res.json(user);
            return;
        }

        const { deviceInfo, ipAddress } = extractRequestInfo(req);
        const signupActivity: IActivity = {
            type: 'signup',
            timestamp: new Date(),
            deviceInfo,
            ipAddress,
            source: 'business_portal'
        };

        const newUser = new User({
            uid,
            email,
            displayName: displayName || name || 'Business Owner',
            name: name || displayName || 'Business Owner',
            photoURL,
            role: 'owner',
            activities: [signupActivity]
        });

        await newUser.save();
        res.status(201).json(newUser);

    } catch (error) {
        console.error('Error registering owner:', error);
        res.status(500).json({ message: 'Error registering owner' });
    }
};

// Get My Restaurants
export const getMyRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        const { uid } = req.params; // Assuming auth middleware puts uid in query or we pass it
        // Ideally we get this from a secure token middleware, but adhering to current pattern:
        // Current pattern seems to pass variables or rely on request body/params. 
        // I will trust req.params.uid ensures auth on frontend for now or check current patterns.
        // Looking at server.ts, there is no global auth middleware visible. 
        // I will require uid in params for now.

        if (!uid) {
            res.status(400).json({ message: 'User ID required' });
            return;
        }

        const restaurants = await Restaurant.find({ ownerId: uid });
        res.json({ success: true, data: restaurants });

    } catch (error) {
        console.error('Error fetching owner restaurants:', error);
        res.status(500).json({ message: 'Error fetching restaurants' });
    }
};

// Create Restaurant
export const createRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ownerId } = req.body;
        if (!ownerId) {
            res.status(400).json({ message: 'Owner ID required' });
            return;
        }

        // Verify user is owner
        const user = await User.findOne({ uid: ownerId });
        if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
            res.status(403).json({ message: 'Unauthorized: User is not an owner' });
            return;
        }

        const restaurant = new Restaurant(req.body);
        await restaurant.save();
        res.status(201).json({ success: true, data: restaurant });

    } catch (error) {
        console.error('Business create restaurant error:', error);
        res.status(400).json({ message: 'Failed to create restaurant', error });
    }
};

// Update Restaurant (Owner only)
export const updateRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { ownerId } = req.body; // Must verify ownership

        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            res.status(404).json({ message: 'Restaurant not found' });
            return;
        }

        if (restaurant.ownerId !== ownerId) {
            res.status(403).json({ message: 'Unauthorized: You do not own this restaurant' });
            return;
        }

        const updated = await Restaurant.findByIdAndUpdate(id, req.body, { new: true });
        res.json({ success: true, data: updated });

    } catch (error) {
        console.error('Business update restaurant error:', error);
        res.status(500).json({ message: 'Error updating restaurant' });
    }
};
