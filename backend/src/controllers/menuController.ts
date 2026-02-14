import { Request, Response } from 'express';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';

// Category Management
export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId, name, description, displayOrder } = req.body;

        const category = new MenuCategory({
            businessId,
            name,
            description,
            displayOrder: displayOrder || 0
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
        const updates = req.body;

        const category = await MenuCategory.findByIdAndUpdate(
            categoryId,
            updates,
            { new: true, runValidators: true }
        );

        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

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

        // Soft delete
        const category = await MenuCategory.findByIdAndUpdate(
            categoryId,
            { isActive: false },
            { new: true }
        );

        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }

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

// Menu Item Management
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
            displayOrder
        } = req.body;

        const menuItem = new MenuItem({
            businessId,
            categoryId,
            name,
            description,
            price,
            image,
            dietaryTags: dietaryTags || [],
            allergens: allergens || [],
            preparationTime,
            calories,
            spiceLevel,
            displayOrder: displayOrder || 0
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
        const updates = req.body;

        const menuItem = await MenuItem.findByIdAndUpdate(
            itemId,
            updates,
            { new: true, runValidators: true }
        );

        if (!menuItem) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

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
        const { isAvailable } = req.body;

        const menuItem = await MenuItem.findByIdAndUpdate(
            itemId,
            { isAvailable },
            { new: true }
        );

        if (!menuItem) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

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

        const menuItem = await MenuItem.findByIdAndDelete(itemId);

        if (!menuItem) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

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

        const bulkOps = items.map((item: any) => ({
            updateOne: {
                filter: { _id: item.id },
                update: { displayOrder: item.displayOrder }
            }
        }));

        await MenuItem.bulkWrite(bulkOps);

        res.json({
            success: true,
            message: 'Display order updated successfully'
        });
    } catch (error) {
        console.error('Error updating display order:', error);
        res.status(500).json({ success: false, message: 'Error updating display order' });
    }
};
