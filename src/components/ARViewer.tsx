import React, { useState, useEffect, useRef, useCallback } from 'react';
import '@google/model-viewer/dist/model-viewer.min.js';
import {
  RotateCcw,
  Sparkles,
  Maximize2,
  Info,
  AlertCircle,
  Smartphone,
  Eye,
  RefreshCw,
  X,
  Share2,
  Layers,
  ChevronUp,
  Flame,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  BookmarkCheck,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  resolveDishModel,
  detectDeviceARSupport,
  type ResolvableDish,
  type ResolvedDishModel,
  type ARSupportStatus
} from '../services/arModelService';
import {
  resolveNutritionIntelligence,
  scaleNutrition,
  type DetailedFoodNutrition
} from '../services/nutritionIntelligenceService';
import {
  evaluateDishRecommendation,
  type RecommendationOutcome,
  type UserFoodPreferences
} from '../services/recommendationEngine';

export interface ARViewerProps {
  dish: ResolvableDish;
  onClose?: () => void;
  className?: string;
  autoRotateDefault?: boolean;
  showDetailsOverlay?: boolean;
  userPreferences?: UserFoodPreferences | null;
  onLogMealSuccess?: (entry: any) => void;
}

export const ARViewer: React.FC<ARViewerProps> = ({
  dish,
  onClose,
  className = '',
  autoRotateDefault = true,
  showDetailsOverlay = true,
  userPreferences = null,
  onLogMealSuccess
}) => {
  const modelViewerRef = useRef<any>(null);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotateDefault);
  const [arSupport, setArSupport] = useState<ARSupportStatus>(detectDeviceARSupport());
  const [canActivateAR, setCanActivateAR] = useState(false);
  const [arStatus, setArStatus] = useState<string>('not-presenting');
  const [showAttribution, setShowAttribution] = useState(false);
  const [showCapabilityHelp, setShowCapabilityHelp] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Portion Scaling & Meal Tracking States
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1.0);
  const [logMealStatus, setLogMealStatus] = useState<'idle' | 'logging' | 'success' | 'duplicate' | 'error'>('idle');

  // Compute live nutrition intelligence with provenance
  const nutrition: DetailedFoodNutrition = resolveNutritionIntelligence(dish.name, {
    portionMultiplier,
    verifiedRestaurantData: dish.calories ? {
      baseNutrition: {
        calories: dish.calories,
        protein: 18,
        carbs: 28,
        fat: 14
      },
      allergens: dish.allergens,
      dietaryTags: dish.dietaryTags
    } : undefined
  });

  // Evaluate personalized recommendations
  const recommendation: RecommendationOutcome = evaluateDishRecommendation(nutrition, userPreferences);

  // Resolve the 3D model configuration using our typed priority pipeline
  const resolved: ResolvedDishModel = resolveDishModel(dish);

  // Detect platform capabilities on mount
  useEffect(() => {
    setArSupport(detectDeviceARSupport());
  }, []);

  const activeModelUrlRef = useRef<string | null>(null);

  // Configure model-viewer event listeners & AR capability detection
  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (!viewer || !resolved.hasModel) {
      if (!resolved.hasModel) {
        setModelState('ready'); // Photo fallback is immediately ready
      }
      return;
    }

    activeModelUrlRef.current = resolved.modelUrl;
    setModelState('loading');
    setLoadProgress(15);
    setErrorMessage(null);

    const handleProgress = (event: any) => {
      if (activeModelUrlRef.current !== resolved.modelUrl) return;
      const progress = Math.round((event.detail?.totalProgress || 0) * 100);
      setLoadProgress(progress);
    };

    const handleLoad = () => {
      if (activeModelUrlRef.current !== resolved.modelUrl) return;
      setModelState('ready');
      setLoadProgress(100);

      // Check if native AR can actually be activated on this viewer/device
      try {
        if (typeof viewer.canActivateAR === 'boolean') {
          setCanActivateAR(viewer.canActivateAR);
        } else if (typeof viewer.canActivateAR === 'function') {
          viewer.canActivateAR().then((supported: boolean) => {
            if (activeModelUrlRef.current === resolved.modelUrl) {
              setCanActivateAR(Boolean(supported));
            }
          }).catch(() => {
            if (activeModelUrlRef.current === resolved.modelUrl) {
              setCanActivateAR(arSupport.isARSupported);
            }
          });
        } else {
          setCanActivateAR(arSupport.isARSupported);
        }
      } catch (err) {
        setCanActivateAR(arSupport.isARSupported);
      }
    };

    const handleError = (errorEvent: any) => {
      if (activeModelUrlRef.current !== resolved.modelUrl) return;
      console.warn('[ARViewer] Model failed to load:', errorEvent);
      setModelState('error');
      setErrorMessage('Failed to load 3D model asset. High-resolution photo preview is available.');
    };

    const handleARStatus = (event: any) => {
      const status = event.detail?.status || 'unknown';
      setArStatus(status);
    };

    viewer.addEventListener('progress', handleProgress);
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    viewer.addEventListener('ar-status', handleARStatus);

    return () => {
      viewer.removeEventListener('progress', handleProgress);
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
      viewer.removeEventListener('ar-status', handleARStatus);
    };
  }, [resolved.hasModel, resolved.modelUrl, reloadKey, arSupport.isARSupported]);

  // Handle AR Activation synchronously on user click gesture
  const handleLaunchAR = useCallback(() => {
    const viewer = modelViewerRef.current;
    if (!viewer || !resolved.hasModel || modelState !== 'ready') {
      return;
    }

    // If viewer does not confirm AR support, show guidance modal
    if (!canActivateAR) {
      setShowCapabilityHelp(true);
      return;
    }

    try {
      if (typeof viewer.activateAR === 'function') {
        viewer.activateAR().catch((err: any) => {
          console.warn('[ARViewer] activateAR failed:', err);
          setArStatus('failed');
        });
      } else {
        // Fallback: Trigger internal AR button click
        const internalArButton = viewer.shadowRoot?.querySelector('#default-ar-button') as HTMLButtonElement | null;
        if (internalArButton) {
          internalArButton.click();
        } else {
          setShowCapabilityHelp(true);
        }
      }
    } catch (err) {
      console.error('[ARViewer] Error activating AR:', err);
      setArStatus('failed');
    }
  }, [resolved.hasModel, modelState, canActivateAR]);

  const handleResetCamera = () => {
    const viewer = modelViewerRef.current;
    if (viewer) {
      if (resolved.cameraOrbit) viewer.cameraOrbit = resolved.cameraOrbit;
      if (resolved.cameraTarget) viewer.cameraTarget = resolved.cameraTarget;
      viewer.fieldOfView = resolved.fieldOfView || '30deg';
      viewer.jumpCameraToGoal();
    }
  };

  const handleRetryLoad = () => {
    setReloadKey(prev => prev + 1);
  };

  const handleLogIntake = async () => {
    setLogMealStatus('logging');
    try {
      const payload = {
        userId: (userPreferences as any)?.userId || 'demo_user',
        dishName: dish.name,
        mealType: 'lunch',
        portionMultiplier,
        baseNutrition: nutrition.baseNutrition,
        calculatedNutrition: nutrition.scaledNutrition,
        provenance: nutrition.provenance,
        confidence: (100 - nutrition.uncertaintyPercent) / 100,
        sourceNotes: nutrition.sourceReference
      };

      const response = await fetch('/api/v1/food-diary/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 409) {
        setLogMealStatus('duplicate');
        setTimeout(() => setLogMealStatus('idle'), 3500);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (onLogMealSuccess) onLogMealSuccess(data.entry);
      } else {
        const existing = JSON.parse(localStorage.getItem('dineingo_diary_entries') || '[]');
        existing.unshift({ ...payload, _id: 'local_' + Date.now(), createdAt: new Date().toISOString() });
        localStorage.setItem('dineingo_diary_entries', JSON.stringify(existing));
      }

      setLogMealStatus('success');
      setTimeout(() => setLogMealStatus('idle'), 3500);
    } catch {
      const existing = JSON.parse(localStorage.getItem('dineingo_diary_entries') || '[]');
      existing.unshift({
        userId: 'demo_user',
        dishName: dish.name,
        mealType: 'lunch',
        portionMultiplier,
        baseNutrition: nutrition.baseNutrition,
        calculatedNutrition: nutrition.scaledNutrition,
        provenance: nutrition.provenance,
        confidence: 0.85,
        _id: 'local_' + Date.now(),
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('dineingo_diary_entries', JSON.stringify(existing));
      setLogMealStatus('success');
      setTimeout(() => setLogMealStatus('idle'), 3500);
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col bg-zinc-950 text-white overflow-hidden rounded-3xl border border-white/10 shadow-2xl select-none ${className}`}>

      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Dish Category & Tier Pill */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                {dish.name}
              </span>
              {dish.price && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                  ${typeof dish.price === 'number' ? dish.price.toFixed(2) : dish.price}
                </span>
              )}
            </div>

            {/* Model Tier Status Badge */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {resolved.tier === 'dish-match' || resolved.tier === 'explicit' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                  <Sparkles size={10} />
                  {resolved.label}
                </span>
              ) : resolved.tier === 'category-match' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <Layers size={10} />
                  {resolved.label}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                  <Eye size={10} />
                  Photo Preview
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {resolved.attribution && (
            <button
              onClick={() => setShowAttribution(!showAttribution)}
              className="p-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
              title="3D Model Licensing & Attribution"
              aria-label="3D Model Licensing & Attribution"
            >
              <Info size={16} />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-colors text-white"
              title="Close 3D View"
              aria-label="Close 3D View"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main 3D Model-Viewer Canvas or Photo Fallback */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center">

        {resolved.hasModel && resolved.modelUrl && modelState !== 'error' ? (
          <model-viewer
            key={reloadKey}
            ref={modelViewerRef}
            src={resolved.modelUrl}
            alt={`3D Augmented Reality Model of ${dish.name}`}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="floor"
            scale={resolved.scale || '1 1 1'}
            camera-controls
            auto-rotate={isAutoRotating}
            rotation-per-second="25deg"
            shadow-intensity="1.5"
            shadow-softness="0.8"
            exposure="1.0"
            camera-orbit={resolved.cameraOrbit || '45deg 55deg 0.5m'}
            camera-target={resolved.cameraTarget || 'auto auto auto'}
            field-of-view={resolved.fieldOfView || '30deg'}
            poster={dish.image}
            loading="eager"
            reveal="auto"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '380px',
              backgroundColor: 'transparent',
              outline: 'none'
            }}
          >
            {/* Native AR Launch Slot (Hidden default button to replace with custom UI) */}
            <button slot="ar-button" id="default-ar-button" style={{ display: 'none' }}>
              Launch AR
            </button>
          </model-viewer>
        ) : (
          /* High-Resolution Photo Fallback */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-900 to-black">
            {dish.image ? (
              <div className="relative max-w-sm aspect-square w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <Eye size={14} className="text-purple-400" />
                    <span>High-Resolution Photo Preview</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-3xl bg-zinc-800 border border-white/10 flex items-center justify-center text-gray-500 mb-4">
                <Eye size={40} />
              </div>
            )}

            <div className="text-center max-w-sm mt-4 space-y-1">
              <p className="text-xs font-bold text-gray-300">3D Model in Preparation</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                A custom calibrated 3D digital twin is being prepared for this dish. Menu details, pricing, and ingredients are fully available.
              </p>
              {modelState === 'error' && (
                <button
                  onClick={handleRetryLoad}
                  className="mt-3 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors border border-white/10"
                >
                  <RefreshCw size={12} />
                  Retry 3D Loading
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading HUD Spinner */}
        <AnimatePresence>
          {modelState === 'loading' && resolved.hasModel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
            >
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-purple-400 mb-2">
                Loading 3D Digital Twin
              </p>
              <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(15, loadProgress)}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AR Session Status Indicator */}
        {arStatus === 'failed' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-[10px] font-bold text-red-300 uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 shadow-lg">
            <AlertCircle size={12} className="text-red-400" />
            <span>AR Unavailable on this device • Reverted to 3D View</span>
          </div>
        )}
        {(arStatus === 'session-started' || arStatus === 'object-placed') && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-[10px] font-bold text-emerald-300 uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{arStatus === 'object-placed' ? 'Dish Placed in Your Environment' : 'AR Camera Active — Scan Surface'}</span>
          </div>
        )}
      </div>

      {/* Floating 3D Interaction Toolbar */}
      {resolved.hasModel && modelState === 'ready' && (
        <div className="absolute bottom-20 left-4 z-20 flex items-center gap-2">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-2.5 rounded-xl backdrop-blur-md border transition-all ${
              isAutoRotating
                ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                : 'bg-black/50 border-white/10 text-gray-400 hover:text-white'
            }`}
            title={isAutoRotating ? 'Pause 360° Rotation' : 'Start 360° Rotation'}
            aria-label="Toggle auto rotation"
          >
            <RotateCcw size={14} className={isAutoRotating ? 'animate-spin' : ''} style={{ animationDuration: '8s' }} />
          </button>

          <button
            onClick={handleResetCamera}
            className="p-2.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white transition-colors"
            title="Reset Camera Angle"
            aria-label="Reset Camera Angle"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      {/* Bottom Bar: Primary AR Launch Action & Details Drawer Toggle */}
      <div className="relative z-20 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Primary View in AR Action Button */}
          {resolved.hasModel ? (
            modelState === 'loading' ? (
              <button
                disabled
                className="flex-1 py-3.5 px-6 rounded-2xl bg-zinc-800 text-gray-400 font-black text-xs uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2 border border-white/5 opacity-80"
              >
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>Loading 3D Twin...</span>
              </button>
            ) : canActivateAR ? (
              <button
                onClick={handleLaunchAR}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                title="Place this 3D dish onto your table in Augmented Reality"
              >
                <Smartphone size={16} />
                <span>View in Real AR</span>
                <Sparkles size={14} className="opacity-80" />
              </button>
            ) : (
              <button
                onClick={() => setShowCapabilityHelp(true)}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-purple-300 border border-purple-500/30 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                title="AR is available on mobile devices (Android ARCore & iOS Quick Look)"
              >
                <Smartphone size={16} className="text-purple-400" />
                <span>📱 AR on Mobile (Instructions)</span>
              </button>
            )
          ) : (
            <div className="flex-1 py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs font-semibold text-gray-400">
              3D Model In Progress • Photo View Only
            </div>
          )}

          {/* Details Drawer Toggle */}
          {showDetailsOverlay && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`p-3.5 rounded-2xl border transition-all ${
                showDetails
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                  : 'bg-zinc-900 border-white/10 text-gray-300 hover:text-white'
              }`}
              title="Dish Details & Nutrition"
              aria-label="Dish details"
            >
              <ChevronUp size={16} className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Subtle touch gesture prompt for 3D navigation */}
        {resolved.hasModel && (
          <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest mt-1">
            Drag to rotate • Pinch to zoom • Tap button to place in room
          </p>
        )}
      </div>

      {/* Expandable Dish Details & Nutrition Intelligence Sheet */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 p-5 rounded-t-3xl shadow-2xl max-h-[75vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                  {nutrition.provenanceLabel}
                </span>
                <h3 className="text-base font-black text-white">{dish.name}</h3>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Live Macro Breakdown HUD */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                <div className="text-amber-400 text-sm font-black mb-0.5">
                  {nutrition.scaledNutrition.calories}
                </div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Calories</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                <div className="text-blue-400 text-sm font-black mb-0.5">
                  {nutrition.scaledNutrition.protein}g
                </div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Protein</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                <div className="text-emerald-400 text-sm font-black mb-0.5">
                  {nutrition.scaledNutrition.carbs}g
                </div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Carbs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                <div className="text-rose-400 text-sm font-black mb-0.5">
                  {nutrition.scaledNutrition.fat}g
                </div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Fat</span>
              </div>
            </div>

            {/* Interactive Portion Multiplier Slider / Selector */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Scale size={13} className="text-purple-400" />
                  Portion Multiplier:
                </span>
                <span className="text-xs font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                  {portionMultiplier}x Serving
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(mult => (
                  <button
                    key={mult}
                    onClick={() => setPortionMultiplier(mult)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      portionMultiplier === mult
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-black/30 hover:bg-white/10 text-gray-400'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>

            {/* Personalized Recommendation Card */}
            <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
              recommendation.variant === 'danger'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                : recommendation.variant === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-black/30">
                  {recommendation.badge}
                </span>
              </div>
              <p className="font-bold text-sm text-white">{recommendation.headline}</p>
              <ul className="space-y-1 list-disc list-inside text-gray-300">
                {recommendation.reasons.map((r, i) => (
                  <li key={i} className="text-[11px] leading-relaxed">{r}</li>
                ))}
              </ul>
              {recommendation.suggestedPortionMultiplier && (
                <button
                  onClick={() => setPortionMultiplier(recommendation.suggestedPortionMultiplier!)}
                  className="mt-1 py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-colors"
                >
                  Apply Suggested {recommendation.suggestedPortionMultiplier}x Portion
                </button>
              )}
            </div>

            {/* Confirm & Log Intake Button */}
            <button
              onClick={handleLogIntake}
              disabled={logMealStatus === 'logging' || logMealStatus === 'success'}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                logMealStatus === 'success'
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : logMealStatus === 'duplicate'
                  ? 'bg-amber-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
              }`}
            >
              {logMealStatus === 'logging' ? (
                <span>Logging to Diary...</span>
              ) : logMealStatus === 'success' ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Logged to Food Diary!</span>
                </>
              ) : logMealStatus === 'duplicate' ? (
                <span>Already Logged Recently</span>
              ) : (
                <>
                  <BookmarkCheck size={16} />
                  <span>Confirm Intake & Log to Diary</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Attribution Modal */}
      <AnimatePresence>
        {showAttribution && resolved.attribution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md p-6 flex items-center justify-center"
          >
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Info size={16} />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">3D Asset Attribution</h4>
                </div>
                <button
                  onClick={() => setShowAttribution(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <div>
                  <span className="text-[10px] uppercase text-gray-500 block">Model</span>
                  <span className="font-semibold text-white">{resolved.dishName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500 block">Creator / Source</span>
                  <span className="text-gray-300">{resolved.attribution.author}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500 block">License</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-[10px] font-bold">
                    {resolved.attribution.license}
                  </span>
                </div>
                {resolved.attribution.notes && (
                  <div>
                    <span className="text-[10px] uppercase text-gray-500 block">Notes</span>
                    <span className="text-gray-400 text-[11px]">{resolved.attribution.notes}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowAttribution(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR Device Capability Help Modal */}
      <AnimatePresence>
        {showCapabilityHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md p-6 flex items-center justify-center"
          >
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Smartphone size={18} />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Augmented Reality Launch</h4>
                </div>
                <button
                  onClick={() => setShowCapabilityHelp(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-gray-300">
                <p className="leading-relaxed">
                  Real-world AR environment placement requires opening this link on a mobile device with camera access and AR runtime support:
                </p>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-emerald-400 font-bold block flex items-center gap-1.5">
                      <CheckCircle2 size={12} />
                      Android Phones
                    </span>
                    <p className="text-[11px] text-gray-400">
                      Chrome browser with Google Play Services for AR (Google Scene Viewer / WebXR).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-emerald-400 font-bold block flex items-center gap-1.5">
                      <CheckCircle2 size={12} />
                      Apple iPhones & iPads
                    </span>
                    <p className="text-[11px] text-gray-400">
                      Safari browser on iOS 12+ (Apple AR Quick Look).
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 italic">
                  Tip: On desktop, use your mouse to spin 360°, inspect textures, and zoom into culinary details!
                </p>
              </div>

              <button
                onClick={() => setShowCapabilityHelp(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold text-white transition-all hover:brightness-110"
              >
                Got It
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ARViewer;
