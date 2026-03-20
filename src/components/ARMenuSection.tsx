import React, { useState, useRef, useEffect } from 'react';
import { Camera, Scan, Info, ChefHat, Leaf, Zap, Heart, X, Play, Pause, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { createWorker } from 'tesseract.js';

interface ARMenuSectionProps {
  isDarkMode: boolean;
  language: string;
  translations: any;
  menuItems?: any[];
  isLoading?: boolean;
}

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

interface DishInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  ingredients: string[];
  allergens: string[];
  nutrition: NutritionInfo;
  cookingMethod: string;
  prepTime: number;
  spiceLevel: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  sustainability: {
    score: number;
    localIngredients: number;
    carbonFootprint: string;
  };
}

const ARMenuSection: React.FC<ARMenuSectionProps> = ({
  isDarkMode,
  language,
  translations,
  menuItems = [],
  isLoading = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDish, setScannedDish] = useState<any | null>(null);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setIsScanning(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Fallback to mock scanning for demo
      setIsScanning(true);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsScanning(false);
  };

  const performOCR = async () => {
    if (isLoading) {
      toast.info('Syncing menu data... Please wait.');
      return;
    }

    if (!videoRef.current || !canvasRef.current || (menuItems || []).length === 0) {
      const errorMsg = (menuItems || []).length === 0
        ? 'Menu data not ready. Please try again in a moment.'
        : 'Camera not ready. Please ensure camera access is allowed.';
      toast.error(errorMsg);
      return;
    }

    try {
      setIsProcessingOCR(true);
      setOcrProgress(0);

      // 1. Capture Frame
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // 2. Process with Tesseract
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.floor(m.progress * 100));
          }
        }
      });

      const { data: { text } } = await worker.recognize(canvas.toDataURL('image/jpeg'));
      await worker.terminate();

      console.log('OCR Result:', text);

      // 3. Fuzzy Match with Menu Items
      const normalizedOCR = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      let bestMatch: any = null;
      let highestScore = 0;

      (menuItems || []).forEach(item => {
        const itemName = item.name.toLowerCase();
        // Simple word-based matching score
        const words = itemName.split(' ');
        let matches = 0;
        words.forEach((word: string) => {
          if (normalizedOCR.includes(word) && word.length > 2) {
            matches++;
          }
        });

        const score = matches / words.length;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      });

      if (bestMatch && highestScore > 0.4) {
        handleManualSelect(bestMatch);
        toast.success(`Identified: ${bestMatch.name}`);
      } else {
        toast.warn('Could not identify dish clearly. Try again or select manually.');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Identification failed. Please try manual selection.');
    } finally {
      setIsProcessingOCR(false);
      setOcrProgress(0);
    }
  };

  const simulateScan = () => {
    // Keep this as a "Demo/Test" function or remove if no longer needed
    // For now, let's keep it but label it clearly in UI if needed
    if (menuItems.length > 0) {
      setTimeout(() => {
        const randomDish = menuItems[Math.floor(Math.random() * menuItems.length)];
        handleManualSelect(randomDish);
      }, 1500);
    }
  };

  const handleManualSelect = (dish: any) => {
    const mappedDish = {
      ...dish,
      id: dish._id || dish.id,
      ingredients: dish.ingredients || [],
      allergens: dish.allergens || [],
      nutrition: dish.nutrition || {
        calories: 350,
        protein: 15,
        carbs: 40,
        fat: 12,
        fiber: 4,
        sodium: 300
      },
      cookingMethod: dish.description || 'Traditional preparation',
      prepTime: dish.prepTime || 20,
      spiceLevel: dish.spiceLevel || 1,
      sustainability: dish.sustainability || { score: 8, localIngredients: 75, carbonFootprint: 'Low' }
    };
    setScannedDish(mappedDish);
    setShowManualSelection(false);
    stopCamera();
  };

  const resetScan = () => {
    setScannedDish(null);
    setShowNutrition(false);
    setShowIngredients(false);
  };

  useEffect(() => {
    if (isScanning && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isScanning, cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const renderNutritionChart = (nutrition: NutritionInfo) => {
    const maxCalories = 800;
    const maxMacro = 60;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {nutrition.calories}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Calories
              </div>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {nutrition.fiber}g
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Fiber
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Protein', value: nutrition.protein, color: 'bg-blue-500', max: maxMacro },
            { label: 'Carbs', value: nutrition.carbs, color: 'bg-green-500', max: maxMacro },
            { label: 'Fat', value: nutrition.fat, color: 'bg-yellow-500', max: maxMacro }
          ].map((macro) => (
            <div key={macro.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {macro.label}
                </span>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {macro.value}g
                </span>
              </div>
              <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-2 rounded-full ${macro.color}`}
                  style={{ width: `${(macro.value / macro.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4 sm:p-8`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 mb-6 shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {translations.arMenu}
              </h1>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {translations.arExperience}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-3 mb-2">
                <Scan className="w-5 h-5 text-blue-500" />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  3D Visualization
                </span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                See dishes in 3D before ordering
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-3 mb-2">
                <Info className="w-5 h-5 text-green-500" />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translations.nutritionInfo}
                </span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Detailed nutrition information
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-3 mb-2">
                <ChefHat className="w-5 h-5 text-orange-500" />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translations.ingredients}
                </span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Interactive ingredient details
              </p>
            </div>
          </div>
        </div>

        {!isScanning && !scannedDish && (
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 shadow-lg text-center`}>
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-white" />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {translations.scanMenu}
              </h2>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Point your camera at any dish to see detailed information, nutrition facts, and 3D visualization
              </p>
            </div>
            <button
              onClick={startCamera}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <Camera className="w-5 h-5" />
              Start AR Scanning
            </button>
          </div>
        )}

        {isScanning && !scannedDish && (
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg`}>
            <div className="relative rounded-xl overflow-hidden bg-gray-200 aspect-video md:aspect-auto md:h-96">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: 'none' }}
              />

              {/* Scanning Crosshair Overlay */}
              {!isProcessingOCR && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/30 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-lg" />
                    <motion.div
                      animate={{ y: [0, 192, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                    />
                  </div>
                </div>
              )}

              {/* Processing Overlay */}
              <AnimatePresence>
                {isProcessingOCR && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center"
                  >
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6" />
                    <p className="text-white font-bold text-xl mb-4">Reading Menu Card...</p>
                    <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                    <p className="text-white/60 text-sm">{ocrProgress}% complete</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Hint */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <div className={`px-6 py-2 rounded-full ${isDarkMode ? 'bg-black/60' : 'bg-white/60'} backdrop-blur-md border border-white/10 shadow-xl`}>
                  <p className={`text-sm font-bold tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {isProcessingOCR ? 'Hold steady...' : 'Align menu text within frame'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 mt-8">
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <button
                  onClick={performOCR}
                  disabled={isProcessingOCR || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Scan className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                  {isLoading ? 'Syncing...' : 'Identify'}
                </button>
                <button
                  onClick={stopCamera}
                  disabled={isProcessingOCR}
                  className={`px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${isDarkMode
                    ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                    }`}
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>

              <button
                onClick={() => setShowManualSelection(true)}
                disabled={isProcessingOCR}
                className="text-purple-400 text-sm font-bold hover:text-purple-300 transition-colors flex items-center gap-2"
              >
                Can't scan? Select from list
              </button>
            </div>

            {/* Manual Selection Modal */}
            <AnimatePresence>
              {showManualSelection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-sm rounded-2xl flex flex-col p-6 overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Select a Dish</h3>
                    <button onClick={() => setShowManualSelection(false)} className="p-2 hover:bg-white/10 rounded-full">
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                    {menuItems.map((dish) => (
                      <button
                        key={dish._id || dish.id}
                        onClick={() => handleManualSelect(dish)}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-bold text-white group-hover:text-purple-400 transition-colors">{dish.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{dish.categoryName}</p>
                        </div>
                        <span className="text-emerald-400 font-bold">${dish.price}</span>
                      </button>
                    ))}
                    {menuItems.length === 0 && (
                      <p className="text-center text-gray-500 mt-10">No items available in the digital menu.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {scannedDish && (
          <div className="space-y-6">
            {/* Dish Information */}
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {scannedDish.name}
                  </h2>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    {scannedDish.description}
                  </p>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-2xl font-bold text-emerald-500">
                      ${scannedDish.price}
                    </span>
                    <div className="flex items-center gap-2">
                      {scannedDish.isVegetarian && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Vegetarian
                        </span>
                      )}
                      {scannedDish.isVegan && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Vegan
                        </span>
                      )}
                      {scannedDish.isGlutenFree && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Gluten-Free
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetScan}
                  className={`p-2 rounded-xl ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                >
                  <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setShowNutrition(!showNutrition)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${showNutrition
                    ? 'bg-emerald-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <Info className="w-4 h-4" />
                  {translations.nutritionInfo}
                </button>
                <button
                  onClick={() => setShowIngredients(!showIngredients)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${showIngredients
                    ? 'bg-emerald-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <ChefHat className="w-4 h-4" />
                  {translations.ingredients}
                </button>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Prep Time
                    </span>
                  </div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {scannedDish.prepTime} min
                  </div>
                </div>

                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Spice Level
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-2 h-4 rounded-full ${level <= scannedDish.spiceLevel ? 'bg-red-500' : 'bg-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                </div>

                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Leaf className="w-4 h-4 text-green-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Sustainability
                    </span>
                  </div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {scannedDish.sustainability.score}/10
                  </div>
                </div>

                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ChefHat className="w-4 h-4 text-blue-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Local
                    </span>
                  </div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {scannedDish.sustainability.localIngredients}%
                  </div>
                </div>
              </div>
            </div>

            {/* Nutrition Information */}
            {showNutrition && (
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg`}>
                <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translations.nutritionInfo}
                </h3>
                {renderNutritionChart(scannedDish.nutrition)}
              </div>
            )}

            {/* Ingredients */}
            {showIngredients && (
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg`}>
                <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translations.ingredients}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {scannedDish.ingredients.map((ingredient: string, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} text-center`}
                    >
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {ingredient}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translations.cookingMethod}
                  </h4>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {scannedDish.cookingMethod}
                  </p>
                </div>

                {scannedDish.allergens.length > 0 && (
                  <div>
                    <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Allergens
                    </h4>
                    <div className="flex gap-2">
                      {scannedDish.allergens.map((allergen: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="text-center">
              <button
                onClick={resetScan}
                className={`px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 mx-auto ${isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <RotateCcw className="w-5 h-5" />
                Scan Another Dish
              </button>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default ARMenuSection;