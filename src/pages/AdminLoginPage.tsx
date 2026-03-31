import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import DineInGoLogo from '../components/DineInGoLogo';
import { createSession, getSessionToken } from '../utils/sessionGuard';
import { API_CONFIG } from '../config/api';

const AdminLoginPage: React.FC = () => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  // Check if already logged in as admin
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const sessionToken = getSessionToken();
    if (adminToken && sessionToken) {
      navigate(`/admin/${sessionToken}/dashboard`);
    }
  }, [navigate]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/admin/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      
      setSuccess('OTP sent to your email address');
      setStep('otp');
      setCountdown(120); // 2 minutes countdown
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/admin/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otp,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }
      
      // Store admin session with JWT token
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminEmail', data.admin.email);
      localStorage.setItem('adminRole', data.admin.role);
      localStorage.setItem('adminLoginTime', new Date().toISOString());
      
      // Generate web session token for URL obfuscation
      const sessionToken = createSession(data.admin.email);
      
      // Navigate to admin dashboard with session token
      navigate(`/admin/${sessionToken}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/admin/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }
      
      setSuccess('New OTP sent to your email');
      setCountdown(120);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtp(value);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-6">
            <DineInGoLogo size="large" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="text-red-600" size={24} />
            <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
          </div>
          <p className="text-slate-600">Secure access for DineInGo administrators</p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-8">
            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    <Mail size={16} className="inline mr-2" />
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-4 border-2 rounded-2xl transition-all focus:outline-none focus:ring-4 focus:ring-red-500/20 ${
                      error 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-slate-200 focus:border-red-500'
                    }`}
                    placeholder="Enter your admin email"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Only authorized DineInGo administrators can access this portal
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700"
                  >
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">{error}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700"
                  >
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">{success}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                    loading || !email
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25 active:scale-95'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    <Lock size={16} className="inline mr-2" />
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={handleOTPChange}
                    className={`w-full px-4 py-4 border-2 rounded-2xl text-center text-2xl font-mono tracking-widest transition-all focus:outline-none focus:ring-4 focus:ring-red-500/20 ${
                      error 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-slate-200 focus:border-red-500'
                    }`}
                    placeholder="••••••"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    disabled={loading}
                  />
                  
                  {/* OTP length indicator */}
                  <div className="flex justify-center mt-3 gap-1">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i < otp.length 
                            ? 'bg-red-500' 
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-slate-500">
                      OTP sent to: <span className="font-medium">{email}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Change Email
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700"
                  >
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">{error}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700"
                  >
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">{success}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                    loading || otp.length !== 6
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25 active:scale-95'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Login
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {/* Resend OTP */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Clock size={14} />
                      <span>Resend OTP in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                      Didn't receive OTP? Resend
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield size={12} />
              <span>This is a secure admin area. All access is logged and monitored.</span>
            </div>
          </div>
        </motion.div>

        {/* Back to main site */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mt-6"
        >
          <button
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
          >
            ← Back to DineInGo
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLoginPage;