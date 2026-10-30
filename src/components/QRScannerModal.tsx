import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshCw,
  Sparkles,
  Zap,
  ZapOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsQR from 'jsqr';
import { toast } from 'react-toastify';
import { parseAndValidateQRPayload, ParsedQRPayload } from '../services/qrScannerService';

export interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (payload: ParsedQRPayload) => void;
  title?: string;
  subtitle?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Scan Table QR Code",
  subtitle = "Point your camera at a restaurant table or dish QR code to open the AR experience."
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ParsedQRPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    isScanningActiveRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setTorchEnabled(false);
  }, []);

  // Handle Detected QR String
  const handleDetectedCode = useCallback((rawCode: string) => {
    if (!rawCode || isProcessing) return;
    setIsProcessing(true);

    const parsed = parseAndValidateQRPayload(rawCode);
    setScanResult(parsed);

    if (parsed.isValid && parsed.targetRoute) {
      stopCamera();
      toast.success(
        parsed.dishId
          ? `Dish QR detected: ${parsed.dishId}`
          : `Table QR detected! Loading AR menu...`,
        { autoClose: 2000 }
      );

      if (onScanSuccess) {
        onScanSuccess(parsed);
      } else {
        // Default navigation
        onClose();
        navigate(parsed.targetRoute);
      }
    } else {
      toast.warn(parsed.error || 'Scanned QR code is not a valid DineInGo payload.');
    }

    setIsProcessing(false);
  }, [isProcessing, onScanSuccess, onClose, navigate, stopCamera]);

  // Barcode Detection Loop: Uses BarcodeDetector if supported, falls back universally to jsQR on canvas
  const startScanningLoop = useCallback(() => {
    isScanningActiveRef.current = true;

    const scanFrame = async () => {
      if (!isScanningActiveRef.current) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      let detectedString: string | null = null;

      // 1. Try native BarcodeDetector if available in browser
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            detectedString = barcodes[0].rawValue;
          }
        } catch {
          // Fall through to jsQR
        }
      }

      // 2. Universal fallback: jsQR on Canvas (100% cross-browser: PC webcams, Safari Mac, iOS, Android, Firefox)
      if (!detectedString && canvasRef.current) {
        try {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const width = video.videoWidth;
            const height = video.videoHeight;
            if (canvas.width !== width || canvas.height !== height) {
              canvas.width = width;
              canvas.height = height;
            }
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            });
            if (qrCode && qrCode.data) {
              detectedString = qrCode.data;
            }
          }
        } catch (canvasErr) {
          // Frame capture error ignored
        }
      }

      if (detectedString) {
        isScanningActiveRef.current = false;
        handleDetectedCode(detectedString);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleDetectedCode]);

  // Start Camera with resilient cross-device constraints (mobile rear vs desktop webcam)
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      setCameraError('Camera access is not supported by your browser or environment.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Attempt high-res environment camera for mobile
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (envErr) {
        // Fallback for PC/Mac webcams without 'environment' rear camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      streamRef.current = stream;

      // Check for torch capability on mobile
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }

      setHasCameraPermission(true);
      startScanningLoop();
    } catch (err: any) {
      console.warn('[QRScanner] Camera access failed:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please enable camera permissions in your browser or upload a QR image.');
      } else {
        setCameraError('Could not start video stream. The camera may be in use by another application.');
      }
    }
  }, [startScanningLoop]);

  // Toggle Torch/Flashlight on mobile
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !torchEnabled;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }]
        });
        setTorchEnabled(next);
      } catch (err) {
        console.warn('Torch toggle error:', err);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  // Image Upload Fallback (reads QR from photo files on PC or Mobile)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        let detected: string | null = null;

        // Try BarcodeDetector
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              detected = barcodes[0].rawValue;
            }
          } catch {}
        }

        // Try jsQR on canvas
        if (!detected) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth'
              });
              if (qr && qr.data) {
                detected = qr.data;
              }
            }
          } catch (canvasErr) {
            console.error('Canvas decode error:', canvasErr);
          }
        }

        if (detected) {
          handleDetectedCode(detected);
        } else {
          toast.warn('No QR code could be detected in this photo. Please ensure it is well-lit and clear.');
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
                Table AR Gateway
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">{title}</h3>
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Camera Viewfinder */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
            {hasCameraPermission === false ? (
              <div className="p-6 text-center space-y-3">
                <AlertCircle className="mx-auto text-amber-400" size={32} />
                <p className="text-sm text-gray-300 font-medium">Camera Unavailable</p>
                <p className="text-xs text-gray-400 leading-relaxed">{cameraError || 'Please allow camera permission to scan QR codes.'}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw size={13} />
                  <span>Retry Camera</span>
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Reticle Overlay */}
                <div className="absolute inset-8 border-2 border-emerald-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,1)] animate-pulse" />
                  
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                </div>

                {/* Torch button on mobile if supported */}
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className="absolute top-3 right-3 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-all"
                    title={torchEnabled ? "Turn off light" : "Turn on light"}
                  >
                    {torchEnabled ? <Zap size={16} className="text-amber-400" /> : <ZapOff size={16} />}
                  </button>
                )}

                {/* Scanning indicator */}
                <div className="absolute bottom-3 inset-x-3 text-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    Align QR code within frame
                  </span>
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
                      : 'Restaurant table menu recognized.'}
                  </p>
                  <button
                    onClick={handleNavigateToResult}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <span>Launch AR Experience Now</span>
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
              <span>Upload QR Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={() => handleDetectedCode('/ar-demo?dish=french-onion-soup')}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
              title="Test with French Onion Soup"
            >
              <Sparkles size={12} className="text-purple-400" />
              <span>Demo QR</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QRScannerModal;
