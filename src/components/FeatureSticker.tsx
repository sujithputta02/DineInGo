import React from 'react';
import { motion } from 'framer-motion';

interface FeatureStickerProps {
  stickerId: string;
  caption: string;
  mode: string;
}

const videoMap: Record<string, string> = {
  development: '/stickers/dino_development.mp4',
  maintenance: '/stickers/dino_maintenance.mp4',
  testing: '/stickers/dino_testing.mp4',
  coming_soon: '/stickers/dino_coming_soon.mp4',
};

const frameColors: Record<string, string> = {
  development: '#10b981', // emerald-500
  testing: '#3b82f6',     // blue-500
  maintenance: '#f43f5e', // rose-500
  coming_soon: '#10b981', // emerald-500
};

const badgeStyles: Record<string, string> = {
  development: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-400/20',
  testing: 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300 border-blue-500/20 dark:border-blue-400/20',
  maintenance: 'bg-rose-500/10 text-rose-600 dark:bg-rose-400/20 dark:text-rose-300 border-rose-500/20 dark:border-rose-400/20',
  coming_soon: 'bg-emerald-400/10 text-emerald-500 dark:bg-emerald-400/20 dark:text-emerald-300 border-emerald-400/20 dark:border-emerald-400/20',
};

const captionStyles: Record<string, string> = {
  development: 'text-emerald-500 dark:text-emerald-400',
  testing: 'text-blue-500 dark:text-blue-400',
  maintenance: 'text-rose-500 dark:text-rose-400',
  coming_soon: 'text-emerald-500 dark:text-emerald-400',
};

export const FeatureSticker: React.FC<FeatureStickerProps> = ({ stickerId, caption, mode }) => {
  const videoSrc = videoMap[mode] || videoMap.development;
  const frameColor = frameColors[mode] || frameColors.development;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-12 relative min-h-[700px] w-full overflow-hidden bg-transparent">
      
      {/* Light backing spotlight so 'multiply' blending works securely on dark themes */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-48 h-48 bg-white rounded-full blur-[50px] opacity-100 pointer-events-none" />

      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
        {/* Universal Background Glow */}
        <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/5 blur-[60px] rounded-full scale-[1.5] pointer-events-none" />
        
        {/* Pixelated Decorative Frame (SVG) */}
        <div className="absolute inset-0 z-20 pointer-events-none drop-shadow-2xl">
          <svg viewBox="0 0 100 100" className="w-full h-full opacity-90" shapeRendering="crispEdges">
            {/* Dark Drop Shadow Base */}
            <path d="M 3 9 L 9 9 L 9 3 L 91 3 L 91 9 L 97 9 L 97 91 L 91 91 L 91 97 L 9 97 L 9 91 L 3 91 Z" fill="none" stroke="#020617" strokeWidth="4" />
            
            {/* Main Colored Border */}
            <path d="M 5 9 L 9 9 L 9 5 L 91 5 L 91 9 L 95 9 L 95 91 L 91 91 L 91 95 L 9 95 L 9 91 L 5 91 Z" fill="none" stroke={frameColor} strokeWidth="2" />
            
            {/* Inner Dark Frame Layer */}
            <path d="M 12 16 L 16 16 L 16 12 L 84 12 L 84 16 L 88 16 L 88 84 L 84 84 L 84 88 L 16 88 L 16 84 L 12 84 Z" fill="none" stroke="#0f172a" strokeWidth="1" />

            {/* Corner Squares */}
            <rect x="5" y="5" width="4" height="4" fill={frameColor} />
            <rect x="91" y="5" width="4" height="4" fill={frameColor} />
            <rect x="5" y="91" width="4" height="4" fill={frameColor} />
            <rect x="91" y="91" width="4" height="4" fill={frameColor} />
            
            {/* Retro Tech Lines */}
            <rect x="40" y="7" width="20" height="2" fill="#0f172a" />
            <rect x="45" y="93" width="10" height="2" fill={frameColor} />
            <rect x="7" y="40" width="2" height="20" fill="#0f172a" />
            <rect x="93" y="40" width="2" height="20" fill="#0f172a" />
          </svg>
        </div>

        {/* THE DINOSAUR - ANIMATED VIDEO */}
        <div 
          className="relative z-10 w-full h-full flex items-center justify-center p-6 mix-blend-multiply"
          style={{ mixBlendMode: 'multiply' }}
        >
          <video 
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain pointer-events-none"
            style={{ 
              filter: 'contrast(1.1)' 
            }}
          />
        </div>
      </div>

      <div className="space-y-10 max-w-6xl z-20">
        <div className="flex justify-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.6em] border shadow-2xl ${badgeStyles[mode] || badgeStyles.development}`}
          >
            {mode.replace('_', ' ')}
          </motion.div>
        </div>
        
        {/* CUSTOM CAPTION RESPONSIVE TO THEME */}
        <div className="flex flex-col items-center">
          <h3 className={`text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tighter uppercase italic drop-shadow-2xl transition-colors duration-300 ${captionStyles[mode] || captionStyles.development}`}>
            {caption}
          </h3>
        </div>
        
        <p className="text-slate-500 dark:text-slate-400 text-xl md:text-2xl font-bold leading-relaxed max-w-3xl mx-auto">
          Our team of dinosaurs is working hard to bring this feature to your expedition.
        </p>

        {/* Dynamic Status Indicator */}
        <div className="pt-12 flex flex-col items-center space-y-4">
           <div className={`text-[10px] md:text-[12px] font-black tracking-[0.8em] uppercase animate-pulse ${captionStyles[mode] || captionStyles.development}`}>
             Syncing Expedition Data
           </div>
           <div className="h-2 w-72 md:w-96 bg-slate-200 dark:bg-slate-800 rounded-full relative overflow-hidden border border-black/5 dark:border-white/10">
             <motion.div 
               animate={{ left: ['-100%', '100%'] }}
               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               className="absolute top-0 bottom-0 w-48 bg-gradient-to-r from-transparent via-current to-transparent opacity-50"
               style={{ color: 'inherit' }}
             />
           </div>
        </div>
      </div>
    </div>
  );
};


