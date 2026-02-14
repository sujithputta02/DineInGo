import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type Step = 'email' | 'otp' | 'password';

interface ApiResponse {
    success: boolean;
    message: string;
}

interface VerifyOTPResponse extends ApiResponse {
    resetToken: string;
}

export default function ForgotPassword() {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/business/forgot-password/request`, {
                email,
            });

            if ((response.data as ApiResponse).success) {
                setSuccess('OTP sent to your email!');
                setTimeout(() => {
                    setStep('otp');
                    setSuccess('');
                }, 1500);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/business/forgot-password/verify-otp`, {
                email,
                otp,
            });

            if ((response.data as VerifyOTPResponse).success) {
                setResetToken((response.data as VerifyOTPResponse).resetToken);
                setSuccess('OTP verified!');
                setTimeout(() => {
                    setStep('password');
                    setSuccess('');
                }, 1500);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/business/forgot-password/reset`, {
                email,
                resetToken,
                newPassword,
            });

            if ((response.data as ApiResponse).success) {
                setSuccess('Password reset successful!');
                setTimeout(() => {
                    navigate('/business/businessLogin');
                }, 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ffffff 0%, #f6f9ff 50%, #fff5e6 100%)',
            padding: '20px',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '50px',
                    maxWidth: '500px',
                    width: '100%',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        margin: 0,
                        marginBottom: '8px',
                    }}>
                        <span style={{ color: '#000' }}>DineIn</span>
                        <span style={{ color: '#facc15' }}>Go</span>
                    </h1>
                    <div style={{
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        letterSpacing: '0.3em',
                        color: '#00F29D',
                        fontFamily: "'Poppins', sans-serif",
                    }}>
                        BUSINESS
                    </div>
                </div>

                <h2 style={{
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    color: '#1a1a2e',
                    marginBottom: '10px',
                    textAlign: 'center',
                }}>
                    Reset Password
                </h2>

                <p style={{
                    color: '#666',
                    textAlign: 'center',
                    marginBottom: '30px',
                }}>
                    {step === 'email' && 'Enter your email to receive an OTP'}
                    {step === 'otp' && 'Enter the 6-digit OTP sent to your email'}
                    {step === 'password' && 'Create a new password'}
                </p>

                {/* Progress Indicator */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '30px',
                }}>
                    {['email', 'otp', 'password'].map((s, i) => (
                        <div
                            key={s}
                            style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: step === s ? '#00F29D' : s === 'email' && (step === 'otp' || step === 'password') ? '#00F29D' : s === 'otp' && step === 'password' ? '#00F29D' : '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                            }}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 1: Email */}
                    {step === 'email' && (
                        <motion.form
                            key="email"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleRequestOTP}
                        >
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#1a1a2e',
                                    fontWeight: '600',
                                }}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@restaurant.com"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.3s',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#00F29D'}
                                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: loading ? '#ccc' : '#00F29D',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    marginBottom: '20px',
                                }}
                            >
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>
                        </motion.form>
                    )}

                    {/* Step 2: OTP */}
                    {step === 'otp' && (
                        <motion.form
                            key="otp"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleVerifyOTP}
                        >
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#1a1a2e',
                                    fontWeight: '600',
                                }}>
                                    Enter OTP
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    placeholder="123456"
                                    maxLength={6}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '1.5rem',
                                        textAlign: 'center',
                                        letterSpacing: '0.5em',
                                        outline: 'none',
                                        fontWeight: 'bold',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#00F29D'}
                                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: (loading || otp.length !== 6) ? '#ccc' : '#00F29D',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
                                    marginBottom: '20px',
                                }}
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'transparent',
                                    color: '#00F29D',
                                    border: '2px solid #00F29D',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                Back
                            </button>
                        </motion.form>
                    )}

                    {/* Step 3: New Password */}
                    {step === 'password' && (
                        <motion.form
                            key="password"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleResetPassword}
                        >
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#1a1a2e',
                                    fontWeight: '600',
                                }}>
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '1rem',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#00F29D'}
                                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#1a1a2e',
                                    fontWeight: '600',
                                }}>
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '2px solid #e5e7eb',
                                        fontSize: '1rem',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#00F29D'}
                                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: loading ? '#ccc' : '#00F29D',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Error/Success Messages */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginTop: '20px',
                            padding: '12px',
                            background: '#fee2e2',
                            border: '2px solid #ef4444',
                            borderRadius: '12px',
                            color: '#dc2626',
                            textAlign: 'center',
                            fontWeight: '600',
                        }}
                    >
                        {error}
                    </motion.div>
                )}

                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginTop: '20px',
                            padding: '12px',
                            background: '#d1fae5',
                            border: '2px solid #00F29D',
                            borderRadius: '12px',
                            color: '#059669',
                            textAlign: 'center',
                            fontWeight: '600',
                        }}
                    >
                        {success}
                    </motion.div>
                )}

                {/* Back to Login */}
                <div style={{
                    marginTop: '30px',
                    textAlign: 'center',
                    color: '#666',
                }}>
                    Remember your password?{' '}
                    <button
                        onClick={() => navigate('/business/businessLogin')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#00F29D',
                            fontWeight: '700',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        Back to Login
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
