import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Share2, Smartphone, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  subtitle?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title = 'Scan to Experience in AR',
  subtitle = 'Open on your mobile phone to place dishes into your physical space using native AR.'
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !url) return;

    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#09090b',
        light: '#ffffff'
      }
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [isOpen, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DineInGo 3D & AR Menu Demo',
          text: 'Explore interactive 3D dishes and augmented reality with DineInGo!',
          url
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-black uppercase tracking-wider mb-2 border border-purple-500/30">
                <Smartphone size={13} />
                Mobile AR Pathway
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">{title}</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* QR Code Canvas */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code for DineInGo AR Demo"
                className="w-56 h-56 rounded-lg object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-gray-400 text-xs">
                Generating QR code...
              </div>
            )}
            <p className="text-[11px] font-bold text-gray-800 uppercase tracking-widest mt-2">
              Point phone camera at code
            </p>
          </div>

          {/* Share Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={url}
                className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs font-mono text-gray-300 truncate focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all"
              >
                <Share2 size={14} />
                Share Demo Link
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QRCodeModal;
