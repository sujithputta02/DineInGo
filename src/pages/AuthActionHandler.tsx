import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyActionCode, getAuth, checkActionCode } from 'firebase/auth';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader, Mail, Key } from 'lucide-react';
import { toast } from 'react-toastify';

const AuthActionHandler: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const actionCode = params.get('oobCode');

    if (!actionCode) {
      setStatus('error');
      setError('Invalid request. No action code provided.');
      return;
    }

    const handleAction = async () => {
      try {
        // Identify the action from the code.
        const actionInfo = await checkActionCode(auth, actionCode);
        setAction(actionInfo.operation);

        switch (actionInfo.operation) {
          case 'VERIFY_EMAIL':
            await applyActionCode(auth, actionCode);
            setStatus('success');
            toast.success('Email verified successfully!');
            
            // Redirect based on whether the user is new or existing
            setTimeout(() => {
              const isNewUser = localStorage.getItem('isNewUser') === 'true';
              localStorage.removeItem('isNewUser'); // Clean up the flag
              navigate(isNewUser ? '/feedback' : '/dashboard');
            }, 3000);
            break;

          case 'PASSWORD_RESET':
            // This would typically redirect to a password reset form
            // For now, we'll just show a success message
            // navigate(`/reset-password?oobCode=${actionCode}`);
            setStatus('success');
            toast.success('Password reset link is valid. You can now reset your password.');
            break;
            
          default:
            throw new Error('Unsupported action.');
        }
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to process request. The link may be invalid or expired.');
        console.error('Auth action error:', err);
        toast.error(err.message || 'Invalid or expired link.');
      }
    };

    handleAction();
  }, [location, navigate, auth]);

  const renderIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader className="animate-spin text-emerald-500 h-16 w-16" />;
      case 'success':
        return <CheckCircle className="text-green-500 h-16 w-16" />;
      case 'error':
        return <XCircle className="text-red-500 h-16 w-16" />;
      default:
        return null;
    }
  };

  const getActionInfo = () => {
    if (status === 'error') {
      return { title: 'An Error Occurred', message: error };
    }
    switch (action) {
      case 'VERIFY_EMAIL':
        return {
          title: status === 'success' ? 'Email Verified!' : 'Verifying Email...',
          message: status === 'success' ? 'Your email has been successfully verified. Redirecting you...' : 'Please wait while we verify your email address.'
        };
      case 'PASSWORD_RESET':
        return {
          title: status === 'success' ? 'Password Reset' : 'Verifying Link...',
          message: status === 'success' ? 'You can now proceed to reset your password.' : 'Please wait while we verify the password reset link.'
        };
      default:
        return {
          title: 'Processing...',
          message: 'Please wait while we process your request.'
        };
    }
  };

  const { title, message } = getActionInfo();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center">
          {renderIcon()}
          <h2 className="mt-4 text-2xl font-bold text-gray-800">{title}</h2>
          <p className="mt-2 text-md text-gray-600">{message}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthActionHandler; 