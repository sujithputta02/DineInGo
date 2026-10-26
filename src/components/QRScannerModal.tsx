import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  X,
  AlertCircle,
  Upload,
  CheckCircle2,
  ScanLine,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseAndValidateQRPayload, ParsedQRPayload } from '../services/qrScannerService';

export interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (payload: ParsedQRPayload) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ParsedQRPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    setScanResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      setCameraError('Camera access is not supported by your browser.');
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
      setHasCameraPermission(true);
      startScanningLoop();
    } catch (err: any) {
      console.warn('[QRScanner] Camera error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings or upload a QR image.');
      } else {
        setCameraError('Could not start video stream. Camera may be in use by another application.');
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  // Barcode Detection Loop
  const startScanningLoop = () => {
    const scan = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      // Check if browser has native BarcodeDetector API
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            handleDetectedCode(rawValue);
            return;
          }
        } catch {
          // Fall through to frame loop
        }
      }

      animationFrameRef.current = requestAnimationFrame(scan);
    };

    animationFrameRef.current = requestAnimationFrame(scan);
  };

  const handleDetectedCode = (code: string) => {
    setIsProcessing(true);
    const parsed = parseAndValidateQRPayload(code);
    setScanResult(parsed);

    if (parsed.isValid && parsed.targetRoute) {
      stopCamera();
      if (onScanSuccess) {
        onScanSuccess(parsed);
      }
    }
    setIsProcessing(false);
  };

  // Image Upload Fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const detected = await detector.detect(img);
            if (detected.length > 0) {
              handleDetectedCode(detected[0].rawValue);
              return;
            }
          } catch {}
        }
        // If detector failed or not present
        handleDetectedCode(file.name.includes('demo') ? '/ar-demo?dish=french-onion-soup' : file.name);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    setIsProcessing(false);
  };

  const handleNavigateToResult = () => {
    if (scanResult?.isValid && scanResult.targetRoute) {
      onClose();
      navigate(scanResult.targetRoute);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 text-white shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2 border border-emerald-500/30">
                <ScanLine size={13} />
                Food Discovery
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">Scan Table QR Code</h3>
              <p className="text-xs text-gray-400 mt-1">Point your camera at a restaurant table or dish QR code.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Camera Viewfinder */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
            {hasCameraPermission === false ? (
              <div className="p-6 text-center space-y-3">
                <AlertCircle className="mx-auto text-amber-400" size={32} />
                <p className="text-sm text-gray-300 font-medium">Camera Unavailable</p>
                <p className="text-xs text-gray-400">{cameraError || 'Please allow camera permission to scan QR codes.'}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Reticle Overlay */}
                <div className="absolute inset-8 border-2 border-emerald-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
                </div>
              </>
            )}
          </div>

          {/* Scan Result Feedback */}
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border text-sm ${
                scanResult.isValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              {scanResult.isValid ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 size={16} />
                    <span>Verified QR Code Found</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    {scanResult.dishId
                      ? `Dish detected: ${scanResult.dishId}`
                      : 'Restaurant menu location identified.'}
                  </p>
                  <button
                    onClick={handleNavigateToResult}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <span>Launch Dish Experience</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertCircle size={16} />
                    <span>Invalid QR Code</span>
                  </div>
                  <p className="text-xs text-rose-200/80">{scanResult.error}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Quick Actions & Image Upload */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Upload size={14} />
              <span>Upload QR Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={() => handleDetectedCode('/ar-demo?dish=braised-beef')}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-400 hover:text-white transition-colors"
              title="Test with Braised Beef"
            >
              Demo QR
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
