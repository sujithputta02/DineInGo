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
  development: 'bg-emerald-500/10 text-emerald-500 dark:bg-white dark:text-slate-900 border-emerald-500/20 dark:border-white/20',
  testing: 'bg-blue-500/10 text-blue-500 dark:bg-white dark:text-slate-900 border-blue-500/20 dark:border-white/20',
  maintenance: 'bg-rose-500/10 text-rose-500 dark:bg-white dark:text-slate-900 border-rose-500/20 dark:border-white/20',
  coming_soon: 'bg-emerald-400/10 text-emerald-400 dark:bg-white dark:text-slate-900 border-emerald-400/20 dark:border-white/20',
};

export const FeatureSticker: React.FC<FeatureStickerProps> = ({ stickerId, caption, mode }) => {
  const itemIndex = itemMap[mode] || 0;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-12 relative min-h-[600px]">
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Cinematic Background Glow */}
        <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-400/10 blur-[100px] rounded-full scale-[2]" />
        
        {/* Animated Walking Figure - Increased visibility and foolproof sizing */}
        <motion.div 
          className="relative z-10 w-full h-full flex items-center justify-center"
          animate={{
             y: [0, -10, 0],
             scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "steps(4)"
          }}
        >
          {/* Walking Dino Sprite */}
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: 'url(/stickers/dino_walk_sheet.png)',
              backgroundSize: '400% 400%', // Fixed sizing to account for square spritesheet
              backgroundPosition: '0 45%', 
              imageRendering: 'pixelated',
              animation: 'dino-walk-cycle 0.8s steps(4) infinite',
              // Use standard opacity instead of blending to ensure it shows up everywhere
              filter: 'brightness(1.5) contrast(1.2)', 
              mixBlendMode: 'screen'
            }}
          />

          {/* Held Item Overlay */}
          <motion.div
            animate={{
              y: [0, -5, 0, 5, 0],
              x: [50, 52, 50, 48, 50],
              rotate: [-10, 10, -10]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "steps(4)"
            }}
            className="absolute top-1/4 left-1/2 -ml-12 w-24 h-24 pointer-events-none"
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

      <div className="space-y-8 max-w-4xl z-20">
        <div className="flex justify-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`px-8 py-2 rounded-xl text-xs font-black uppercase tracking-[0.5em] border shadow-2xl ${badgeStyles[mode] || badgeStyles.development}`}
          >
            {mode.replace('_', ' ')}
          </motion.div>
        </div>
        
        {/* THE HEADING - Now with theme-specific gradients as requested */}
        <h3 className="text-6xl font-black leading-tight tracking-tighter uppercase italic drop-shadow-2xl bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-900 dark:from-white dark:via-gray-100 dark:to-gray-400">
          {caption}
        </h3>
        
        <p className="text-slate-400 text-2xl font-semibold leading-relaxed max-w-2xl mx-auto opacity-90">
          Our team of dinosaurs is working hard to bring this feature to your expedition.
        </p>

        {/* Status indicator */}
        <div className="pt-10 flex flex-col items-center space-y-4">
           <div className="text-[12px] text-emerald-500 font-black tracking-[0.6em] uppercase animate-pulse">Syncing Expedition Data</div>
           <div className="h-1.5 w-80 bg-slate-800/50 rounded-full relative overflow-hidden border border-white/10">
             <motion.div 
               animate={{ left: ['-100%', '100%'] }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
               className="absolute top-0 bottom-0 w-40 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
             />
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dino-walk-cycle {
          from { background-position: 0% 45%; }
          to { background-position: 100% 45%; }
        }
      `}} />
    </div>
  );
};
