import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Layers,
  ArrowRight,
  ShieldCheck,
  Info,
  Scale,
  RefreshCw,
  Box,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { analyzeFoodImage, FoodAnalysisReport } from '../services/foodRecognitionService';
import {
  submitFoodReconstructionJob,
  pollReconstructionJob,
  type ReconstructionJobResponse
} from '../services/reconstructionClientService';
import { ARViewer } from './ARViewer';

export interface FoodCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDish?: (dishName: string, report: FoodAnalysisReport) => void;
  onReconstructedModelReady?: (modelUrl: string, dishName: string, job?: ReconstructionJobResponse) => void;
}

export const FoodCaptureModal: React.FC<FoodCaptureModalProps> = ({
  isOpen,
  onClose,
  onConfirmDish,
  onReconstructedModelReady
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<'capture' | 'analyzing' | 'review'>('capture');
  const [analysisStatus, setAnalysisStatus] = useState('Initializing vision cascade...');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [report, setReport] = useState<FoodAnalysisReport | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [correctedName, setCorrectedName] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // 3D Reconstruction states
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconstructionProgress, setReconstructionProgress] = useState(0);
  const [reconstructionStatus, setReconstructionStatus] = useState('');
  const [reconstructedModelUrl, setReconstructedModelUrl] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Try environment-facing rear camera first (mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
      } catch {
        // Fallback to PC / Mac webcam
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('[FoodCapture] Camera access failed:', err);
      setCameraError('Camera permission was denied or camera is in use. You can still upload a food photo below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen && step === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, step]);

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      processImage(dataUrl, video);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      processImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const processImage = async (dataUrl: string, videoElement?: HTMLVideoElement) => {
    stopCamera();
    setStep('analyzing');
    setAnalysisStatus('Segmenting dish and analyzing visible ingredients...');

    try {
      const result = await analyzeFoodImage(videoElement || dataUrl, (msg) => {
        setAnalysisStatus(msg);
      });
      setReport(result);
      setCorrectedName(result.primaryFood.dishName === 'Unrecognized Dish' ? '' : result.primaryFood.dishName);
      if (result.primaryFood.confidence === 0 || result.primaryFood.dishName === 'Unrecognized Dish') {
        setIsEditingName(true);
      }
      setStep('review');
    } catch (err) {
      console.error('[FoodCapture] Analysis error:', err);
      const honestFallback: FoodAnalysisReport = {
        primaryFood: {
          dishName: 'Unrecognized Dish',
          category: 'Manual Selection Required',
          confidence: 0,
          confidenceTier: 'low',
          visibleIngredients: [],
          estimatedPortion: {
            servingGrams: 250,
            uncertaintyGrams: 100,
            description: 'Please specify dish name manually'
          },
          visualEvidence: 'Automated recognition encountered an error or could not identify the image.',
          undeterminedFactors: ['Dish identity', 'Ingredients', 'Portion size']
        },
        imageSnapshot: dataUrl,
        needsUserConfirmation: true,
        providerStatus: {
          providerName: 'None',
          isRealProvider: false,
          setupNote: 'Recognition was inconclusive. Please type or select your dish name.'
        }
      };
      setReport(honestFallback);
      setCorrectedName('');
      setIsEditingName(true);
      setStep('review');
    }
  };

  // Reconstruct 3D AR Model with Hugging Face ZeroGPU TripoSR Pipeline
  const handleStart3DReconstruction = async () => {
    const finalDishName = (isEditingName ? correctedName.trim() : report?.primaryFood.dishName) || 'Custom Dish';
    setIsReconstructing(true);
    setReconstructionProgress(15);
    setReconstructionStatus('Uploading food photo to Hugging Face ZeroGPU...');

    try {
      const jobId = await submitFoodReconstructionJob({
        dishName: finalDishName,
        imageUrl: capturedImage || undefined
      });

      setReconstructionProgress(35);
      setReconstructionStatus('ZeroGPU TripoSR generating 3D neural mesh...');

      const result = await pollReconstructionJob(
        jobId,
        (progress, status) => {
          setReconstructionProgress(Math.max(35, progress));
          if (status === 'processing') {
            setReconstructionStatus('Synthesizing 3D textures and tabletop surface bounds...');
          }
        },
        50
      );

      if (result.status === 'completed' && result.modelUrl) {
        setReconstructionProgress(100);
        setReconstructedModelUrl(result.modelUrl);
        setReconstructionStatus('3D Model generated successfully!');
        toast.success(`3D model generated with Hugging Face TripoSR!`);

        if (onReconstructedModelReady) {
          onReconstructedModelReady(result.modelUrl, finalDishName, result);
        }
      } else {
        throw new Error(result.error || 'Reconstruction did not complete.');
      }
    } catch (err: any) {
      console.warn('[FoodCapture] 3D reconstruction notice:', err);
      // If server returns error, notify user with honest feedback
      toast.warn(err.message || 'ZeroGPU queue is busy. Fallback model available.');
      setReconstructionStatus(err.message || 'ZeroGPU busy.');
    } finally {
      setIsReconstructing(false);
    }
  };

  const handleConfirmAndProceed = () => {
    const finalDishName = (isEditingName ? correctedName.trim() : report?.primaryFood.dishName) || 'Custom Dish';

    if (onConfirmDish && report) {
      onConfirmDish(finalDishName, report);
    }

    onClose();

    // If we have a reconstructed model, pass query or navigate
    if (reconstructedModelUrl) {
      navigate(`/ar-demo?dish=${encodeURIComponent(finalDishName)}&modelUrl=${encodeURIComponent(reconstructedModelUrl)}`);
      return;
    }

    // Map to known demo dish only if clearly matching, otherwise general view
    let targetParam = 'custom';
    const lower = finalDishName.toLowerCase();
    if (lower.includes('soup') || lower.includes('onion')) targetParam = 'french-onion-soup';
    else if (lower.includes('salad') || lower.includes('caesar')) targetParam = 'salad-bowl';
    else if (lower.includes('beef') || lower.includes('steak') || lower.includes('bourguignon')) targetParam = 'braised-beef';
    else if (lower.includes('pie') || lower.includes('tarte') || lower.includes('tatin')) targetParam = 'baked-pie';
    else if (lower.includes('creme') || lower.includes('brulee')) targetParam = 'creme-brulee';

    navigate(`/ar-demo?dish=${targetParam}`);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setReport(null);
    setIsEditingName(false);
    setReconstructedModelUrl(null);
    setIsReconstructing(false);
    setReconstructionProgress(0);
    setStep('capture');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-6 text-white shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 text-xs font-black uppercase tracking-wider mb-2 border border-purple-500/30">
                <Sparkles size={13} className="text-purple-400" />
                Hugging Face AI 3D Reconstruction
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">Food Recognition & 3D AR</h3>
              <p className="text-xs text-gray-400 mt-1">Capture or upload food to reconstruct a 3D model with Hugging Face TripoSR.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* STEP 1: CAPTURE */}
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                {cameraError ? (
                  <div className="p-6 text-center space-y-2">
                    <p className="text-sm font-semibold text-amber-300">Camera Unavailable</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{cameraError}</p>
                  </div>
                ) : (
                  <>
                    <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                    <div className="absolute inset-6 border border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                      <span className="text-[11px] font-bold text-white/60 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                        Center Dish in Frame
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!cameraError && (
                  <button
                    onClick={handleCapturePhoto}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                  >
                    <Camera size={16} />
                    <span>Snap Photo</span>
                  </button>
                )}
                <label className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload size={16} />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Demo Sample Photos */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Or test with verified demo dishes:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'french-onion-soup', name: 'French Onion Soup' },
                    { id: 'salad-bowl', name: 'Caesar Salad' },
                    { id: 'braised-beef', name: 'Braised Beef' }
                  ].map(demo => (
                    <button
                      key={demo.id}
                      onClick={() => processImage(demo.name)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-gray-300 text-left truncate transition-colors"
                    >
                      {demo.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING */}
          {step === 'analyzing' && (
            <div className="py-12 text-center space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <div className="w-16 h-16 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto text-purple-400 animate-pulse" size={24} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Analyzing Dish</h4>
                <p className="text-xs text-purple-400 mt-1 font-mono">{analysisStatus}</p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & 3D RECONSTRUCTION */}
          {step === 'review' && report && (
            <div className="space-y-4">
              {/* Predicted Identity Header */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
                    {report.primaryFood.category}
                  </span>
                  {report.primaryFood.confidence > 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-black">
                      <CheckCircle2 size={12} />
                      {Math.round(report.primaryFood.confidence * 100)}% Confidence
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-black">
                      <AlertTriangle size={12} />
                      Manual Entry Needed
                    </div>
                  )}
                </div>

                {isEditingName ? (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Correct Dish Name:</label>
                    <input
                      type="text"
                      value={correctedName}
                      onChange={(e) => setCorrectedName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-white">{correctedName || report.primaryFood.dishName}</h4>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-300 leading-relaxed">
                  {report.primaryFood.visualEvidence}
                </p>
              </div>

              {/* RECONSTRUCTED MODEL PREVIEW IF FINISHED */}
              {reconstructedModelUrl && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-400" />
                      Reconstructed 3D Food Model
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Hugging Face ZeroGPU
                    </span>
                  </div>
                  
                  <div className="h-56 w-full rounded-xl overflow-hidden bg-black border border-white/10">
                    <ARViewer
                      dish={{
                        name: correctedName || report.primaryFood.dishName,
                        modelUrl: reconstructedModelUrl
                      }}
                      showDetailsOverlay={false}
                      autoRotateDefault={true}
                    />
                  </div>
                </div>
              )}

              {/* RECONSTRUCTION PROGRESS HUD */}
              {isReconstructing && (
                <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-purple-400" />
                      {reconstructionStatus}
                    </span>
                    <span>{reconstructionProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${reconstructionProgress}%` }}
                      transition={{ ease: "easeInOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Action: Reconstruct with Hugging Face TripoSR */}
              {!reconstructedModelUrl && !isReconstructing && (
                <button
                  onClick={handleStart3DReconstruction}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 border border-white/20"
                >
                  <Sparkles size={15} />
                  <span>Reconstruct 3D AR Model with Hugging Face AI</span>
                </button>
              )}

              {/* Portion Uncertainty & Visible Ingredients */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 uppercase">
                    <Scale size={12} />
                    <span>Estimated Portion</span>
                  </div>
                  <p className="text-xs font-bold text-white">{report.primaryFood.estimatedPortion.servingGrams}g</p>
                  <p className="text-[10px] text-gray-400">±{report.primaryFood.estimatedPortion.uncertaintyGrams}g uncertainty</p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 uppercase">
                    <Layers size={12} />
                    <span>3D Asset Status</span>
                  </div>
                  <p className="text-xs font-bold text-white">
                    {reconstructedModelUrl ? 'Reconstructed 3D GLB Ready' : 'AI 3D Synthesis Ready'}
                  </p>
                  <p className="text-[10px] text-emerald-400">Tabletop Contact Aligned</p>
                </div>
              </div>

              {/* Confirmation CTA */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleRetake}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Retake</span>
                </button>
                <button
                  onClick={handleConfirmAndProceed}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <span>{reconstructedModelUrl ? 'View Reconstructed Dish in AR' : 'Confirm Dish & Explore in AR'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FoodCaptureModal;
