import React from 'react';
import { motion } from 'framer-motion';

interface FeatureStickerProps {
  stickerId: string;
  caption: string;
  mode: string;
}

const stickerMap: Record<string, string> = {
  dino_dev: '/stickers/dino_dev.png',
  dino_test: '/stickers/dino_test.png',
  dino_maint: '/stickers/dino_maint.png',
  dino_soon: '/stickers/dino_soon.png',
};

const modeColors: Record<string, string> = {
  development: 'bg-amber-100 text-amber-700 border-amber-200',
  testing: 'bg-blue-100 text-blue-700 border-blue-200',
  maintenance: 'bg-rose-100 text-rose-700 border-rose-200',
  coming_soon: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const FeatureSticker: React.FC<FeatureStickerProps> = ({ stickerId, caption, mode }) => {
  const stickerPath = stickerMap[stickerId] || stickerMap.dino_dev;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [0, -5, 5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full" />
        
        <img
          src={stickerPath}
          alt="Feature Status"
          className="w-48 h-48 object-contain relative z-10 drop-shadow-2xl"
          style={{ mixBlendMode: 'multiply' }} // Removes white background
        />
        
        {/* Floating elements animation */}
        <motion.div
          animate={{
            opacity: [0, 1, 0],
            y: [0, -40],
            x: [0, 20]
          }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="absolute top-0 right-0 text-2xl"
        >
          ✨
        </motion.div>
        <motion.div
          animate={{
            opacity: [0, 1, 0],
            y: [0, -30],
            x: [0, -20]
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          className="absolute top-10 left-0 text-xl"
        >
          🚀
        </motion.div>
      </motion.div>

      <div className="space-y-3">
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${modeColors[mode] || modeColors.development}`}>
          {mode.replace('_', ' ')}
        </span>
        <h3 className="text-2xl font-bold text-gray-900 leading-tight">
          {caption}
        </h3>
        <p className="text-gray-500 max-w-xs mx-auto">
          Our team of dinosaurs is working hard to bring this feature to your expedition.
        </p>
      </div>
    </div>
  );
};
