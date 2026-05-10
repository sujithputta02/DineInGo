import React from 'react';
import { motion } from 'framer-motion';

interface FeatureStickerProps {
  stickerId: string;
  caption: string;
  mode: string;
}

const itemMap: Record<string, number> = {
  development: 0, // Blueprint
  maintenance: 1, // Wrench
  testing: 2,     // Test Tube
  coming_soon: 3, // Sign
};

const badgeStyles: Record<string, string> = {
  development: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-400/20',
  testing: 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300 border-blue-500/20 dark:border-blue-400/20',
  maintenance: 'bg-rose-500/10 text-rose-600 dark:bg-rose-400/20 dark:text-rose-300 border-rose-500/20 dark:border-rose-400/20',
  coming_soon: 'bg-emerald-400/10 text-emerald-500 dark:bg-emerald-400/20 dark:text-emerald-300 border-emerald-400/20 dark:border-emerald-400/20',
};

const captionStyles: Record<string, string> = {
  development: 'text-emerald-700 dark:text-emerald-400',
  testing: 'text-blue-700 dark:text-blue-400',
  maintenance: 'text-rose-700 dark:text-rose-400',
  coming_soon: 'text-emerald-600 dark:text-emerald-300',
};

export const FeatureSticker: React.FC<FeatureStickerProps> = ({ stickerId, caption, mode }) => {
  const itemIndex = itemMap[mode] || 0;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-12 relative min-h-[700px] w-full overflow-hidden bg-transparent">
      <style>{`
        @keyframes dino-walk-cycle {
          0%, 24.99% { background-position: 0% 50%; }
          25%, 49.99% { background-position: 33.33% 50%; }
          50%, 74.99% { background-position: 66.66% 50%; }
          75%, 100% { background-position: 100% 50%; }
        }
        .dino-sprite-anim {
          background-image: url(/stickers/dino_walk_sheet.png);
          background-size: 400% 100%;
          image-rendering: pixelated;
          animation: dino-walk-cycle 0.8s infinite;
        }
        
        @keyframes item-bob-cycle {
          0%, 24.99% { transform: translateY(0) translateX(48px) rotate(-15deg); }
          25%, 49.99% { transform: translateY(-5px) translateX(52px) rotate(15deg); }
          50%, 74.99% { transform: translateY(0) translateX(48px) rotate(-15deg); }
          75%, 100% { transform: translateY(5px) translateX(44px) rotate(15deg); }
        }
        .item-sprite-anim {
          background-image: url(/stickers/pixel_items_sheet.png);
          background-size: 400% 100%;
          background-position: calc(-100% * var(--item-index)) 50%;
          image-rendering: pixelated;
          animation: item-bob-cycle 0.8s infinite;
        }
      `}</style>

      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Universal Background Glow */}
        <div className="absolute inset-0 bg-emerald-500/15 dark:bg-emerald-400/10 blur-[100px] rounded-full scale-[2]" />
        
        {/* THE DINOSAUR - STATIONARY WALKING FIGURE */}
        <motion.div 
          className="relative z-10 w-full h-full"
          animate={{
             y: [0, -12, 0], // Bobbing up and down
             scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Walking Dino Sprite - CSS Animation */}
          <div 
            className="absolute inset-0 w-full h-full dino-sprite-anim dark:mix-blend-screen dark:brightness-125 mix-blend-normal"
          />

          {/* Held Item Overlay */}
          <div
            className="absolute top-1/4 left-1/2 -ml-12 w-24 h-24 item-sprite-anim dark:mix-blend-screen dark:brightness-125 mix-blend-normal"
            style={{ '--item-index': itemIndex } as React.CSSProperties}
          />
        </motion.div>
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

