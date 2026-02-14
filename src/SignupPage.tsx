import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { motion } from "framer-motion";
import {
  auth,
  provider,
  signInWithPopup,
  createUserWithEmailAndPassword
} from "./firebase";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { userAPI, authOtpApi } from './services/api';
import { sendVerificationEmail } from "./authUtils";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface FormErrors {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: string;
  general: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

interface OTPFormData {
  digit1: string;
  digit2: string;
  digit3: string;
  digit4: string;
  digit5: string;
  digit6: string;
}

interface DoodleItem {
  src: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: string;
  delay: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: "",
    color: ""
  });
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });
  const [errors, setErrors] = useState<FormErrors>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: "",
    general: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otpFormData, setOTPFormData] = useState<OTPFormData>({
    digit1: '',
    digit2: '',
    digit3: '',
    digit4: '',
    digit5: '',
    digit6: ''
  });
  const [otpError, setOtpError] = useState('');
  const [tempFormData, setTempFormData] = useState<FormData | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpVerified, setOtpVerified] = useState(false);

  // Store OTPs temporarily
  const [otpStore, setOtpStore] = useState<{ [email: string]: { otp: string, expiry: number } }>({});

  useEffect(() => {
    if (showVerification) {
      const interval = setInterval(async () => {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            clearInterval(interval);
            toast.success("Email verified successfully! Redirecting...");

            const isNewUser = sessionStorage.getItem('isNewUser') === 'true';
            if (isNewUser) {
              sessionStorage.removeItem('isNewUser'); // clear flag
              navigate('/onboarding');
            } else {
              navigate('/dashboard'); // fallback for existing user
            }
          }
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [showVerification, navigate]);

  // Check password strength whenever password changes
  useEffect(() => {
    if (formData.password) {
      const strength = checkPasswordStrength(formData.password);
      setPasswordStrength(strength);

      // If confirm password already has a value, check matching again
      if (formData.confirmPassword) {
        setPasswordsMatch(formData.password === formData.confirmPassword);
      } else {
        setPasswordsMatch(null);
      }
    } else {
      setPasswordStrength({ score: 0, label: "", color: "" });
      setPasswordsMatch(null);
    }
  }, [formData.password]);

  // Check if passwords match whenever confirm password changes
  useEffect(() => {
    if (formData.confirmPassword && formData.password) {
      setPasswordsMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordsMatch(null);
    }
  }, [formData.confirmPassword]);

  // Function to check password strength
  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1; // Has uppercase
    if (/[a-z]/.test(password)) score += 1; // Has lowercase
    if (/[0-9]/.test(password)) score += 1; // Has number
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Has special char

    // Define strength levels
    if (score <= 2) {
      return { score, label: "Weak", color: "bg-red-500" };
    } else if (score <= 4) {
      return { score, label: "Moderate", color: "bg-yellow-500" };
    } else {
      return { score, label: "Strong", color: "bg-green-500" };
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Validate passwords match
    if (name === 'password' || name === 'confirmPassword') {
      const password = name === 'password' ? value : formData.password;
      const confirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword;
      setPasswordsMatch(password === confirmPassword);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      password: value
    }));

    // Clear error when user starts typing
    if (errors.password) {
      setErrors(prev => ({
        ...prev,
        password: ''
      }));
    }

    // Calculate password strength
    const strength = calculatePasswordStrength(value);
    setPasswordStrength(strength);
  };

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    let label = '';
    let color = '';

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character type checks
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Determine strength label and color
    if (score <= 2) {
      label = 'Weak';
      color = 'text-red-500';
    } else if (score <= 4) {
      label = 'Medium';
      color = 'text-yellow-500';
    } else {
      label = 'Strong';
      color = 'text-green-500';
    }

    return { score, label, color };
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: '',
      general: ''
    };

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Create user data object
      const userData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || '',
        name: user.displayName || user.email?.split('@')[0] || '',
        photoURL: user.photoURL || null,
        emailVerified: user.emailVerified
      };

      // Create user in backend
      const savedUser = await userAPI.createUser(userData);

      // Store in session storage
      sessionStorage.setItem('userData', JSON.stringify(savedUser));

      // Navigate to onboarding
      navigate("/onboarding");
    } catch (error: any) {
      console.error("Google Sign-Up failed:", error);
      let errorMessage = 'Failed to sign up with Google.';

      switch (error.code) {
        case 'auth/popup-blocked':
          errorMessage = 'Please allow popups for this website to sign up with Google.';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Google sign up was cancelled. Please try again.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email. Please try signing in.';
          break;
        default:
          errorMessage = error.message || 'Failed to sign up with Google.';
      }

      setErrors(prev => ({
        ...prev,
        general: errorMessage
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Function to send OTP email
  const sendOTPEmail = async (email: string) => {
    try {
      await authOtpApi.requestSignupOTP(email);
      console.log('OTP email sent successfully');
      return true;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP email');
      throw error;
    }
  };

  // Function to start resend timer
  const startResendTimer = () => {
    setResendTimer(30);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle OTP input change
  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof OTPFormData) => {
    const { value } = e.target;
    if (value.length <= 1 && /^[0-9]*$/.test(value)) {
      setOTPFormData(prev => ({
        ...prev,
        [field]: value
      }));

      // Auto-focus next input
      if (value.length === 1) {
        const inputs = document.querySelectorAll('input[type="text"]');
        const currentIndex = Array.from(inputs).findIndex(input => input === e.target);
        if (currentIndex < inputs.length - 1) {
          (inputs[currentIndex + 1] as HTMLInputElement).focus();
        }
      }
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async () => {
    const enteredOTP = Object.values(otpFormData).join('');
    if (enteredOTP.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const email = tempFormData?.email;
      if (!email) {
        throw new Error('Email not found');
      }

      await authOtpApi.verifySignupOTP(email, enteredOTP);

      setOtpVerified(true);
      toast.success('Email verified successfully!');

      // Create user account after OTP verification
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        tempFormData!.email,
        tempFormData!.password
      );
      const user = userCredential.user;

      // Create user data object
      const userData = {
        uid: user.uid,
        email: tempFormData!.email,
        displayName: tempFormData!.name,
        name: tempFormData!.name,
        photoURL: user.photoURL || null,
        lastLogin: new Date(),
        createdAt: new Date(),
        emailVerified: false
      };

      // Store user data in MongoDB
      await userAPI.createUser(userData);

      // Store in session storage
      sessionStorage.setItem('userData', JSON.stringify(userData));

      // Navigate to onboarding
      navigate("/onboarding");
    } catch (error: any) {
      console.error("Error during verification:", error);
      setOtpError(error.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Instead of direct signup, request OTP first
      await sendOTPEmail(formData.email);
      setTempFormData(formData);
      setShowOTPVerification(true);
      setVerificationEmail(formData.email);
      startResendTimer();
      toast.info('OTP has been sent to your email.');

    } catch (error: any) {
      console.error("Error during signup:", error);
      let errorMessage = 'Failed to sign up. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please try logging in.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password registration is not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Please choose a stronger password.';
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      }

      setErrors(prev => ({
        ...prev,
        general: errorMessage
      }));

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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
    { src: "/images/cakedodle.png", bottom: "5%", left: "5%", width: "140px", delay: 5.5 },
  ];

  // Update the verification resend handler
  const handleResendVerification = async () => {
    if (verificationEmail) {
      setIsLoading(true);
      try {
        // Try to get the user from session storage
        const tempUserStr = sessionStorage.getItem('tempUser');
        if (!tempUserStr) {
          throw new Error('User session expired. Please try signing up again.');
        }

        const tempUser = JSON.parse(tempUserStr);

        // Get the current user or try to get user from Firebase
        const user = auth.currentUser;
        if (!user) {
          toast.error('Session expired. Please try signing up again.');
          setShowVerification(false);
          setVerificationSent(false);
          return;
        }

        console.log('Attempting to resend verification email to:', user.email);
        const result = await sendVerificationEmail(user);
        console.log('Resend verification email result:', result);
        if (!result.success) {
          throw new Error(result.message || 'Failed to resend verification email');
        }
        toast.success('Verification email resent! Please check your inbox and spam folder.');
      } catch (error) {
        console.error('Detailed error resending verification:', error);
        toast.error('Failed to resend verification email. Please try signing up again.');
        // Redirect to signup form
        setShowVerification(false);
        setVerificationSent(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-gray-50 overflow-hidden">
      {/* Floating Doodles */}
      {doodleItems.map((doodle, index) => (
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
              values="
                M0,96L48,122.7C96,149,192,203,288,213.3C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,128L48,154.7C96,181,192,235,288,245.3C384,256,480,224,576,192C672,160,768,128,864,144C960,160,1056,224,1152,245.3C1248,267,1344,245,1392,234.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,96L48,122.7C96,149,192,203,288,213.3C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z
              "
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

      {/* Signup/Verification Container */}
      <motion.div
        className="bg-white p-8 rounded-3xl w-full max-w-md z-10 shadow-xl border border-emerald-100 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {showOTPVerification ? (
          <>
            {/* OTP Verification View */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>
              <p className="text-sm text-gray-600 mt-2">
                We've sent a 6-digit code to<br />
                <span className="font-medium">{verificationEmail}</span>
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between gap-2 max-w-xs mx-auto">
                {(['digit1', 'digit2', 'digit3', 'digit4', 'digit5', 'digit6'] as const).map((field, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={otpFormData[field]}
                    onChange={(e) => handleOTPChange(e, field)}
                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-red-500 text-xs text-center font-medium">{otpError}</p>
              )}

              <motion.button
                onClick={handleVerifyOTP}
                className="w-full bg-emerald-500 text-white py-3 rounded-full font-medium text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify & Create Account"}
              </motion.button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?{' '}
                  <button
                    onClick={() => {
                      if (resendTimer === 0) {
                        sendOTPEmail(verificationEmail);
                        startResendTimer();
                      }
                    }}
                    className={`font-medium ${resendTimer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-emerald-600 hover:text-emerald-700'}`}
                    disabled={resendTimer > 0 || isLoading}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </p>
                <button
                  onClick={() => setShowOTPVerification(false)}
                  className="mt-4 text-xs text-gray-400 hover:text-gray-600 font-medium"
                >
                  Change Email Address
                </button>
              </div>
            </div>
          </>
        ) : showVerification ? (
          <>
            {/* Verification Message */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Verify Your Email</h2>
              <p className="text-sm text-gray-600 mt-2">
                We've sent a verification link to<br />
                <span className="font-medium">{verificationEmail}</span>
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Please check your email and click the verification link to complete your registration.
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the email?{' '}
                <button
                  onClick={handleResendVerification}
                  className="text-emerald-600 font-medium hover:text-emerald-700"
                  disabled={isLoading}
                >
                  Resend Email
                </button>
              </p>
              <div className="mt-4">
                <Link
                  to="/login"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Regular Signup Form */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
              <p className="text-sm text-gray-600 mt-2">Join us and explore the best dining and event experiences.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                className="space-y-1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Name"
                  className={`w-full p-3 rounded-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-xs ml-4">{errors.name}</p>
                )}
              </motion.div>

              <motion.div
                className="space-y-1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email ID"
                  className={`w-full p-3 rounded-full border ${errors.email ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                  required
                />
                {errors.email && (
                  <p className="text-red-500 text-xs ml-4">{errors.email}</p>
                )}
              </motion.div>

              <motion.div
                className="relative space-y-1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    placeholder="Password"
                    className={`w-full p-3 rounded-full border ${errors.password ? 'border-red-500' : 'border-gray-300'} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
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

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2 ml-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color}`}
                          style={{
                            width: `${(passwordStrength.score / 6) * 100}%`,
                            transition: 'width 0.3s ease'
                          }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength.label === 'Weak' ? 'text-red-500' :
                        passwordStrength.label === 'Moderate' ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Password should have 8+ characters with upper, lower case, numbers and symbols.
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="text-red-500 text-xs ml-4">{errors.password}</p>
                )}
              </motion.div>

              <motion.div
                className="relative space-y-1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm Password"
                    className={`w-full p-3 rounded-full border ${errors.confirmPassword ? 'border-red-500' : (passwordsMatch === false ? 'border-red-500' : (passwordsMatch === true ? 'border-green-500' : 'border-gray-300'))} bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    required
                  />
                  {/* Password match indicator */}
                  {passwordsMatch !== null && (
                    <span className="absolute right-12 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? (
                        <Check size={20} className="text-green-500" />
                      ) : (
                        <X size={20} className="text-red-500" />
                      )}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Password Match Status */}
                {formData.confirmPassword && (
                  <div className="mt-1 ml-4">
                    <p className={`text-xs font-medium ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  </div>
                )}

                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs ml-4">{errors.confirmPassword}</p>
                )}
              </motion.div>

              <motion.div
                className="flex items-start space-x-2"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                    I Agree
                    <Link to="/terms" className="text-blue-600 hover:underline ml-1">Terms and Conditions</Link>
                  </label>
                  {errors.agreeToTerms && (
                    <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>
                  )}
                </div>
              </motion.div>

              <motion.button
                type="submit"
                className="w-full bg-emerald-500 text-white py-3 rounded-full font-medium text-sm hover:bg-emerald-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Sign Up
              </motion.button>

              <div className="text-center py-2">
                <span className="text-sm text-gray-500">Or</span>
              </div>

              {/* Google Sign-Up Button */}
              <motion.button
                type="button"
                className="w-full bg-white text-gray-700 py-3 px-4 rounded-full border border-gray-300 font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
                onClick={handleGoogleSignUp}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="#10B981"
                  />
                </svg>
                Sign Up With Google
              </motion.button>

              <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Already have an account? </span>
                <Link
                  to="/login"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  onClick={() => {
                    // Clear any existing errors when navigating to login
                    setErrors({
                      name: "",
                      email: "",
                      password: "",
                      confirmPassword: "",
                      agreeToTerms: "",
                      general: ""
                    });
                  }}
                >
                  Sign In
                </Link>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default SignupPage;
