import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { createSession } from '../utils/sessionGuard';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

const ImpersonationHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleImpersonation = async () => {
      const token = searchParams.get('token');
      const userRaw = searchParams.get('user');

      if (!token || !userRaw) {
        toast.error('Invalid impersonation request. Access denied.');
        return;
      }

      try {
        const userData = JSON.parse(decodeURIComponent(userRaw));
        const durationMins = parseInt(searchParams.get('duration') || '20');
        const durationMs = durationMins * 60 * 1000;
        
        console.log(`[Ghost Login] Initiating secure ${durationMins}m session for: ${userData.email}`);
        
        // 1. Sign in with the Custom Token
        await signInWithCustomToken(auth, token);
        
        // 2. Create the DineInGo session (Token in URL)
        const sessionToken = createSession(userData.uid || userData._id);
        
        // 3. CRITICAL: Pre-seed the userData in localStorage
        // This prevents RouteGuards from redirecting to /login
        localStorage.setItem('userData', JSON.stringify({
          ...userData,
          impersonated: true,
          startTime: new Date().toISOString(),
          sessionLimitMs: durationMs
        }));

        // 4. Give the AuthProvider 100ms to catch up with the login state
        setTimeout(() => {
          const path = userData.role === 'owner' ? `/business/app/dashboard/${sessionToken}` : `/dashboard/${sessionToken}`;
          navigate(path, { replace: true });
          
          toast.success(`Ghosting: ${userData.displayName || userData.email}`, {
            autoClose: 3000
          });
        }, 100);
        
      } catch (error: any) {
        console.error('[Ghost Login] Session failure:', error);
        toast.error(`Ghost Login failed: ${error.message}`);
      }
    };

    handleImpersonation();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20"></div>
        <div className="relative bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Initiating Ghost Login...</h2>
          <p className="text-slate-400 mb-6">
            Establishing secure encrypted tunnel. You will be redirected shortly.
          </p>
          <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 50%; transform: translateX(50%); }
          100% { width: 0%; transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default ImpersonationHandler;
