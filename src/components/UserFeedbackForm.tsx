import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { NotificationService } from '../services/NotificationService';
import { AlertTriangle } from 'lucide-react';

interface OnboardingFormData {
  // Discovery & Marketing Attribution
  decisionReason: string;
  followsSocialMedia: 'yes' | 'no' | 'not_sure' | '';
  
  // User Intent & Preferences
  diningFrequency: string;
  bookingPriorities: string[];
  groupSize: string;
  
  // Personalization & Notifications
  preferredCuisines: string[];
  preferredEvents: string[];
  lastMinuteDeals: 'yes' | 'no' | '';
  
  // Location & Booking Preferences
  exploreNewVenues: 'yes' | 'no' | '';
  saveFavorites: 'yes' | 'not_now' | '';
  
  // Optional Feedback
  perfectExperience: string;
  pastIssues: string;
  
  // Behavioral Insights
  bookingStyle: string;
  focusPreference: string;
  
  email: string;
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

const DineInGoOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<OnboardingFormData>({
    decisionReason: '',
    followsSocialMedia: '',
    diningFrequency: '',
    bookingPriorities: [],
    groupSize: '',
    preferredCuisines: [],
    preferredEvents: [],
    lastMinuteDeals: '',
    exploreNewVenues: '',
    saveFavorites: '',
    perfectExperience: '',
    pastIssues: '',
    bookingStyle: '',
    focusPreference: '',
    email: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(1);
  const [animationDirection, setAnimationDirection] = useState(1);
  const [notificationBlocked, setNotificationBlocked] = useState(false);

  useEffect(() => {
    const checkPermission = () => {
      if (NotificationService.isSupported()) {
        setNotificationBlocked(NotificationService.getPermission() === 'denied');
      }
    };

    checkPermission();
    // Periodically check in case the user changes settings in another tab
    const interval = setInterval(checkPermission, 2000); 

    return () => clearInterval(interval);
  }, []);

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

  const calculateCompletion = () => {
    let filledFields = 0;
    let totalFields = 0;
    
    switch (activeSection) {
      case 1: // Discovery & Marketing
        totalFields = 2;
        if (formData.decisionReason) filledFields++;
        if (formData.followsSocialMedia) filledFields++;
        break;
      case 2: // User Intent & Preferences
        totalFields = 3;
        if (formData.diningFrequency) filledFields++;
        if (formData.bookingPriorities.length > 0) filledFields++;
        if (formData.groupSize) filledFields++;
        break;
      case 3: // Personalization & Notifications
        totalFields = 3;
        if (formData.preferredCuisines.length > 0) filledFields++;
        if (formData.preferredEvents.length > 0) filledFields++;
        if (formData.lastMinuteDeals) filledFields++;
        break;
      case 4: // Location & Booking
        totalFields = 2;
        if (formData.exploreNewVenues) filledFields++;
        if (formData.saveFavorites) filledFields++;
        break;
      case 5: // Feedback & Behavioral
        totalFields = 2;
        if (formData.bookingStyle) filledFields++;
        if (formData.focusPreference) filledFields++;
        break;
      case 6: // Final
        totalFields = 1;
        if (formData.email) filledFields++;
        break;
    }
    
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  };

  const canProceedToNextSection = () => {
    switch (activeSection) {
      case 1:
        return formData.decisionReason && formData.followsSocialMedia;
      case 2:
        return formData.diningFrequency && formData.bookingPriorities.length > 0 && formData.groupSize;
      case 3:
        return formData.preferredCuisines.length > 0 && formData.preferredEvents.length > 0 && formData.lastMinuteDeals;
      case 4:
        return formData.exploreNewVenues && formData.saveFavorites;
      case 5:
        return formData.bookingStyle && formData.focusPreference;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const nextSection = () => {
    if (activeSection < 6 && canProceedToNextSection()) {
      setAnimationDirection(1);
      setActiveSection(activeSection + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevSection = () => {
    if (activeSection > 1) {
      setAnimationDirection(-1);
      setActiveSection(activeSection - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // The API route is proxied so we can just use /api/send-email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'New User Feedback - DineInGo',
          message: JSON.stringify(formData, null, 2),
          from: formData.email
        })
      });
      if (!response.ok) {
        throw new Error('Failed to send feedback.');
      }
      setSubmitSuccess(true);
      toast.success('Thank you for your feedback!');
      navigate('/dashboard'); // instant redirect
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      setError('Failed to complete onboarding. Please try again.');
      toast.error('Failed to submit feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLastMinuteDealsChange = async (value: 'yes' | 'no' | '') => {
    setFormData({ ...formData, lastMinuteDeals: value });

    if (value === 'yes') {
      if (!NotificationService.isSupported()) {
        toast.error("This browser does not support desktop notification");
        return;
      }

      const permission = NotificationService.getPermission();

      if (permission === 'granted') {
        toast.info('Notifications are already enabled!');
        NotificationService.show('DineInGo Deals', {
          body: 'You are all set to receive amazing deals!',
        });
        return;
      }

      if (permission === 'denied') {
        // The inline warning is now displayed, no need for a toast.
        return;
      }

      const newPermission = await NotificationService.requestPermission();
      if (newPermission === 'granted') {
        toast.success('Notifications enabled! You will now receive last-minute deals.');
        NotificationService.show('DineInGo Deals', {
          body: 'You are all set to receive amazing deals!',
        });
        setNotificationBlocked(false);
      } else {
        toast.info("You won't receive last-minute deals because notifications are blocked.");
        setNotificationBlocked(true);
      }
    }
  };

  const CompletionBar = ({ percentage }: { percentage: number }) => (
    <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-3">
      <motion.div 
        className="bg-gradient-to-r from-yellow-300 to-orange-400 h-3 rounded-full shadow-lg"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );

  const sectionVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const MultiSelectCard = ({ 
    options, 
    selectedValues, 
    onChange, 
    maxSelections 
  }: { 
    options: string[], 
    selectedValues: string[], 
    onChange: (values: string[]) => void,
    maxSelections?: number 
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {options.map((option) => {
        const isSelected = selectedValues.includes(option);
        const canSelect = !maxSelections || selectedValues.length < maxSelections || isSelected;
        
        return (
          <motion.div
            key={option}
            className={`relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-300 ${
              isSelected 
                ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 shadow-lg transform scale-105' 
                : canSelect
                  ? 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'
                  : 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
            }`}
            whileHover={canSelect ? { scale: 1.02 } : {}}
            whileTap={canSelect ? { scale: 0.98 } : {}}
            onClick={() => {
              if (!canSelect) return;
              
              const newValues = isSelected
                ? selectedValues.filter(v => v !== option)
                : [...selectedValues, option];
              onChange(newValues);
            }}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'bg-emerald-400 border-emerald-400' : 'border-gray-300'
              }`}>
                {isSelected && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </motion.svg>
                )}
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                {option}
              </span>
            </div>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-2 right-2 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );

  const RadioCard = ({ 
    options, 
    selectedValue, 
    onChange, 
    name 
  }: { 
    options: {value: string, label: string, icon?: string}[], 
    selectedValue: string, 
    onChange: (value: string) => void,
    name: string 
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options.map((option) => (
        <motion.label
          key={option.value}
          className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-300 ${
            selectedValue === option.value
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 shadow-lg'
              : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedValue === option.value ? 'bg-emerald-400 border-emerald-400' : 'border-gray-300'
            }`}>
              {selectedValue === option.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2.5 h-2.5 bg-white rounded-full"
                />
              )}
            </div>
            {option.icon && <span className="text-lg">{option.icon}</span>}
            <span className={`text-sm font-medium ${
              selectedValue === option.value ? 'text-emerald-700' : 'text-gray-700'
            }`}>
              {option.label}
            </span>
          </div>
        </motion.label>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4 relative overflow-hidden">
      {/* Floating Doodles */}
      {doodleItems.map((doodle, index) => (
        <motion.img
          key={index}
          src={doodle.src}
          className="absolute object-contain opacity-20 z-0"
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

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header with logo */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block bg-white p-6 rounded-2xl shadow-xl mb-6 backdrop-blur-sm">
            <h1 className="text-5xl font-bold">
              D<span className="relative">
                i
                <span className="absolute top-3.5 left-1.5 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full"></span>
              </span>neIn
              <span className="text-yellow-400">Go</span>
            </h1>
          </div>
          <motion.h2 
            className="text-2xl font-semibold text-gray-800 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Welcome! Let's personalize your experience
          </motion.h2>
          <motion.p 
            className="text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Help us understand your preferences to recommend the best dining experiences
          </motion.p>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p className="text-red-600 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Container */}
        <motion.div
          className="bg-white bg-opacity-80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white border-opacity-30"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, type: "spring" }}
        >
          {submitSuccess ? (
            <motion.div 
              className="p-12 text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">Welcome to DineInGo! 🎉</h3>
              <p className="text-gray-600 text-lg mb-2">Your preferences have been saved successfully.</p>
              <p className="text-gray-500">Redirecting to your personalized dashboard...</p>
              <motion.div 
                className="mt-6 w-32 h-1 bg-emerald-200 rounded-full mx-auto overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div 
                  className="h-full bg-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="relative">
              {/* Form Header with Progress */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-bold text-xl">Extended Onboarding</h3>
                  <span className="text-white font-medium bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    Step {activeSection} of 6
                  </span>
                </div>
                <CompletionBar percentage={calculateCompletion()} />
                <div className="flex justify-between text-xs text-white opacity-90">
                  <span>Progress</span>
                  <span>{calculateCompletion()}% Complete</span>
                </div>
              </div>

              <div className="p-8 md:p-10 min-h-[500px]">
                <AnimatePresence custom={animationDirection} mode="wait">
                  <motion.div
                    key={activeSection}
                    custom={animationDirection}
                    variants={sectionVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    className="space-y-8"
                  >
                    {/* Section 1: Discovery & Marketing Attribution */}
                    {activeSection === 1 && (
                      <div className="space-y-8">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">🧭 Discovery & Marketing</h2>
                          <p className="text-gray-600">Let's understand how you found us</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              What made you decide to try DineInGo today?
                            </label>
                            <RadioCard
                              options={[
                                { value: 'no_seat', label: "I couldn't find a good seat on other platforms", icon: '🪑' },
                                { value: 'great_deal', label: 'I saw a great deal or event', icon: '💰' },
                                { value: 'friend_recommended', label: 'A friend recommended it', icon: '👥' },
                                { value: 'try_new', label: 'I wanted to try something new', icon: '✨' },
                                { value: 'special_occasion', label: "I'm planning a special occasion", icon: '🎉' }
                              ]}
                              selectedValue={formData.decisionReason}
                              onChange={(value) => setFormData({ ...formData, decisionReason: value })}
                              name="decisionReason"
                            />
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Do you follow any of our restaurant or event partners on social media?
                            </label>
                            <RadioCard
                              options={[
                                { value: 'yes', label: 'Yes', icon: '📱' },
                                { value: 'no', label: 'No', icon: '❌' },
                                { value: 'not_sure', label: 'Not sure', icon: '🤔' }
                              ]}
                              selectedValue={formData.followsSocialMedia}
                              onChange={(value) => setFormData({ ...formData, followsSocialMedia: value as 'yes' | 'no' | 'not_sure' })}
                              name="followsSocialMedia"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 2: User Intent & Preferences */}
                    {activeSection === 2 && (
                      <div className="space-y-8">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">🧑‍💼 Intent & Preferences</h2>
                          <p className="text-gray-600">Tell us about your dining habits</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              How often do you dine out or attend events?
                            </label>
                            <RadioCard
                              options={[
                                { value: '1-2_month', label: '1–2 times a month', icon: '📅' },
                                { value: 'once_week', label: 'Once a week', icon: '📆' },
                                { value: 'few_week', label: 'A few times a week', icon: '🍽️' },
                                { value: 'rarely', label: 'Rarely', icon: '🏠' }
                              ]}
                              selectedValue={formData.diningFrequency}
                              onChange={(value) => setFormData({ ...formData, diningFrequency: value })}
                              name="diningFrequency"
                            />
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              What matters most to you when booking? <span className="text-sm text-gray-500">(Choose up to 2)</span>
                            </label>
                            <MultiSelectCard
                              options={[
                                'Seat/view location',
                                'Special deals or offers',
                                'Quick confirmation',
                                'Easy cancellation/change',
                                'VIP or exclusive access',
                                'Crowd level / privacy'
                              ]}
                              selectedValues={formData.bookingPriorities}
                              onChange={(values) => setFormData({ ...formData, bookingPriorities: values })}
                              maxSelections={2}
                            />
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Do you usually book for:
                            </label>
                            <RadioCard
                              options={[
                                { value: 'myself', label: 'Just myself', icon: '🙋‍♂️' },
                                { value: 'couple', label: 'A couple (2 people)', icon: '💑' },
                                { value: 'small_group', label: 'A small group (3–5 people)', icon: '👥' },
                                { value: 'large_group', label: 'A large group (6+)', icon: '👫👬👭' }
                              ]}
                              selectedValue={formData.groupSize}
                              onChange={(value) => setFormData({ ...formData, groupSize: value })}
                              name="groupSize"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 3: Personalization & Notifications */}
                    {activeSection === 3 && (
                      <div className="space-y-8">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">💡 Personalization</h2>
                          <p className="text-gray-600">Help us customize your experience</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Which cuisines do you enjoy most?
                            </label>
                            <MultiSelectCard
                              options={[
                                'Indian',
                                'Italian',
                                'Chinese',
                                'Continental',
                                'Mexican',
                                'Japanese',
                                'South Indian',
                                'North Indian'
                              ]}
                              selectedValues={formData.preferredCuisines}
                              onChange={(values) => setFormData({ ...formData, preferredCuisines: values })}
                            />
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Preferred event types:
                            </label>
                            <MultiSelectCard
                              options={[
                                'Live music',
                                'Stand-up comedy',
                                'Fine dining events',
                                'Food festivals',
                                'Networking / business events',
                                'Private parties'
                              ]}
                              selectedValues={formData.preferredEvents}
                              onChange={(values) => setFormData({ ...formData, preferredEvents: values })}
                            />
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Would you like to receive last-minute deal alerts in your area?
                            </label>
                            <RadioCard
                              options={[
                                { value: 'yes', label: 'Yes, I love deals!', icon: '🔔' },
                                { value: 'no', label: 'No, thanks', icon: '🔕' }
                              ]}
                              selectedValue={formData.lastMinuteDeals}
                              onChange={(value) => handleLastMinuteDealsChange(value as 'yes' | 'no')}
                              name="lastMinuteDeals"
                            />
                             {formData.lastMinuteDeals === 'yes' && notificationBlocked && (
                              <motion.div
                                className="mt-4 p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-xl text-sm flex items-start space-x-3 shadow-sm"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                              >
                                <AlertTriangle className="h-5 w-5 mt-0.5 text-yellow-500" />
                                <div>
                                  <h4 className="font-bold">Notifications Blocked</h4>
                                  <p className="mt-1">To get deal alerts, please enable notifications for this site in your browser settings.</p>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 4: Location & Booking Preferences */}
                    {activeSection === 4 && (
                      <div className="space-y-8">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">📍 Location & Booking</h2>
                          <p className="text-gray-600">Your location and booking preferences</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Are you open to exploring new venues nearby your preferred location?
                            </label>
                            <RadioCard
                              options={[
                                { value: 'yes', label: 'Yes, suggest new places', icon: '🗺️' },
                                { value: 'no', label: 'No, stick to known ones', icon: '📍' }
                              ]}
                              selectedValue={formData.exploreNewVenues}
                              onChange={(value) => setFormData({ ...formData, exploreNewVenues: value as 'yes' | 'no' })}
                              name="exploreNewVenues"
                            />
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Would you like to save your favorite locations or venues?
                            </label>
                            <RadioCard
                              options={[
                                { value: 'yes', label: 'Yes, save my favorites', icon: '❤️' },
                                { value: 'not_now', label: 'Not now', icon: '⏰' }
                              ]}
                              selectedValue={formData.saveFavorites}
                              onChange={(value) => setFormData({ ...formData, saveFavorites: value as 'yes' | 'not_now' })}
                              name="saveFavorites"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 5: Optional Feedback */}
                    {activeSection === 5 && (
                      <div className="space-y-8">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">✨ Optional Feedback</h2>
                          <p className="text-gray-600">Help us improve your experience</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              What's one thing that would make your booking experience perfect?
                            </label>
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="relative"
                            >
                              <textarea
                                value={formData.perfectExperience}
                                onChange={(e) => setFormData({ ...formData, perfectExperience: e.target.value })}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:outline-none transition-colors duration-300 bg-white resize-none"
                                rows={4}
                                placeholder="Share your thoughts... (optional)"
                              />
                              <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                                {formData.perfectExperience.length}/500
                              </div>
                            </motion.div>
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Have you had any issues with restaurant or event bookings in the past?
                            </label>
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="relative"
                            >
                              <textarea
                                value={formData.pastIssues}
                                onChange={(e) => setFormData({ ...formData, pastIssues: e.target.value })}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:outline-none transition-colors duration-300 bg-white resize-none"
                                rows={4}
                                placeholder="Tell us about any past issues... (optional)"
                              />
                              <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                                {formData.pastIssues.length}/500
                              </div>
                            </motion.div>
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Do you prefer planning ahead or making last-minute bookings?
                            </label>
                            <RadioCard
                              options={[
                                { value: 'plan_ahead', label: 'I plan days/weeks ahead', icon: '📅' },
                                { value: 'last_minute', label: 'I often book same day', icon: '⚡' },
                                { value: 'depends', label: 'Depends on the situation', icon: '🤷‍♂️' }
                              ]}
                              selectedValue={formData.bookingStyle}
                              onChange={(value) => setFormData({ ...formData, bookingStyle: value })}
                              name="bookingStyle"
                            />
                          </div>

                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Are you more price-conscious or experience-focused?
                            </label>
                            <RadioCard
                              options={[
                                { value: 'price_conscious', label: 'I want value and deals', icon: '💰' },
                                { value: 'experience_focused', label: 'I care more about the seat/experience', icon: '⭐' },
                                { value: 'balanced', label: 'A mix of both', icon: '⚖️' }
                              ]}
                              selectedValue={formData.focusPreference}
                              onChange={(value) => setFormData({ ...formData, focusPreference: value })}
                              name="focusPreference"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 6: Final Step */}
                    {activeSection === 6 && (
                      <div className="space-y-8">
                        <div className="text-center mb-8">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4"
                          >
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </motion.div>
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">🎉 Almost Done!</h2>
                          <p className="text-gray-600">Just one more step to complete your setup</p>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-lg font-semibold text-gray-800 mb-4">
                              Email Address <span className="text-red-500">*</span>
                            </label>
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="relative"
                            >
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:outline-none transition-colors duration-300 bg-white text-lg"
                                placeholder="your@email.com"
                                required
                              />
                              <motion.div
                                className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: formData.email ? 1 : 0 }}
                              >
                                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </motion.div>
                            </motion.div>
                          </div>

                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200"
                          >
                            <h3 className="font-semibold text-gray-800 mb-3">🎯 What happens next?</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                                <span>Personalized restaurant recommendations based on your preferences</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                                <span>Exclusive deals and early access to popular venues</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                                <span>Smart booking suggestions based on your dining habits</span>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="bg-gray-50 px-8 py-6 flex justify-between items-center">
                <motion.button
                  type="button"
                  onClick={prevSection}
                  disabled={activeSection === 1}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeSection === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-200 hover:shadow-md'
                  }`}
                  whileHover={activeSection !== 1 ? { scale: 1.05 } : {}}
                  whileTap={activeSection !== 1 ? { scale: 0.95 } : {}}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </motion.button>

                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5, 6].map((step) => (
                    <motion.div
                      key={step}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        step === activeSection
                          ? 'bg-emerald-500 scale-125'
                          : step < activeSection
                            ? 'bg-emerald-300'
                            : 'bg-gray-300'
                      }`}
                      initial={{ scale: 0 }}
                      animate={{ scale: step === activeSection ? 1.25 : 1 }}
                      transition={{ type: "spring", duration: 0.3 }}
                    />
                  ))}
                </div>

                {activeSection < 6 ? (
                  <motion.button
                    type="button"
                    onClick={nextSection}
                    disabled={!canProceedToNextSection()}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      canProceedToNextSection()
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    whileHover={canProceedToNextSection() ? { scale: 1.05 } : {}}
                    whileTap={canProceedToNextSection() ? { scale: 0.95 } : {}}
                  >
                    <span>Continue</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                ) : (
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || !formData.email}
                    className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-medium transition-all duration-300 ${
                      !isSubmitting && formData.email
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    whileHover={!isSubmitting && formData.email ? { scale: 1.05 } : {}}
                    whileTap={!isSubmitting && formData.email ? { scale: 0.95 } : {}}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span>Setting up...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Setup</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </form>
          )}
        </motion.div>

        {/* Additional UI Enhancement: Floating Tips */}
        <AnimatePresence>
          {activeSection === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 text-center"
            >
              <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Your answers help us recommend the perfect dining experiences</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DineInGoOnboarding;