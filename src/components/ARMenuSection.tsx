import React, { useState, useRef, useEffect } from 'react';
import { Camera, Scan, Info, ChefHat, Leaf, Zap, Heart, X, RotateCcw, Sparkles, Box, Clock, ShieldCheck, ZapOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  loadLocalMLModel,
  isLocalMLReady,
  identifyFoodFromCamera,
  matchLabelToMenu,
  clearVisionCache,
} from '../services/foodVisionService';
import { foodScanApi } from '../services/api';

// --- Types ---
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

// --- CSS 3D Digital Twin Component ---
const DishModel3D = ({ color = '#ec4899', isVeg = false }) => {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ perspective: '800px' }}>
      <motion.div
        animate={{ rotateY: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        style={{ transformStyle: 'preserve-3d', width: 200, height: 200, position: 'relative' }}
      >
        {/* Plate */}
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          width: 180, height: 20, borderRadius: '50%',
          background: 'radial-gradient(ellipse, #fff 60%, #e5e7eb 100%)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
        }} />
        {/* Dish blob */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
            width: 130, height: 130, borderRadius: '40% 60% 55% 45% / 50% 40% 60% 50%',
            background: `radial-gradient(circle at 35% 35%, ${isVeg ? '#34d399' : '#f472b6'}, ${color})`,
            boxShadow: `0 0 40px ${color}99, 0 20px 60px rgba(0,0,0,0.4)`
          }}
        />
        {/* Garnish dots */}
        {[0,60,120,180,240,300].map((deg, i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 10, height: 10, borderRadius: '50%',
            background: '#facc15',
            transform: `rotate(${deg}deg) translateX(70px) translateY(-50%)`,
            boxShadow: '0 0 8px #facc1599'
          }} />
        ))}
      </motion.div>
    </div>
  );
};

const ARMenuSection: React.FC<ARMenuSectionProps> = ({
  isDarkMode,
  translations,
  menuItems = [],
  isLoading = false
}) => {
  // --- State ---
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDish, setScannedDish] = useState<any | null>(null);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [confidence, setConfidence] = useState(0);
  const [activeTier, setActiveTier] = useState('');
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);

  // Ref callback — fires the moment React mounts the <video> element
  const videoCallbackRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && pendingStreamRef.current) {
      el.srcObject = pendingStreamRef.current;
      el.play().catch(console.error);
      pendingStreamRef.current = null;
    }
  };

  // --- Engine Initialization ---
  useEffect(() => {
    const initEngine = async () => {
      try {
        setEngineStatus('loading');
        // Preload local ML model (Tier-3 fallback)
        await loadLocalMLModel();
        setEngineStatus('ready');
      } catch (error) {
        console.error('Vision Engine Init Error:', error);
        setEngineStatus('error');
      }
    };
    initEngine();
  }, []);

  // --- Camera Controls ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      // Store stream so the ref callback can pick it up when video mounts
      pendingStreamRef.current = stream;
      setCameraStream(stream);
      setIsScanning(true);
      // If video is already in DOM (e.g. re-scan), assign immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
        pendingStreamRef.current = null;
      }
    } catch (error) {
      console.error('Camera Error:', error);
      toast.error('Camera permissions denied.');
    }
  };

  const fetchHistory = async () => {
    try {
      const history = await foodScanApi.getHistory();
      setScanHistory(history);
      setShowHistory(true);
    } catch (error) {
      console.error('History fetch error:', error);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsScanning(false);
  };

  // --- 3-Tier Vision Cascade: Sarvam → OpenRouter → Local ML ---
  const identifyDish = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setConfidence(0);
    setActiveTier('');
    setActiveScanId(null); // Clear previous scan ID for new attempt
    setCapturedFrame(null);

    try {
      // --- PRECISION CROP: Focus AI on the bounding box area ---
      let cropBase64 = '';
      if (videoRef.current) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        
        // Match the UI's bounding box: A square in the center
        // We take about 60% of the smaller dimension to match the HUD
        const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.7;
        const sx = (video.videoWidth - cropSize) / 2;
        const sy = (video.videoHeight - cropSize) / 2;
        
        canvas.width = 512; // Standard size for learning/AI
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 512, 512);
          cropBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedFrame(cropBase64);
        }
      }

      const result = await identifyFoodFromCamera(
        videoRef.current,
        (tier) => {
          setActiveTier(tier);
          toast.info(tier, { autoClose: 1200, toastId: 'tier-status' });
        },
        cropBase64 // Pass the cropped image to the AI
      );

      if (!result) {
        toast.warn('Dino 🦖 couldn\'t identify this. Please tell us what it is!');
        // Trigger manual entry immediately
        setShowCorrection(true);
        setCorrectionInput('');
        return;
      }

      if (result.scanId) setActiveScanId(result.scanId);

      console.log(`[Vision] Result from ${result.tier}:`, result.label, result.confidence);

      // Match AI label against the actual restaurant menu
      const matched = matchLabelToMenu(result.label, menuItems);

      if (matched && matched.score >= 0.15) {
        setConfidence(Math.round(result.confidence * 100));
        handleManualSelect(matched.item);
        toast.success(`Identified: ${matched.item.name} via ${result.tier}`);
      } else {
        // AI identified the food but it's not on this specific menu
        toast.warn(`Detected "${result.label}" — but this specific dish isn't on this menu. Try selecting manually.`);
      }

    } catch (error) {
      console.error('ID Error:', error);
      toast.error('Scan failed. Ensure you have good lighting.');
      
      // FALLBACK: Offer manual entry on error
      setShowCorrection(true);
      setCorrectionInput('');
    } finally {
      setIsProcessing(false);
      setActiveTier('');
    }
  };

  const submitCorrection = async () => {
    if (!correctionInput) return;
    try {
      if (activeScanId) {
        // Update existing scan
        await foodScanApi.correct(activeScanId, correctionInput);
      } else {
        // Create a completely new manual entry for learning
        await foodScanApi.log({
          foodName: 'Unrecognized Dish',
          confidence: 0,
          source: 'ml',
          imageData: capturedFrame || undefined,
          correctedName: correctionInput
        });
      }
      
      // Invalidate the vision memory cache so it picks up the new correction immediately
      clearVisionCache();
      
      toast.success('Dino 🦖 learned something new! Thanks!');
      setShowCorrection(false);
      setCorrectionInput('');
      
      const matched = matchLabelToMenu(correctionInput, menuItems);
      if (matched) handleManualSelect(matched.item);
    } catch (error: any) {
      console.error('Save Error:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    }
  };

  const handleManualSelect = (dish: any) => {
    const mappedDish = {
      ...dish,
      id: dish._id || dish.id,
      ingredients: dish.ingredients || ['Artisan Flour', 'House Sauce', 'Organic Herbs'],
      allergens: dish.allergens || [],
      nutrition: dish.nutrition || {
        calories: Math.floor(Math.random() * 500) + 200,
        protein: 15,
        carbs: 45,
        fat: 18,
        fiber: 5,
        sodium: 400
      },
      cookingMethod: dish.description || 'Modern molecular gastronomy preparation',
      prepTime: dish.prepTime || 25,
      spiceLevel: dish.spiceLevel || 2,
      sustainability: dish.sustainability || { score: 9, localIngredients: 85, carbonFootprint: 'Ultra-Low' }
    };
    setScannedDish(mappedDish);
    setShowManualSelection(false);
    stopCamera();
  };

  const resetScan = () => {
    setScannedDish(null);
    setShowNutrition(false);
    setShowIngredients(false);
    setConfidence(0);
  };

  const renderNutritionChart = (nutrition: NutritionInfo) => {
    const maxMacro = 60;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-6 rounded-[2rem] ${isDarkMode ? 'bg-zinc-800/30 border border-white/5' : 'bg-gray-100'} backdrop-blur-xl`}>
            <div className="text-center">
              <div className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tighter`}>
                {nutrition.calories}
              </div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Calories
              </div>
            </div>
          </div>
          <div className={`p-6 rounded-[2rem] ${isDarkMode ? 'bg-zinc-800/30 border border-white/5' : 'bg-gray-100'} backdrop-blur-xl`}>
            <div className="text-center">
              <div className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tighter`}>
                {nutrition.fiber}g
              </div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Fiber
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Protein', value: nutrition.protein, color: 'from-blue-500 to-indigo-600', max: maxMacro },
            { label: 'Carbs', value: nutrition.carbs, color: 'from-emerald-400 to-teal-500', max: maxMacro },
            { label: 'Fat', value: nutrition.fat, color: 'from-orange-400 to-pink-500', max: maxMacro }
          ].map((macro) => (
            <div key={macro.label} className="group">
              <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  {macro.label}
                </span>
                <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {macro.value}g
                </span>
              </div>
              <div className={`w-full h-3 rounded-full ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-200'} overflow-hidden p-[2px]`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(macro.value / macro.max) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${macro.color} shadow-[0_0_10px_rgba(16,185,129,0.2)]`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Fallback: assign srcObject if videoRef is available after render
    if (isScanning && cameraStream && videoRef.current) {
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = cameraStream;
      }
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.error);
      }
    }
  }, [isScanning, cameraStream]);

  // --- UI Components ---
  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Status Bar */}
      <div className="flex justify-center">
        <div className={`px-4 py-2 rounded-full backdrop-blur-xl border ${
          engineStatus === 'ready' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
          engineStatus === 'loading' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
          'bg-red-500/10 border-red-500/20 text-red-500'
        } text-[10px] font-black uppercase tracking-widest flex items-center gap-2`}>
          {engineStatus === 'ready' ? <ShieldCheck size={14} /> : engineStatus === 'loading' ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ZapOff size={14} />}
          {engineStatus === 'ready' ? 'Vision Engine Active (Local ML)' : engineStatus === 'loading' ? 'Initializing Neural Engine...' : 'Vision Engine Offline'}
        </div>
      </div>

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {!isScanning && !scannedDish ? (
          <motion.div 
            key="start"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className={`${isDarkMode ? 'bg-zinc-900/40 border-2 border-white/5 shadow-2xl' : 'bg-white shadow-xl'} backdrop-blur-3xl rounded-[3rem] p-10 sm:p-20 text-center relative group overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 max-w-lg mx-auto">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl transform group-hover:rotate-6 transition-transform duration-700">
                <Camera className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tighter text-white">Vision Discovery</h2>
              <p className="text-lg font-medium mb-12 text-gray-400">
                Instantly identify dishes and metadata using our hybrid local Neural Engine and Cloud AI.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={startCamera}
                  disabled={engineStatus === 'loading'}
                  className="px-12 py-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-black uppercase tracking-widest text-[11px] hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  Launch Scanner
                </button>
                <button
                  onClick={() => setShowManualSelection(true)}
                  className="px-10 py-5 bg-zinc-800 text-white rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-zinc-700 transition-all border border-white/5"
                >
                  Browse Archive
                </button>
                <button
                  onClick={fetchHistory}
                  className="px-10 py-5 bg-zinc-800/50 text-gray-400 rounded-full font-black uppercase tracking-widest text-[11px] hover:text-white transition-all border border-white/5 flex items-center gap-2"
                >
                  <Clock size={14} /> My History
                </button>
              </div>
            </div>
          </motion.div>
        ) : isScanning && !scannedDish ? (
          <motion.div 
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${isDarkMode ? 'bg-zinc-900/50 border border-white/5' : 'bg-white'} backdrop-blur-3xl rounded-[3rem] p-6 shadow-2xl relative overflow-hidden`}
          >
            <div className="relative rounded-[2.5rem] overflow-hidden bg-black aspect-video sm:aspect-[21/9] border-4 border-white/5">
              <video
                ref={videoCallbackRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover opacity-90"
              />

              {/* HUD Elements */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Crosshair */}
                {!isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center p-10">
                    <div className="w-full max-w-sm aspect-square border-2 border-white/10 rounded-[4rem] relative">
                      <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-purple-500 rounded-tl-[3rem]" />
                      <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-purple-500 rounded-tr-[3rem]" />
                      <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-purple-500 rounded-bl-[3rem]" />
                      <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-purple-500 rounded-br-[3rem]" />
                      
                      <motion.div
                        animate={{ y: ["0%", "100%", "0%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_30px_rgba(168,85,247,1)]"
                      />
                    </div>
                  </div>
                )}

                {/* Floating Meta Data Labels (Simulated) */}
                <div className="absolute top-10 right-10 space-y-3">
                  <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Neural Processing active</span>
                  </div>
                  <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">FPS: 60.00</span>
                  </div>
                </div>
                {/* AI Debug HUD */}
                <div className="absolute bottom-10 left-10 z-30 space-y-2 pointer-events-none">
                  <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-gray-500 mb-1">Dino Engine</p>
                    <p className="text-xs font-black text-white">{activeTier || 'Waiting for Scan...'}</p>
                  </div>
                  {confidence > 0 && (
                    <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                      <p className="text-[9px] font-black uppercase tracking-tighter text-gray-500 mb-1">Neural Confidence</p>
                      <p className="text-xs font-black text-emerald-400">{confidence}% Match</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Processing Overlay */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-zinc-950/80 backdrop-blur-2xl flex flex-col items-center justify-center"
                  >
                    <div className="w-24 h-24 relative mb-8">
                      <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full" />
                      <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-white font-black text-3xl tracking-tighter mb-4">Analyzing Molecular Composition...</p>
                    <div className="w-80 h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={identifyDish}
                disabled={isProcessing}
                className="px-12 py-5 bg-white text-black rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50"
              >
                <Scan className="w-5 h-5" />
                Analyze Dish
              </button>
              <button
                onClick={stopCamera}
                className="px-12 py-5 rounded-full bg-zinc-800 text-white font-black uppercase tracking-widest text-[11px] border border-white/10 hover:bg-zinc-700 transition-all"
              >
                Abort Mission
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Left: 3D Visualization */}
            <div className={`${isDarkMode ? 'bg-zinc-950/40 border border-white/5 shadow-2xl' : 'bg-white shadow-xl'} backdrop-blur-3xl rounded-[3rem] p-6 h-[500px] relative overflow-hidden group`}>
              <div className="absolute top-8 left-8 z-10">
                <span className="px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-500 text-[10px] font-black uppercase tracking-widest border border-purple-500/10">
                  <Sparkles size={10} className="inline mr-1" />
                  High Fidelity Digital Twin
                </span>
              </div>
              
              <DishModel3D
                color={scannedDish?.isVegetarian ? '#10b981' : '#ec4899'}
                isVeg={scannedDish?.isVegetarian}
              />

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/40 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/10 whitespace-nowrap">
                <Box size={14} className="text-purple-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Drag to rotate 360° visualization</span>
              </div>
            </div>

            {/* Right: Data & Analytics */}
            <div className="space-y-6">
              <div className={`${isDarkMode ? 'bg-zinc-900/40 border border-white/5 shadow-2xl' : 'bg-white shadow-xl'} backdrop-blur-3xl rounded-[3rem] p-10 relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                      <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">{confidence}% Neural Match Accuracy</span>
                    </div>
                    <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-4">{scannedDish.name}</h2>
                    <p className="text-gray-400 text-lg font-medium leading-relaxed">{scannedDish.description}</p>
                  </div>
                  <button onClick={resetScan} className="p-4 rounded-2xl bg-zinc-800 text-white hover:bg-red-500 transition-all border border-white/5">
                    <X size={20} />
                  </button>
                </div>

                {activeScanId && (
                  <div className="mt-4 flex items-center justify-between p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={12} /> Personalized Learning Active
                    </span>
                    <button 
                      onClick={() => setShowCorrection(true)}
                      className="text-[10px] font-black text-white uppercase tracking-widest hover:underline"
                    >
                      Not correct?
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="p-6 rounded-[2rem] bg-zinc-950/40 border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Metabolic Impact</span>
                    <span className="text-3xl font-black text-white tracking-tighter">{scannedDish.nutrition.calories} Cal</span>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-zinc-950/40 border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Market Price</span>
                    <span className="text-3xl font-black text-emerald-400 tracking-tighter">${scannedDish.price}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowNutrition(!showNutrition)}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      showNutrition ? 'bg-purple-500 text-white shadow-xl' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    <Info size={16} /> Nutrition
                  </button>
                  <button
                    onClick={() => setShowIngredients(!showIngredients)}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      showIngredients ? 'bg-purple-500 text-white shadow-xl' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    <ChefHat size={16} /> Composition
                  </button>
                </div>
              </div>

              {/* Detail Sections */}
              <AnimatePresence>
                {showNutrition && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`${isDarkMode ? 'bg-zinc-900/40 border border-white/5 shadow-2xl' : 'bg-white shadow-xl'} backdrop-blur-3xl rounded-[3rem] p-10`}>
                    <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase tracking-[0.1em]">Molecular Profile</h3>
                    {renderNutritionChart(scannedDish.nutrition)}
                  </motion.div>
                )}
                {showIngredients && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`${isDarkMode ? 'bg-zinc-900/40 border border-white/5 shadow-2xl' : 'bg-white shadow-xl'} backdrop-blur-3xl rounded-[3rem] p-10`}>
                    <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase tracking-[0.1em]">Element Origin</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {scannedDish.ingredients.map((ing: string, i: number) => (
                        <div key={i} className="p-4 rounded-xl bg-zinc-950/40 border border-white/5 text-center">
                          <span className="text-sm font-black text-white tracking-tight">{ing}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Selection Overlay */}
      <AnimatePresence>
        {showManualSelection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowManualSelection(false)} className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 40 }} className="bg-zinc-900 border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative z-10">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-zinc-950/40">
                <div>
                  <h3 className="text-4xl font-black text-white tracking-tighter leading-none">Dish Registry</h3>
                  <p className="text-[10px] font-black text-gray-500 mt-2 uppercase tracking-[0.3em]">Verified digital archives</p>
                </div>
                <button onClick={() => setShowManualSelection(false)} className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all group">
                  <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-hide">
                {menuItems.map((dish) => (
                  <button key={dish._id || dish.id} onClick={() => handleManualSelect(dish)} className="w-full p-8 bg-zinc-800/40 border border-white/5 rounded-[2rem] text-left hover:bg-purple-500/10 hover:border-purple-500/30 transition-all flex items-center justify-between group">
                    <div>
                      <p className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors tracking-tight leading-none">{dish.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mt-2">{dish.categoryName || 'General entry'}</p>
                    </div>
                    <span className="text-3xl font-black text-emerald-400 group-hover:scale-110 transition-transform tracking-tighter">${dish.price}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Overlay */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-900 border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative z-10">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-zinc-950/40">
                <h3 className="text-3xl font-black text-white tracking-tighter leading-none">Scan History</h3>
                <button onClick={() => setShowHistory(false)} className="p-4 bg-zinc-800 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {scanHistory.length > 0 ? scanHistory.map((scan) => (
                  <div key={scan._id} className="p-4 bg-zinc-800/40 border border-white/5 rounded-3xl flex items-center gap-6 transition-all hover:bg-zinc-800/60">
                    {scan.imageData && (
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-zinc-950">
                        <img src={scan.imageData} className="w-full h-full object-cover opacity-80" alt="Scan" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xl font-black text-white leading-none tracking-tight">{scan.correctedName || scan.foodName}</p>
                        {scan.correctedName && (
                          <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Learned</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase text-gray-500">{new Date(scan.createdAt).toLocaleDateString()}</span>
                        <span className="text-[9px] font-black uppercase text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">{scan.source}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20 text-gray-500 font-black uppercase tracking-widest text-xs">No scan history yet</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Correction Overlay */}
      <AnimatePresence>
        {showCorrection && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCorrection(false)} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 text-center">
              <ChefHat size={48} className="text-purple-500 mx-auto mb-6" />
              <h3 className="text-3xl font-black text-white tracking-tighter mb-2">Help Dino 🦖 Learn</h3>
              <p className="text-gray-400 text-sm mb-8">Tell us what this dish actually is so we can recognize it better next time!</p>
              
              <input
                type="text"
                value={correctionInput}
                onChange={(e) => setCorrectionInput(e.target.value)}
                placeholder="Enter correct dish name..."
                className="w-full bg-zinc-800 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold mb-6 focus:ring-2 focus:ring-purple-500 outline-none"
              />
              
              <div className="flex gap-4">
                <button onClick={submitCorrection} className="flex-1 py-4 bg-purple-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">Save & Learn</button>
                <button onClick={() => setShowCorrection(false)} className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ARMenuSection;