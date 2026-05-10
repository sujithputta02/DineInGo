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
  development: 'bg-emerald-500/10 text-emerald-600 dark:bg-white dark:text-slate-900 border-emerald-500/20 dark:border-white/20',
  testing: 'bg-blue-500/10 text-blue-600 dark:bg-white dark:text-slate-900 border-blue-500/20 dark:border-white/20',
  maintenance: 'bg-rose-500/10 text-rose-600 dark:bg-white dark:text-slate-900 border-rose-500/20 dark:border-white/20',
  coming_soon: 'bg-emerald-400/10 text-emerald-500 dark:bg-white dark:text-slate-900 border-emerald-400/20 dark:border-white/20',
};

export const FeatureSticker: React.FC<FeatureStickerProps> = ({ stickerId, caption, mode }) => {
  const itemIndex = itemMap[mode] || 0;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-12 relative min-h-[700px] w-full overflow-hidden bg-transparent">
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
            ease: "steps(2)"
          }}
        >
          {/* Walking Dino Sprite - Stationed in Front */}
          <motion.div 
            className="absolute inset-0 w-full h-full"
            animate={{
              backgroundPositionX: ['0%', '33.33%', '66.66%', '100%']
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "steps(3)"
            }}
            style={{
              backgroundImage: 'url(/stickers/dino_walk_sheet.png)',
              backgroundSize: '400% 400%',
              backgroundPositionY: '45%',
              imageRendering: 'pixelated',
              // Standard screen blending for dark mode, contrast for light
              mixBlendMode: 'screen',
              filter: 'brightness(1.5) contrast(1.2)'
            }}
          />

          {/* Held Item Overlay */}
          <motion.div
            animate={{
              y: [0, -5, 0, 5, 0],
              x: [48, 52, 48, 44, 48],
              rotate: [-15, 15, -15]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "steps(4)"
            }}
            className="absolute top-1/4 left-1/2 -ml-12 w-24 h-24"
            style={{
              backgroundImage: 'url(/stickers/pixel_items_sheet.png)',
              backgroundSize: '400% 400%',
              backgroundPosition: `${-(itemIndex * 100)}% 45%`,
              imageRendering: 'pixelated',
              mixBlendMode: 'screen',
              filter: 'brightness(1.5)',
            }}
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
        
        {/* CUSTOM CAPTION WITH THEME-SPECIFIC GRADIENTS */}
        <div className="flex flex-col items-center">
          <h3 className="text-6xl md:text-7xl font-black leading-[1.1] tracking-tighter uppercase italic drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-800 dark:from-white dark:via-gray-100 dark:to-gray-400"
              style={{ WebkitBackgroundClip: 'text', display: 'inline-block' }}>
            {caption}
          </h3>
        </div>
        
        <p className="text-slate-500 dark:text-slate-400 text-2xl font-bold leading-relaxed max-w-3xl mx-auto">
          Our team of dinosaurs is working hard to bring this feature to your expedition.
        </p>

        {/* Dynamic Status Indicator */}
        <div className="pt-12 flex flex-col items-center space-y-4">
           <div className="text-[12px] text-emerald-600 dark:text-emerald-400 font-black tracking-[0.8em] uppercase animate-pulse">Syncing Expedition Data</div>
           <div className="h-2 w-96 bg-slate-200 dark:bg-slate-800 rounded-full relative overflow-hidden border border-black/5 dark:border-white/10">
             <motion.div 
               animate={{ left: ['-100%', '100%'] }}
               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               className="absolute top-0 bottom-0 w-48 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
             />
           </div>
        </div>
      </div>
    </div>
  );
};
