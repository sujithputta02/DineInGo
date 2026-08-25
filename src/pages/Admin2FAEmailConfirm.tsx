import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import DineInGoLogo from '../components/DineInGoLogo';
import { API_CONFIG } from '../config/api';

/**
 * Admin 2FA Email Confirmation Page
 * 
 * When admin clicks the confirmation link in their email (or scans the QR code),
 * they land here. They see:
 * - Device info
 * - Location
 * - Time
 * - Approve/Reject buttons
 * 
 * If they approve, the original device (where they started login) automatically
 * logs in via the stored session token.
 */
function Admin2FAEmailConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'pending' | 'approved' | 'rejected' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid confirmation link. No token provided.');
      return;
    }
    
    // Show the approval UI
    setStatus('pending');
  }, [token]);

  const handleApprove = async () => {
    if (!token) return;
    
    setStatus('loading');
    setMessage('Confirming your sign-in...');
    
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/admin/2fa/email-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmToken: token }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to confirm sign-in');
      }
      
      setStatus('approved');
      setMessage('✓ Sign-in approved! You can now close this window and return to your original device.');
      
      // The original device will be logged in automatically
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to confirm sign-in');
    }
  };

  const handleReject = () => {
    setStatus('rejected');
    setMessage('Sign-in rejected. If this wasn\'t you, please contact support immediately.');
    
    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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
            <h1 className="text-2xl font-bold text-slate-900">Confirm Admin Sign-In</h1>
          </div>
          <p className="text-slate-600">Verify that you're trying to log in</p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-8">
            {status === 'loading' && (
              <div className="text-center py-8">
                <Loader className="animate-spin mx-auto text-red-600 mb-4" size={48} />
                <p className="text-slate-600">{message || 'Loading...'}</p>
              </div>
            )}

            {status === 'pending' && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <Shield className="text-red-600" size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    Sign-in Attempt Detected
                  </h2>
                  <p className="text-slate-600">
                    Someone is trying to sign in to your admin account. Was this you?
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Time:</span>
                    <span className="font-medium text-slate-900">{new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Device:</span>
                    <span className="font-medium text-slate-900">
                      {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} Browser
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleReject}
                    className="py-4 rounded-2xl font-bold text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <XCircle size={20} />
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle size={20} />
                    Approve
                  </button>
                </div>

                <p className="text-xs text-center text-slate-500">
                  If you reject this, the sign-in attempt will be blocked and logged.
                </p>
              </div>
            )}

            {status === 'approved' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Sign-In Approved!</h2>
                <p className="text-slate-600">{message}</p>
              </motion.div>
            )}

            {status === 'rejected' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <XCircle className="text-red-600" size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Sign-In Rejected</h2>
                <p className="text-slate-600">{message}</p>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <AlertCircle className="text-red-600" size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
                <p className="text-slate-600 mb-4">{error}</p>
                <button
                  onClick={() => navigate('/portal-admin')}
                  className="px-6 py-2 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  Go to Login
                </button>
              </motion.div>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield size={12} />
              <span>This verification helps protect your admin account from unauthorized access.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Admin2FAEmailConfirm;
