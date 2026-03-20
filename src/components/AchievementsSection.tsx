import React, { useState, useEffect } from 'react';
import { ChefHat, GraduationCap, MapPin, Share2, Star, Trophy, Users, Zap, Search, CheckCircle } from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { achievementsApi } from '../services/achievementsApi';
import socketService from '../utils/socketService';
import DinoMascot from './DinoMascot';
import DinoTerritoryMap from './DinoTerritoryMap';
import DinoDailyMorsels from './DinoDailyMorsels';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  category: string;
  points: number;
  unlockedDate?: string;
}

interface UserStats {
  cuisinesTried: number;
  localRestaurants: number;
  sustainableChoices: number;
  friendsReferred: number;
  totalBookings: number;
  totalEvents: number;
  territory: {
    visitedLocations: { latitude: number; longitude: number; name: string }[];
    conqueredAreas: string[];
  };
}

interface AchievementsSectionProps {
  isDarkMode: boolean;
  language: string;
  translations: any;
  userMood?: 'Chill' | 'Social' | 'Hustle' | 'Happy' | 'Romantic' | 'Adventurous' | 'Hungry';
}

const AchievementsSection: React.FC<AchievementsSectionProps> = ({ isDarkMode, language, translations, userMood = 'Social' }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [level, setLevel] = useState(1);
  const [tier, setTier] = useState<'Early Hatcher' | 'Urban Raptor' | 'Apex Predator' | 'Cuisine King'>('Early Hatcher');
  const [lastAction, setLastAction] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    fetchAchievements();

    // Socket.io Real-time setup
    const socket = socketService.connect();
    if (socket) {
      // User specific room is handled by backend based on userId or explicit join
      socket.emit('join', { rooms: [`user:${userId}`] }); 

      socketService.on('stats-updated', (data: any) => {
        setStats(prev => ({ ...prev, ...data.stats }));
        setLevel(data.level);
        setTier(data.tier);
        setLastAction('booking_completed');
      });

      socketService.on('achievement-unlocked', (data: any) => {
        setLastAction('achievement_unlocked');
        fetchAchievements(); 
      });

      socketService.on('level-up', (data: any) => {
        setLevel(data.level);
        setLastAction('achievement_unlocked');
      });

      socketService.on('tier-up', (data: any) => {
        setTier(data.tier);
        setLastAction('achievement_unlocked');
      });
    }

    return () => {
      socketService.off('stats-updated');
      socketService.off('achievement-unlocked');
      socketService.off('level-up');
      socketService.off('tier-up');
    };
  }, [userId]);

  const fetchAchievements = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await achievementsApi.getUserAchievements(userId);
      if (data.success) {
        setAchievements(data.data.achievements);
        setStats(data.data.userStats);
        setLevel(data.data.level || 1);
        setTier(data.data.tier || 'Early Hatcher');
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (achievementId: string) => {
    if (achievementId.includes('cuisine')) return ChefHat;
    if (achievementId.includes('local')) return MapPin;
    if (achievementId.includes('sustainable')) return Zap;
    if (achievementId.includes('social')) return Users;
    return Trophy;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-8 max-w-7xl mx-auto px-4 py-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Premium Header with Mascot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <DinoMascot level={level} tier={tier} lastAction={lastAction} />
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${isDarkMode ? 'bg-zinc-900/50' : 'bg-white'} backdrop-blur-xl border ${isDarkMode ? 'border-white/5' : 'border-gray-200'} p-8 rounded-[2.5rem] h-full flex flex-col justify-center shadow-2xl`}
          >
            <div className="flex items-center gap-3 mb-4">
               <div className="h-2 w-12 bg-yellow-500 rounded-full" />
               <span className="text-yellow-500 font-black text-xs uppercase tracking-[0.2em]">Dino Expedition Status</span>
            </div>
            <h1 className="text-5xl font-black mb-4 leading-tight">
              YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">DIG SITE</span>
            </h1>
            <p className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-600'} text-lg max-w-xl font-medium`}>
              Uncover rare culinary fossils by exploring new territories. Your evolution depends on the variety of your bites.
            </p>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { label: 'Cuisines', value: stats?.cuisinesTried || 0, icon: ChefHat },
                { label: 'Territories', value: stats?.localRestaurants || 0, icon: MapPin },
                { label: 'Bookings', value: stats?.totalBookings || 0, icon: Zap },
                { label: 'Points', value: level * 100, icon: Star }
              ].map((item, idx) => (
                <div key={idx} className={`${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} p-4 rounded-2xl border`}>
                  <item.icon className={`${isDarkMode ? 'text-white/30' : 'text-gray-400'} mb-2`} size={20} />
                  <div className="text-2xl font-black">{item.value}</div>
                  <div className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Territory Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <DinoTerritoryMap 
          locations={stats?.territory?.visitedLocations || []} 
          isDarkMode={isDarkMode} 
        />
      </motion.div>

      {/* Daily Morsels */}
      {userId && (
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
        >
          <DinoDailyMorsels userId={userId} isDarkMode={isDarkMode} userMood={userMood} />
        </motion.div>
      )}

      {/* Achievement Dig Site Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement, index) => {
          const Icon = getIcon(achievement.id);
          const progress = (achievement.progress / achievement.maxProgress) * 100;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative overflow-hidden group p-6 rounded-[2rem] transition-all duration-500 border-2 ${
                achievement.unlocked 
                  ? isDarkMode 
                    ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-yellow-500/30 shadow-[0_0_30px_-5px_rgba(234,179,8,0.1)]' 
                    : 'bg-white border-yellow-500/20 shadow-xl'
                  : isDarkMode 
                    ? 'bg-zinc-900/40 border-white/5 grayscale opacity-60' 
                    : 'bg-gray-50 border-gray-100 grayscale opacity-70'
              } hover:border-yellow-500/50 hover:-translate-y-1`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl ${
                  achievement.unlocked ? 'bg-yellow-500 text-black shadow-lg' : isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-200 text-gray-400'
                } group-hover:scale-110 transition-transform duration-500`}>
                  <Icon size={28} />
                </div>
                {achievement.unlocked && (
                  <div className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    IDENTIFIED
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight uppercase">
                  {achievement.title}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'} font-medium leading-relaxed`}>
                  {achievement.description}
                </p>
              </div>

              {/* Fossil Progress Bar */}
              <div className="mt-8 space-y-3">
                <div className="flex justify-between items-end">
                  <span className={`text-[10px] font-black ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'} uppercase tracking-widest`}>Extraction Progress</span>
                  <span className="text-sm font-black">
                    {achievement.progress} <span className={isDarkMode ? 'text-zinc-600' : 'text-gray-400'}>/ {achievement.maxProgress}</span>
                  </span>
                </div>
                <div className={`${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full h-3 overflow-hidden p-[2px]`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      achievement.unlocked ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500' : isDarkMode ? 'bg-zinc-600' : 'bg-gray-300'
                    } relative`}
                  >
                    {achievement.unlocked && (
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[slide_1s_linear_infinite]" />
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Unlocked Date Sticker */}
              {achievement.unlocked && achievement.unlockedDate && (
                <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-100'} flex items-center gap-2 opacity-50`}>
                  <Search size={12} className="text-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">
                    Discovered {new Date(achievement.unlockedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      <style>{`
        @keyframes slide {
          from { background-position: 0 0; }
          to { background-position: 40px 0; }
        }
      `}</style>
    </div>
  );
};

export default AchievementsSection;