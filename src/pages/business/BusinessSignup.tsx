import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../../utils/sessionGuard';
import { motion } from 'framer-motion';
import { auth, createUserWithEmailAndPassword, signInWithPopup, provider } from '../../firebase';
import { toast } from 'react-toastify';
import { Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import DineInGoLogo from '../../components/DineInGoLogo';
import { waitlistApi } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface RegisterResponse {
    success: boolean;
    message: string;
    linked?: boolean;
    linkedProvider?: string;
    isNewAccount?: boolean;
}

const BusinessSignup: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        referralCode: ''
    });

    const [showReferralModal, setShowReferralModal] = useState(false);
    const [googleUserToRegister, setGoogleUserToRegister] = useState<any>(null);
    const [referralError, setReferralError] = useState('');

    const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        label: '',
        color: ''
    });

    const checkPasswordStrength = (password: string) => {
        let score = 0;
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        if (score < 3) return { score, label: 'Weak', color: 'bg-red-500' };
        if (score < 5) return { score, label: 'Moderate', color: 'bg-yellow-500' };
        return { score, label: 'Strong', color: 'bg-green-500' };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = { ...prev, [name]: value };
            
            if (name === 'password') {
                setPasswordStrength(checkPasswordStrength(value));
            }
            
            if (name === 'password' || name === 'confirmPassword') {
                setPasswordsMatch(newFormData.password === newFormData.confirmPassword && newFormData.confirmPassword !== '');
            }
            
            return newFormData;
        });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        setIsLoading(true);
        setReferralError('');
        
        try {
            // Check if referral code is provided
            if (!formData.referralCode.trim()) {
                toast.error("Please enter your Early Access Code");
                setIsLoading(false);
                return;
            }
            // BETA ACCESS GUARD: Check waitlist status and verify referral code
            const verifyCheck = await waitlistApi.verifyCode(formData.email, formData.referralCode, 'business');
            
            if (!verifyCheck.hasAccess) {
                toast.error("Dino says: Invalid code or email! Please strictly use the code sent to your approved waitlist email.");
                setReferralError("Invalid Referral Code");
                setIsLoading(false);
                return;
            }

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
            navigate('/business/onboarding');
        } catch (error: any) {
            console.error("Owner Registration Error:", error);
            toast.error(error.response?.data?.message || error.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setIsGoogleLoading(true);
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Instead of immediate signup, prompt for referral code if not already provided
            // For business google signup, easiest is to show the inline modal logic
            setGoogleUserToRegister(user);
            setShowReferralModal(true);
            setIsGoogleLoading(false);

        } catch (error: any) {
            console.error("Google Auth Error:", error);
            toast.error("Google authentication failed");
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleReferralSubmit = async () => {
        if (!formData.referralCode.trim()) {
            setReferralError("Please enter your Early Access Code");
            return;
        }

        setIsLoading(true);
        setReferralError('');
        
        try {
            // Verify Google User's email with provided referral code
            const emailToCheck = googleUserToRegister?.email || '';
            const verifyCheck = await waitlistApi.verifyCode(emailToCheck, formData.referralCode, 'business');
            
            if (!verifyCheck.hasAccess) {
                setReferralError("Invalid Referral Code! Please check your business waitlist email.");
                setIsLoading(false);
                return;
            }

            // Code verified, proceed with Google account creation
            const response = await axios.post(`${API_URL}/api/v1/business/register`, {
                uid: googleUserToRegister.uid,
                email: googleUserToRegister.email,
                displayName: googleUserToRegister.displayName || 'Business Owner',
                photoURL: googleUserToRegister.photoURL
            });

            sessionStorage.setItem('userData', JSON.stringify({
                uid: googleUserToRegister.uid,
                email: googleUserToRegister.email,
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

            // Cleanup state
            setShowReferralModal(false);
            setGoogleUserToRegister(null);
            const token = createSession(googleUserToRegister?.uid || '');
            navigate(`/business/app/dashboard/${token}`);

        } catch (error: any) {
            console.error("Owner Google Registration Error:", error);
            toast.error(error.response?.data?.message || error.message || "Registration failed");
            // If failed to register backend side after code pass, might as well kick them out of firebase to be safe
            await auth.signOut();
            setShowReferralModal(false);
            setGoogleUserToRegister(null);
        } finally {
            setIsLoading(false);
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
            </div>            {/* Right Panel - Signup Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-16 bg-white overflow-y-auto">
                <div className="w-full max-w-md space-y-10 py-8">
                    {/* Mobile Logo Only */}
                    <div className="lg:hidden flex justify-center mb-6">
                        <DineInGoLogo size="medium" color="#0f172a" />
                    </div>

                    <div className="text-center lg:text-left space-y-3">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                            Partner with DineInGo
                        </h2>
                        <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed">
                            {showReferralModal ? "Just one more step to verify your business beta access!" : "Create your business account to get started"}
                        </p>
                    </div>

                    {showReferralModal ? (
                         <div className="space-y-8 bg-emerald-50/50 p-6 md:p-8 rounded-3xl border-2 border-emerald-100 shadow-sm">
                            <div className="space-y-3">
                                <label className="block text-sm md:text-base font-bold text-slate-700 text-center uppercase tracking-widest">Early Access Code</label>
                                <input
                                    type="text"
                                    name="referralCode"
                                    value={formData.referralCode}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, referralCode: e.target.value.toUpperCase() }));
                                        setReferralError('');
                                    }}
                                    className={`w-full px-6 py-5 text-center text-2xl md:text-3xl font-black tracking-[0.2em] rounded-2xl border-3 ${referralError ? 'border-red-500 bg-red-50' : 'border-emerald-200 bg-white focus:border-emerald-500'} outline-none transition-all uppercase shadow-inner`}
                                    placeholder="DINO-XXXX"
                                />
                                {referralError && (
                                    <p className="text-red-500 text-sm text-center font-bold mt-2">{referralError}</p>
                                )}
                            </div>

                            <button
                                onClick={handleGoogleReferralSubmit}
                                disabled={isLoading}
                                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 flex justify-center items-center gap-3"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        Verify & Continue
                                        <ArrowRight size={22} />
                                    </>
                                )}
                            </button>
                            
                            <div className="text-center pt-2">
                                <button
                                    onClick={async () => {
                                        setShowReferralModal(false);
                                        setGoogleUserToRegister(null);
                                        await auth.signOut();
                                    }}
                                    className="text-sm md:text-base text-slate-500 hover:text-slate-700 font-bold"
                                >
                                    Cancel & Go Back
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleRegister} className="space-y-8">
                        <div className="space-y-2">
                            <label className="block text-sm md:text-base font-bold text-slate-700 ml-1">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-5 py-4 md:py-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-base md:text-lg"
                                placeholder="Restaurant Owner Name"
                            />
                        </div>

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

                        <div className="space-y-2">
                            <label className="block text-sm md:text-base font-bold text-slate-700 ml-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className={`w-full px-5 py-4 md:py-5 rounded-2xl border-2 ${passwordStrength.label === 'Strong' ? 'border-emerald-500' : 'border-slate-100'} bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-base md:text-lg`}
                                placeholder="••••••••"
                            />
                            {formData.password && (
                                <div className="mt-3 px-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs md:text-sm font-black uppercase tracking-wider ${passwordStrength.label === 'Strong' ? 'text-emerald-500' : passwordStrength.label === 'Moderate' ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {passwordStrength.label} Strength
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                                            className={`h-full transition-all duration-500 ${passwordStrength.color}`} 
                                        />
                                    </div>
                                    <p className="text-slate-400 mt-2 text-xs md:text-sm font-medium">Use 8+ characters with a mix of letters, numbers & symbols.</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm md:text-base font-bold text-slate-700 ml-1">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className={`w-full px-5 py-4 md:py-5 rounded-2xl border-2 ${passwordsMatch === true ? 'border-emerald-500 text-emerald-600' : passwordsMatch === false ? 'border-red-500' : 'border-slate-100'} bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-base md:text-lg`}
                                placeholder="••••••••"
                            />
                            {formData.confirmPassword && (
                                <p className={`mt-2 text-xs md:text-sm font-black ml-1 ${passwordsMatch ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {passwordsMatch ? '✓ Passwords matched' : '✕ Passwords do not match'}
                                </p>
                            )}
                        </div>

                        {/* BETA ACCESS GUARD: Referral Code Input */}
                        <div className="space-y-2 bg-emerald-50/30 p-5 rounded-2xl border-2 border-emerald-100/50">
                            <label className="block text-sm md:text-base font-bold text-slate-700 ml-1 flex items-center justify-between">
                                Early Access Code 
                                <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded-full">Required</span>
                            </label>
                            <input
                                type="text"
                                name="referralCode"
                                value={formData.referralCode}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, referralCode: e.target.value.toUpperCase() }));
                                    setReferralError('');
                                }}
                                required
                                className={`w-full px-5 py-4 md:py-5 rounded-xl border-2 ${referralError ? 'border-red-500 bg-red-50' : 'border-emerald-200 bg-white focus:border-emerald-500'} outline-none transition-all text-lg font-black tracking-widest uppercase text-center`}
                                placeholder="DINO-XXXX"
                            />
                            {referralError && (
                                <p className="text-red-500 text-xs md:text-sm font-bold mt-2 ml-1 text-center">{referralError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || isGoogleLoading || passwordStrength.label !== 'Strong' || !passwordsMatch || !formData.referralCode}
                            className={`w-full py-4 md:py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                                (passwordStrength.label === 'Strong' && passwordsMatch && formData.referralCode && !isLoading)
                                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200 shadow-none'
                            }`}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Create Business Account
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
                            Already have an account?{" "}
                            <button
                                onClick={() => navigate('/business/businessLogin')}
                                className="text-emerald-600 font-extrabold hover:underline"
                            >
                                Login here
                            </button>
                        </p>
                    </div>
                </>
                )}
                </div>
            </div>
        </div>
    );
};

export default BusinessSignup;
