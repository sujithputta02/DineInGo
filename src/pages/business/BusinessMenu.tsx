import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

interface MenuItem {
    name: string;
    description: string;
    price: number;
    category: string;
    image: string;
    isVegetarian: boolean;
    isSpicy: boolean;
}

interface MenuProps {
    restaurantId: string;
    currentMenu: MenuItem[];
    onUpdate: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const BusinessMenu: React.FC<MenuProps> = ({ restaurantId, currentMenu, onUpdate }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const emptyItem: MenuItem = {
        name: '',
        description: '',
        price: 0,
        category: 'Main Course',
        image: '',
        isVegetarian: false,
        isSpicy: false
    };

    const [formData, setFormData] = useState<MenuItem>(emptyItem);

    const startEdit = (item: MenuItem, index: number) => {
        setFormData(item);
        setEditingIndex(index);
        setIsAdding(true);
    };

    const startAdd = () => {
        setFormData(emptyItem);
        setEditingIndex(null);
        setIsAdding(true);
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingIndex(null);
    };

    const saveItem = async () => {
        try {
            const storedUser = sessionStorage.getItem('userData');
            if (!storedUser) return;
            const user = JSON.parse(storedUser);

            let updatedMenu = [...currentMenu];
            if (editingIndex !== null) {
                updatedMenu[editingIndex] = formData;
            } else {
                updatedMenu.push(formData);
            }

            await axios.put(`${API_URL}/api/v1/business/restaurant/${restaurantId}`, {
                ownerId: user.uid,
                menu: updatedMenu
            });

            toast.success('Menu updated successfully');
            setIsAdding(false);
            onUpdate(); // Refresh parent
        } catch (error) {
            console.error('Error saving menu:', error);
            toast.error('Failed to save menu item');
        }
    };

    const deleteItem = async (index: number) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            const storedUser = sessionStorage.getItem('userData');
            if (!storedUser) return;
            const user = JSON.parse(storedUser);

            const updatedMenu = currentMenu.filter((_, i) => i !== index);

            await axios.put(`${API_URL}/api/v1/business/restaurant/${restaurantId}`, {
                ownerId: user.uid,
                menu: updatedMenu
            });

            toast.success('Item deleted');
            onUpdate();
        } catch (error) {
            toast.error('Failed to delete item');
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Menu Management</h2>
                <button
                    onClick={startAdd}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition"
                >
                    <Plus size={18} />
                    Add Item
                </button>
            </div>

            {isAdding && (
                <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h3 className="font-bold mb-4">{editingIndex !== null ? 'Edit Item' : 'New Item'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-slate-500">Name</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-2 rounded-lg border border-slate-300"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-500">Price</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                className="w-full p-2 rounded-lg border border-slate-300"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-500">Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full p-2 rounded-lg border border-slate-300"
                            >
                                <option>Starters</option>
                                <option>Main Course</option>
                                <option>Desserts</option>
                                <option>Beverages</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-500">Image URL</label>
                            <input
                                value={formData.image}
                                onChange={e => setFormData({ ...formData, image: e.target.value })}
                                className="w-full p-2 rounded-lg border border-slate-300"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm text-slate-500">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full p-2 rounded-lg border border-slate-300"
                            />
                        </div>
                        <div className="flex gap-4 col-span-2">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.isVegetarian} onChange={e => setFormData({ ...formData, isVegetarian: e.target.checked })} />
                                <span className="text-sm">Vegetarian</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.isSpicy} onChange={e => setFormData({ ...formData, isSpicy: e.target.checked })} />
                                <span className="text-sm">Spicy</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={cancelEdit} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg">Cancel</button>
                        <button onClick={saveItem} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
                            <Save size={16} /> Save
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {currentMenu.length === 0 && !isAdding && (
                    <p className="text-center text-slate-400 py-8">No menu items yet.</p>
                )}
                {currentMenu.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:shadow-sm transition bg-white">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden">
                                {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No Img</div>}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{item.name}</h4>
                                <p className="text-sm text-slate-500">{item.category} • ${item.price}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => startEdit(item, idx)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={18} /></button>
                            <button onClick={() => deleteItem(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BusinessMenu;
