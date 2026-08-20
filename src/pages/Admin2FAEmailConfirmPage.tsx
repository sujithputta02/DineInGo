import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import DineInGoLogo from '../components/DineInGoLogo';
import { API_CONFIG } from '../config/api';
import { createSession } from '../utils/sessionGuard';

/**
 * Email 2FA fallback confirmation page.
 *
 * Reached via the "Confirm Sign-In" button in the email the admin received at the
 * 2FA step, OR by scanning the confirm QR shown on the login screen. The token in
 * the URL is the one-time magic link; we POST it to the backend, which verifies it
 * and issues the full admin JWT. On success we drop the admin into the portal.
 */
function Admin2FAEmailConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Confirming your sign-in…');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No confirmation token found in the link. Please start login again.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/admin/2fa/email-confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmToken: token }),
        });
        const data = await res.json();
        if (cancelled) return;
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
        if (cancelled) return;
        setStatus('error');
        setMessage(err.message || 'Confirmation failed. Please try again.');
      }
    })();

    return () => { cancelled = true; };
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center"
      >
        <div className="flex justify-center mb-6">
          <DineInGoLogo size="large" />
        </div>

        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 text-red-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Confirming sign-in</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Confirmed</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Could not confirm</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/portal-secure-dino-x7b8w9v2q4m1n5p8r3t6y9')}
              className="w-full py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} /> Back to admin login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default Admin2FAEmailConfirmPage;
