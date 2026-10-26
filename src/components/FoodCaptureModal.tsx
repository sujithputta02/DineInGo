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
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeFoodImage, FoodAnalysisReport } from '../services/foodRecognitionService';
import { VERIFIED_MODELS } from '../services/arModelService';

export interface FoodCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDish?: (dishName: string, report: FoodAnalysisReport) => void;
}

export const FoodCaptureModal: React.FC<FoodCaptureModalProps> = ({
  isOpen,
  onClose,
  onConfirmDish
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

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('[FoodCapture] Camera access failed:', err);
      setCameraError('Camera permission was denied or camera is in use. You can still upload a food photo below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
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
      setCorrectedName(result.primaryFood.dishName);
      setStep('review');
    } catch (err) {
      console.error('[FoodCapture] Analysis error:', err);
      // Fallback result
      const fallbackReport = await analyzeFoodImage('French Onion Soup');
      setReport(fallbackReport);
      setCorrectedName(fallbackReport.primaryFood.dishName);
      setStep('review');
    }
  };

  const handleConfirmAndProceed = () => {
    const finalDishName = isEditingName ? correctedName : report?.primaryFood.dishName || 'French Onion Soup';
    
    if (onConfirmDish && report) {
      onConfirmDish(finalDishName, report);
    }

    onClose();

    // Map to known demo dish if closely matching
    let targetParam = 'french-onion-soup';
    const lower = finalDishName.toLowerCase();
    if (lower.includes('salad') || lower.includes('caesar')) targetParam = 'salad-bowl';
    else if (lower.includes('beef') || lower.includes('steak')) targetParam = 'braised-beef';
    else if (lower.includes('pie') || lower.includes('tarte')) targetParam = 'baked-pie';
    else if (lower.includes('creme') || lower.includes('brulee')) targetParam = 'creme-brulee';

    navigate(`/ar-demo?dish=${targetParam}`);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setReport(null);
    setIsEditingName(false);
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider mb-2 border border-blue-500/30">
                <Sparkles size={13} />
                AI Vision Food Intelligence
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">Food Recognition</h3>
              <p className="text-xs text-gray-400 mt-1">Capture or upload food to identify nutrition and view in 3D AR.</p>
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
                    <p className="text-xs text-gray-400">{cameraError}</p>
                  </div>
                ) : (
                  <>
                    <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
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
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
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
                <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={24} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Analyzing Dish</h4>
                <p className="text-xs text-blue-400 mt-1 font-mono">{analysisStatus}</p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & CONFIRM */}
          {step === 'review' && report && (
            <div className="space-y-4">
              {/* Predicted Identity Header */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">
                    {report.primaryFood.category}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-black">
                    <CheckCircle2 size={12} />
                    {Math.round(report.primaryFood.confidence * 100)}% Confidence
                  </div>
                </div>

                {isEditingName ? (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Correct Dish Name:</label>
                    <input
                      type="text"
                      value={correctedName}
                      onChange={(e) => setCorrectedName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-white">{correctedName}</h4>
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
                    {report.primaryFood.matchedMenuItem?.hasModel ? 'Verified 3D Ready' : '3D Generation Available'}
                  </p>
                  <p className="text-[10px] text-emerald-400">Fixed Tabletop Scale</p>
                </div>
              </div>

              {/* Visible Ingredients */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Identified Ingredients:</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.primaryFood.visibleIngredients.map((ing, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-white/10 text-gray-300 text-[11px]">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Undetermined Factors Notice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={13} />
                  <span>Image Uncertainty Notice</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Single photographs cannot reveal internal cooking fats, sodium, or exact sugar content. You can fine-tune portion size in the nutrition overlay.
                </p>
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
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <span>Confirm Dish & Explore in AR</span>
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
