import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../../utils/sessionGuard';
import { motion } from 'framer-motion';
import { auth, signInWithEmailAndPassword, signInWithPopup, provider } from '../../firebase';
import { toast } from 'react-toastify';
import { Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import DineInGoLogo from '../../components/DineInGoLogo';

const API_URL = API_CONFIG.BASE_URL;

interface RegisterResponse {
    success: boolean;
    message: string;
    linked?: boolean;
    linkedProvider?: string;
    isNewAccount?: boolean;
}

const BusinessLogin: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // Handle cross-portal redirection
    useEffect(() => {
        const storedUser = sessionStorage.getItem('userData');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.role === 'user') {
                const token = user.token;
                navigate(token ? `/dashboard/${token}` : "/dashboard", { replace: true });
            }
        }
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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

            // Check if this is a Google-only account
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast.error("Invalid email or password. If you signed up with Google, please use the 'Continue with Google' button.");
            } else if (error.code === 'auth/user-not-found') {
                toast.error("No account found with this email. Please sign up first.");
            } else {
                toast.error("Login failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setIsGoogleLoading(true);
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const response = await axios.post(`${API_URL}/api/v1/business/register`, {
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

            // Check if account was linked
            const data = response.data as RegisterResponse;
            if (data.linked) {
                toast.success(`✓ Google account linked! You can now login with Google or password`);
            } else if (data.isNewAccount) {
                toast.success("Welcome to DineInGo Business!");
            } else {
                toast.success("Login successful!");
            }

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

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-16 bg-white">
                <div className="w-full max-w-md space-y-10">
                    {/* Mobile Logo Only */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <DineInGoLogo size="medium" color="#0f172a" />
                    </div>

                    <div className="text-center lg:text-left space-y-3">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                            Welcome Back
                        </h2>
                        <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed">
                            Sign in to manage your restaurant and grow your business
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        <div className="space-y-2">
                            <label className="block text-sm md:text-base font-bold text-slate-700 ml-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-5 py-4 md:py-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-base md:text-lg"
                                placeholder="you@restaurant.com"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm md:text-base font-bold text-slate-700 ml-1">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-5 py-4 md:py-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-base md:text-lg"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => navigate('/business/forgot-password')}
                                    className="text-sm md:text-base text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || isGoogleLoading}
                            className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Login to Dashboard
                                    {!isLoading && <ArrowRight size={22} />}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-100" />
                        </div>
                        <div className="relative flex justify-center text-sm md:text-base">
                            <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest">Or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={isGoogleLoading || isLoading}
                        className="w-full bg-white text-slate-700 border-2 border-slate-100 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                    >
                        {isGoogleLoading ? <Loader2 className="animate-spin" size={24} /> : (
                            <>
                                <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#10B981" /></svg>
                                Google
                            </>
                        )}
                    </button>

                    <div className="text-center pt-4">
                        <p className="text-slate-500 text-base md:text-lg">
                            New to DineInGo?{" "}
                            <button
                                onClick={() => navigate('/business/businessSignup')}
                                className="text-emerald-600 font-extrabold hover:underline"
                            >
                                Register Restaurant
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessLogin;
