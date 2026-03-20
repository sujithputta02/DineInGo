import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Star, Trophy, MapPin, Zap } from 'lucide-react';

interface DinoMascotProps {
  level: number;
  tier: 'Early Hatcher' | 'Urban Raptor' | 'Apex Predator' | 'Cuisine King';
  lastAction?: string; // e.g., 'booking_completed', 'achievement_unlocked'
}

const DinoMascot: React.FC<DinoMascotProps> = ({ level, tier, lastAction }) => {
  const [animationState, setAnimationState] = useState<'idle' | 'happy' | 'eating' | 'dancing' | 'excited'>('idle');
  const [bubbleText, setBubbleText] = useState<string | null>(null);

  useEffect(() => {
    if (lastAction === 'booking_completed') {
      setAnimationState('eating');
      setBubbleText('YUMMY! NEW TASTE DISCOVERED! 🥗');
      setTimeout(() => {
        setAnimationState('idle');
        setBubbleText(null);
      }, 4000);
    } else if (lastAction === 'achievement_unlocked') {
      setAnimationState('dancing');
      setBubbleText('WHOA! WE FOUND A FOSSIL! 🏆');
      setTimeout(() => {
        setAnimationState('idle');
        setBubbleText(null);
      }, 5000);
    }
  }, [lastAction]);

  const getEvolutionStage = () => {
    switch (tier) {
      case 'Cuisine King': return '🦖'; // T-Rex
      case 'Apex Predator': return '🐉'; // Raptor/Dragon-like
      case 'Urban Raptor': return '🦎'; // Baby Raptor
      default: return '🥚'; // Egg
    }
  };

  const stageColor = {
    'Early Hatcher': 'from-blue-400 to-cyan-500',
    'Urban Raptor': 'from-green-400 to-emerald-600',
    'Apex Predator': 'from-orange-400 to-red-600',
    'Cuisine King': 'from-purple-500 to-indigo-700'
  }[tier];

  return (
    <div className="relative flex flex-col items-center justify-center p-6 rounded-[2.5rem] bg-zinc-900 border-white/5 border-2 shadow-2xl overflow-hidden group min-h-[300px]">
      {/* Animated Background Glow */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity }}
        className={`absolute inset-0 bg-gradient-to-br ${stageColor} blur-3xl -z-10`}
      />

      {/* Mascot Container */}
      <motion.div
        animate={
          animationState === 'dancing' ? { y: [0, -30, 0], rotate: [0, 15, -15, 0] } :
          animationState === 'eating' ? { scale: [1, 1.2, 0.8, 1.1, 1], x: [0, 10, -10, 5, 0] } :
          animationState === 'happy' ? { scale: [1, 1.1, 1] } :
          { 
            y: [0, -10, 0],
            scale: [1, 1.05, 1]
          }
        }
        transition={{ duration: animationState === 'idle' ? 3 : 0.6, repeat: animationState === 'idle' ? Infinity : 0 }}
        className="text-[120px] mb-6 cursor-pointer relative z-20"
        onClick={() => {
            setAnimationState('happy');
            setBubbleText('RAWR! I LOVE CULINARY DIGS! 🦖');
            setTimeout(() => {
                setAnimationState('idle');
                setBubbleText(null);
            }, 3000);
        }}
      >
        {getEvolutionStage()}
        
        {/* Level Badge */}
        <div className="absolute -top-4 -right-4 bg-yellow-500 text-black text-sm font-black px-4 py-2 rounded-2xl border-4 border-zinc-900 shadow-2xl">
          Lvl {level}
        </div>
      </motion.div>

      {/* Speech Bubble */}
      <AnimatePresence>
        {bubbleText && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.5 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-zinc-900 px-6 py-3 rounded-3xl text-xs font-black shadow-2xl z-50 whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-t-white after:border-l-transparent after:border-r-transparent after:border-b-transparent"
          >
            {bubbleText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier Info */}
      <div className="text-center z-10 transition-transform group-hover:scale-105 duration-500">
        <h3 className="text-3xl font-black text-white tracking-widest uppercase mb-1">
          {tier}
        </h3>
        <div className="flex items-center justify-center gap-2">
            <div className={`h-1.5 w-12 rounded-full overflow-hidden bg-white/10`}>
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${level % 10 * 10}%` }}
                    className={`h-full bg-gradient-to-r ${stageColor}`}
                />
            </div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-tighter">
              Next Evolution: {10 - (level % 10)} Levels
            </p>
        </div>
      </div>

      {/* Stats Quick View (Micro Icons) */}
      <div className="flex gap-4 mt-6">
        <div className="flex flex-col items-center">
            <div className="p-2 bg-white/20 rounded-lg mb-1"><ChefHat size={16} /></div>
            <span className="text-[10px] uppercase font-bold text-white/50">Cuisines</span>
        </div>
        <div className="flex flex-col items-center">
            <div className="p-2 bg-white/20 rounded-lg mb-1"><MapPin size={16} /></div>
            <span className="text-[10px] uppercase font-bold text-white/50">Territory</span>
        </div>
        <div className="flex flex-col items-center">
            <div className="p-2 bg-white/20 rounded-lg mb-1"><Zap size={16} /></div>
            <span className="text-[10px] uppercase font-bold text-white/50">Active</span>
        </div>
      </div>
    </div>
  );
};

export default DinoMascot;
