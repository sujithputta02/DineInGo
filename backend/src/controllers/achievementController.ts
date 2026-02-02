import { Request, Response } from 'express';
import { Achievement } from '../models/Achievement';
import { UserStats } from '../models/UserStats';
import { Booking } from '../models/Booking';
import { Restaurant } from '../models/Restaurant';
import { Event } from '../models/Event';

// Calculate real user stats from bookings and events data
const calculateRealUserStats = async (userId: string) => {
  try {
    // Get all user bookings
    const bookings = await Booking.find({ userId }).populate('restaurantId').populate('eventId');
    
    // Calculate cuisines tried from restaurant bookings
    const cuisineSet = new Set<string>();
    const localRestaurantSet = new Set<string>();
    let sustainableChoices = 0;
    let totalBookings = 0;
    let totalEvents = 0;

    for (const booking of bookings) {
      totalBookings++;

      // Count cuisines from restaurant bookings
      if (booking.restaurantId && typeof booking.restaurantId === 'object') {
        const restaurant = booking.restaurantId as any;
        if (restaurant.cuisine && Array.isArray(restaurant.cuisine)) {
          restaurant.cuisine.forEach((cuisine: string) => cuisineSet.add(cuisine));
        }
        
        // Count local restaurants (you can define criteria for "local")
        // For now, let's assume all restaurants are local
        localRestaurantSet.add(restaurant._id.toString());
        
        // Count sustainable choices (restaurants with sustainability features)
        if (restaurant.sustainability && restaurant.sustainability.score > 7) {
          sustainableChoices++;
        }
      }

      // Count events
      if (booking.eventId) {
        totalEvents++;
      }
    }

    // Get friends referred (this would need to be tracked separately)
    // For now, we'll use the existing UserStats or default to 0
    let userStats = await UserStats.findOne({ userId });
    const friendsReferred = userStats?.friendsReferred || [];

    return {
      cuisinesTried: Array.from(cuisineSet),
      localRestaurantsVisited: Array.from(localRestaurantSet),
      sustainableChoices,
      friendsReferred,
      totalBookings,
      totalEvents
    };
  } catch (error) {
    console.error('Error calculating real user stats:', error);
    // Fallback to existing stats or defaults
    let userStats = await UserStats.findOne({ userId });
    return {
      cuisinesTried: userStats?.cuisinesTried || [],
      localRestaurantsVisited: userStats?.localRestaurantsVisited || [],
      sustainableChoices: userStats?.sustainableChoices || 0,
      friendsReferred: userStats?.friendsReferred || [],
      totalBookings: userStats?.totalBookings || 0,
      totalEvents: userStats?.totalEvents || 0
    };
  }
};

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS = [
  // Cuisine Explorer Achievements
  {
    id: 'cuisine-explorer-1',
    title: 'Cuisine Explorer',
    description: 'Try 50 different cuisines',
    category: 'cuisine' as const,
    maxProgress: 50,
    points: 500,
    checkProgress: (stats: any) => stats.cuisinesTried?.length || 0
  },
  {
    id: 'cuisine-novice',
    title: 'Cuisine Novice',
    description: 'Try 10 different cuisines',
    category: 'cuisine' as const,
    maxProgress: 10,
    points: 100,
    checkProgress: (stats: any) => stats.cuisinesTried?.length || 0
  },
  {
    id: 'cuisine-enthusiast',
    title: 'Cuisine Enthusiast',
    description: 'Try 25 different cuisines',
    category: 'cuisine' as const,
    maxProgress: 25,
    points: 250,
    checkProgress: (stats: any) => stats.cuisinesTried?.length || 0
  },

  // Local Hero Achievements
  {
    id: 'local-hero-1',
    title: 'Local Hero',
    description: 'Support 100 local restaurants',
    category: 'local' as const,
    maxProgress: 100,
    points: 1000,
    checkProgress: (stats: any) => stats.localRestaurantsVisited?.length || 0
  },
  {
    id: 'local-supporter',
    title: 'Local Supporter',
    description: 'Support 10 local restaurants',
    category: 'local' as const,
    maxProgress: 10,
    points: 200,
    checkProgress: (stats: any) => stats.localRestaurantsVisited?.length || 0
  },

  // Sustainable Diner Achievements
  {
    id: 'sustainable-diner-1',
    title: 'Sustainable Diner',
    description: 'Make 50 sustainable dining choices',
    category: 'sustainable' as const,
    maxProgress: 50,
    points: 750,
    checkProgress: (stats: any) => stats.sustainableChoices || 0
  },
  {
    id: 'eco-conscious',
    title: 'Eco Conscious',
    description: 'Make 20 sustainable dining choices',
    category: 'sustainable' as const,
    maxProgress: 20,
    points: 300,
    checkProgress: (stats: any) => stats.sustainableChoices || 0
  },

  // Social Foodie Achievements
  {
    id: 'social-foodie-1',
    title: 'Social Foodie',
    description: 'Bring 25 new people to restaurants',
    category: 'social' as const,
    maxProgress: 25,
    points: 600,
    checkProgress: (stats: any) => stats.friendsReferred?.length || 0
  },
  {
    id: 'friend-magnet',
    title: 'Friend Magnet',
    description: 'Bring 5 new people to restaurants',
    category: 'social' as const,
    maxProgress: 5,
    points: 150,
    checkProgress: (stats: any) => stats.friendsReferred?.length || 0
  }
];

// Get user achievements
export const getUserAchievements = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Calculate real stats from bookings data
    const realStats = await calculateRealUserStats(userId);

    // Update or create user stats with real data
    let userStats = await UserStats.findOne({ userId });
    if (!userStats) {
      userStats = new UserStats({
        userId,
        cuisinesTried: realStats.cuisinesTried,
        localRestaurantsVisited: realStats.localRestaurantsVisited,
        sustainableChoices: realStats.sustainableChoices,
        friendsReferred: realStats.friendsReferred,
        totalBookings: realStats.totalBookings,
        totalEvents: realStats.totalEvents,
        totalPoints: 0
      });
    } else {
      // Update with real data
      userStats.cuisinesTried = realStats.cuisinesTried;
      userStats.localRestaurantsVisited = realStats.localRestaurantsVisited;
      userStats.sustainableChoices = realStats.sustainableChoices;
      userStats.totalBookings = realStats.totalBookings;
      userStats.totalEvents = realStats.totalEvents;
      // Keep friendsReferred as it needs manual tracking
    }
    await userStats.save();

    // Get existing achievements
    const existingAchievements = await Achievement.find({ userId });
    const achievementMap = new Map(existingAchievements.map(a => [a.achievementId, a]));

    // Process all achievements with real stats
    const achievements = [];
    let totalPoints = 0;

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const currentProgress = def.checkProgress(userStats);
      const isUnlocked = currentProgress >= def.maxProgress;
      
      let achievement = achievementMap.get(def.id);
      
      if (!achievement) {
        // Create new achievement
        achievement = new Achievement({
          userId,
          achievementId: def.id,
          title: def.title,
          description: def.description,
          category: def.category,
          progress: currentProgress,
          maxProgress: def.maxProgress,
          unlocked: isUnlocked,
          points: def.points,
          unlockedDate: isUnlocked ? new Date() : undefined
        });
        await achievement.save();
      } else {
        // Update existing achievement
        const wasUnlocked = achievement.unlocked;
        achievement.progress = currentProgress;
        achievement.unlocked = isUnlocked;
        
        if (isUnlocked && !wasUnlocked) {
          achievement.unlockedDate = new Date();
        }
        
        await achievement.save();
      }

      if (achievement.unlocked) {
        totalPoints += achievement.points;
      }

      achievements.push({
        id: achievement.achievementId,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        progress: achievement.progress,
        maxProgress: achievement.maxProgress,
        unlocked: achievement.unlocked,
        points: achievement.points,
        unlockedDate: achievement.unlockedDate
      });
    }

    // Update total points in user stats
    userStats.totalPoints = totalPoints;
    await userStats.save();

    res.json({
      success: true,
      data: {
        achievements,
        totalPoints,
        userStats: {
          cuisinesTried: userStats.cuisinesTried.length,
          localRestaurants: userStats.localRestaurantsVisited.length,
          sustainableChoices: userStats.sustainableChoices,
          friendsReferred: userStats.friendsReferred.length,
          totalBookings: userStats.totalBookings,
          totalEvents: userStats.totalEvents
        }
      }
    });
  } catch (error) {
    console.error('Error getting user achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get achievements'
    });
  }
};

// Update user stats (called when user performs actions)
export const updateUserStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { action, data } = req.body;

    let userStats = await UserStats.findOne({ userId });
    if (!userStats) {
      userStats = new UserStats({
        userId,
        cuisinesTried: [],
        localRestaurantsVisited: [],
        sustainableChoices: 0,
        friendsReferred: [],
        totalBookings: 0,
        totalEvents: 0,
        totalPoints: 0
      });
    }

    switch (action) {
      case 'try_cuisine':
        if (data.cuisine && !userStats.cuisinesTried.includes(data.cuisine)) {
          userStats.cuisinesTried.push(data.cuisine);
        }
        break;
      
      case 'visit_local_restaurant':
        if (data.restaurantId && !userStats.localRestaurantsVisited.includes(data.restaurantId)) {
          userStats.localRestaurantsVisited.push(data.restaurantId);
        }
        break;
      
      case 'sustainable_choice':
        userStats.sustainableChoices += 1;
        break;
      
      case 'refer_friend':
        if (data.friendId && !userStats.friendsReferred.includes(data.friendId)) {
          userStats.friendsReferred.push(data.friendId);
        }
        break;
      
      case 'complete_booking':
        userStats.totalBookings += 1;
        break;
      
      case 'attend_event':
        userStats.totalEvents += 1;
        break;
    }

    await userStats.save();

    res.json({
      success: true,
      message: 'User stats updated successfully'
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user stats'
    });
  }
};

// Get user stats
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    let userStats = await UserStats.findOne({ userId });
    if (!userStats) {
      userStats = new UserStats({
        userId,
        cuisinesTried: [],
        localRestaurantsVisited: [],
        sustainableChoices: 0,
        friendsReferred: [],
        totalBookings: 0,
        totalEvents: 0,
        totalPoints: 0
      });
      await userStats.save();
    }

    res.json({
      success: true,
      data: {
        cuisinesTried: userStats.cuisinesTried.length,
        localRestaurants: userStats.localRestaurantsVisited.length,
        sustainableChoices: userStats.sustainableChoices,
        friendsReferred: userStats.friendsReferred.length,
        totalBookings: userStats.totalBookings,
        totalEvents: userStats.totalEvents,
        totalPoints: userStats.totalPoints
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user stats'
    });
  }
};