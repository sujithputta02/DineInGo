import React, { useState, useRef, useEffect } from 'react';
import { Camera, Scan, Info, ChefHat, Leaf, Zap, Heart, X, Play, Pause, RotateCcw } from 'lucide-react';

interface ARMenuSectionProps {
  isDarkMode: boolean;
  language: string;
  translations: any;
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

const ARMenuSection: React.FC<ARMenuSectionProps> = ({ isDarkMode, language, translations }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDish, setScannedDish] = useState<DishInfo | null>(null);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mock dish data for demonstration
  const mockDishes: DishInfo[] = [
    {
      id: '1',
      name: 'Butter Chicken',
      description: 'Creamy tomato-based curry with tender chicken pieces',
      price: 18.99,
      ingredients: ['Chicken', 'Tomatoes', 'Cream', 'Butter', 'Onions', 'Garlic', 'Ginger', 'Spices'],
      allergens: ['Dairy'],
      nutrition: {
        calories: 520,
        protein: 35,
        carbs: 12,
        fat: 38,
        fiber: 3,
        sodium: 890
      },
      cookingMethod: 'Slow-cooked in traditional tandoor style',
      prepTime: 25,
      spiceLevel: 2,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: true,
      sustainability: {
        score: 7,
        localIngredients: 60,
        carbonFootprint: 'Medium'
      }
    },
    {
      id: '2',
      name: 'Quinoa Buddha Bowl',
      description: 'Nutritious bowl with quinoa, roasted vegetables, and tahini dressing',
      price: 16.99,
      ingredients: ['Quinoa', 'Kale', 'Sweet Potato', 'Chickpeas', 'Avocado', 'Tahini', 'Lemon'],
      allergens: ['Sesame'],
      nutrition: {
        calories: 420,
        protein: 18,
        carbs: 52,
        fat: 16,
        fiber: 12,
        sodium: 340
      },
      cookingMethod: 'Fresh assembly with roasted vegetables',
      prepTime: 15,
      spiceLevel: 1,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      sustainability: {
        score: 9,
        localIngredients: 85,
        carbonFootprint: 'Low'
      }
    }
  ];

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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

  const simulateScan = () => {
    // Simulate scanning delay
    setTimeout(() => {
      const randomDish = mockDishes[Math.floor(Math.random() * mockDishes.length)];
      setScannedDish(randomDish);
      stopCamera();
    }, 2000);
  };

  const resetScan = () => {
    setScannedDish(null);
    setShowNutrition(false);
    setShowIngredients(false);
  };

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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
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
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 md:h-96 object-cover rounded-xl bg-gray-200"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: 'none' }}
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-4 border-purple-500 rounded-xl relative">
                  <div className="absolute inset-0 border-4 border-purple-500 rounded-xl animate-pulse"></div>
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-purple-500"></div>
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-purple-500"></div>
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-purple-500"></div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-purple-500"></div>
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className={`px-4 py-2 rounded-full ${isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-sm`}>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Point camera at a dish to scan...
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={simulateScan}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center gap-2"
              >
                <Scan className="w-5 h-5" />
                Simulate Scan
              </button>
              <button
                onClick={stopCamera}
                className={`px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
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
                  className={`p-2 rounded-xl ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setShowNutrition(!showNutrition)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                    showNutrition
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                    showIngredients
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
                        className={`w-2 h-4 rounded-full ${
                          level <= scannedDish.spiceLevel ? 'bg-red-500' : 'bg-gray-300'
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
                  {scannedDish.ingredients.map((ingredient, index) => (
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
                      {scannedDish.allergens.map((allergen, index) => (
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
                className={`px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 mx-auto ${
                  isDarkMode 
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
    </div>
  );
};

export default ARMenuSection;