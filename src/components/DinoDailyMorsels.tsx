import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { recommendationService, Recommendation } from '../services/recommendationService';
import { Sparkles, ArrowRight, Utensils, Zap } from 'lucide-react';
import socketService from '../utils/socketService';
import { useLanguage } from '../contexts/LanguageContext';

interface DinoDailyMorselsProps {
  userId: string;
  isDarkMode: boolean;
  variant?: 'default' | 'compact';
  userMood?: 'Chill' | 'Social' | 'Hustle' | 'Happy' | 'Romantic' | 'Adventurous' | 'Hungry';
  language?: string;
}

const DinoDailyMorsels: React.FC<DinoDailyMorselsProps> = ({ userId, isDarkMode, variant = 'default', userMood = 'Social', language: propLanguage = 'english' }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const fetchMorsels = async (refresh: boolean = false) => {
    if (isRefreshing) return;
    
    // Stage 1: Get items immediately with local/fallback reasoning
    if (refresh) setIsRefreshing(true);
    else setLoading(true);
    
    try {
      const items = await recommendationService.getDailyMorsels(userId, userMood);
      setRecommendations(items);
      setLoading(false);

      // Stage 2: Fetch AI reasons in background or from cache
      // We don't set loading back to true here, so UI remains interactive
      const aiReasons = await recommendationService.getAIReasons(userId, items, language, refresh);
      if (aiReasons && aiReasons.length > 0) {
        setRecommendations(prev => prev.map(item => {
          const found = aiReasons.find(r => r.id === item.id);
          return found ? { ...item, reason: found.reason } : item;
        }));
      }
    } catch (e) {
      console.error('Failed to fetch morsels:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMorsels();

    // Listen for real-time recommendation updates
    socketService.on('daily-morsels-updated', () => {
      fetchMorsels();
    });

    return () => {
      socketService.off('daily-morsels-updated');
    };
  }, [userId, userMood, language]);

  if (loading) return null;

  const isCompact = variant === 'compact';

  const handleMorselClick = (morsel: Recommendation) => {
    if (morsel.type === 'restaurant') {
      navigate(`/restaurant/${morsel.id}`);
    } else {
      navigate(`/event/${morsel.id}/register`);
    }
  };

  const getVibeIcon = (mood: string) => {
    if (mood === 'Chill') return '🤫';
    if (mood === 'Social') return '🔥';
    return '⚡';
  };

  return (
    <div className={`${isCompact ? 'p-0 bg-transparent border-0 shadow-none' : `p-8 rounded-[2.5rem] ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-200'} border-2 shadow-2xl`}`}>
      {!isCompact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500 rounded-xl text-black flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none mb-1 truncate">{t('dinoDailyMorsels')}</h3>
              <div className="flex items-center gap-1.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 truncate">{t('aiInsightsActive')}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <button 
              onClick={() => fetchMorsels(true)}
              disabled={isRefreshing}
              className={`p-2 rounded-xl border border-white/10 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100'} transition-all active:scale-90 group flex-shrink-0 disabled:opacity-50`}
              title={t('refreshAIInsights')}
            >
              <Zap size={16} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} group-hover:text-yellow-500 transition-colors ${isRefreshing ? 'animate-spin text-yellow-500' : ''}`} />
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'} border border-white/5 flex-shrink-0`}>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-40 whitespace-nowrap">{t('currentVibe')}</span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-500 whitespace-nowrap">
                {t(`mood${userMood}` as any) || userMood} {getVibeIcon(userMood)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isCompact ? 'gap-3' : 'md:grid-cols-2 gap-4'}`}>
        {recommendations.map((morsel, idx) => (
          <motion.div
            key={`${morsel.type}-${morsel.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => handleMorselClick(morsel)}
            className={`group relative overflow-hidden ${isCompact ? 'p-4 rounded-2xl' : 'p-6 rounded-3xl'} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-white hover:shadow-lg'} border ${isDarkMode ? 'border-white/5' : 'border-gray-100'} transition-all cursor-pointer`}
          >
            {/* Background Image subtle overlay */}
            {morsel.image && !isCompact && (
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <img src={morsel.image} alt="" className="w-full h-full object-cover grayscale" />
                <div className={`absolute inset-0 ${isDarkMode ? 'bg-zinc-900/60' : 'bg-white/60'}`} />
              </div>
            )}

            <div className="relative z-10">
              <div className={`flex justify-between items-start ${isCompact ? 'mb-2' : 'mb-4'}`}>
                 <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                       <span className={`text-[8px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full inline-block`}>
                        {morsel.cuisine}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${morsel.type === 'event' ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10'} px-2 py-0.5 rounded-full inline-block`}>
                        {morsel.type}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full inline-block border border-emerald-400/20`}>
                        {getVibeIcon(userMood)} {t('vibeCheck')}
                      </span>
                    </div>
                    <h4 className={`${isCompact ? 'text-lg' : 'text-xl'} font-black`}>{morsel.name}</h4>
                 </div>
                 <div className="text-right">
                    <span className={`font-black text-yellow-500 ${isCompact ? 'text-xl' : 'text-2xl'}`}>{morsel.matchScore}%</span>
                    {!isCompact && <p className="text-[8px] uppercase font-bold opacity-30">{t('match')}</p>}
                 </div>
              </div>
              
              <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'} font-medium italic ${isCompact ? 'mb-3' : 'mb-6'} leading-relaxed`}>
                "{morsel.reason}"
              </p>

              <div className="flex items-center justify-between">
                 <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-yellow-500 opacity-50" />)}
                 </div>
                 <motion.div 
                   whileHover={{ x: 5 }}
                   className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-yellow-500"
                 >
                   {t('view')} <ArrowRight size={10} />
                 </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DinoDailyMorsels;
