import React, { useState, useEffect } from 'react';
import { Trophy, Target, Award, Star, Users, Leaf, MapPin, ChefHat, Lock, CheckCircle, Sparkles, TrendingUp } from 'lucide-react';
import { auth } from '../firebase';
import { achievementsApi } from '../services/achievementsApi';
import { motion } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  category: 'cuisine' | 'local' | 'sustainable' | 'social';
  points: number;
  unlockedDate?: Date;
}

interface AchievementsSectionProps {
  isDarkMode: boolean;
  language: string;
  translations: any;
}

const AchievementsSection: React.FC<AchievementsSectionProps> = ({ isDarkMode, language, translations }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userStats, setUserStats] = useState({
    cuisinesTried: 0,
    localRestaurants: 0,
    sustainableChoices: 0,
    friendsReferred: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      if (!auth.currentUser) return;

      setLoading(true);
      const response = await achievementsApi.getUserAchievements(auth.currentUser.uid);

      if (response.success) {
        setAchievements(response.data.achievements);
        setTotalPoints(response.data.totalPoints);
        setUserStats(response.data.userStats);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      // Fallback to mock data
      initializeMockAchievements();
    } finally {
      setLoading(false);
    }
  };

  const initializeMockAchievements = () => {
    const mockStats = {
      cuisinesTried: 12,
      localRestaurants: 8,
      sustainableChoices: 15,
      friendsReferred: 3
    };
    setUserStats(mockStats);
    const achievementsList: Achievement[] = [
      // Cuisine Explorer Achievements
      {
        id: 'cuisine-explorer-1',
        title: translations.cuisineExplorer,
        description: 'Try 50 different cuisines',
        icon: <ChefHat className="w-6 h-6" />,
        progress: mockStats.cuisinesTried,
        maxProgress: 50,
        unlocked: mockStats.cuisinesTried >= 50,
        category: 'cuisine',
        points: 500,
        unlockedDate: mockStats.cuisinesTried >= 50 ? new Date() : undefined
      },
      {
        id: 'cuisine-novice',
        title: 'Cuisine Novice',
        description: 'Try 10 different cuisines',
        icon: <ChefHat className="w-6 h-6" />,
        progress: mockStats.cuisinesTried,
        maxProgress: 10,
        unlocked: mockStats.cuisinesTried >= 10,
        category: 'cuisine',
        points: 100,
        unlockedDate: mockStats.cuisinesTried >= 10 ? new Date() : undefined
      },
      {
        id: 'cuisine-enthusiast',
        title: 'Cuisine Enthusiast',
        description: 'Try 25 different cuisines',
        icon: <ChefHat className="w-6 h-6" />,
        progress: mockStats.cuisinesTried,
        maxProgress: 25,
        unlocked: mockStats.cuisinesTried >= 25,
        category: 'cuisine',
        points: 250,
        unlockedDate: mockStats.cuisinesTried >= 25 ? new Date() : undefined
      },

      // Local Hero Achievements
      {
        id: 'local-hero-1',
        title: translations.localHero,
        description: 'Support 100 local restaurants',
        icon: <MapPin className="w-6 h-6" />,
        progress: mockStats.localRestaurants,
        maxProgress: 100,
        unlocked: mockStats.localRestaurants >= 100,
        category: 'local',
        points: 1000,
        unlockedDate: mockStats.localRestaurants >= 100 ? new Date() : undefined
      },
      {
        id: 'local-supporter',
        title: 'Local Supporter',
        description: 'Support 10 local restaurants',
        icon: <MapPin className="w-6 h-6" />,
        progress: mockStats.localRestaurants,
        maxProgress: 10,
        unlocked: mockStats.localRestaurants >= 10,
        category: 'local',
        points: 200,
        unlockedDate: mockStats.localRestaurants >= 10 ? new Date() : undefined
      },

      // Sustainable Diner Achievements
      {
        id: 'sustainable-diner-1',
        title: translations.sustainableDiner,
        description: 'Make 50 sustainable dining choices',
        icon: <Leaf className="w-6 h-6" />,
        progress: mockStats.sustainableChoices,
        maxProgress: 50,
        unlocked: mockStats.sustainableChoices >= 50,
        category: 'sustainable',
        points: 750,
        unlockedDate: mockStats.sustainableChoices >= 50 ? new Date() : undefined
      },
      {
        id: 'eco-conscious',
        title: 'Eco Conscious',
        description: 'Make 20 sustainable dining choices',
        icon: <Leaf className="w-6 h-6" />,
        progress: mockStats.sustainableChoices,
        maxProgress: 20,
        unlocked: mockStats.sustainableChoices >= 20,
        category: 'sustainable',
        points: 300,
        unlockedDate: mockStats.sustainableChoices >= 20 ? new Date() : undefined
      },

      // Social Foodie Achievements
      {
        id: 'social-foodie-1',
        title: translations.socialFoodie,
        description: 'Bring 25 new people to restaurants',
        icon: <Users className="w-6 h-6" />,
        progress: mockStats.friendsReferred,
        maxProgress: 25,
        unlocked: mockStats.friendsReferred >= 25,
        category: 'social',
        points: 600,
        unlockedDate: mockStats.friendsReferred >= 25 ? new Date() : undefined
      },
      {
        id: 'friend-magnet',
        title: 'Friend Magnet',
        description: 'Bring 5 new people to restaurants',
        icon: <Users className="w-6 h-6" />,
        progress: mockStats.friendsReferred,
        maxProgress: 5,
        unlocked: mockStats.friendsReferred >= 5,
        category: 'social',
        points: 150,
        unlockedDate: mockStats.friendsReferred >= 5 ? new Date() : undefined
      }
    ];

    setAchievements(achievementsList);

    // Calculate total points
    const points = achievementsList
      .filter(achievement => achievement.unlocked)
      .reduce((sum, achievement) => sum + achievement.points, 0);
    setTotalPoints(points);
  };

  const categories = [
    { id: 'all', label: 'All', icon: <Trophy className="w-4 h-4" /> },
    { id: 'cuisine', label: 'Cuisine', icon: <ChefHat className="w-4 h-4" /> },
    { id: 'local', label: 'Local', icon: <MapPin className="w-4 h-4" /> },
    { id: 'sustainable', label: 'Sustainable', icon: <Leaf className="w-4 h-4" /> },
    { id: 'social', label: 'Social', icon: <Users className="w-4 h-4" /> }
  ];

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} p-8`}>
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          <div className="flex gap-4">
            <div className="w-1/3 h-48 bg-gray-300/20 rounded-3xl"></div>
            <div className="w-2/3 h-48 bg-gray-300/20 rounded-3xl"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`h-64 rounded-3xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} p-8`}>
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Level/Points Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-8 shadow-2xl shadow-emerald-500/20 text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-emerald-100" />
                  <span className="text-emerald-100 font-bold uppercase tracking-wider text-xs">Current Level</span>
                </div>
                <h2 className="text-3xl font-black">Foodie Explorer</h2>
              </div>

              <div className="mt-8">
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-5xl font-black tracking-tight">{totalPoints}</span>
                  <span className="text-xl text-emerald-100 font-medium mb-1.5">pts</span>
                </div>
                <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="bg-white h-full rounded-full w-[75%]" />
                </div>
                <p className="text-xs text-emerald-100 mt-2 font-medium">150 pts to next level</p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className={`lg:col-span-2 rounded-[2.5rem] p-8 relative overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-white'} border shadow-xl`}>
            <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-3xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center mb-3 text-orange-600">
                  <ChefHat size={20} className="fill-current" />
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userStats.cuisinesTried}</div>
                <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cuisines</div>
              </div>
              <div className={`p-4 rounded-3xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center mb-3 text-blue-600">
                  <MapPin size={20} className="fill-current" />
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userStats.localRestaurants}</div>
                <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Local Spots</div>
              </div>
              <div className={`p-4 rounded-3xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center mb-3 text-green-600">
                  <Leaf size={20} className="fill-current" />
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userStats.sustainableChoices}</div>
                <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Eco Choices</div>
              </div>
              <div className={`p-4 rounded-3xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center mb-3 text-purple-600">
                  <Users size={20} className="fill-current" />
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userStats.friendsReferred}</div>
                <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Referred</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl whitespace-nowrap transition-all duration-300 font-semibold text-sm ${selectedCategory === category.id
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              {category.icon}
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              whileHover={{ y: -4 }}
              className={`relative overflow-hidden rounded-[2rem] p-6 transition-all duration-300 border ${achievement.unlocked
                  ? isDarkMode
                    ? 'bg-gray-800 border-emerald-500/30 shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]'
                    : 'bg-white border-emerald-100 shadow-xl shadow-emerald-500/5'
                  : isDarkMode
                    ? 'bg-gray-900 border-gray-800 opacity-60 grayscale'
                    : 'bg-gray-50 border-gray-100 opacity-70 grayscale'
                }`}
            >
              {achievement.unlocked && (
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl"></div>
              )}

              <div className="relative flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${achievement.unlocked
                    ? 'bg-emerald-100 text-emerald-600'
                    : isDarkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400'
                  }`}>
                  {achievement.icon}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${achievement.unlocked
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-md'
                    : isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {achievement.points} pts
                </div>
              </div>

              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {achievement.title}
              </h3>
              <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {achievement.description}
              </p>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide">
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Progress</span>
                  <span className={achievement.unlocked ? 'text-emerald-500' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                    {achievement.progress} / {achievement.maxProgress}
                  </span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((achievement.progress / achievement.maxProgress) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className={`h-full rounded-full ${achievement.unlocked
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : 'bg-gray-400'
                      }`}
                  />
                </div>
              </div>

              {achievement.unlocked && (
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-500">
                  <CheckCircle size={14} />
                  <span>Unlocked {achievement.unlockedDate ? new Date(achievement.unlockedDate).toLocaleDateString() : 'Recently'}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementsSection;