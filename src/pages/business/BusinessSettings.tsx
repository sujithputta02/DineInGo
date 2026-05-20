import React, { useState, useEffect } from 'react';
import {
    User,
    Building2,
    MapPin,
    Clock,
    DollarSign,
    UserCircle,
    ChevronRight,
    Save,
    Eye,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Search,
    Settings,
    Bell,
    Lock,
    Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { businessApi, userAPI, normalizeImageUrl } from '../../services/api';
import { auth } from '../../firebase';
import { toast } from 'react-toastify';
import BusinessLocationSelector from '../../components/BusinessLocationSelector';
import SafeImage from '../../components/SafeImage';
import ReportIssueModal from '../../components/ReportIssueModal';

interface Business {
    id: string;
    name: string;
    type: 'restaurant' | 'event' | 'both';
    location: any;
    locationData?: any;
    description?: string;
    thumbnail?: string | File | null;
    coverImage?: string | File | null;
    status: 'active' | 'paused' | 'draft';
    basePrice: number;
    normalCost?: number;
    peakTimeCost?: number;
    cuisine: string[];
    weeklySchedule: any;
    dailySlots: any[];
    slotMode: 'weekly' | 'daily';
    tierPricing: {
        standard: { price: number; defaultCapacity: number };
        premium: { price: number; defaultCapacity: number };
        vip: { price: number; defaultCapacity: number };
    };
    capacity: number;
    bookingType: 'seat-based' | 'slot-based';
}

interface UserProfile {
    uid: string;
    displayName: string;
    name: string;
    email: string;
    phoneNumber: string;
    address: {
        street: string;
        city: string;
        state: string;
        country: string;
        zipCode: string;
    };
}

function BusinessSettings() {
    const [activeTab, setActiveTab] = useState<'profile' | 'businesses'>('profile');
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showReportIssueModal, setShowReportIssueModal] = useState(false);

    // Form states
    const [profileForm, setProfileForm] = useState<UserProfile | null>(null);
    const [businessForm, setBusinessForm] = useState<Business | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) return;

            // Fetch user profile
            const userData = await userAPI.getUser(user.uid);
            setProfile(userData);
            setProfileForm(userData);

            // Fetch businesses
            const result = await businessApi.getOwnerBusinesses();
            const bizList = result.data || result;
            setBusinesses(bizList);

        } catch (error) {
            console.error('Error fetching settings data:', error);
            toast.error('Failed to load settings data');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSave = async () => {
        if (!profileForm || !profile) return;
        try {
            setSaving(true);
            await userAPI.updateUser(profile.uid, profileForm);
            setProfile(profileForm);
            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleBusinessSave = async () => {
        if (!businessForm || !selectedBusinessId) return;
        try {
            setSaving(true);
            
            // Ensure location is a string to match backend schema
            const payloadToSave = { ...businessForm };
            if (typeof payloadToSave.location === 'object' && payloadToSave.location !== null) {
                payloadToSave.location = (payloadToSave.location as any).address || 
                                         (payloadToSave.location as any).city || 
                                         JSON.stringify(payloadToSave.location);
            }
            
            await businessApi.update(selectedBusinessId, payloadToSave);

            // Update local state
            setBusinesses(prev => prev.map(b => b.id === selectedBusinessId ? payloadToSave : b));
            toast.success('Business settings updated successfully');
        } catch (error) {
            console.error('Error updating business:', error);
            toast.error('Failed to update business settings');
        } finally {
            setSaving(false);
        }
    };

    const filteredBusinesses = businesses.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderProfileTab = () => {
        if (!profileForm) return null;
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <UserCircle className="text-emerald-500" size={24} />
                        Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Full Name</label>
                            <input
                                type="text"
                                value={profileForm.name}
                                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                placeholder="Ex: John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Display Name</label>
                            <input
                                type="text"
                                value={profileForm.displayName}
                                onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                placeholder="Ex: JohnD"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Email Address</label>
                            <input
                                type="email"
                                value={profileForm.email}
                                disabled
                                className="w-full px-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-[10px] text-slate-400 ml-1">* Email cannot be changed here for security</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Phone Number</label>
                            <input
                                type="tel"
                                value={profileForm.phoneNumber}
                                onChange={e => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                placeholder="Ex: +91 9876543210"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <MapPin className="text-blue-500" size={24} />
                        Physical Address
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Street Address</label>
                            <input
                                type="text"
                                value={profileForm.address.street}
                                onChange={e => setProfileForm({ ...profileForm, address: { ...profileForm.address, street: e.target.value } })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="House No, Street Name, Area..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">City</label>
                            <input
                                type="text"
                                value={profileForm.address.city}
                                onChange={e => setProfileForm({ ...profileForm, address: { ...profileForm.address, city: e.target.value } })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ex: Bangalore"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">State</label>
                            <input
                                type="text"
                                value={profileForm.address.state}
                                onChange={e => setProfileForm({ ...profileForm, address: { ...profileForm.address, state: e.target.value } })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ex: Karnataka"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Pincode / Zip</label>
                            <input
                                type="text"
                                value={profileForm.address.zipCode}
                                onChange={e => setProfileForm({ ...profileForm, address: { ...profileForm.address, zipCode: e.target.value } })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ex: 560001"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Country</label>
                            <input
                                type="text"
                                value={profileForm.address.country}
                                onChange={e => setProfileForm({ ...profileForm, address: { ...profileForm.address, country: e.target.value } })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ex: India"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 pb-12">
                    <button
                        onClick={handleProfileSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-bold shadow-lg transition-all transform active:scale-95 ${saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-emerald-200'
                            }`}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save size={20} />
                        )}
                        {saving ? 'Saving Changes...' : 'Update Account Profile'}
                    </button>
                </div>
            </div>
        );
    };

    const renderBusinessForm = () => {
        if (!businessForm) return null;
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                    <button
                        onClick={() => {
                            setSelectedBusinessId(null);
                            setBusinessForm(null);
                        }}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                    >
                        Back
                    </button>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">{businessForm.name}</h3>
                        <p className="text-slate-500 flex items-center gap-1 text-sm">
                            <Settings size={14} />
                            Manage operational settings
                        </p>
                    </div>
                </div>

                {/* General & Identity */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Building2 className="text-purple-500" size={24} />
                        Identity & Branding
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Business Name</label>
                            <input
                                type="text"
                                value={businessForm.name}
                                onChange={e => setBusinessForm({ ...businessForm, name: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Type</label>
                            <select
                                value={businessForm.type}
                                onChange={e => setBusinessForm({ ...businessForm, type: e.target.value as any })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all appearance-none"
                            >
                                <option value="restaurant">Restaurant</option>
                                <option value="event">Event Venue</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Description</label>
                            <textarea
                                value={businessForm.description}
                                onChange={e => setBusinessForm({ ...businessForm, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                                placeholder="Give a brief overview of your business..."
                            />
                        </div>

                        {/* Image Uploads */}
                        <div className="space-y-4">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Thumbnail Image</label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative">
                                    <SafeImage
                                        src={businessForm.thumbnail instanceof File ? URL.createObjectURL(businessForm.thumbnail) : normalizeImageUrl(businessForm.thumbnail || undefined)}
                                        alt="Thumbnail"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer text-sm font-bold text-slate-700 transition-all">
                                    <Plus size={16} />
                                    Change
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) setBusinessForm({ ...businessForm, thumbnail: file });
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Cover Image</label>
                            <div className="flex items-center gap-4">
                                <div className="w-40 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative">
                                    <SafeImage
                                        src={businessForm.coverImage instanceof File ? URL.createObjectURL(businessForm.coverImage) : normalizeImageUrl(businessForm.coverImage || undefined)}
                                        alt="Cover"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer text-sm font-bold text-slate-700 transition-all">
                                    <Plus size={16} />
                                    Change
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) setBusinessForm({ ...businessForm, coverImage: file });
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Section */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <MapPin className="text-blue-500" size={24} />
                        Location & Map
                    </h3>
                    <BusinessLocationSelector
                        onLocationSelect={(locationData) => {
                            setBusinessForm({
                                ...businessForm,
                                location: locationData.address,
                                locationData
                            });
                        }}
                        initialLocation={typeof businessForm.location === 'string' ? businessForm.location : ''}
                        initialLocationData={businessForm.locationData}
                    />
                </div>

                {/* Operating Hours */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Clock className="text-orange-500" size={24} />
                        Availability & Hours
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(businessForm.weeklySchedule || {}).map(([day, schedule]: [string, any]) => (
                            <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-orange-200 transition-all">
                                <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold uppercase text-xs ${schedule.isOpen ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                                        {day.substring(0, 3)}
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={schedule.isOpen}
                                            onChange={e => {
                                                const newSchedule = { ...businessForm.weeklySchedule };
                                                newSchedule[day].isOpen = e.target.checked;
                                                setBusinessForm({ ...businessForm, weeklySchedule: newSchedule });
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                        <span className="ml-3 text-sm font-medium text-slate-600">{schedule.isOpen ? 'Open' : 'Closed'}</span>
                                    </label>
                                </div>

                                {schedule.isOpen && (
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="time"
                                            value={schedule.openTime}
                                            onChange={e => {
                                                const newSchedule = { ...businessForm.weeklySchedule };
                                                newSchedule[day].openTime = e.target.value;
                                                setBusinessForm({ ...businessForm, weeklySchedule: newSchedule });
                                            }}
                                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-bold"
                                        />
                                        <span className="text-slate-400 font-bold">to</span>
                                        <input
                                            type="time"
                                            value={schedule.closeTime}
                                            onChange={e => {
                                                const newSchedule = { ...businessForm.weeklySchedule };
                                                newSchedule[day].closeTime = e.target.value;
                                                setBusinessForm({ ...businessForm, weeklySchedule: newSchedule });
                                            }}
                                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-bold"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing & Tiers */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <DollarSign className="text-emerald-500" size={24} />
                        Pricing Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Normal Table Reservation Fee (₹)</label>
                            <input
                                type="number"
                                value={businessForm.normalCost ?? businessForm.basePrice ?? 25}
                                onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    setBusinessForm({ 
                                        ...businessForm, 
                                        normalCost: val,
                                        basePrice: val // Sync for legacy queries
                                    });
                                }}
                                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                                placeholder="Ex: 25"
                            />
                            <p className="text-[10px] text-slate-500 ml-1">Standard flat fee charged for standard table reservations.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Peak Time Surge Reservation Fee (₹)</label>
                            <input
                                type="number"
                                value={businessForm.peakTimeCost ?? 50}
                                onChange={e => setBusinessForm({ 
                                    ...businessForm, 
                                    peakTimeCost: parseInt(e.target.value) || 0 
                                })}
                                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                                placeholder="Ex: 50"
                            />
                            <p className="text-[10px] text-slate-500 ml-1">Dynamically triggered surge fee when the venue bookings are close to full (occupancy ≥ 70%).</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['standard', 'premium', 'vip'].map((tier) => (
                            <div key={tier} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 hover:shadow-md transition-all">
                                <h4 className="font-bold text-slate-800 capitalize mb-4 flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${tier === 'standard' ? 'bg-emerald-400' :
                                        tier === 'premium' ? 'bg-blue-400' : 'bg-purple-400'
                                        }`}></div>
                                    {tier} Tier
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Price (₹)</label>
                                        <input
                                            type="number"
                                            value={(businessForm.tierPricing as any)[tier].price ?? 0}
                                            onChange={e => {
                                                const newPricing = { ...businessForm.tierPricing };
                                                (newPricing as any)[tier].price = parseInt(e.target.value) || 0;
                                                setBusinessForm({ ...businessForm, tierPricing: newPricing });
                                            }}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Default Capacity</label>
                                        <input
                                            type="number"
                                            value={(businessForm.tierPricing as any)[tier].defaultCapacity ?? 0}
                                            onChange={e => {
                                                const newPricing = { ...businessForm.tierPricing };
                                                (newPricing as any)[tier].defaultCapacity = parseInt(e.target.value) || 0;
                                                setBusinessForm({ ...businessForm, tierPricing: newPricing });
                                            }}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-4 pb-12">
                    <button
                        onClick={handleBusinessSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-bold shadow-lg transition-all transform active:scale-95 ${saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-emerald-200'
                            }`}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save size={20} />
                        )}
                        {saving ? 'Saving...' : 'Update Business Settings'}
                    </button>
                </div>
            </div>
        );
    };

    const renderBusinessList = () => {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search your businesses..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                    />
                </div>

                {filteredBusinesses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBusinesses.map(biz => (
                            <motion.div
                                key={biz.id}
                                layoutId={biz.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group overflow-hidden relative cursor-pointer"
                                onClick={() => {
                                    setSelectedBusinessId(biz.id);
                                    const formClone = JSON.parse(JSON.stringify(biz)); // Deep clone for editing
                                    if (typeof formClone.location === 'object' && formClone.location !== null) {
                                        formClone.location = formClone.location.address || formClone.location.city || JSON.stringify(formClone.location);
                                    }
                                    setBusinessForm(formClone);
                                }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-2xl ${biz.type === 'restaurant' ? 'bg-orange-50 text-orange-600' :
                                        biz.type === 'event' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                        <Building2 size={24} />
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${biz.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                        biz.status === 'paused' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                        {biz.status}
                                    </div>
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 mb-1 truncate">{biz.name}</h4>
                                <p className="text-slate-500 text-sm mb-6 line-clamp-1 flex items-center gap-1">
                                    <MapPin size={12} />
                                    {typeof biz.location === 'string' ? biz.location : `${biz.locationData?.city}, ${biz.locationData?.state}`}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Base Price</span>
                                        <span className="font-bold text-slate-900">₹{biz.basePrice}</span>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all text-slate-400">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Search size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-700">No businesses found</h4>
                        <p className="text-slate-500">Try adjusting your search or add a new business.</p>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pt-8 pb-20 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Settings</h1>
                        <p className="text-slate-500 font-medium">Customize your account and business operations</p>
                    </div>

                    <div className="flex bg-white p-1.5 rounded-[24px] border border-slate-200 shadow-sm self-start">
                        <button
                            onClick={() => {
                                setActiveTab('profile');
                                setSelectedBusinessId(null);
                                setBusinessForm(null);
                            }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-[18px] text-sm font-bold transition-all ${activeTab === 'profile'
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <User size={18} />
                            Account Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('businesses')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-[18px] text-sm font-bold transition-all ${activeTab === 'businesses'
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <Building2 size={18} />
                            My Businesses
                        </button>
                    </div>
                </header>

                {/* Report Issue Section */}
                <div className="mb-6 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                                <AlertCircle className="text-red-500" size={20} />
                                Report an Issue
                            </h3>
                            <p className="text-sm text-slate-500">
                                Found a bug or have feedback about the platform? Let us know!
                            </p>
                        </div>
                        <button
                            onClick={() => setShowReportIssueModal(true)}
                            className="px-6 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all flex items-center gap-2 font-semibold shadow-lg shadow-red-500/20"
                        >
                            <AlertCircle size={18} />
                            Report Issue
                        </button>
                    </div>
                </div>

                <main className="relative min-h-[600px]">
                    <AnimatePresence mode="wait">
                        {!selectedBusinessId && activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                {renderProfileTab()}
                            </motion.div>
                        )}
                        {!selectedBusinessId && activeTab === 'businesses' && (
                            <motion.div
                                key="biz-list"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                {renderBusinessList()}
                            </motion.div>
                        )}
                        {selectedBusinessId && (
                            <motion.div
                                key="biz-form"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                            >
                                {renderBusinessForm()}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* Report Issue Modal */}
            <ReportIssueModal
                isOpen={showReportIssueModal}
                onClose={() => setShowReportIssueModal(false)}
                userType="business"
                userId={auth.currentUser?.uid}
                userEmail={profile?.email}
                userName={profile?.displayName || profile?.name}
            />
        </div>
    );
}

export default BusinessSettings;
