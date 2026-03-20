import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../../utils/sessionGuard';
import { motion } from 'framer-motion';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, provider } from '../../firebase';
import { toast } from 'react-toastify';
import { Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import DineInGoLogo from '../../components/DineInGoLogo';

// Assuming global API URL, replace with env var in real usage
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const BusinessAuth: React.FC = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Create User in Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Register as Owner in Backend
            await axios.post(`${API_URL}/api/v1/business/register`, {
                uid: user.uid,
                email: user.email,
                displayName: formData.name,
                photoURL: user.photoURL
            });

            // 3. Store minimal session data 
            sessionStorage.setItem('userData', JSON.stringify({
                uid: user.uid,
                email: user.email,
                role: 'owner'
            }));

            toast.success("Welcome to DineInGo Business!");
            navigate('/business/onboarding'); // Go to restaurant setup
        } catch (error: any) {
            console.error("Owner Registration Error:", error);
            toast.error(error.response?.data?.message || error.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            sessionStorage.setItem('userData', JSON.stringify({
                uid: user.uid,
                email: user.email,
                role: 'owner'
            }));

            toast.success("Login successful");
            const token = createSession(user.uid);
            navigate(`/business/app/dashboard/${token}`);
        } catch (error: any) {
            console.error("Login Error:", error);
            toast.error("Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setIsGoogleLoading(true);
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Register/Login with backend to ensure owner role
            await axios.post(`${API_URL}/api/v1/business/register`, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Business Owner',
                photoURL: user.photoURL
            });

            sessionStorage.setItem('userData', JSON.stringify({
                uid: user.uid,
                email: user.email,
                role: 'owner'
            }));

            toast.success("Welcome to DineInGo Business!");

            // Determine destination based on if they have restaurants?
            // For now, simpler: check if they have restaurants or just go to dashboard
            // Ideally we check if they have restaurants, if not -> onboarding.
            // Let's optimize: try to fetch restaurants, if existing -> dashboard, else -> onboarding?
            // Or just go to dashboard and let dashboard prompt "No restaurants yet" (which it does).
            const token = createSession(user.uid);
            navigate(`/business/app/dashboard/${token}`);

        } catch (error: any) {
            console.error("Google Auth Error:", error);
            toast.error("Google authentication failed");
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex text-slate-800 bg-emerald-50">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="z-10 text-white p-12 max-w-xl">
                    <div className="mb-6">
                        <DineInGoLogo size="large" color="#ffffff" />
                    </div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold mb-6"
                    >
                        Grow Your Restaurant Business
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-slate-300 mb-8"
                    >
                        Manage reservations, floor plans, and events all in one place. Join thousands of restaurants on DineInGo.
                    </motion.p>
                    <ul className="space-y-4 text-slate-300">
                        <li className="flex items-center gap-3"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Real-time table management</li>
                        <li className="flex items-center gap-3"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Direct customer booking connection</li>
                        <li className="flex items-center gap-3"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Advanced analytics dashboard</li>
                    </ul>
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900">
                            {isLogin ? "Welcome Back" : "Partner with DineInGo"}
                        </h2>
                        <p className="mt-2 text-slate-500">
                            {isLogin ? "Sign in to manage your restaurant" : "Create your business account to get started"}
                        </p>
                    </div>

                    <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Restaurant Owner Name"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                placeholder="you@restaurant.com"
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            {isLogin && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/business/forgot-password')}
                                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            {!isLogin && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || isGoogleLoading}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    {isLogin ? "Login to Dashboard" : "Create Business Account"}
                                    {!isLoading && <ArrowRight size={20} />}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={isGoogleLoading || isLoading}
                        className="w-full bg-white text-slate-700 border border-slate-200 py-3 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                        {isGoogleLoading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#10B981" /></svg>
                                Google
                            </>
                        )}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-slate-600">
                            {isLogin ? "New to DineInGo?" : "Already have an account?"}{" "}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-emerald-600 font-bold hover:underline"
                            >
                                {isLogin ? "Register your Restaurant" : "Login here"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessAuth;
