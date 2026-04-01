import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    ChevronRight,
    ChevronLeft,
    Heart,
    Zap,
    Bell,
    DollarSign,
    CheckCircle2,
    UtensilsCrossed,
    Leaf,
    Clock,
    Star,
    Sparkles,
    Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { userPreferenceApi, userAPI } from '../services/api';
import { toast } from 'react-toastify';
import { persistUserSession, getSessionToken } from '../utils/sessionGuard';

const CUISINES = [
    { id: 'indian', name: 'Indian', icon: '🥘', color: 'from-orange-500/20 to-red-500/20' },
    { id: 'italian', name: 'Italian', icon: '🍝', color: 'from-green-500/20 to-red-500/20' },
    { id: 'chinese', name: 'Chinese', icon: '🍜', color: 'from-red-500/20 to-yellow-500/20' },
    { id: 'japanese', name: 'Japanese', icon: '🍣', color: 'from-pink-500/20 to-red-500/20' },
    { id: 'mexican', name: 'Mexican', icon: '🌮', color: 'from-yellow-500/20 to-green-500/20' },
    { id: 'american', name: 'American', icon: '🍔', color: 'from-blue-500/20 to-red-500/20' },
    { id: 'french', name: 'French', icon: '🥐', color: 'from-blue-500/10 to-blue-200/10' },
    { id: 'thai', name: 'Thai', icon: '🍲', color: 'from-orange-400/20 to-yellow-400/20' },
    { id: 'mediterranean', name: 'Mediterranean', icon: '🥗', color: 'from-blue-400/20 to-cyan-400/20' },
    { id: 'korean', name: 'Korean', icon: '🍱', color: 'from-red-600/20 to-blue-600/20' },
    { id: 'middle-eastern', name: 'Middle Eastern', icon: '🥙', color: 'from-yellow-600/20 to-amber-600/20' },
    { id: 'continental', name: 'Continental', icon: '🍴', color: 'from-neutral-500/20 to-neutral-200/20' },
];

const DIETARY = [
    { id: 'vegan', label: 'Vegan', icon: '🌱', desc: 'No animal products' },
    { id: 'vegetarian', label: 'Vegetarian', icon: '🥗', desc: 'No meat or fish' },
    { id: 'gluten-free', label: 'Gluten-Free', icon: '🌾', desc: 'No wheat/gluten' },
    { id: 'dairy-free', label: 'Dairy-Free', icon: '🥛', desc: 'No lactose' },
    { id: 'keto', label: 'Keto', icon: '🥑', desc: 'High fat, low carb' },
    { id: 'halal', label: 'Halal', icon: '☪️', desc: 'Halal certified' },
    { id: 'jain', label: 'Jain', icon: '🙏', desc: 'No root vegetables' },
];

const ALLERGENS = [
    'Peanuts', 'Tree Nuts', 'Dairy', 'Eggs', 'Soy', 'Wheat', 'Shellfish', 'Fish', 'Mustard', 'Sesame'
];

const OnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(0);
    const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
    const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
    const [priceRange, setPriceRange] = useState(2);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState({
        marketing: true,
        reminders: true,
        offers: true
    });
    const [dinoReaction, setDinoReaction] = useState<'neutral' | 'heart' | 'yum' | 'fire' | 'leaf'>('neutral');
    const [dinoMessage, setDinoMessage] = useState("Rawr! I'm so excited to build your profile!");
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    useEffect(() => {
        if (!currentUser) {
            const timer = setTimeout(() => {
                if (!currentUser) navigate('/login');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [currentUser, navigate]);

    const handleNext = () => {
        setDirection(1);
        setStep(prev => prev + 1);
    };
    const handleBack = () => {
        setDirection(-1);
        setStep(prev => prev - 1);
    };

    const toggleCuisine = (id: string) => {
        const isSelecting = !selectedCuisines.includes(id);
        setSelectedCuisines(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );

        if (isSelecting) {
            const spicyCuisines = ['indian', 'mexican', 'thai', 'chinese', 'korean'];
            if (spicyCuisines.includes(id.toLowerCase())) {
                setDinoReaction('fire');
                setDinoMessage("Ooh! I love a bit of heat! Stomp-tastic choice!");
            } else {
                setDinoReaction('yum');
                setDinoMessage(`Yum! ${id} is a prehistoric favorite of mine!`);
            }
            setTimeout(() => setDinoReaction('neutral'), 3000);
        }
    };

    const toggleDietary = (id: string) => {
        const isSelecting = !dietaryPrefs.includes(id);
        setDietaryPrefs(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );

        if (isSelecting) {
            setDinoReaction('leaf');
            setDinoMessage(`Eating clean! Dino approves of the ${id} lifestyle!`);
            setTimeout(() => setDinoReaction('neutral'), 3000);
        }
    };

    const toggleAllergen = (id: string) => {
        setSelectedAllergens(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleRequestNotifications = async () => {
        if (!('Notification' in window)) {
            toast.warn("This browser does not support notifications.");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if (permission === 'granted') {
                setNotifications({
                    marketing: true,
                    reminders: true,
                    offers: true
                });
                toast.success("Notifications enabled! You'll stay updated.");
            } else if (permission === 'denied') {
                toast.error("Notification permission denied. You can enable them in browser settings.");
            }
        } catch (error) {
            console.error("Error requesting notifications:", error);
        }
    };

    const handleComplete = async () => {
        if (!currentUser) return;
        setLoading(true);

        try {
            await userPreferenceApi.upsert({
                userId: currentUser.uid,
                cuisines: selectedCuisines.map(c => ({ name: c, score: 50 })),
                dietaryPreferences: dietaryPrefs,
                allergens: selectedAllergens,
                averageSpend: priceRange * 500,
                notificationSettings: notifications
            });

            // 🛡️ IRON GATE: Mark onboarding as officially complete in DB
            await userAPI.updateOnboardingStatus(currentUser.uid, true);

            // Trigger premium confetti
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            toast.success("Preferences saved! Welcome to DineInGo.");
            
            // Fetch fresh user data including token for correct dashboard redirection
            const freshUser = await userAPI.fetchUserData(currentUser.uid);
            
            if (freshUser) {
                // atomicaly update session tokens and user data 
                const token = persistUserSession(freshUser, currentUser.uid);
                
                setTimeout(() => {
                    if (token) {
                        navigate(`/dashboard/${token}`, { replace: true });
                    } else {
                        navigate('/login', { replace: true });
                    }
                }, 2000);
            } else {
                console.warn("Could not fetch fresh user token after onboarding");
                // Fallback attempt with existing session if available
                const token = getSessionToken();
                
                setTimeout(() => {
                    if (token) {
                        navigate(`/dashboard/${token}`, { replace: true });
                    } else {
                        navigate('/login', { replace: true });
                    }
                }, 2000);
            }
        } catch (error) {
            console.error("Error saving preferences:", error);
            toast.error("Failed to save preferences. Redirecting to dashboard...");
            
            // Fallback redirect even on error
            try {
                const freshUser = await userAPI.fetchUserData(currentUser.uid);
                if (freshUser) {
                    const token = persistUserSession(freshUser, currentUser.uid);
                    navigate(`/dashboard/${token}`, { replace: true });
                    return;
                }
            } catch (e) {
                console.error("Fallback fetch failed:", e);
            }

            const token = getSessionToken();
            if (token) {
                navigate(`/dashboard/${token}`, { replace: true });
            } else {
                navigate('/login', { replace: true });
            }
        } finally {
            setLoading(false);
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.9
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.4 },
                scale: { duration: 0.4 }
            }
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.9,
            transition: {
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.4 }
            }
        })
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden selection:bg-emerald-500/30 relative">
            {/* Dino Onboarding Host */}
            <motion.div
                className="fixed bottom-10 left-10 z-[100] hidden xl:flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl"
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1 }}
            >
                <div className="relative">
                    <motion.div
                        animate={{
                            y: [0, -10, 0],
                            scale: dinoReaction !== 'neutral' ? [1, 1.2, 1] : 1
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center p-3 border border-emerald-500/30 overflow-visible relative"
                    >
                        <img src="/images/Dino Icon.svg" alt="Dino Host" className="w-full h-full object-contain" />

                        {/* Reaction Emojis Overlay */}
                        <AnimatePresence>
                            {dinoReaction === 'fire' && (
                                <motion.span
                                    initial={{ scale: 0, opacity: 0, y: 0 }}
                                    animate={{ scale: 1.5, opacity: 1, y: -40 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center text-3xl"
                                >
                                    🔥
                                </motion.span>
                            )}
                            {dinoReaction === 'yum' && (
                                <motion.span
                                    initial={{ scale: 0, opacity: 0, y: 0 }}
                                    animate={{ scale: 1.5, opacity: 1, y: -40 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center text-3xl"
                                >
                                    😋
                                </motion.span>
                            )}
                            {dinoReaction === 'leaf' && (
                                <motion.span
                                    initial={{ scale: 0, opacity: 0, y: 0 }}
                                    animate={{ scale: 1.5, opacity: 1, y: -40 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center text-3xl"
                                >
                                    🥗
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
                <div className="max-w-[200px]">
                    <p className="text-xs uppercase tracking-widest text-emerald-400 font-black mb-1">Dino Host</p>
                    <p className="text-sm text-white/80 font-medium leading-tight">{dinoMessage}</p>
                </div>
            </motion.div>
            {/* Liquid Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        rotate: [0, 10, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[150px] rounded-full"
                />
                <motion.div
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 50, 0],
                        rotate: [0, -10, 0],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 blur-[150px] rounded-full"
                />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-150 mix-blend-overlay"></div>
            </div>

            <div className="w-full max-w-5xl relative z-10">
                {/* Progress Tracking */}
                <div className="mb-16 flex flex-col items-center">
                    <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden max-w-md">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / 4) * 100}%` }}
                            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                        />
                    </div>
                    <div className="mt-4 flex gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <motion.div
                                key={i}
                                initial={false}
                                animate={{
                                    scale: step === i ? 1.2 : 1,
                                    opacity: step >= i ? 1 : 0.3
                                }}
                                className={`w-2 h-2 rounded-full ${step >= i ? 'bg-emerald-500' : 'bg-neutral-700'}`}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="w-full"
                    >
                        {step === 1 && (
                            <div className="text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 15 }}
                                    className="mb-10 inline-flex p-6 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 backdrop-blur-xl"
                                >
                                    <Sparkles className="w-16 h-16 text-emerald-400" />
                                </motion.div>
                                <motion.h1
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-6xl sm:text-7xl font-bold mb-8 tracking-tighter"
                                >
                                    Taste is <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500">Personal</span>.
                                </motion.h1>
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-xl text-neutral-400 mb-14 max-w-2xl mx-auto font-light leading-relaxed"
                                >
                                    Your journey on DineInGo starts with your palate. Let's craft an experience curated exclusively for you.
                                </motion.p>
                                <motion.button
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    onClick={handleNext}
                                    className="group relative px-10 py-5 bg-white text-black font-black rounded-full overflow-hidden transition-all hover:pr-14 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95"
                                >
                                    <span className="relative z-10 flex items-center gap-3 text-lg">
                                        Let's Begin <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </motion.button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="w-full">
                                <div className="text-center mb-16">
                                    <h2 className="text-5xl font-bold mb-4">The Palette</h2>
                                    <p className="text-neutral-400 text-lg">Pick 3 or more culinary worlds you love exploring.</p>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16 px-4">
                                    {CUISINES.map((cuisine, idx) => (
                                        <motion.button
                                            key={cuisine.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => toggleCuisine(cuisine.name)}
                                            className={`group relative p-8 rounded-[2rem] border transition-all duration-500 overflow-hidden ${selectedCuisines.includes(cuisine.name)
                                                ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-[1.02]'
                                                : 'bg-neutral-900/40 border-neutral-800/50 hover:border-neutral-700/50 backdrop-blur-md'
                                                }`}
                                        >
                                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${cuisine.color}`}></div>
                                            <div className="relative z-10 flex flex-col items-center gap-4">
                                                <span className="text-5xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-500">{cuisine.icon}</span>
                                                <span className={`text-lg font-bold transition-colors ${selectedCuisines.includes(cuisine.name) ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                                                    {cuisine.name}
                                                </span>
                                            </div>
                                            {selectedCuisines.includes(cuisine.name) && (
                                                <motion.div
                                                    layoutId="selection"
                                                    className="absolute top-4 right-4 text-emerald-400"
                                                >
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center px-4 max-w-4xl mx-auto">
                                    <button onClick={handleBack} className="text-neutral-500 hover:text-white flex items-center gap-3 text-lg font-medium transition-colors">
                                        <ChevronLeft className="w-6 h-6" /> Back
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={selectedCuisines.length < 3}
                                        className={`px-10 py-5 rounded-full font-black text-lg flex items-center gap-3 transition-all ${selectedCuisines.length >= 3
                                            ? 'bg-white text-black hover:scale-105 shadow-xl'
                                            : 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800'
                                            }`}
                                    >
                                        Next <ChevronRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="w-full max-w-4xl mx-auto px-4">
                                <div className="text-center mb-16">
                                    <h2 className="text-5xl font-bold mb-4">Values & Health</h2>
                                    <p className="text-neutral-400 text-lg">Your well-being is our priority. Specify your needs.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                                    {DIETARY.map((pref, idx) => (
                                        <motion.button
                                            key={pref.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => toggleDietary(pref.label)}
                                            className={`p-6 rounded-3xl border text-left transition-all duration-500 ${dietaryPrefs.includes(pref.label)
                                                ? 'bg-emerald-500/10 border-emerald-500/50 scale-[1.02]'
                                                : 'bg-neutral-900/40 border-neutral-800'
                                                }`}
                                        >
                                            <div className="flex gap-4">
                                                <span className="text-4xl">{pref.icon}</span>
                                                <div>
                                                    <h4 className="font-bold text-lg">{pref.label}</h4>
                                                    <p className="text-sm text-neutral-500">{pref.desc}</p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="bg-neutral-900/50 border border-neutral-800 p-10 rounded-[2.5rem] mb-16">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-3 rounded-2xl bg-red-500/10">
                                            <Shield className="w-6 h-6 text-red-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold">Allergens</h3>
                                            <p className="text-neutral-500">Select any ingredients we should flag for you.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {ALLERGENS.map(allergen => (
                                            <button
                                                key={allergen}
                                                onClick={() => toggleAllergen(allergen)}
                                                className={`px-8 py-3 rounded-2xl border text-base font-bold transition-all ${selectedAllergens.includes(allergen)
                                                    ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                                                    : 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                                                    }`}
                                            >
                                                {allergen}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <button onClick={handleBack} className="text-neutral-500 hover:text-white flex items-center gap-3 text-lg font-medium transition-colors">
                                        <ChevronLeft className="w-6 h-6" /> Back
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="px-10 py-5 bg-white text-black rounded-full font-black text-lg flex items-center gap-3 hover:scale-105 shadow-xl transition-all"
                                    >
                                        Almost There <ChevronRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="w-full max-w-4xl mx-auto px-4">
                                <div className="text-center mb-16">
                                    <h2 className="text-5xl font-bold mb-4">Finishing Touches</h2>
                                    <p className="text-neutral-400 text-lg">Define how you want to interact with the city.</p>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-10 mb-16">
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-neutral-900/40 border border-neutral-800 p-10 rounded-[2.5rem] backdrop-blur-md"
                                    >
                                        <div className="flex items-center gap-4 mb-8">
                                            <DollarSign className="w-8 h-8 text-emerald-400" />
                                            <h3 className="text-2xl font-bold">Planned Spend</h3>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                            {[1, 2, 3, 4].map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => setPriceRange(val)}
                                                    className={`p-4 rounded-2xl border transition-all text-center ${priceRange === val
                                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                                        : 'bg-neutral-800 border-neutral-700 text-neutral-500'
                                                        }`}
                                                >
                                                    <span className="text-xl sm:text-2xl font-black">{'$'.repeat(val)}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="mt-6 text-sm text-neutral-500 text-center font-medium">
                                            Estimated budget: {(priceRange * 500).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </p>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-neutral-900/40 border border-neutral-800 p-10 rounded-[2.5rem] backdrop-blur-md"
                                    >
                                        <div className="flex items-center justify-between gap-4 mb-8">
                                            <div className="flex items-center gap-4">
                                                <Bell className="w-8 h-8 text-blue-400" />
                                                <h3 className="text-2xl font-bold">Communication</h3>
                                            </div>
                                            {permissionStatus !== 'granted' && (
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={handleRequestNotifications}
                                                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold border border-blue-500/30 hover:bg-blue-500/30 transition-all flex items-center gap-2"
                                                >
                                                    <Zap className="w-3 h-3" /> Enable Alerts
                                                </motion.button>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            {Object.entries(notifications).map(([key, value]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setNotifications(prev => ({ ...prev, [key]: !value }))}
                                                    className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all duration-500 ${value
                                                        ? 'bg-neutral-800 border-neutral-600'
                                                        : 'bg-transparent border-neutral-800 opacity-60'
                                                        }`}
                                                >
                                                    <span className="capitalize text-lg font-bold">
                                                        {key === 'reminders' ? 'Bookings' : key === 'offers' ? 'VIP Offers' : 'Updates'}
                                                    </span>
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${value ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-700'
                                                        }`}>
                                                        {value && <CheckCircle2 className="w-4 h-4 text-black font-black" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <button onClick={handleBack} className="text-neutral-500 hover:text-white flex items-center gap-3 text-lg font-medium transition-colors">
                                        <ChevronLeft className="w-6 h-6" /> Back
                                    </button>
                                    <button
                                        onClick={handleComplete}
                                        disabled={loading}
                                        className="group relative px-14 py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-black text-xl flex items-center gap-3 hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <Clock className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>Finalize Profile <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Secure Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-20 flex flex-col items-center gap-4"
                >
                    <div className="flex items-center gap-4 text-neutral-500 font-medium">
                        <span className="w-8 h-[1px] bg-neutral-800"></span>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            <span className="text-sm uppercase tracking-widest">End-to-End Privacy</span>
                        </div>
                        <span className="w-8 h-[1px] bg-neutral-800"></span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default OnboardingPage;
