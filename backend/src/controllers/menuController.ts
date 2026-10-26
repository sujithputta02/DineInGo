import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';
import { Business } from '../models/Business';

// Allowed cloud hostnames for 3D model storage
const ALLOWED_MODEL_HOSTS = [
    'amazonaws.com',
    'cloudfront.net',
    'storage.googleapis.com',
    'cloudinary.com',
    'githubusercontent.com',
    'github.com',
    'vercel.app',
    'onrender.com',
    'dineingo.com'
];

/**
 * Validates a 3D model URL against security policies
 */
export function validateModelUrl(url: unknown): { valid: boolean; reason?: string } {
    if (!url || typeof url !== 'string') {
        return { valid: true }; // modelUrl is optional
    }

    const trimmed = url.trim();
    if (trimmed.length === 0) {
        return { valid: true };
    }

    const lower = trimmed.toLowerCase();

    // Reject dangerous schemes
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('file:') ||
        lower.startsWith('blob:') ||
        lower.startsWith('vbscript:')
    ) {
        return { valid: false, reason: 'Disallowed URL scheme' };
    }

    // Reject placeholder URLs
    if (
        lower.includes('sketchfab.com/models/d1d1') ||
        lower.includes('example.com') ||
        lower.includes('placeholder')
    ) {
        return { valid: false, reason: 'Placeholder model URLs are not allowed' };
    }

    // Relative path validation
    if (trimmed.startsWith('/')) {
        if (trimmed.startsWith('//') || trimmed.includes('..') || trimmed.includes('\\')) {
            return { valid: false, reason: 'Path traversal or malformed relative path' };
        }
        if (!trimmed.startsWith('/models/')) {
            return { valid: false, reason: 'Relative models must reside within /models/' };
        }
        const cleanPath = trimmed.split('?')[0].split('#')[0].toLowerCase();
        if (!cleanPath.endsWith('.glb') && !cleanPath.endsWith('.gltf')) {
            return { valid: false, reason: 'Model asset must be a .glb or .gltf file' };
        }
        return { valid: true };
    }

    // External URL validation
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:') {
            return { valid: false, reason: 'External model URLs must use HTTPS' };
        }

        const pathname = parsed.pathname.toLowerCase();
        if (!pathname.endsWith('.glb') && !pathname.endsWith('.gltf')) {
            return { valid: false, reason: 'External model URL pathname must end with .glb or .gltf' };
        }

        const hostname = parsed.hostname.toLowerCase();
        const isAllowed = ALLOWED_MODEL_HOSTS.some(
            domain => hostname === domain || hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
            return {
                valid: false,
                reason: `Host "${hostname}" is not in the permitted model storage whitelist`
            };
        }

        return { valid: true };
    } catch (err) {
        return { valid: false, reason: 'Malformed model URL' };
    }
}

/**
 * Checks whether the authenticated user owns or is authorized to manage the business
 */
async function verifyBusinessOwnership(businessId: string, requester: any): Promise<boolean> {
    if (!requester) return true; // If endpoint accessed without user context, allow controller logic to proceed

    const isAdmin = requester.role === 'admin' || requester.role === 'super_admin' || requester.isAdmin;
    if (isAdmin) return true;

    if (!mongoose.Types.ObjectId.isValid(businessId)) return false;

    const business = await Business.findById(businessId);
    if (!business) return false;

    return business.ownerId === requester.uid;
}

// ============================================================================
// Category Management
// ============================================================================

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId, name, description, displayOrder } = req.body;

        if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
            res.status(400).json({ success: false, message: 'Invalid or missing businessId' });
            return;
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            res.status(400).json({ success: false, message: 'Category name is required' });
            return;
        }

        const requester = (req as any).user;
        if (requester) {
            const isOwner = await verifyBusinessOwnership(businessId, requester);
            if (!isOwner) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this business.' });
                return;
            }
        }

        const category = new MenuCategory({
            businessId,
            name: name.trim(),
            description: description || '',
            displayOrder: typeof displayOrder === 'number' ? displayOrder : 0
        });

        await category.save();

        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, message: 'Error creating category' });
    }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;

        if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
            res.status(400).json({ success: false, message: 'Invalid businessId format' });
            return;
        }

        const categories = await MenuCategory.find({ businessId, isActive: true })
            .sort({ displayOrder: 1, name: 1 });

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { categoryId } = req.params;

        if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
            res.status(400).json({ success: false, message: 'Invalid categoryId format' });
            return;
        }

        const category = await MenuCategory.findById(categoryId);
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        const requester = (req as any).user;
        if (requester) {
            const isOwner = await verifyBusinessOwnership(category.businessId, requester);
            if (!isOwner) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this business.' });
                return;
            }
        }

        const allowedFields = ['name', 'description', 'displayOrder', 'isActive'];
        for (const field of allowedFields) {
            if (field in req.body) {
                (category as any)[field] = req.body[field];
            }
        }

        await category.save();

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ success: false, message: 'Error updating category' });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { categoryId } = req.params;

        if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
            res.status(400).json({ success: false, message: 'Invalid categoryId format' });
            return;
        }

        const category = await MenuCategory.findById(categoryId);
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

        const requester = (req as any).user;
        if (requester) {
            const isOwner = await verifyBusinessOwnership(category.businessId, requester);
            if (!isOwner) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this business.' });
                return;
            }
        }

        category.isActive = false;
        await category.save();

        // Also mark all items in this category as unavailable
        await MenuItem.updateMany(
            { categoryId },
            { isAvailable: false }
        );

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Error deleting category' });
    }
};

// ============================================================================
// Menu Item Management
// ============================================================================

export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            businessId,
            categoryId,
            name,
            description,
            price,
            image,
            dietaryTags,
            allergens,
            preparationTime,
            calories,
            spiceLevel,
            displayOrder,
            modelUrl
        } = req.body;

        if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
            res.status(400).json({ success: false, message: 'Invalid or missing businessId' });
            return;
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            res.status(400).json({ success: false, message: 'Dish name is required' });
            return;
        }

        if (typeof price !== 'number' || price < 0 || isNaN(price)) {
            res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
            return;
        }

        // Validate 3D model URL if provided
        if (modelUrl !== undefined && modelUrl !== null && modelUrl !== '') {
            const validation = validateModelUrl(modelUrl);
            if (!validation.valid) {
                res.status(400).json({ success: false, message: `Invalid modelUrl: ${validation.reason}` });
                return;
            }
        }

        // Verify business ownership
        const requester = (req as any).user;
        if (requester) {
            const isOwner = await verifyBusinessOwnership(businessId, requester);
            if (!isOwner) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
                return;
            }
        }

        const menuItem = new MenuItem({
            businessId,
            categoryId: categoryId || undefined,
            name: name.trim(),
            description: description || '',
            price,
            image: image || undefined,
            modelUrl: modelUrl && typeof modelUrl === 'string' ? modelUrl.trim() : undefined,
            dietaryTags: Array.isArray(dietaryTags) ? dietaryTags : [],
            allergens: Array.isArray(allergens) ? allergens : [],
            preparationTime: typeof preparationTime === 'number' ? preparationTime : undefined,
            calories: typeof calories === 'number' ? calories : undefined,
            spiceLevel: typeof spiceLevel === 'number' ? spiceLevel : undefined,
            displayOrder: typeof displayOrder === 'number' ? displayOrder : 0
        });

        await menuItem.save();

        res.status(201).json({
            success: true,
            data: menuItem
        });
    } catch (error) {
        console.error('Error creating menu item:', error);
        res.status(500).json({ success: false, message: 'Error creating menu item' });
    }
};

export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;

        if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
            res.status(400).json({ success: false, message: 'Invalid businessId format' });
            return;
        }

        const { categoryId, dietaryTags, available } = req.query;

        const query: any = { businessId };

        if (categoryId) {
            query.categoryId = categoryId;
        }

        if (available === 'true') {
            query.isAvailable = true;
        }

        if (dietaryTags) {
            const tags = (dietaryTags as string).split(',');
            query.dietaryTags = { $in: tags };
        }

        const menuItems = await MenuItem.find(query)
            .sort({ displayOrder: 1, name: 1 });

        res.json({
            success: true,
            data: menuItems
        });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ success: false, message: 'Error fetching menu items' });
    }
};

export const getFullMenu = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;

        if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
            res.status(400).json({ success: false, message: 'Invalid businessId format' });
            return;
        }

        const categories = await MenuCategory.find({ businessId, isActive: true })
            .sort({ displayOrder: 1, name: 1 })
            .lean();

        const menuItems = await MenuItem.find({ businessId, isAvailable: true })
            .sort({ displayOrder: 1, name: 1 })
            .lean();

        // Group items by category
        const menuByCategory = categories.map(category => ({
            ...category,
            items: menuItems.filter(item => item.categoryId === category._id.toString())
        }));

        res.json({
            success: true,
            data: menuByCategory
        });
    } catch (error) {
        console.error('Error fetching full menu:', error);
        res.status(500).json({ success: false, message: 'Error fetching full menu' });
    }
};

export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;

        if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
            res.status(400).json({ success: false, message: 'Invalid itemId format' });
            return;
        }

        const menuItem = await MenuItem.findById(itemId);
        if (!menuItem) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

        // Verify ownership
        const requester = (req as any).user;
        if (requester) {
            const isOwner = await verifyBusinessOwnership(menuItem.businessId, requester);
            if (!isOwner) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
                return;
            }
        }

        // Validate modelUrl if being updated
        if (req.body.modelUrl !== undefined && req.body.modelUrl !== null && req.body.modelUrl !== '') {
            const validation = validateModelUrl(req.body.modelUrl);
            if (!validation.valid) {
                res.status(400).json({ success: false, message: `Invalid modelUrl: ${validation.reason}` });
                return;
            }
        }

        // Validate price if being updated
        if (req.body.price !== undefined) {
            if (typeof req.body.price !== 'number' || req.body.price < 0 || isNaN(req.body.price)) {
                res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
                return;
            }
        }

        // SECURITY: Strict field whitelisting (never allow changing _id or businessId)
        const allowedUpdateFields = [
            'name',
            'description',
            'price',
            'image',
            'modelUrl',
            'categoryId',
            'dietaryTags',
            'allergens',
            'preparationTime',
            'calories',
            'spiceLevel',
            'displayOrder',
            'isAvailable'
        ];

        for (const field of allowedUpdateFields) {
            if (field in req.body) {
                (menuItem as any)[field] = req.body[field];
            }
        }

        await menuItem.save();

        res.json({
            success: true,
            data: menuItem
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ success: false, message: 'Error updating menu item' });
    }
};

export const toggleItemAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;

        if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
            res.status(400).json({ success: false, message: 'Invalid itemId format' });
            return;
        }

        const menuItem = await MenuItem.findById(itemId);
        if (!menuItem) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

        // Verify ownership
        const requester = (req as any).user;
        if (requester) {
            const isOwner = await verifyBusinessOwnership(menuItem.businessId, requester);
            if (!isOwner) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
                return;
            }
        }

        menuItem.isAvailable = Boolean(req.body.isAvailable);
        await menuItem.save();

        res.json({
            success: true,
            data: menuItem
        });
    } catch (error) {
        console.error('Error toggling item availability:', error);
        res.status(500).json({ success: false, message: 'Error toggling item availability' });
    }
};

export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;

        if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
            res.status(400).json({ success: false, message: 'Invalid itemId format' });
            return;
        }

        const menuItem = await MenuItem.findById(itemId);
        if (!menuItem) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

        // Verify ownership
        const requester = (req as any).user;
        if (requester) {
            const isOwner = await verifyBusinessOwnership(menuItem.businessId, requester);
            if (!isOwner) {
                res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
                return;
            }
        }

        await MenuItem.findByIdAndDelete(itemId);

        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ success: false, message: 'Error deleting menu item' });
    }
};

// Bulk operations
export const bulkUpdateDisplayOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { items } = req.body; // Array of { id, displayOrder }

        if (!Array.isArray(items)) {
            res.status(400).json({ success: false, message: 'Items must be an array' });
            return;
        }

        const bulkOps = items
            .filter((item: any) => item && item.id && mongoose.Types.ObjectId.isValid(item.id))
            .map((item: any) => ({
                updateOne: {
                    filter: { _id: item.id },
                    update: { displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : 0 }
                }
            }));

        if (bulkOps.length > 0) {
            await MenuItem.bulkWrite(bulkOps);
        }

        res.json({
            success: true,
            message: 'Display order updated successfully'
        });
    } catch (error) {
        console.error('Error updating display order:', error);
        res.status(500).json({ success: false, message: 'Error updating display order' });
    }
};
