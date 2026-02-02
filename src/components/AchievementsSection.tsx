import React, { useState, useEffect } from 'react';
import { Trophy, Target, Award, Star, Users, Leaf, MapPin, ChefHat, Lock, CheckCircle } from 'lucide-react';
import { auth } from '../firebase';
import { achievementsApi } from '../services/achievementsApi';

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
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
        <div className="max-w-6xl mx-auto">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 mb-6 shadow-lg`}>
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-gray-300 rounded-xl"></div>
                <div>
                  <div className="h-6 bg-gray-300 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-48"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 mb-6 shadow-lg`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translations.achievements}
                </h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {translations.gamification} • Live tracking from your bookings
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {totalPoints}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Points
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translations.unlocked}
                </span>
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {unlockedCount}/{totalCount}
              </div>
            </div>
            
            <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ChefHat className="w-5 h-5 text-blue-500" />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Cuisines
                </span>
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {userStats.cuisinesTried}
              </div>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Local Spots
                </span>
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {userStats.localRestaurants}
              </div>
            </div>

            <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Friends
                </span>
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {userStats.friendsReferred}
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-emerald-500 text-white'
                  : isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category.icon}
              <span className="font-medium">{category.label}</span>
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } rounded-2xl p-6 shadow-lg transition-transform hover:scale-105 ${
                achievement.unlocked ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  achievement.unlocked 
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
                    : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {achievement.unlocked ? (
                    <div className="text-white">{achievement.icon}</div>
                  ) : (
                    <Lock className={`w-6 h-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    achievement.unlocked 
                      ? 'text-emerald-500' 
                      : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {achievement.points}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    points
                  </div>
                </div>
              </div>

              <h3 className={`text-lg font-bold mb-2 ${
                achievement.unlocked 
                  ? isDarkMode ? 'text-white' : 'text-gray-900'
                  : isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {achievement.title}
              </h3>

              <p className={`text-sm mb-4 ${
                achievement.unlocked 
                  ? isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  : isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {achievement.description}
              </p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className={`${
                    achievement.unlocked 
                      ? isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {translations.progress}
                  </span>
                  <span className={`${
                    achievement.unlocked 
                      ? isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {achievement.progress}/{achievement.maxProgress}
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      achievement.unlocked 
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
                        : 'bg-gray-400'
                    }`}
                    style={{
                      width: `${Math.min((achievement.progress / achievement.maxProgress) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>

              {achievement.unlocked && achievement.unlockedDate && (
                <div className="flex items-center gap-2 text-xs text-emerald-500">
                  <CheckCircle className="w-4 h-4" />
                  <span>Unlocked {achievement.unlockedDate.toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementsSection;