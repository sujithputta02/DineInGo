import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, ShoppingCart, Users as UsersIcon, Camera, Loader2, Info } from 'lucide-react';
import { adminApi } from '../utils/adminApi';
import { menuApi } from '../services/api';
import WaitlistManagement from './business/WaitlistManagement';
import PreOrderManagement from './business/PreOrderManagement';
import ARMenuSection from '../components/ARMenuSection';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

const AdminSandboxPage: React.FC = () => {
    const [sandboxTab, setSandboxTab] = useState<'pre-orders' | 'waitlist' | 'ar-menu'>('pre-orders');
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    const [arMenuItems, setArMenuItems] = useState<any[]>([]);
    const [loadingARMenu, setLoadingARMenu] = useState(false);
    const { isEnabled } = useFeatureFlags();

    const availableFeatures = [
        { id: 'pre-orders', label: 'Pre-order Engine', icon: ShoppingCart, flag: 'preOrders' },
        { id: 'waitlist', label: 'Universal Waitlist', icon: UsersIcon, flag: 'waitlist' },
        { id: 'ar-menu', label: 'AR Interactive Menu', icon: Camera, flag: 'arMenus' }
    ].filter(f => !isEnabled(f.flag as any));

    useEffect(() => {
        if (availableFeatures.length > 0 && !availableFeatures.find(f => f.id === sandboxTab)) {
            setSandboxTab(availableFeatures[0].id as any);
        }
    }, [availableFeatures, sandboxTab]);

    useEffect(() => {
        loadBusinesses();
    }, []);

    useEffect(() => {
        if (selectedBusinessId && sandboxTab === 'ar-menu') {
            loadARMenu(selectedBusinessId);
        }
    }, [selectedBusinessId, sandboxTab]);

    const loadBusinesses = async () => {
        try {
            setLoadingBusinesses(true);
            const res = await adminApi.getBusinesses({ limit: 100 });
            if (res.success) {
                setBusinesses(res.businesses);
                if (res.businesses.length > 0) {
                    setSelectedBusinessId(res.businesses[0]._id);
                }
            }
        } catch (error) {
            console.error('Failed to load businesses for sandbox');
        } finally {
            setLoadingBusinesses(false);
        }
    };

    const loadARMenu = async (businessId: string) => {
        try {
            setLoadingARMenu(true);
            const fullMenu = await menuApi.getFullMenu(businessId);
            const allItems = fullMenu.categories.flatMap((cat: any) =>
                cat.items.map((item: any) => ({
                    ...item,
                    categoryName: cat.name
                }))
            );
            setArMenuItems(allItems);
        } catch (error) {
            console.error('Error loading AR menu:', error);
            setArMenuItems([]);
        } finally {
            setLoadingARMenu(false);
        }
    };

    const translations = {
        arMenu: 'AR Interactive Menu',
        arExperience: 'Exploring Dishes',
        nutritionInfo: 'Nutrition',
        ingredients: 'Ingredients',
        scanMenu: 'Scan Your Dish',
        cookingMethod: 'Cooking Method'
    };

    if (loadingBusinesses) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-bold uppercase tracking-widest">Entering Lab Environment...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-2xl shadow-lg shadow-red-100">
                            <FlaskConical className="text-red-600" size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">Developer Sandbox</h1>
                            <p className="text-slate-500 font-medium">Test unreleased features in an isolated production environment</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full border border-emerald-200">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">LIVE DATA ACCESS</span>
                </div>
            </div>

            {/* Sandbox Controls */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Info size={12} /> Target Business
                        </label>
                        <select
                            value={selectedBusinessId}
                            onChange={(e) => setSelectedBusinessId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-red-100 outline-none transition-all appearance-none cursor-pointer"
                        >
                            {businesses.map(b => (
                                <option key={b._id} value={b._id}>{b.name} • {b.type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="lg:col-span-2">
                         <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Feature Under Development</label>
                         <div className="flex flex-wrap gap-3">
                             {availableFeatures.length > 0 ? (
                                 availableFeatures.map(feature => (
                                     <button
                                         key={feature.id}
                                         onClick={() => setSandboxTab(feature.id as any)}
                                         className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${
                                             sandboxTab === feature.id
                                                 ? 'bg-red-600 text-white shadow-xl shadow-red-200'
                                                 : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                         }`}
                                     >
                                         <feature.icon size={20} />
                                         {feature.label}
                                     </button>
                                 ))
                             ) : (
                                 <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
                                     <FlaskConical size={16} />
                                     All features currently live in production
                                 </div>
                             )}
                         </div>
                     </div>
                </div>
            </div>

            {/* Sandbox Viewport */}
            <motion.div
                key={sandboxTab + selectedBusinessId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden min-h-[600px] relative"
            >
                <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sandbox Preview Session</span>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] font-mono text-slate-500">
                        <span>CONTEXT: {businesses.find(b => b._id === selectedBusinessId)?.name}</span>
                        <span>UID: {selectedBusinessId}</span>
                    </div>
                </div>

                 <div className="p-8">
                     {availableFeatures.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-20 text-center">
                             <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                                 <FlaskConical className="text-emerald-600" size={40} />
                             </div>
                             <h3 className="text-2xl font-black text-slate-900 mb-2">System Stable</h3>
                             <p className="text-slate-500 max-w-md">All developer features have been promoted to stable. There are no features currently in the sandbox pipeline.</p>
                         </div>
                     ) : (
                         <>
                             {sandboxTab === 'pre-orders' && (
                                 <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                     <PreOrderManagement businessId={selectedBusinessId} />
                                 </div>
                             )}
                             {sandboxTab === 'waitlist' && (
                                 <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                     <WaitlistManagement businessId={selectedBusinessId} />
                                 </div>
                             )}
                             {sandboxTab === 'ar-menu' && (
                                 <div className="bg-slate-900 rounded-3xl overflow-hidden min-h-[500px]">
                                     {loadingARMenu ? (
                                         <div className="flex flex-col items-center justify-center p-20 text-white">
                                             <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
                                             <p className="text-sm font-bold uppercase tracking-widest opacity-60">Loading AR Models...</p>
                                         </div>
                                     ) : (
                                         <ARMenuSection
                                             isDarkMode={true}
                                             language="english"
                                             translations={translations}
                                             menuItems={arMenuItems}
                                         />
                                     )}
                                 </div>
                             )}
                         </>
                     )}
                 </div>

                {/* Developer Console Placeholder */}
                <div className="absolute bottom-4 right-4 px-4 py-2 bg-slate-900/10 backdrop-blur-md border border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none">
                    Dev Mode v1.0 Beta
                </div>
            </motion.div>
        </div>
    );
};

export default AdminSandboxPage;
