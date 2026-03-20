import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../../utils/sessionGuard';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Loader2, Upload, MapPin, DollarSign, Phone } from 'lucide-react';

const API_URL = API_CONFIG.BASE_URL;

const RestaurantOnboarding: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // For multi-step if needed later, currently keeping it single for speed

    const [formData, setFormData] = useState({
        name: '',
        cuisineStr: '', // comma separated ui
        address: '',
        city: '',
        state: '',
        country: 'India',
        phoneNumber: '',
        priceLevel: '2',
        image: '',
        description: 'A great place to dine.'
    });

    const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
    const [isCompressing, setIsCompressing] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large. Please select an image under 5MB.");
            return;
        }

        setIsCompressing(true);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG

                setFormData(prev => ({ ...prev, image: compressedDataUrl }));
                setIsCompressing(false);
                toast.success("Image uploaded!");
            };
        };
        reader.onerror = () => {
            toast.error("Failed to read file");
            setIsCompressing(false);
        };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const storedUser = sessionStorage.getItem('userData');
            if (!storedUser) throw new Error("Not authenticated");
            const user = JSON.parse(storedUser);

            const payload = {
                ownerId: user.uid,
                name: formData.name,
                cuisine: formData.cuisineStr.split(',').map(c => c.trim()),
                address: `${formData.address}, ${formData.city}`,
                location: {
                    city: formData.city,
                    state: formData.state,
                    country: formData.country
                },
                priceLevel: parseInt(formData.priceLevel),
                phoneNumber: formData.phoneNumber,
                image: formData.image,
                rating: 4.5, // Default start
                menu: [] // Empty menu to start
            };

            // Generate a random restaurantId similar to existing ones if not provided by backend logic?
            // Mongoose schema says restaurantId is required string. 
            // The old RestaurantController doesn't generate it automatically?
            // Let's check Restaurant model constraints. restaurantId required unique.
            // I'll generate a random one here or let backend handle if it was auto-gen (UUID).
            // Backend createRestaurant just does `new Restaurant(req.body)`. So I must provide it.
            const restaurantId = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

            await axios.post(`${API_URL}/api/v1/business/restaurant`, { ...payload, restaurantId });

            toast.success("Restaurant registered successfully!");
            const token = createSession(user.uid);
            navigate(`/business/app/dashboard/${token}`);
        } catch (error: any) {
            console.error("Registration Error:", error);
            toast.error(error.response?.data?.message || "Failed to register restaurant");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-slate-900">Register Your Restaurant</h1>
                <p className="text-slate-500 mt-2">Tell us about your venue so customers can find you.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 border-b pb-2">Basic Info</h3>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Restaurant Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. The Green Olive"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cuisines (comma separated)</label>
                        <input
                            name="cuisineStr"
                            value={formData.cuisineStr}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. Italian, Pizza, Pasta"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                        <input
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="+91 98765 43210"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 border-b pb-2 pt-4">Location</h3>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                        <input
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="123 Main St"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                            <input
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Mumbai"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                            <input
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Maharashtra"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 border-b pb-2 pt-4">Details</h3>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Price Level</label>
                        <select
                            name="priceLevel"
                            value={formData.priceLevel}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="1">$ (Budget)</option>
                            <option value="2">$$ (Casual)</option>
                            <option value="3">$$$ (Upscale)</option>
                            <option value="4">$$$$ (Fine Dining)</option>
                            <option value="5">$$$$$ (Luxury)</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image</label>

                        <div className="flex gap-4 mb-4 border-b border-slate-200">
                            <button
                                type="button"
                                onClick={() => setUploadMode('url')}
                                className={`pb-2 px-2 font-medium transition-colors ${uploadMode === 'url' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500'}`}
                            >
                                Image URL
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadMode('file')}
                                className={`pb-2 px-2 font-medium transition-colors ${uploadMode === 'file' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500'}`}
                            >
                                Upload File
                            </button>
                        </div>

                        {uploadMode === 'url' ? (
                            <input
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="https://..."
                            />
                        ) : (
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {isCompressing ? (
                                    <div className="flex flex-col items-center text-emerald-600">
                                        <Loader2 className="animate-spin mb-2" />
                                        <span>Compressing...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-500">
                                        <Upload className="mb-2" size={24} />
                                        <span className="font-medium">Click to Upload Image</span>
                                        <span className="text-xs mt-1">Max 2MB. Stored securely.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.image && (
                            <div className="mt-4 relative rounded-xl overflow-hidden h-48 border border-slate-200">
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                                >
                                    <Upload size={16} className="rotate-45" /> {/* X icon workaround */}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RestaurantOnboarding;
