import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { menuApi } from '../../services/api';
import { toast } from 'react-toastify';
import {
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
    Move,
    Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
    _id: string;
    name: string;
    description?: string;
    displayOrder: number;
    isActive: boolean;
}

interface MenuItem {
    _id: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    image?: string;
    dietaryTags: string[];
    allergens: string[];
    isAvailable: boolean;
    displayOrder: number;
}

const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'kosher', 'keto', 'paleo', 'organic'];
const ALLERGENS = ['nuts', 'peanuts', 'dairy', 'eggs', 'soy', 'wheat', 'shellfish', 'fish', 'sesame'];

function DigitalMenuEditor() {
    const { currentUser } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    // Form states
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
    const [itemForm, setItemForm] = useState({
        categoryId: '',
        name: '',
        description: '',
        price: '',
        image: '',
        dietaryTags: [] as string[],
        allergens: [] as string[]
    });

    // Add state for selected file name
    const [selectedFileName, setSelectedFileName] = useState<string>('');

    useEffect(() => {
        if (currentUser?.uid) {
            fetchMenuData();
        }
    }, [currentUser]);

    const fetchMenuData = async () => {
        try {
            setLoading(true);
            const [categoriesRes, itemsRes] = await Promise.all([
                menuApi.getCategories(currentUser!.uid),
                menuApi.getItems(currentUser!.uid)
            ]);

            if (categoriesRes.success) setCategories(categoriesRes.data);
            if (itemsRes.success) setMenuItems(itemsRes.data);
        } catch (error) {
            console.error('Error fetching menu data:', error);
            toast.error('Failed to load menu data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                businessId: currentUser!.uid,
                name: categoryForm.name,
                description: categoryForm.description,
                displayOrder: categories.length
            };

            const res = await menuApi.createCategory(data);
            if (res.success) {
                setCategories([...categories, res.data]);
                setIsCategoryModalOpen(false);
                setCategoryForm({ name: '', description: '' });
                toast.success('Category created successfully');
            }
        } catch (error) {
            toast.error('Failed to create category');
        }
    };

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;

        try {
            const res = await menuApi.updateCategory(editingCategory._id, categoryForm);
            if (res.success) {
                setCategories(categories.map(c => c._id === editingCategory._id ? res.data : c));
                setIsCategoryModalOpen(false);
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '' });
                toast.success('Category updated successfully');
            }
        } catch (error) {
            toast.error('Failed to update category');
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!window.confirm('Are you sure? This will delete the category and hide all its items.')) return;

        try {
            const res = await menuApi.deleteCategory(categoryId);
            if (res.success) {
                setCategories(categories.filter(c => c._id !== categoryId));
                toast.success('Category deleted successfully');
            }
        } catch (error) {
            toast.error('Failed to delete category');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFileName(file.name);

            const reader = new FileReader();
            reader.onloadend = () => {
                setItemForm({ ...itemForm, image: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                businessId: currentUser!.uid,
                ...itemForm,
                price: parseFloat(itemForm.price),
                displayOrder: menuItems.filter(i => i.categoryId === itemForm.categoryId).length
            };

            const res = await menuApi.createItem(data);
            if (res.success) {
                setMenuItems([...menuItems, res.data]);
                setIsItemModalOpen(false);
                resetItemForm();
                toast.success('Menu item created successfully');
            }
        } catch (error) {
            toast.error('Failed to create menu item');
        }
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            const data = {
                ...itemForm,
                price: parseFloat(itemForm.price)
            };

            const res = await menuApi.updateItem(editingItem._id, data);
            if (res.success) {
                setMenuItems(menuItems.map(i => i._id === editingItem._id ? res.data : i));
                setIsItemModalOpen(false);
                setEditingItem(null);
                resetItemForm();
                toast.success('Menu item updated successfully');
            }
        } catch (error) {
            toast.error('Failed to update menu item');
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            const res = await menuApi.deleteItem(itemId);
            if (res.success) {
                setMenuItems(menuItems.filter(i => i._id !== itemId));
                toast.success('Menu item deleted successfully');
            }
        } catch (error) {
            toast.error('Failed to delete menu item');
        }
    };

    const handleToggleAvailability = async (item: MenuItem) => {
        try {
            const res = await menuApi.toggleAvailability(item._id, !item.isAvailable);
            if (res.success) {
                setMenuItems(menuItems.map(i => i._id === item._id ? res.data : i));
                toast.success(`Item marked as ${!item.isAvailable ? 'available' : 'unavailable'}`);
            }
        } catch (error) {
            toast.error('Failed to update availability');
        }
    };

    const resetItemForm = () => {
        setItemForm({
            categoryId: categories[0]?._id || '',
            name: '',
            description: '',
            price: '',
            image: '',
            dietaryTags: [],
            allergens: []
        });
        setSelectedFileName('');
    };

    const openEditItemModal = (item: MenuItem) => {
        setEditingItem(item);
        setItemForm({
            categoryId: item.categoryId,
            name: item.name,
            description: item.description,
            price: item.price.toString(),
            image: item.image || '',
            dietaryTags: item.dietaryTags,
            allergens: item.allergens
        });
        setIsItemModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Digital Menu Editor</h1>
                    <p className="text-gray-500">Manage your restaurant's digital menu</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setCategoryForm({ name: '', description: '' });
                            setIsCategoryModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Plus size={18} />
                        Add Category
                    </button>

                    <button
                        onClick={() => {
                            setEditingItem(null);
                            resetItemForm();
                            setIsItemModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Add Menu Item
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {categories.map((category) => (
                    <div key={category._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{category.name}</h3>
                                {category.description && (
                                    <p className="text-sm text-gray-500">{category.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setEditingCategory(category);
                                        setCategoryForm({ name: category.name, description: category.description || '' });
                                        setIsCategoryModalOpen(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(category._id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {menuItems
                                .filter(item => item.categoryId === category._id)
                                .map((item) => (
                                    <motion.div
                                        layout
                                        key={item._id}
                                        className={`border rounded-xl p-4 flex gap-4 ${!item.isAvailable ? 'opacity-60 bg-gray-50' : 'bg-white hover:border-emerald-200'
                                            } transition-colors group`}
                                    >
                                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <ImageIcon size={24} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-semibold text-gray-900 truncate pr-2">{item.name}</h4>
                                                <span className="font-bold text-emerald-600">₹{item.price}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>

                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {item.dietaryTags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full border border-green-100">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleToggleAvailability(item)}
                                                    className={`text-xs px-2 py-1 rounded border ${item.isAvailable
                                                            ? 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                                            : 'text-green-600 border-green-200 bg-green-50'
                                                        }`}
                                                >
                                                    {item.isAvailable ? 'Available' : 'Sold Out'}
                                                </button>
                                                <button
                                                    onClick={() => openEditItemModal(item)}
                                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-50 rounded"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteItem(item._id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                            {menuItems.filter(item => item.categoryId === category._id).length === 0 && (
                                <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <p>No items in this category yet</p>
                                    <button
                                        onClick={() => {
                                            setEditingItem(null);
                                            resetItemForm();
                                            setItemForm(prev => ({ ...prev, categoryId: category._id }));
                                            setIsItemModalOpen(true);
                                        }}
                                        className="mt-2 text-sm text-emerald-600 font-medium hover:underline"
                                    >
                                        Add an item
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Category Modal */}
            <AnimatePresence>
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
                                <button
                                    onClick={() => setIsCategoryModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="e.g. Starters, Main Course"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                    <textarea
                                        value={categoryForm.description}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Short description for this category"
                                        rows={3}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                                >
                                    {editingCategory ? 'Update Category' : 'Create Category'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Menu Item Modal */}
            <AnimatePresence>
                {isItemModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl my-8"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h2 className="text-xl font-bold">{editingItem ? 'Edit Item' : 'New Menu Item'}</h2>
                                <button
                                    onClick={() => setIsItemModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={editingItem ? handleUpdateItem : handleCreateItem} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={itemForm.name}
                                                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="e.g. Butter Chicken"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                            <select
                                                required
                                                value={itemForm.categoryId}
                                                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(c => (
                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={itemForm.price}
                                                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-emerald-500 transition-colors">
                                                <div className="space-y-1 text-center">
                                                    {itemForm.image ? (
                                                        <div className="relative h-32 w-full mb-2">
                                                            <img src={itemForm.image} alt="Preview" className="h-full w-full object-contain rounded" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setItemForm({ ...itemForm, image: '' })}
                                                                className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                                    )}
                                                    <div className="flex text-sm text-gray-600 justify-center">
                                                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none">
                                                            <span>Upload a file</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="sr-only"
                                                                onChange={handleImageUpload}
                                                            />
                                                        </label>
                                                    </div>
                                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <textarea
                                                required
                                                value={itemForm.description}
                                                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Detailed description of the dish"
                                                rows={4}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Tags</label>
                                            <div className="flex flex-wrap gap-2">
                                                {DIETARY_TAGS.map(tag => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => {
                                                            const newTags = itemForm.dietaryTags.includes(tag)
                                                                ? itemForm.dietaryTags.filter(t => t !== tag)
                                                                : [...itemForm.dietaryTags, tag];
                                                            setItemForm({ ...itemForm, dietaryTags: newTags });
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${itemForm.dietaryTags.includes(tag)
                                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Allergens</label>
                                            <div className="flex flex-wrap gap-2">
                                                {ALLERGENS.map(allergen => (
                                                    <button
                                                        key={allergen}
                                                        type="button"
                                                        onClick={() => {
                                                            const newAllergens = itemForm.allergens.includes(allergen)
                                                                ? itemForm.allergens.filter(a => a !== allergen)
                                                                : [...itemForm.allergens, allergen];
                                                            setItemForm({ ...itemForm, allergens: newAllergens });
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${itemForm.allergens.includes(allergen)
                                                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {allergen}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <button
                                        type="submit"
                                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/10"
                                    >
                                        {editingItem ? 'Update Item' : 'Create Item'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default DigitalMenuEditor;
