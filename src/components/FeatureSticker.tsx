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
  development: 'from-emerald-500 to-slate-900 text-white border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  testing: 'from-blue-500 to-slate-900 text-white border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]',
  maintenance: 'from-rose-500 to-slate-900 text-white border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
  coming_soon: 'from-emerald-400 to-slate-900 text-white border-emerald-400/30 shadow-[0_0_20px_rgba(52,211,153,0.2)]',
};

export const FeatureSticker: React.FC<FeatureStickerProps> = ({ stickerId, caption, mode }) => {
  const itemIndex = itemMap[mode] || 0;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-10 relative overflow-visible">
      {/* Universal Transparency Filter - Improved injection */}
      <svg className="absolute w-0 h-0 pointer-events-none opacity-0">
        <filter id="pixel-transparency" colorInterpolationFilters="sRGB">
          <feColorMatrix 
            type="matrix" 
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    1 1 1 0 -0.1" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="20" intercept="-0.2" />
          </feComponentTransfer>
        </filter>
      </svg>

      <div className="relative">
        {/* Dynamic Background Glow */}
        <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-400/10 blur-[100px] rounded-full scale-[2]" />
        
        {/* The Animated Figure - Walking "In Front" of User */}
        <motion.div 
          className="relative z-10 flex flex-col items-center"
          animate={{
             y: [0, -8, 0],
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
            className="w-64 h-64 overflow-hidden"
            style={{
              backgroundImage: 'url(/stickers/dino_walk_sheet.png)',
              backgroundSize: '400% auto',
              imageRendering: 'pixelated',
              animation: 'dino-walk 0.8s steps(4) infinite',
              filter: 'url(#pixel-transparency) drop-shadow(0 0 10px rgba(16,185,129,0.4))',
            }}
          />

          {/* Held Item Overlay - Bobbing with hand */}
          <motion.div
            animate={{
              y: [0, -4, 0, 4, 0],
              x: [45, 47, 45, 43, 45],
              rotate: [-10, 10, -10]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "steps(4)"
            }}
            className="absolute top-24 left-1/2 -ml-12 w-24 h-24 pointer-events-none"
            style={{
              backgroundImage: 'url(/stickers/pixel_items_sheet.png)',
              backgroundSize: '400% auto',
              backgroundPosition: `${-(itemIndex * 100)}% 45%`,
              imageRendering: 'pixelated',
              filter: 'url(#pixel-transparency) brightness(1.2)',
            }}
          />
        </motion.div>

        {/* Ambient Pixel Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -150],
                x: [0, (i - 4) * 40],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.3,
              }}
              className="absolute left-1/2 bottom-1/4 w-1.5 h-1.5 bg-emerald-400/40 rounded-sm"
              style={{ imageRendering: 'pixelated' }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-6 max-w-xl z-20">
        <div className="flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.4em] border bg-gradient-to-r ${modeStyles[mode] || modeStyles.development}`}
          >
            {mode.replace('_', ' ')}
          </motion.div>
        </div>
        
        <h3 className="text-5xl font-black text-white dark:text-white leading-tight tracking-tighter uppercase italic drop-shadow-xl">
          {caption}
        </h3>
        
        <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-md mx-auto opacity-90">
          Our team of dinosaurs is working hard to bring this feature to your expedition.
        </p>

        {/* Progress Bar / Visual Separator */}
        <div className="pt-8 flex flex-col items-center space-y-2">
           <div className="text-[10px] text-emerald-500 font-bold tracking-[0.2em] uppercase opacity-50">Syncing with Expedition</div>
           <div className="h-1.5 w-48 bg-slate-800 rounded-full overflow-hidden">
             <motion.div 
               animate={{ x: [-200, 200] }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
               className="h-full w-24 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
             />
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dino-walk {
          from { background-position: 0% 50%; }
          to { background-position: 100% 50%; }
        }
      `}} />
    </div>
  );
};
