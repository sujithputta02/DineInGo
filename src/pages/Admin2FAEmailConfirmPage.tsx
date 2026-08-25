import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle, XCircle, Shield } from 'lucide-react';
import DineInGoLogo from '../components/DineInGoLogo';
import { API_CONFIG } from '../config/api';
import { createSession } from '../utils/sessionGuard';

/**
 * Email 2FA fallback confirmation page.
 *
 * Reached via the "Confirm Sign-In" button in the email the admin received at the
 * 2FA step, OR by scanning the confirm QR shown on the login screen. Shows an
 * approval UI where the admin can approve or reject the sign-in attempt.
 */
function Admin2FAEmailConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'rejected' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token found in the link. Please start login again.');
    }
  }, [token]);

  const handleApprove = async () => {
    if (!token) return;
    
    setStatus('verifying');
    setMessage('Confirming your sign-in…');

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/admin/2fa/email-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmToken: token }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setStatus('error');
        setMessage(data.message || 'Confirmation failed.');
        return;
      }

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminEmail', data.admin.email);
      localStorage.setItem('adminRole', data.admin.role);
      localStorage.setItem('adminLoginTime', new Date().toISOString());
      const sessionToken = createSession(data.admin.email);

      setStatus('success');
      setMessage('Sign-in confirmed! Redirecting to the admin portal…');
      setTimeout(() => navigate(`/admin/${sessionToken}/dashboard`), 1200);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Confirmation failed. Please try again.');
    }
  };

  const handleReject = () => {
    setStatus('rejected');
    setMessage('Sign-in rejected. If this wasn\'t you, please contact support immediately.');
    setTimeout(() => navigate('/'), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8"
      >
        <div className="flex justify-center mb-6">
          <DineInGoLogo size="large" />
        </div>

        {status === 'pending' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <Shield className="text-red-600" size={32} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Confirm Admin Sign-In</h1>
            <p className="text-slate-600 mb-6">Someone is trying to sign in to your admin account. Was this you?</p>
            
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
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

            <p className="text-xs text-center text-slate-500 mt-4">
              If you reject this, the sign-in attempt will be blocked.
            </p>
          </div>
        )}

        {status === 'verifying' && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-red-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Confirming sign-in</h1>
            <p className="text-slate-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Confirmed!</h1>
            <p className="text-slate-600">{message}</p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Sign-In Rejected</h1>
            <p className="text-slate-600">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Could not confirm</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/portal-secure-dino-x7b8w9v2q4m1n5p8r3t6y9')}
              className="w-full py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} /> Back to admin login
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Admin2FAEmailConfirmPage;
