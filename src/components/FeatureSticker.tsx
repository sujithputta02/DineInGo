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

const modeStyles: Record<string, string> = {
  development: 'from-emerald-600 to-emerald-400 dark:from-white dark:to-gray-200 text-white dark:text-slate-900 border-emerald-500/20 dark:border-white/20',
  testing: 'from-blue-600 to-blue-400 dark:from-blue-100 dark:to-white text-white dark:text-blue-900 border-blue-500/20 dark:border-white/20',
  maintenance: 'from-rose-600 to-rose-400 dark:from-rose-100 dark:to-white text-white dark:text-rose-900 border-rose-500/20 dark:border-white/20',
  coming_soon: 'from-emerald-500 to-emerald-300 dark:from-emerald-50 dark:to-white text-white dark:text-emerald-900 border-emerald-500/20 dark:border-white/20',
};

export const FeatureSticker: React.FC<FeatureStickerProps> = ({ stickerId, caption, mode }) => {
  const itemIndex = itemMap[mode] || 0;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-12 relative">
      <div className="relative">
        {/* Cinematic Background Glow */}
        <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/5 blur-[120px] rounded-full scale-[2.5]" />
        
        {/* Animated Walking Figure */}
        <motion.div 
          className="relative z-10 flex flex-col items-center justify-center w-72 h-72"
          animate={{
             y: [0, -5, 0],
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            ease: "steps(2)"
          }}
        >
          {/* Walking Dino - Using absolute sizing to ensure visibility */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: 'url(/stickers/dino_walk_sheet.png)',
              backgroundSize: '400% auto',
              backgroundPosition: '0 45%', // Specifically targeting the dino row
              imageRendering: 'pixelated',
              animation: 'dino-walk 0.8s steps(4) infinite',
              mixBlendMode: 'screen', // Reliable on dark backgrounds
              filter: 'brightness(1.2) contrast(1.1)',
            }}
          />

          {/* Held Item - Scaled and Bobbing */}
          <motion.div
            animate={{
              y: [0, -3, 0, 3, 0],
              x: [48, 50, 48, 46, 48],
              rotate: [-8, 8, -8]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "steps(4)"
            }}
            className="absolute top-24 left-1/2 -ml-10 w-24 h-24 pointer-events-none"
            style={{
              backgroundImage: 'url(/stickers/pixel_items_sheet.png)',
              backgroundSize: '400% auto',
              backgroundPosition: `${-(itemIndex * 100)}% 45%`,
              imageRendering: 'pixelated',
              mixBlendMode: 'screen',
              filter: 'brightness(1.3)',
            }}
          />
        </motion.div>

        {/* Action Pixels */}
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -120],
                x: [0, (i - 2.5) * 45],
                opacity: [0, 0.8, 0],
                scale: [0, 1.2, 0]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.4,
              }}
              className="absolute left-1/2 bottom-1/3 w-2 h-2 bg-emerald-500/40 rounded-sm"
              style={{ imageRendering: 'pixelated' }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-8 max-w-2xl z-20">
        <div className="flex justify-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.5em] border bg-gradient-to-br shadow-2xl ${modeStyles[mode] || modeStyles.development}`}
          >
            {mode.replace('_', ' ')}
          </motion.div>
        </div>
        
        <h3 className="text-5xl font-black text-white dark:text-white leading-tight tracking-tighter uppercase italic drop-shadow-2xl">
          {caption}
        </h3>
        
        <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-md mx-auto">
          Our team of dinosaurs is working hard to bring this feature to your expedition.
        </p>

        {/* Futuristic Status Bar */}
        <div className="pt-10 flex flex-col items-center space-y-3">
           <div className="text-[10px] text-emerald-400 font-black tracking-[0.4em] uppercase opacity-60">System Synchronized</div>
           <div className="h-1 w-64 bg-slate-800/50 rounded-full relative overflow-hidden border border-white/5">
             <motion.div 
               animate={{ left: ['-100%', '100%'] }}
               transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
               className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
             />
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dino-walk {
          from { background-position: 0% 45%; }
          to { background-position: 100% 45%; }
        }
      `}} />
    </div>
  );
};
