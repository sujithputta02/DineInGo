import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  text: string;
  isDarkMode?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  text,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Failed to copy link.');
    }
  };

  const handleWhatsApp = () => {
    const formattedText = `${text}\n👉 View here: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(formattedText)}`, '_blank');
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const handleInstagram = () => {
    handleCopyLink();
    toast.info('Instagram link copied! Send it in DMs or add it to your Story.', {
      autoClose: 5000,
    });
  };

  const handleMessages = () => {
    const body = `${text} - ${url}`;
    window.open(`sms:?&body=${encodeURIComponent(body)}`, '_self');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border-2 transition-all duration-300 transform scale-100 bg-white/95 dark:bg-gray-900/90 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white shadow-emerald-500/5 dark:shadow-black/80">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black uppercase tracking-wider">Share Expedition</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dynamic preview thumbnail display */}
        <div className="p-4 rounded-2xl mb-6 border text-left bg-gray-50 dark:bg-gray-950/40 border-gray-200 dark:border-gray-800">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Link Preview</div>
          <h4 className="font-bold text-sm line-clamp-1">{title}</h4>
          <p className="text-xs text-gray-400 line-clamp-2 mt-1">{text}</p>
          <div className="text-[10px] text-gray-500 mt-2 font-mono truncate">{url}</div>
        </div>

        {/* Share Options Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/40 group"
          >
            <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2 transition-all duration-300 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 group-hover:text-white">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.455h.008c6.56 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">WhatsApp</span>
          </button>

          {/* Facebook */}
          <button
            onClick={handleFacebook}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/40 group"
          >
            <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2 transition-all duration-300 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 group-hover:text-white">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Facebook</span>
          </button>

          {/* Instagram */}
          <button
            onClick={handleInstagram}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/40 group"
          >
            <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2 transition-all duration-300 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 group-hover:text-white">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Instagram</span>
          </button>

          {/* Messages */}
          <button
            onClick={handleMessages}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/40 group"
          >
            <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2 transition-all duration-300 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 group-hover:text-white">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Messages</span>
          </button>
        </div>

        {/* Copy Link (Full Width Bottom Button) */}
        <button
          onClick={handleCopyLink}
          className={`w-full mt-6 flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 border-2 ${
            copied
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50 bg-white dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:bg-transparent'
          }`}
        >
          {copied ? (
            <>
              <Check size={16} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
