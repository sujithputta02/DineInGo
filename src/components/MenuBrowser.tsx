import React, { useState, useEffect } from 'react';
import { menuApi, normalizeImageUrl } from '../services/api';
import { X, Search, Filter, ChevronDown, ChevronUp, Plus, Minus, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    isPopular: boolean;
}

interface MenuCategory {
    _id: string;
    name: string;
    description?: string;
    items: MenuItem[];
}

interface MenuBrowserProps {
    businessId: string;
    isOpen: boolean;
    onClose: () => void;
    allowOrdering?: boolean;
    onAddToOrder?: (item: MenuItem, quantity: number, specialRequests?: string) => void;
}

const DIETARY_TAGS = [
    { id: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
    { id: 'vegan', label: 'Vegan', icon: '🌱' },
    { id: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
    { id: 'dairy-free', label: 'Dairy-Free', icon: '🥛' },
    { id: 'halal', label: 'Halal', icon: '🕌' },
    { id: 'kosher', label: 'Kosher', icon: '✡️' },
    { id: 'keto', label: 'Keto', icon: '🥩' },
    { id: 'paleo', label: 'Paleo', icon: '🍖' },
    { id: 'organic', label: 'Organic', icon: '🌿' }
];

const MenuBrowser: React.FC<MenuBrowserProps> = ({
    businessId,
    isOpen,
    onClose,
    allowOrdering = false,
    onAddToOrder
}) => {
    const [menuData, setMenuData] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtering states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');

    // Item detail modal
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [specialRequests, setSpecialRequests] = useState('');

    useEffect(() => {
        if (isOpen && businessId) {
            fetchMenu();
        }
    }, [isOpen, businessId]);

    const fetchMenu = async () => {
        try {
            setLoading(true);
            const res = await menuApi.getFullMenu(businessId);
            if (res.success) {
                setMenuData(res.data);
            } else {
                setError('Failed to load menu');
            }
        } catch (err) {
            setError('Failed to load menu');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredMenu = menuData.map(category => ({
        ...category,
        items: category.items.filter(item => {
            // Search filter
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase());

            // Dietary tag filter (must match all selected tags)
            const matchesTags = selectedTags.length === 0 ||
                selectedTags.every(tag => item.dietaryTags.includes(tag));

            return matchesSearch && matchesTags;
        })
    })).filter(category => category.items.length > 0);

    const handleAddToCart = () => {
        if (selectedItem && onAddToOrder) {
            onAddToOrder(selectedItem, quantity, specialRequests);
            setSelectedItem(null);
            setQuantity(1);
            setSpecialRequests('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full h-full md:h-[90vh] md:w-[90vw] md:max-w-6xl md:rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
            >
                {/* Mobile Header */}
                <div className="md:hidden p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Sidebar Filters (Desktop) */}
                <div className="hidden md:flex flex-col w-80 bg-gray-50 border-r border-gray-100 h-full overflow-y-auto">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>

                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search dishes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Categories</h3>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setActiveCategory('all')}
                                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'all'
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/10'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        All Categories
                                    </button>
                                    {menuData.map(category => (
                                        <button
                                            key={category._id}
                                            onClick={() => {
                                                setActiveCategory(category._id);
                                                document.getElementById(`category-${category._id}`)?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === category._id
                                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/10'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Dietary Preferences</h3>
                                <div className="flex flex-wrap gap-2">
                                    {DIETARY_TAGS.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => {
                                                setSelectedTags(prev =>
                                                    prev.includes(tag.id)
                                                        ? prev.filter(t => t !== tag.id)
                                                        : [...prev, tag.id]
                                                );
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${selectedTags.includes(tag.id)
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <span>{tag.icon}</span>
                                            {tag.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto p-6 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                        >
                            Close Menu
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 h-full overflow-y-auto bg-white p-4 md:p-8 relative">
                    <button
                        onClick={onClose}
                        className="hidden md:block absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Mobile Filters */}
                    <div className="md:hidden mb-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                            {DIETARY_TAGS.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => {
                                        setSelectedTags(prev =>
                                            prev.includes(tag.id)
                                                ? prev.filter(t => t !== tag.id)
                                                : [...prev, tag.id]
                                        );
                                    }}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${selectedTags.includes(tag.id)
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                            : 'bg-white text-gray-600 border-gray-200'
                                        }`}
                                >
                                    <span>{tag.icon}</span>
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                        </div>
                    ) : error ? (
                        <div className="flex h-64 items-center justify-center flex-col text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                                <ShoppingBag size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Oops!</h3>
                            <p className="text-gray-500">{error}</p>
                            <button
                                onClick={fetchMenu}
                                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredMenu.length === 0 ? (
                        <div className="flex h-64 items-center justify-center flex-col text-center">
                            <p className="text-gray-500 mb-2">No items found matching your filters.</p>
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedTags([]); }}
                                className="text-emerald-600 font-medium hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12 pb-24 md:pb-0">
                            {filteredMenu.map(category => (
                                <div key={category._id} id={`category-${category._id}`} className="scroll-mt-6">
                                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                        {category.name}
                                        <div className="h-px flex-1 bg-gray-100"></div>
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {category.items.map(item => (
                                            <motion.div
                                                layout
                                                key={item._id}
                                                onClick={() => allowOrdering && item.isAvailable ? setSelectedItem(item) : null}
                                                className={`group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all ${allowOrdering && item.isAvailable ? 'cursor-pointer hover:border-emerald-200' : ''
                                                    } ${!item.isAvailable ? 'opacity-60' : ''}`}
                                            >
                                                <div className="flex h-32 md:h-40">
                                                    <div className="w-32 md:w-40 h-full bg-gray-100 flex-shrink-0 relative">
                                                        {item.image ? (
                                                            <img src={normalizeImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <ShoppingBag size={32} />
                                                            </div>
                                                        )}
                                                        {item.isPopular && (
                                                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                                                                Popular
                                                            </div>
                                                        )}
                                                        {!item.isAvailable && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                <span className="px-2 py-1 bg-white text-gray-900 text-xs font-bold rounded shadow-sm">Sold Out</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 p-4 flex flex-col">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                                                            <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-sm">₹{item.price}</span>
                                                        </div>

                                                        <p className="text-sm text-gray-500 line-clamp-2 mb-auto">{item.description}</p>

                                                        <div className="mt-3 flex flex-wrap gap-1">
                                                            {item.dietaryTags.slice(0, 3).map(tag => (
                                                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-100">
                                                                    {DIETARY_TAGS.find(t => t.id === tag)?.icon} {DIETARY_TAGS.find(t => t.id === tag)?.label}
                                                                </span>
                                                            ))}
                                                            {item.dietaryTags.length > 3 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
                                                                    +{item.dietaryTags.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Item Details Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="relative h-48 md:h-56 bg-gray-100">
                                {selectedItem.image ? (
                                    <img src={normalizeImageUrl(selectedItem.image)} alt={selectedItem.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <ShoppingBag size={48} />
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-gray-900">{selectedItem.name}</h3>
                                    <span className="text-lg font-bold text-emerald-600">₹{selectedItem.price}</span>
                                </div>

                                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{selectedItem.description}</p>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {selectedItem.dietaryTags.map(tag => (
                                        <span key={tag} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-full border border-gray-100 flex items-center gap-1">
                                            {DIETARY_TAGS.find(t => t.id === tag)?.icon} {DIETARY_TAGS.find(t => t.id === tag)?.label}
                                        </span>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-700">Quantity</span>
                                        <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                            <button
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-600"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="w-6 text-center font-bold text-gray-900">{quantity}</span>
                                            <button
                                                onClick={() => setQuantity(quantity + 1)}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-600"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Special requests (optional)
                                        </label>
                                        <textarea
                                            value={specialRequests}
                                            onChange={(e) => setSpecialRequests(e.target.value)}
                                            placeholder="e.g. No onions, extra spicy..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            rows={2}
                                        />
                                    </div>

                                    <button
                                        onClick={handleAddToCart}
                                        className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-900/10 flex justify-between items-center px-6"
                                    >
                                        <span>Add to Order</span>
                                        <span>₹{(selectedItem.price * quantity).toFixed(2)}</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MenuBrowser;
