import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import {
  auth,
  provider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider,
  sendEmailVerification
} from "./firebase";
import { storeUserData, fetchUserData } from "./dbUtils";
import { userAPI, authOtpApi } from './services/api';
import { sendPasswordReset } from "./authUtils";
import socketService from './utils/socketService';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email: string;
  password: string;
  general: string;
}

interface DoodleItem {
  src: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width: string;
  delay: number;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });

  // Forgot Password State
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email');
  const [resetOTP, setResetOTP] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({
    email: "",
    password: "",
    general: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        console.log('User is signed in:', user.email);
        navigate('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Connect to socket when component mounts
    const socket = socketService.connect();

    // Optional: Listen for user activities
    socketService.onUserActivity((data) => {
      console.log('Real-time user activity:', data);
      // You can add more logic here, like showing notifications
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  // Validate form inputs
  const validateForm = () => {
    let valid = true;
    const newErrors: FormErrors = { email: "", password: "", general: "" };

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Handle manual login
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = result.user;

      // Emit login event to socket
      socketService.emitLogin({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || ''
      });

      // Check if email is verified
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setErrors({
          ...errors,
          general: "Please verify your email first. A new verification link has been sent to your email."
        });
        // Ensure we're not treating this as a new user that needs to go to the feedback form
        sessionStorage.removeItem('isNewUser');
        setIsLoading(false);
        return;
      }

      // Track login activity in our backend
      try {
        console.log('Tracking login activity for user:', user.uid);
        const response = await userAPI.loginUser(user.uid, 'email');
        console.log('Login activity tracked successfully:', response);
        // Set timestamp to avoid duplicate tracking on page refresh
        sessionStorage.setItem('lastLoginTracked', Date.now().toString());
      } catch (error) {
        console.error('Error tracking login activity:', error);
        // Continue with login flow even if tracking fails
      }

      // Fetch existing user data from Firestore first
      try {
        const existingData = await fetchUserData(user.uid);
        if (existingData) {
          // Update the existing data with the latest Google profile picture
          const updatedUserData = {
            ...existingData,
            photoURL: user.photoURL || existingData.photoURL,
            lastLogin: new Date()
          };

          // Store the updated user data in Firestore
          await storeUserData(updatedUserData);

          // Store user data in session storage
          sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }

      // If no existing data, create new user data
      const userData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || '',
        name: user.displayName || user.email?.split('@')[0] || '',
        photoURL: user.photoURL || null,
        lastLogin: new Date(),
        createdAt: new Date()
      };

      // Store user data in Firestore
      await storeUserData(userData);

      // Store user data in session storage
      sessionStorage.setItem('userData', JSON.stringify(userData));

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', {
        code: error.code,
        message: error.message
      });

      let errorMessage = 'An error occurred during login.';

      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          setErrors({ ...errors, password: errorMessage });
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address. Please sign up first.';
          setErrors({ ...errors, email: errorMessage });
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          setErrors({ ...errors, email: errorMessage });
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          setErrors({ ...errors, general: errorMessage });
          break;
        default:
          errorMessage = error.message || 'Login failed. Please try again.';
          setErrors({ ...errors, general: errorMessage });
      }

      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google login/signup separately
  const handleGoogleSignIn = async () => {
    if (isGoogleSigningIn) return; // Prevent multiple popups
    setIsGoogleSigningIn(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Emit login event to socket
      socketService.emitLogin({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || ''
      });

      console.log('Google sign-in successful, photoURL:', user.photoURL);

      // Track login activity in our backend
      try {
        console.log('Tracking Google login activity for user:', user.uid);
        const response = await userAPI.loginUser(user.uid, 'google');
        console.log('Google login activity tracked successfully:', response);
        // Set timestamp to avoid duplicate tracking on page refresh
        sessionStorage.setItem('lastLoginTracked', Date.now().toString());
      } catch (error) {
        console.error('Error tracking Google login activity:', error);
        // Continue with login flow even if tracking fails
      }

      // Fetch existing user data from Firestore first
      try {
        const existingData = await fetchUserData(user.uid);
        if (existingData) {
          // Update the existing data with the latest Google profile picture
          const updatedUserData = {
            ...existingData,
            uid: user.uid,

            photoURL: user.photoURL || existingData.photoURL,
            lastLogin: new Date()
          };

          // Store the updated user data in Firestore
          await storeUserData(updatedUserData);

          // Store user data in session storage
          sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }

      // If no existing data, create new user data
      const userData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || '',
        name: user.displayName || user.email?.split('@')[0] || '',
        photoURL: user.photoURL || null,
        lastLogin: new Date(),
        createdAt: new Date()
      };

      // Store user data in Firestore
      await storeUserData(userData);

      // Store user data in session storage
      sessionStorage.setItem('userData', JSON.stringify(userData));

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      let errorMessage = 'An error occurred during Google sign-in.';

      switch (error.code) {
        case 'auth/popup-blocked':
          errorMessage = 'Please allow popups for this website.';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in was cancelled.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email.';
          break;
        default:
          errorMessage = error.message || 'Failed to sign in with Google.';
      }

      alert(errorMessage);
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetStep === 'email') {
      if (!resetEmail.trim()) {
        setErrors(prev => ({ ...prev, general: 'Please enter your email address' }));
        return;
      }
      setIsLoading(true);
      try {
        await authOtpApi.requestForgotPasswordOTP(resetEmail);
        setResetStep('otp');
        setErrors(prev => ({ ...prev, general: '' }));
      } catch (error: any) {
        setErrors(prev => ({ ...prev, general: error.message || 'Failed to send OTP' }));
      } finally {
        setIsLoading(false);
      }
    } else if (resetStep === 'otp') {
      if (!resetOTP.trim()) {
        setErrors(prev => ({ ...prev, general: 'Please enter the OTP' }));
        return;
      }
      setIsLoading(true);
      try {
        const response = await authOtpApi.verifyForgotPasswordOTP(resetEmail, resetOTP);
        setResetToken(response.resetToken);
        setResetStep('password');
        setErrors(prev => ({ ...prev, general: '' }));
      } catch (error: any) {
        setErrors(prev => ({ ...prev, general: error.message || 'Invalid OTP' }));
      } finally {
        setIsLoading(false);
      }
    } else if (resetStep === 'password') {
      if (!newPassword.trim()) {
        setErrors(prev => ({ ...prev, general: 'Please enter a new password' }));
        return;
      }
      setIsLoading(true);
      try {
        await authOtpApi.resetPassword(resetEmail, resetToken, newPassword);
        setResetEmailSent(true);
        setErrors(prev => ({ ...prev, general: '' }));
      } catch (error: any) {
        setErrors(prev => ({ ...prev, general: error.message || 'Failed to reset password' }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Add logout method to emit logout event
  const handleLogout = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Emit logout event to socket
        socketService.emitLogout({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || ''
        });
      }

      // Perform actual logout
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Doodle items for floating animations
  const doodleItems: DoodleItem[] = [
    { src: "/images/tabledodle.png", top: "10%", left: "10%", width: "100px", delay: 0 },
    { src: "/images/cakedodle.png", top: "30%", left: "20%", width: "120px", delay: 0.5 },
    { src: "/images/dodle.png", top: "70%", left: "15%", width: "110px", delay: 1 },
    { src: "/images/eventdodle.png", top: "15%", right: "30%", width: "80px", delay: 1.5 },
    { src: "/images/guiterdodle.png", top: "20%", right: "15%", width: "90px", delay: 2 },
    { src: "/images/hotdogdodle.png", top: "40%", right: "20%", width: "85px", delay: 2.5 },
    { src: "/images/meatdodle.png", top: "60%", right: "10%", width: "100px", delay: 3 },
    { src: "/images/nooddodle.png", top: "50%", left: "10%", width: "95px", delay: 3.5 },
    { src: "/images/pioanododle.png", top: "80%", left: "45%", width: "90px", delay: 4 },
    { src: "/images/tabledodle.png", top: "70%", right: "30%", width: "100px", delay: 4.5 },
    { src: "/images/teacrosdod.png", bottom: "10%", right: "15%", width: "90px", delay: 5 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-gray-50 overflow-hidden">
      {/* Floating Doodles */}
      {doodleItems.map((doodle: DoodleItem, index: number) => (
        <motion.img
          key={index}
          src={doodle.src}
          className="absolute object-contain opacity-70 z-0"
          style={{
            ...doodle,
            position: "absolute",
          }}
          animate={{
            y: [-8, 8, -8],
            rotate: [0, 3, -3, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Fixed Wave Background */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          className="w-full"
          preserveAspectRatio="none"
        >
          <path
            fill="#00F29D"
            fillOpacity="1"
            d="M0,96L48,122.7C96,149,192,203,288,213.3C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          >
            <animate
              attributeName="d"
              dur="10s"
              repeatCount="indefinite"
              values="M0,96L48,122.7C96,149,192,203,288,213.3C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,128L48,154.7C96,181,192,235,288,245.3C384,256,480,224,576,192C672,160,768,128,864,144C960,160,1056,224,1152,245.3C1248,267,1344,245,1392,234.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,96L48,122.7C96,149,192,203,288,213.3C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </path>
        </svg>
      </div>

      {/* Logo */}
      <div className="mb-6 text-center relative z-10">
        <h1 className="text-4xl font-bold">
          D<span className="relative">
            i
            <span className="absolute top-2.5 left-1.5 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></span>
          </span>neIn
          <span className="text-yellow-400">Go</span>
        </h1>
        <p className="text-sm text-gray-600">Reserve Dining & Events</p>
      </div>

      {/* Login/Forgot Password Container */}
      <motion.div
        className="bg-white p-8 rounded-3xl w-full max-w-md z-10 shadow-xl border border-emerald-100 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {showForgotPassword ? (
          <>
            {/* Forgot Password Form */}
            <div className="text-center mb-6">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setResetEmail("");
                }}
                className="absolute left-4 top-4 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
              <p className="text-sm text-gray-600 mt-2">
                {resetEmailSent
                  ? "Check your email for reset instructions!"
                  : "Enter your email to receive password reset instructions."}
              </p>
            </div>

            {!resetEmailSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {resetStep === 'email' && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-1"
                  >
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Email"
                      className={`w-full p-3 rounded-full border ${errors.general ? "border-red-500" : "border-gray-300"} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                      required
                    />
                  </motion.div>
                )}

                {resetStep === 'otp' && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="space-y-1"
                  >
                    <input
                      type="text"
                      value={resetOTP}
                      onChange={(e) => setResetOTP(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className={`w-full p-3 rounded-full border ${errors.general ? "border-red-500" : "border-gray-300"} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center tracking-widest font-bold`}
                      required
                    />
                  </motion.div>
                )}

                {resetStep === 'password' && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="space-y-1 relative"
                  >
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className={`w-full p-3 rounded-full border ${errors.general ? "border-red-500" : "border-gray-300"} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </motion.div>
                )}

                {errors.general && <p className="text-red-500 text-xs text-center">{errors.general}</p>}

                <motion.button
                  type="submit"
                  className="w-full bg-emerald-500 text-white py-3 rounded-full font-medium text-sm hover:bg-emerald-600 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." :
                    resetStep === 'email' ? "Send OTP" :
                      resetStep === 'otp' ? "Verify OTP" : "Reset Password"}
                </motion.button>
              </form>
            ) : (
              <div className="text-center">
                <p className="text-emerald-600 mb-4">Reset link sent successfully!</p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    setResetEmail("");
                  }}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Return to Login
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Login Form */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Welcome Back!</h2>
              <p className="text-sm text-gray-600 mt-2">Sign in to continue your seamless dining experience.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-1"
              >
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className={`w-full p-3 rounded-full border ${errors.email ? "border-red-500" : "border-gray-300"} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                  required
                />
                {errors.email && <p className="text-red-500 text-xs ml-4">{errors.email}</p>}
              </motion.div>

              {/* Password Input */}
              <motion.div
                className="relative space-y-1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className={`w-full p-3 rounded-full border ${errors.password ? "border-red-500" : "border-gray-300"} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs ml-4">{errors.password}</p>}
              </motion.div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetEmail(formData.email);
                  }}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <motion.button
                type="submit"
                className="w-full bg-emerald-500 text-white py-3 rounded-full font-medium text-sm hover:bg-emerald-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Login"}
              </motion.button>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-gray-500">Or</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <motion.button
                type="button"
                className="w-full bg-white text-gray-700 py-3 px-4 rounded-full border border-gray-300 font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
                onClick={handleGoogleSignIn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isGoogleSigningIn}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="#10B981"
                  />
                </svg>
                {isGoogleSigningIn ? "Signing in..." : "Sign in with Google"}
              </motion.button>

              {/* Sign-Up Link */}
              <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Don't have an account? </span>
                <Link to="/signup" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  Sign Up
                </Link>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
