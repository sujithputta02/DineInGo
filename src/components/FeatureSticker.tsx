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

const modeColors: Record<string, string> = {
  development: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  testing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  maintenance: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  coming_soon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export const FeatureSticker: React.FC<FeatureStickerProps> = ({ stickerId, caption, mode }) => {
  const itemIndex = itemMap[mode] || 0;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-8">
      <div className="relative group">
        {/* Cinematic Ambient Glow */}
        <div className="absolute inset-0 bg-emerald-500/15 blur-[80px] rounded-full scale-150" />
        
        {/* Animated Spritesheet Character */}
        <motion.div 
          className="relative z-10 flex flex-col items-center"
          animate={{
             x: [-20, 20, -20],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {/* Walking Dino Sprite */}
          <div 
            className="w-56 h-56 overflow-hidden"
            style={{
              backgroundImage: 'url(/stickers/dino_walk_sheet.png)',
              backgroundSize: '400% auto',
              backgroundPosition: '0 50%', // Centers the dino and crops the numbers
              imageRendering: 'pixelated',
              animation: 'dino-walk 0.8s steps(4) infinite',
              mixBlendMode: 'screen', // Perfect for black backgrounds
              filter: 'brightness(1.1)',
            }}
          />

          {/* Held Item Overlay */}
          <motion.div
            animate={{
              y: [0, -6, 0, 6, 0],
              x: [40, 42, 40, 38, 40],
              rotate: [-5, 5, -5]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "steps(4)"
            }}
            className="absolute top-20 left-1/2 -ml-12 w-20 h-20 pointer-events-none"
            style={{
              backgroundImage: 'url(/stickers/pixel_items_sheet.png)',
              backgroundSize: '400% auto',
              backgroundPosition: `${-(itemIndex * 100)}% 45%`,
              imageRendering: 'pixelated',
              mixBlendMode: 'screen',
            }}
          />
        </motion.div>

        {/* Action Micro-particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -100],
                x: [0, (i - 2) * 30],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut"
              }}
              className="absolute left-1/2 bottom-1/2 w-1 h-1 bg-emerald-400 rounded-full blur-[1px]"
            />
          ))}
        </div>
      </div>

      <div className="space-y-4 max-w-md z-20">
        <div className="flex justify-center">
          <motion.span 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border shadow-2xl backdrop-blur-xl ${modeColors[mode] || modeColors.development}`}
          >
            {mode.replace('_', ' ')}
          </motion.span>
        </div>
        
        <h3 className="text-4xl font-black text-white leading-tight tracking-tighter uppercase italic">
          {caption}
        </h3>
        
        <p className="text-gray-400 text-lg font-medium leading-relaxed opacity-80">
          Our team of dinosaurs is working hard to bring this feature to your expedition.
        </p>

        <div className="pt-6 flex justify-center space-x-2">
           <div className="h-1 w-1 bg-emerald-500 rounded-full" />
           <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
           <div className="h-1 w-1 bg-emerald-500/50 rounded-full" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dino-walk {
          from { background-position: 0% 0; }
          to { background-position: 100% 0; }
        }
      `}} />
    </div>
  );
};
