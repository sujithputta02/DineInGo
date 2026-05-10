import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { DinoStepper } from "../components/DinoStepper";
import { InitialsAvatar } from "../components/InitialsAvatar";
import {
  Search,
  Menu,
  MapPin,
  Heart,
  X,
  Bell,
  Settings,
  Globe,
  ArrowLeft,
  Moon,
  Sun,
  Calendar,
  Clock,
  Check,
  Users,
  FileText,
  Trophy,
  Camera,
  Target,
  Award,
  Zap,
  MessageSquare,
  Pencil,
  Trash2,
  Star,
  AlertCircle,
  Smile,
  Compass,
  Utensils,
  ArrowRight,
  Sparkles,
  Info,
  ShoppingCart,
  ChefHat,
} from "lucide-react";
import InvoiceModal from "../components/InvoiceModal";
import { signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import BookingCard from "../components/BookingCard";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { userAPI, bookingsApi, userPreferenceApi, normalizeImageUrl, businessApi, menuApi } from "../services/api";
import { API_CONFIG } from "../config/api";
import { toast } from "react-toastify";
import { Location as GeoLocation, Event as AppEvent, Booking } from "../types";
import { mockRestaurants, mockEvents } from "../utils/mockData";
import { GeocodingService } from "../services/geocodingService";
import { indianCities } from "../utils/indianCities";
import SkeletonLoading from "../components/SkeletonLoading";
import RestaurantMap from "../components/RestaurantMap";
import ProfileSettings from "../components/ProfileSettings";
import ReportIssueModal from "../components/ReportIssueModal";
import NotificationBell from "../components/NotificationBell";
import { useNotifications } from "../contexts/NotificationContext";
import { User, LocationSettings } from "../types/user";
import { trackEvent } from '../utils/analytics';
import { favoritesApi } from '../services/favoritesApi';
import socketService from "../utils/socketService";
import { VoiceSearchButton } from "../components/VoiceSearchButton";
import mixpanel from "mixpanel-browser";
import { SustainabilityBadge } from "../components/SustainabilityBadge";
import AchievementsSection from "../components/AchievementsSection";
import ARMenuSection from "../components/ARMenuSection";
import { FeatureSticker } from "../components/FeatureSticker";
import StarRating from "../components/StarRating";
import EmojiPicker from "../components/EmojiPicker";
import { isRestaurantOpen } from "../utils/openStatus";
import DinoDailyMorsels from "../components/DinoDailyMorsels";
import { PremiumRestaurantCard } from "../components/PremiumRestaurantCard";
import { PremiumEventCard } from "../components/PremiumEventCard";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL: string | null;
  location: GeoLocation;
  locationSettings?: LocationSettings;
  createdAt: Date;
  lastLogin: Date;
  avatars?: string[];
  emailVerified: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  location: {
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  rating: number;
  image: string;
  cuisine?: string[];
  priceLevel?: number;
  address?: string;
  photos?: string[];
  openNow?: boolean;
  timeSlots?: Array<{
    startTime: string;
    endTime: string;
    label: string;
  }>;
  phoneNumber?: string;

  averageRating?: number | string | null;
}
 
interface DashboardEvent extends AppEvent {
  imageUrl: string;
  category: string;
  organizer?: string;
}

interface FavoriteItem {
  id: string;
  name: string;
  image: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  type: "restaurant" | "event";
  rating?: number;
  cuisine?: string[];
  priceLevel?: number;
  openNow?: boolean;
  date?: string;
  time?: string;
  price?: number;
  category?: string;
  description?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type?: string;
}

interface AvatarOption {
  id: string;
  src: string;
  alt: string;
}

const defaultLocation: GeoLocation = {
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
};

const getAvatarUrl = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
};

const getPersonalizationScore = (restaurant: Restaurant, preferences: any) => {
  let score = 0;
  if (preferences.favoriteCuisines && restaurant.cuisine) {
    restaurant.cuisine.forEach(c => {
      if (preferences.favoriteCuisines.includes(c)) score += 10;
    });
  }
  if (preferences.pricePreference === restaurant.priceLevel) score += 5;
  return score;
};

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString();
};

import { Translation, Language, translations } from "../utils/translations";

type Section =
  | "home"
  | "bookings"
  | "restaurants"
  | "events"
  | "favorites"
  | "messages"
  | "settings"
  | "achievements"
  | "ar-menu"
  | "reviews"
  | "pre-orders"
  | "waitlist";
type Translations = Record<Language, Translation>;

// Available Indian languages
const availableLanguages: { code: Language; name: string }[] = [
  { code: "english", name: "English" },
  { code: "telugu", name: "Telugu" },
  { code: "hindi", name: "Hindi" },
  { code: "tamil", name: "Tamil" },
  { code: "malayalam", name: "Malayalam" },
  { code: "kannada", name: "Kannada" },
];

// Use the imported Event type directly
export default function DashboardPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<Section>("home");
  const { language, setLanguage, t } = useLanguage();
  
  // Create a translations object that always reflects the current state of t
  const tProps = new Proxy({} as any, {
    get: (_, prop: string) => t(prop as any)
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    [],
  );
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<DashboardEvent[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] =
    useState<boolean>(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  const { isEnabled, shouldShow, flags } = useFeatureFlags();

  // Add listener for system theme changes when in 'system' mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const isDark = mediaQuery.matches;
        setIsDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('dineInGoDarkMode', isDark.toString());
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Track active section changes
  useEffect(() => {
    trackEvent('view_section', { section: activeSection });
  }, [activeSection]);

  // Sync userData to localStorage whenever it changes to ensure consistency
  useEffect(() => {
    if (userData && userData.uid) {
      const storedUser = localStorage.getItem('userData');
      const parsedStored = storedUser ? JSON.parse(storedUser) : {};

      // Update local storage while preserving role to prevent routing loops
      localStorage.setItem('userData', JSON.stringify({
        ...userData,
        role: parsedStored.role || 'user' // Default to 'user' if not present
      }));
    }
  }, [userData]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Defined early to avoid scope issues
  const forceInitialsAvatar = async () => {
    if (!userData || !userData.displayName) return;
    try {
      const avatarUrl = getAvatarUrl(userData.displayName);
      setUserData({ ...userData, photoURL: avatarUrl });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: avatarUrl });
        await auth.currentUser.getIdToken(true);
      }
      await userAPI.updateUser(userData.uid, { photoURL: avatarUrl });
      toast.success("Generated avatar based on your name");
    } catch (error) {
      console.error("Error setting avatar:", error);
    }
  };

  async function fetchBookingsFromAPI() {
    if (!auth.currentUser) {
      setBookings([]);
      return;
    }
    try {
      setIsLoading(true);
      const fetchedBookings = await bookingsApi.getAll();
      const bookingsArray = Array.isArray(fetchedBookings) ? fetchedBookings : [];
      const transformedBookings = bookingsArray.map((booking: any) => ({
        ...booking,
        id: booking._id || booking.id,
        date: booking.date || booking.bookingDate,
        time: booking.time || booking.bookingTime,
        guests: booking.guests || booking.partySize || 2,
        status: booking.status || "pending",
        restaurantName: booking.restaurantName || booking.businessName || booking.venueName,
        eventName: booking.eventName,
        type: booking.type || (booking.eventName ? "event" : "restaurant"),
      }));
      setBookings(transformedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }
  const [isDetectingLocation, setIsDetectingLocation] =
    useState<boolean>(false);
  const [filteredCities, setFilteredCities] = useState(indianCities);
  const [homeSection, setHomeSection] = useState<"restaurants" | "events">(
    "restaurants",
  );
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>("");
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [arMenuItems, setArMenuItems] = useState<any[]>([]);
  const [isArMenuItemsLoading, setIsArMenuItemsLoading] = useState(false);
  const [userMood, setUserMood] = useState<
    | "Chill"
    | "Social"
    | "Hustle"
    | "Happy"
    | "Romantic"
    | "Adventurous"
    | "Hungry"
  >("Social");

  const {
    unreadCount,
    markAllAsRead,
    notifications: notificationContextNotifications,
    markAsRead: markSingleAsRead,
    isRead,
  } = useNotifications();

  const navigate = useNavigate();
  const location = useLocation();

  const avatarOptions: AvatarOption[] = [
    ...(userData?.displayName
      ? [{ id: "initials", src: "initials", alt: "Initials Avatar" }]
      : []),
    // Only show avatars that exist in userData.avatars array (uploaded avatars)
    ...(userData?.avatars || []).map((avatarUrl: string, idx: number) => ({
      id: `uploaded-${idx + 1}`,
      src: avatarUrl,
      alt: `Avatar ${idx + 1}`,
    })),
  ];



  // Reference to the fetchBookingsFromAPI function defined below

  // Add this validation function before the handleAvatarSelect function
  const isValidImageUrl = (url: string | null): boolean => {
    if (!url) return false;

    // Check if URL has a valid image extension
    const validExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".bmp",
    ];
    const lowerUrl = url.toLowerCase();

    // Handle Firebase Storage URLs which may not have extensions
    if (lowerUrl.includes("firebasestorage.googleapis.com")) {
      return true;
    }

    // Check for valid extensions
    return validExtensions.some((ext) => lowerUrl.endsWith(ext));
  };

  // Update the useEffect for initial data loading to validate image URLs
  useEffect(() => {
    const loadUserWithValidation = async () => {
      try {
        setIsLoading(true);

        // Fetch user preferences
        if (auth.currentUser) {
          try {
            const prefs = await userPreferenceApi.get(auth.currentUser.uid);
            if (prefs && prefs.data) {
              setUserPreferences(prefs.data);
            }
          } catch (prefError) {
            // Error fetching user preferences suppressed
          }
        }

        // Fetch restaurants from both APIs

        try {
          const timestamp = Date.now(); // Cache busting
          const apiUrl = API_CONFIG.BASE_URL;


          const [restaurantsResponse, businessesResponse] = await Promise.all([
            fetch(`${apiUrl}/api/v1/restaurants?_t=${timestamp}`).catch(
              (err) => {

                return null;
              },
            ),
            fetch(
              `${apiUrl}/api/v1/business?type=restaurant&_t=${timestamp}`,
            ).catch((err) => {

              return null;
            }),
          ]);

          let allRestaurants: Restaurant[] = []; // Start with empty array

          // Add new businesses (restaurants) FIRST to prioritize them

          if (businessesResponse && businessesResponse.ok) {
            const businessData = await businessesResponse.json();

            const businessRestaurants = (businessData.data || []).map(
              (b: any) => ({
                ...b,
                thumbnail: normalizeImageUrl(b.thumbnail),
                id: b.id || b._id, // Ensure id is set
              }),
            );
            allRestaurants = [...businessRestaurants];
          } else {
            // Business API response was not OK
          }


          // Add legacy restaurants if API is available

          if (restaurantsResponse && restaurantsResponse.ok) {
            const resData = await restaurantsResponse.json();
            const apiRestaurants = (resData.data || []).map((r: any) => ({
              ...r,
              image: normalizeImageUrl(r.image || r.thumbnail),
              id: r._id || r.id, // Ensure id is set
            }));
            allRestaurants = [...allRestaurants, ...apiRestaurants];

          }

          // Add mock data LAST as fallback/examples
          allRestaurants = [...allRestaurants, ...mockRestaurants];

          // Sort restaurants based on preferences if available
          if (userPreferences) {
            allRestaurants.sort((a, b) => {
              const scoreA = getPersonalizationScore(a, userPreferences);
              const scoreB = getPersonalizationScore(b, userPreferences);
              return scoreB - scoreA;
            });
          }

          setRestaurants(allRestaurants);
        } catch (error) {
          setRestaurants(mockRestaurants);
        }

        // Fetch events from both APIs (legacy events + new businesses)
        try {
          // Fetch events from unified endpoint (includes both Event collection and Business collection)
          const eventsResponse = await fetch(
            `${API_CONFIG.BASE_URL}/api/v1/events`,
          ).catch(() => null);

          let allEvents: DashboardEvent[] = [];

          if (eventsResponse && eventsResponse.ok) {
            const data = await eventsResponse.json();
            const apiEvents = (data.data || data).map((event: any) => ({
              id: event._id,
              title: event.title,
              description: event.description,
              date:
                event.startDate && event.endDate
                  ? (() => {
                    const start = new Date(event.startDate);
                    const end = new Date(event.endDate);
                    const isSameDay =
                      start.toDateString() === end.toDateString();
                    if (isSameDay) {
                      return start.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    } else {
                      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
                    }
                  })()
                  : new Date(event.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
              time: event.time,
              location: event.location,
              imageUrl: normalizeImageUrl(event.image || event.imageUrl),
              price: event.price,
              category: event.category,
              organizer: event.organizer,
              capacity: event.capacity,
              registeredCount: event.registeredCount || 0,
            }));
            allEvents = apiEvents;
          }

          setEvents(allEvents);

        } catch (error) {
          setEvents([]);
        }

        // Check if the user's photoURL is valid
        if (
          userData &&
          userData.photoURL &&
          !isValidImageUrl(userData.photoURL)
        ) {

          // Force initials avatar if image URL doesn't seem valid
          await forceInitialsAvatar();
        }

        // Fetch bookings if user is authenticated
        if (auth.currentUser) {
          await fetchBookingsFromAPI();
        } else {
          setBookings([]);
        }
      } catch (error) {
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadUserWithValidation();
  }, []);

  // Fetch real-time ratings for business restaurants (ObjectIDs only)
  useEffect(() => {
    const fetchRealRatings = async () => {
      if (restaurants.length === 0) return;

      // Business IDs are typically 24-char ObjectIDs
      const businessRestaurants = restaurants.filter(
        (r) => r.id && r.id.length >= 24,
      );
      if (businessRestaurants.length === 0) return;

      try {
        // Use statically imported businessApi


        const ratingPromises = businessRestaurants.map(async (restaurant) => {
          try {
            const stats = await businessApi.getRatingStats(restaurant.id);
            return {
              id: restaurant.id,
              averageRating: stats.averageRating,
            };
          } catch (err) {
            return { id: restaurant.id, averageRating: null };
          }
        });

        const results = await Promise.all(ratingPromises);

        setRestaurants((prev) =>
          prev.map((r) => {
            const match = results.find((res) => res.id === r.id);
            if (
              match &&
              match.averageRating !== undefined &&
              match.averageRating !== null
            ) {
              return { ...r, averageRating: match.averageRating };
            }
            return r;
          }),
        );
      } catch (err) {
        // Failed to fetch real-time ratings suppressed
      }
    };

    fetchRealRatings();
  }, [restaurants.length > 0]);

  // Force reload bookings from API when bookings section is opened
  useEffect(() => {
    if (activeSection === "bookings" && auth.currentUser) {

      fetchBookingsFromAPI();
    }
  }, [activeSection]);


  // Effect to load user data and monitor auth state
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await userAPI.fetchUserData(user.uid);
          if (profile) {
            const avatarUrl = profile.currentAvatar || profile.photoURL || profile.avatarUrl;
            const fullAvatarUrl = API_CONFIG.getAssetUrl(avatarUrl);

            setUserData({
              uid: user.uid,
              email: user.email || profile.email || "",
              displayName: profile.displayName || user.displayName || "",
              name: profile.name || profile.fullName || user.displayName || "",
              photoURL: fullAvatarUrl,
              emailVerified: user.emailVerified,
              avatars: (profile.avatars || []).map((url: string) => API_CONFIG.getAssetUrl(url)).filter(Boolean),
              location: profile.locationSettings?.city ? {
                city: profile.locationSettings.city,
                state: profile.locationSettings.state || "",
                country: profile.locationSettings.country || "India",
              } : defaultLocation,
              lastLogin: new Date(),
              createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
            });

            if (profile.language && ["english", "hindi", "tamil", "kannada", "telugu", "malayalam"].includes(profile.language)) {
              setLanguage(profile.language as Language);
            }
          } else {
            const newUserData: UserData = {
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || user.email?.split("@")[0] || "",
              name: user.displayName || user.email?.split("@")[0] || "",
              photoURL: user.photoURL || null,
              emailVerified: user.emailVerified,
              location: defaultLocation,
              lastLogin: new Date(),
              createdAt: new Date(),
            };
            await userAPI.createUser(newUserData);
            setUserData(newUserData);
          }
        } catch (error) {
          console.error("Dashboard auth listener error:", error);
          setUserData({
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            name: user.displayName || "",
            photoURL: user.photoURL || null,
            emailVerified: user.emailVerified,
            location: defaultLocation,
            lastLogin: new Date(),
            createdAt: new Date(),
          });
        } finally {
          setAuthLoading(false);
        }
      } else {
        setAuthLoading(false);
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Real-time profile updates via Socket.IO
  useEffect(() => {
    if (!userData?.uid) return;

    // Connect to Socket.IO only once
    const socket = socketService.connect();

    // Handler for profile updates
    const handleProfileUpdate = (data: any) => {
      if (data.uid === userData.uid) {

        const profile = data.profile;

        // Update local state with the latest profile data
        setUserData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            displayName: profile.displayName || prev.displayName,
            name: profile.fullName || profile.name || prev.name,
            photoURL:
              profile.currentAvatar || profile.avatarUrl || profile.photoURL,
            avatars: profile.avatars || prev.avatars,
          };
        });

        toast.info("Profile updated!", { autoClose: 2000 });
      }
    };

    socket?.on("profile_updated", handleProfileUpdate);

    return () => {
      // Only remove the listener, don't disconnect (other components might be using it)
      socket?.off("profile_updated", handleProfileUpdate);
    };
  }, [userData?.uid]);

  // Auto-detect location on load if not already set in persistent profile
  useEffect(() => {
    const autoDetect = async () => {
      if (!userData?.uid || isLoading) return;

      // Check if the user has already set a location in their persistent MongoDB profile
      const hasSetLocationInProfile = userData?.locationSettings?.city &&
        userData.locationSettings.city.trim() !== "";

      const isCurrentlyOnDefault = userData?.location?.city === defaultLocation.city;

      // Only auto-detect if they haven't saved a location yet AND they are currently seeing the default Mumbai
      if (!hasSetLocationInProfile && isCurrentlyOnDefault) {
        // Use sessionStorage to ensure we only try once per browser session if they decline/ignore
        const hasPrompted = sessionStorage.getItem("dineInGoAutoLocationPrompted");

        if (!hasPrompted) {
          sessionStorage.setItem("dineInGoAutoLocationPrompted", "true");
          // Brief delay to let the dashboard render completely
          setTimeout(() => {
            detectLocation();
          }, 1500);
        }
      }
    };

    autoDetect();
  }, [userData?.uid, isLoading, userData?.locationSettings?.city]);

  // Language is now loaded from MongoDB profile (see auth useEffect above)
  // No need for localStorage anymore

  // Fetch favorites from backend when userData, restaurants, or events change
  useEffect(() => {
    const fetchFavorites = async () => {
      if (userData?.uid) {
        try {
          const favs = await favoritesApi.get(userData.uid);
          const newFavorites: FavoriteItem[] = [];
          if (favs.restaurantIds) {
            favs.restaurantIds.forEach((rid: string) => {
              const rest = restaurants.find((r) => r.id === rid);
              if (rest) {
                newFavorites.push({
                  id: rest.id,
                  name: rest.name,
                  image: rest.image,
                  location: rest.location,
                  type: "restaurant",
                  rating: rest.rating,
                  cuisine: rest.cuisine,
                  priceLevel: rest.priceLevel,
                  openNow: rest.openNow,
                });
              }
            });
          }
          if (favs.eventIds) {
            favs.eventIds.forEach((eid: string) => {
              const ev = events.find((e) => e.id === eid);
              if (ev) {
                newFavorites.push({
                  id: ev.id,
                  name: ev.title,
                  image: ev.imageUrl,
                  location: ev.location as any,
                  type: "event",
                  date: ev.date,
                  time: ev.time,
                  price: ev.price,
                  category: ev.category,
                  description: ev.description,
                });
              }
            });
          }
          setFavorites(newFavorites);
        } catch (err) {
          // Failed to fetch favorites suppressed
        }
      }
    };
    fetchFavorites();
  }, [userData, restaurants, events]);

  const fetchUserReviews = async () => {
    if (!userData?.uid) return;
    setIsReviewsLoading(true);
    try {
      // Use statically imported businessApi

      const reviews = await businessApi.getUserReviews(userData.uid);
      setUserReviews(reviews);
    } catch (err) {
      toast.error("Failed to load your reviews");
    } finally {
      setIsReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "reviews" && userData?.uid) {
      fetchUserReviews();
    }
  }, [activeSection, userData?.uid]);

  const handleUpdateReview = async (reviewId: string) => {
    if (editRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!editComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      // Use statically imported businessApi

      await businessApi.updateReview(reviewId, {
        rating: editRating,
        comment: editComment.trim(),
      });
      toast.success("Review updated successfully");
      setEditingReviewId(null);
      fetchUserReviews();
    } catch (err) {
      toast.error("Failed to update review");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      // Use statically imported businessApi

      await businessApi.deleteReview(reviewId);
      toast.success("Review deleted successfully");
      fetchUserReviews();
    } catch (err) {
      toast.error("Failed to delete review");
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    let resolvedDarkMode: boolean;
    if (newTheme === 'system') {
      resolvedDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      resolvedDarkMode = newTheme === 'dark';
    }

    setIsDarkMode(resolvedDarkMode);
    document.documentElement.setAttribute('data-theme', resolvedDarkMode ? 'dark' : 'light');
    localStorage.setItem('dineInGoDarkMode', resolvedDarkMode.toString());
  };

  const toggleDarkMode = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    handleThemeChange(newTheme);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigation = (section: Section): void => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  const toggleFavorite = async (item: Restaurant | DashboardEvent) => {
    if (!userData?.uid) {
      toast.error(t('pleaseLogin').replace('{action}', 'add favorites'));
      return;
    }

    const itemName = "name" in item ? item.name : "";
    const isCurrentlyFavorite = favorites.some((fav) => fav.id === item.id);

    try {
      if ("rating" in item) {
        // Restaurant
        if (
          favorites.some(
            (fav) => fav.id === item.id && fav.type === "restaurant",
          )
        ) {
          await favoritesApi.removeRestaurant(userData.uid, item.id);
          toast.success(t('removedFromFavorites').replace('{name}', itemName));
        } else {
          await favoritesApi.addRestaurant(userData.uid, item.id);
          toast.success(t('addedToFavorites').replace('{name}', itemName));
        }
      } else {
        // Event
        if (
          favorites.some((fav) => fav.id === item.id && fav.type === "event")
        ) {
          await favoritesApi.removeEvent(userData.uid, item.id);
          toast.success(t('removedFromFavorites').replace('{name}', itemName));
        } else {
          await favoritesApi.addEvent(userData.uid, item.id);
          toast.success(t('addedToFavorites').replace('{name}', itemName));
        }
      }
      // Always re-fetch from backend after any change
      const favs = await favoritesApi.get(userData.uid);
      const newFavorites: FavoriteItem[] = [];
      if (favs.restaurantIds) {
        favs.restaurantIds.forEach((rid: string) => {
          const rest = restaurants.find((r) => r.id === rid);
          if (rest) {
            newFavorites.push({
              id: rest.id,
              name: rest.name,
              image: rest.image,
              location: rest.location,
              type: "restaurant",
              rating: rest.rating,
              cuisine: rest.cuisine,
              priceLevel: rest.priceLevel,
              openNow: rest.openNow,
            });
          }
        });
      }
      if (favs.eventIds) {
        favs.eventIds.forEach((eid: string) => {
          const ev = events.find((e) => e.id === eid);
          if (ev) {
            newFavorites.push({
              id: ev.id,
              name: ev.title,
              image: ev.imageUrl,
              location: ev.location as any,
              type: "event",
              date: ev.date,
              time: ev.time,
              price: ev.price,
              category: ev.category,
              description: ev.description,
            });
          }
        });
      }
      setFavorites(newFavorites);
    } catch (err) {
      console.error("Failed to update favorite:", err);
      toast.error(
        `Failed to ${isCurrentlyFavorite ? "remove" : "add"} favorite. Please try again.`,
      );
    }
  };

  const isItemFavorite = (itemId: string, type: "restaurant" | "event") => {
    return favorites.some((fav) => fav.id === itemId && fav.type === type);
  };

  const handleLanguageChange = async (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('dineInGoLanguage', newLanguage);

    // Save language preference to MongoDB
    if (userData?.uid) {
      try {
        await userAPI.updateUser(userData.uid, {
          // @ts-ignore - language is supported in backend
          language: newLanguage,
        } as any);

        toast.success(
          `Language changed to ${newLanguage.charAt(0).toUpperCase() + newLanguage.slice(1)}`,
          {
            autoClose: 2000,
          },
        );
      } catch (error) {
        console.error("Error saving language preference:", error);
      }
    }
  };

  const handleLogout = async () => {
    trackEvent('logout');
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Track logout activity in our backend
        try {
          // Use statically imported userAPI

          await userAPI.logoutUser(currentUser.uid, "ui_button");
        } catch (error) {
          console.error("Error tracking logout:", error);
          // Continue with logout even if tracking fails
        }
      }

      await signOut(auth);
      localStorage.removeItem("dineInGoFavorites");
      localStorage.removeItem("dineInGoLanguage");
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      alert("Failed to log out. Please try again.");
    }
  };


  // Restored: Handle booking actions (confirm, cancel, delete)
  async function handleBookingAction(
    bookingId: string,
    action: "confirm" | "cancel" | "delete",
  ) {
    try {
      if (!bookingId) {
        toast.error(t('invalidBookingId'));
        return;
      }


      if (action === "confirm") {
        await bookingsApi.confirm(bookingId);
      } else if (action === "cancel") {
        await bookingsApi.cancel(bookingId);
      } else if (action === "delete") {
        if (
          !window.confirm(
            "Are you sure you want to delete this booking history?",
          )
        )
          return;
        await bookingsApi.delete(bookingId);
      }

      const successMessage = action === 'confirm' ? t('bookingConfirmedSuccess') :
        action === 'cancel' ? t('bookingCancelledSuccess') :
          t('bookingDeletedSuccess');

      toast.success(successMessage);
      fetchBookingsFromAPI();
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      toast.error(t('failedToAction').replace('{action}', action));
    }
  }

  // Update the handleAvatarSelect function to handle null values
  const handleAvatarSelect = async (src: string | null): Promise<void> => {
    try {


      // Prepare updated user data
      const updatedUserData: UserData = {
        ...userData!,
        photoURL: src,
        uid: userData?.uid || "",
        createdAt: userData?.createdAt || new Date(),
        lastLogin: new Date(),
        emailVerified: userData?.emailVerified || false,
      };

      // Update in MongoDB profile
      await userAPI.updateUser(userData?.uid || "", {
        photoURL: src,
      });


      // Update Firebase auth profile
      if (auth.currentUser) {
        // Force a direct update to auth.currentUser
        await updateProfile(auth.currentUser, {
          photoURL: src,
        });


        // For null (initials) avatar, we need to reassert this value
        if (src === null) {
          // Forces a refresh of the Firebase auth token
          await auth.currentUser.getIdToken(true);

        }
      }

      // Update local state immediately
      setUserData(updatedUserData);

      // Close the avatar modal
      setIsAvatarModalOpen(false);

      // Add visual feedback
      toast.success(
        src === null
          ? "Using initials for profile picture"
          : "Profile picture updated successfully!",
      );

      // Force UI refresh
      setTimeout(() => {
        setUserData({ ...updatedUserData });
      }, 100);
    } catch (error) {
      setError("Failed to update avatar. Please try again.");
      toast.error("Failed to update profile picture.");
    }
  };

  const handleLocationSelect = async (newLocation: GeoLocation) => {
    try {
      // Forward geocode the location to get coordinates
      const coordinates = await GeocodingService.forwardGeocode(
        `${newLocation.city}, ${newLocation.state}, ${newLocation.country}`,
      );

      if (coordinates) {
        // Update user data with new location
        setUserData((prev: UserData | null) =>
          prev
            ? {
              ...prev,
              location: newLocation,
              uid: prev.uid,
              createdAt: prev.createdAt,
              lastLogin: new Date(),
            }
            : null,
        );

        // Save location to localStorage
        localStorage.setItem("dineInGoLocation", JSON.stringify(newLocation));

        // Close the location modal
        setIsLocationModalOpen(false);
      } else {
        // Geocode failed suppressed
      }
    } catch (error) {
      console.error("Error updating location:", error);
    }
  };

  // Update the detectLocation function
  const detectLocation = async () => {
    try {
      setIsDetectingLocation(true);
      const currentLocation = await GeocodingService.getCurrentLocation();
      if (currentLocation) {
        const nearestCity = GeocodingService.findNearestCity(
          currentLocation.lat,
          currentLocation.lng,
        );

        const locationData = {
          city: nearestCity.city,
          state: nearestCity.state,
          country: nearestCity.country,
        };

        setUserData((prev) =>
          prev
            ? {
              ...prev,
              location: locationData,
              uid: prev.uid,
              createdAt: prev.createdAt,
              lastLogin: new Date(),
            }
            : null,
        );

        // Save to localStorage
        localStorage.setItem(
          "dineInGoLocation",
          JSON.stringify(locationData),
        );

        // Persist to backend if user is logged in
        if (userData?.uid) {
          try {
            await userAPI.updateUser(userData.uid, {
              locationSettings: {
                ...locationData,
                type: 'Point',
                coordinates: {
                  lat: currentLocation.lat,
                  lng: currentLocation.lng
                }
              }
            } as any);
          } catch (apiError) {
            console.error("Failed to update location in profile:", apiError);
          }
        }

        // Close the modal
        setIsLocationModalOpen(false);
        toast.success(`Location set to ${nearestCity.city}`);
      }
    } catch (error) {
      console.error("Error detecting location:", error);
      toast.error("Could not detect your location automatically.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Restored: Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark notifications as read");
    }
  };

  // Restored: Handle real-time booking updates
  useEffect(() => {
    const handleBookingUpdate = (data: any) => {

      fetchBookingsFromAPI();
    };

    socketService.on("bookingUpdate", handleBookingUpdate);
    return () => socketService.off("bookingUpdate", handleBookingUpdate);
  }, []);

  // Restored: Handle booking success on mount/location change
  useEffect(() => {
    const handleBookingSuccess = () => {
      if (location.state?.bookingSuccess) {
        // Show success toast
        if (location.state.newBooking) {
          const venueName =
            location.state.newBooking.restaurantName ||
            location.state.newBooking.eventName ||
            "the venue";
          toast.success(t('reservationConfirmed').replace('{venue}', venueName), {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }

        // Clear the state to prevent showing the toast again on refresh
        navigate(location.pathname, { replace: true, state: {} });

        // Fetch latest bookings
        fetchBookingsFromAPI();
      }
    };

    handleBookingSuccess();

    // Auto-refresh interval
    const intervalId = setInterval(() => {
      if (auth.currentUser && activeSection === "bookings") {
        fetchBookingsFromAPI();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [location, auth.currentUser, activeSection]);

  // Restored: Render My Reviews section
  const renderMyReviews = () => {
    return (
      <div
        className={`min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"} p-8`}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            {t('myReviews')}
          </h1>
        </div>

        {isReviewsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        ) : userReviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-emerald-500 opacity-20" />
            <p className="text-lg opacity-50">
              You haven't written any reviews yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {userReviews.map((review: any) => (
              <div
                key={review._id}
                className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border rounded-3xl p-6 shadow-sm`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">
                      {review.businessId?.name?.charAt(0) || "R"}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl">
                        {review.businessId?.name || "Restaurant"}
                      </h3>
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} size={14} />
                        <span className="text-xs opacity-50">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingReviewId === review._id ? (
                      <>
                        <button
                          onClick={() => handleUpdateReview(review._id)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          onClick={() => setEditingReviewId(null)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingReviewId(review._id);
                            setEditRating(review.rating);
                            setEditComment(review.comment);
                          }}
                          className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors"
                        >
                          <Pencil size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingReviewId === review._id ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setEditRating(star)}
                          className={`text-2xl ${star <= editRating ? "text-yellow-400" : "text-gray-300"}`}
                        >
                          â˜…
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className={`w-full p-4 pr-12 rounded-2xl border ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} focus:ring-2 focus:ring-emerald-500 outline-none resize-none`}
                        rows={3}
                      />
                      <div className="absolute bottom-2 right-2">
                        <EmojiPicker
                          onEmojiSelect={(emoji) =>
                            setEditComment((prev) => prev + emoji)
                          }
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-lg mb-4">{review.comment}</p>
                    {review.reply && (
                      <div
                        className={`${isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50"} rounded-2xl p-4 border-l-4 border-emerald-500`}
                      >
                        <p className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">
                          Owner Response
                        </p>
                        <p className="text-sm opacity-80">
                          {review.reply.text}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Restored: Render Location Update Modal
  const renderLocationModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1001] p-4">
      <div
        className={`${isDarkMode ? "bg-gray-800" : "bg-white"} p-5 sm:p-8 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl scale-in-center`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3
            className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            Update Location
          </h3>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className={`p-2 ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} rounded-full transition-colors`}
          >
            <X
              className={`w-5 h-5 ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
            />
          </button>
        </div>

        <button
          onClick={detectLocation}
          disabled={isDetectingLocation}
          className={`w-full mb-6 px-4 py-3 rounded-xl text-white transition-colors flex items-center justify-center gap-2 ${isDetectingLocation ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-500 hover:bg-emerald-600"}`}
        >
          {isDetectingLocation ? "Detecting..." : "Use Current Location"}
        </button>

        <div className="relative mb-6">
          <input
            type="text"
            value={searchTerm}
            placeholder={t('searchCities')}
            className={`w-full ${isDarkMode ? "bg-gray-700 text-white placeholder-gray-400" : "bg-gray-100 text-gray-900 placeholder-gray-500"} rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            size={18}
          />
        </div>

        <div className="space-y-2">
          {indianCities
            .filter((c) =>
              c.city.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .slice(0, 5)
            .map((city) => (
              <button
                key={`${city.city}-${city.state}`}
                onClick={() => {
                  setUserData((prev) =>
                    prev
                      ? {
                        ...prev,
                        location: {
                          city: city.city,
                          state: city.state,
                          country: city.country,
                        },
                        uid: prev.uid,
                        createdAt: prev.createdAt,
                        lastLogin: new Date(),
                        emailVerified: prev.emailVerified,
                      }
                      : null,
                  );
                  setIsLocationModalOpen(false);
                }}
                className={`w-full text-left px-4 py-3 ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"} rounded-xl transition-colors`}
              >
                {city.city}, {city.state}
              </button>
            ))}
        </div>
      </div>
    </div>
  );

  // Restored: Render Avatar Selection Modal
  const renderAvatarModal = () => {
    if (!isAvatarModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 sm:p-6">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsAvatarModalOpen(false)}
        />
        <div
          className={`relative ${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]`}
        >
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2
              className={`text-2xl sm:text-3xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              {t('chooseIdentity')}
            </h2>
            <button onClick={() => setIsAvatarModalOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() =>
                  handleAvatarSelect(
                    avatar.src === "initials" ? null : avatar.src,
                  )
                }
                className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all"
              >
                {avatar.src === "initials" ? (
                  <InitialsAvatar
                    name={userData?.displayName || ""}
                    className="w-full h-full"
                  />
                ) : (
                  <img
                    src={avatar.src}
                    alt={avatar.alt}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Add search handler function
  const handleSearch = (term: string) => {
    if (term.trim()) {
      trackEvent('search', { term: term.trim() });

      // Mixpanel Tracking
      mixpanel.track('Search', {
        'search_query': term.trim(),
        'results_count': (filteredRestaurants.length + filteredEvents.length)
      });
    }
    setSearchTerm(term);
    if (term.trim() === "") {
      setFilteredRestaurants([]);
      setFilteredEvents([]);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const filteredRests = restaurants.filter(
      (restaurant) =>
        restaurant.name.toLowerCase().includes(lowerTerm) ||
        restaurant.cuisine?.some((c) => c.toLowerCase().includes(lowerTerm)) ||
        restaurant.location.city.toLowerCase().includes(lowerTerm) ||
        restaurant.location.state.toLowerCase().includes(lowerTerm),
    );

    // Add a type guard for event.location to fix the type error
    const filteredEvs = events.filter((event) => {
      const locationMatches =
        typeof event.location === "string"
          ? event.location.toLowerCase().includes(lowerTerm)
          : (event.location as GeoLocation).city
            .toLowerCase()
            .includes(lowerTerm) ||
          (event.location as GeoLocation).state
            .toLowerCase()
            .includes(lowerTerm);

      return (
        event.title.toLowerCase().includes(lowerTerm) ||
        event.category.toLowerCase().includes(lowerTerm) ||
        event.description.toLowerCase().includes(lowerTerm) ||
        locationMatches
      );
    });

    setFilteredRestaurants(filteredRests);
    setFilteredEvents(filteredEvs);
  };
  const getAIInsights = (userBookings: Booking[]) => {
    if (!userBookings || userBookings.length === 0) {
      return [
        {
          id: "initial-scout",
          title: "Initial Territory Scout",
          description:
            "No expeditions detected yet. Launch your first excavation to begin gathering prehistoric data!",
          icon: <Compass className="text-emerald-500" />,
          color: "from-emerald-500/20 to-teal-600/20",
        },
      ];
    }

    const insights = [];

    // Prediction 1: Future Era
    insights.push({
      id: "future-era",
      title: "Era Prediction: Fusion Age",
      description:
        'Historical data suggests your next 3 moon-cycles will favor "Gourmet Fossil" discoveries. Scout for more Pan-Asian territories.',
      icon: <Sparkles className="text-purple-400" />,
      color: "from-purple-500/20 to-indigo-600/20",
    });

    // Prediction 2: Territory Expansion
    insights.push({
      id: "expansion",
      title: "Expansion Route: Coastal Digs",
      description:
        'Mastery of inland valleys complete. Predictive sensors indicate your next expedition should target high-yield "Seafood" excavation sites.',
      icon: <Globe className="text-blue-500" />,
      color: "from-blue-500/20 to-cyan-600/20",
    });

    // Prediction 3: Stamina Forecast
    insights.push({
      id: "stamina",
      title: "Expedition Stamina: Peak",
      description:
        'Recent 7:00 PM energy spikes detected. Your future expeditions will be most successful during these prime prehistoric "Golden Hours".',
      icon: <Zap className="text-amber-500" />,
      color: "from-amber-500/20 to-orange-600/20",
    });

    return insights;
  };

  const renderSection = () => {
    const section = activeSection;

    // Show search results if there's a search term
    if (searchTerm.trim() !== "") {
      return (
        <div
          className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} p-4 sm:p-8`}
        >
          <h1
            className={`text-3xl sm:text-4xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"} mb-6 sm:mb-8`}
          >
            {t('searchResults')}
          </h1>

          {/* Territories (Restaurants) Results */}
          {filteredRestaurants.length > 0 && (
            <div className="mb-12">
              <h2
                className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"} mb-6 flex items-center gap-2`}
              >
                <Utensils size={24} className="text-emerald-500" />
                {t('territoriesFound')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRestaurants.map((restaurant, idx) => (
                  <PremiumRestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    isDarkMode={isDarkMode}
                    isFavorite={isItemFavorite(restaurant.id, "restaurant")}
                    isOpen={isRestaurantOpen(restaurant)}
                    onToggleFavorite={toggleFavorite}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Events Results */}
          {filteredEvents.length > 0 && (
            <div className="mb-12">
              <h2
                className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"} mb-6 flex items-center gap-2`}
              >
                <Calendar size={24} className="text-purple-500" />
                {t('liveHappenings')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event, idx) => (
                  <PremiumEventCard
                    key={event.id}
                    event={event}
                    isDarkMode={isDarkMode}
                    isFavorite={isItemFavorite(event.id, "event")}
                    onToggleFavorite={(e) => toggleFavorite(e as any)}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {filteredRestaurants.length === 0 && filteredEvents.length === 0 && (
            <div className="text-center py-20 bg-white/50 dark:bg-zinc-900/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-zinc-800">
              <div className="text-6xl mb-4">ðŸ”¦</div>
              <h3
                className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} mb-2`}
              >
                {t('noFossilsFound')}
              </h3>
              <p
                className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {t('noResultsDescription').replace('{searchTerm}', searchTerm)}
              </p>
            </div>
          )}
        </div>
      );
    }
    switch (section) {
      case "home": {
        return (
          <div className="space-y-12 pb-12">
            {/* Premium Header 2.0: Immersive Greeting */}
            <div className="relative mb-12 rounded-[3rem] overflow-hidden group shadow-2xl">
              <div
                className={`absolute inset-0 bg-gradient-to-br transition-all duration-700 ${isDarkMode
                    ? "from-emerald-950 via-zinc-900 to-black"
                    : "from-emerald-600 via-emerald-500 to-emerald-400"
                  }`}
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.3, 0.1],
                  }}
                  transition={{ duration: 10, repeat: Infinity }}
                  className="absolute -top-24 -left-24 w-96 h-96 bg-yellow-400/20 rounded-full blur-[100px]"
                />
              </div>

              <div className="relative z-10 p-5 sm:p-10 md:p-14 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-10">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="px-5 py-2 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden group/pill">
                      <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                      />
                      <span className="relative text-white text-[10px] font-black uppercase tracking-[0.25em]">
                        {new Date().getHours() < 12
                          ? t('morningGreeting')
                          : new Date().getHours() < 18
                            ? t('afternoonGreeting')
                            : t('eveningGreeting')}
                      </span>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-white/40 shadow-glow animate-pulse" />
                    <span className="text-white/70 text-sm font-black tracking-tight">
                      {new Date().toLocaleDateString(language === 'english' ? 'en-US' : language, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6 drop-shadow-2xl">
                    {t('helloGreeting')},{" "}<br className="md:hidden" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/60">
                      {userData?.displayName?.split(" ")[0] || t('explorer')}!
                    </span>
                  </h1>

                  <p className="text-white/80 text-xl font-medium max-w-xl leading-relaxed">
                    {t('heroQuestion')}{" "}
                    <span className="text-white font-black underline decoration-yellow-400/60 transition-colors hover:decoration-yellow-400">
                      {t('yourTerritory')}
                    </span>
                  </p>
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsLocationModalOpen(true)}
                  className="relative group/loc overflow-hidden bg-white/10 hover:bg-white/20 backdrop-blur-3xl border-2 border-white/20 transition-all duration-500 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 min-w-full sm:min-w-[280px] shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/loc:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] transform group-hover/loc:rotate-6 transition-transform">
                      <MapPin size={32} className="fill-emerald-500/20" />
                    </div>
                    <div className="text-left">
                      <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                        {t('assignedTerritory')}
                      </p>
                      <p className="text-white font-black text-3xl tracking-tight">
                        {typeof userData?.location === "object" &&
                          userData?.location &&
                          "city" in userData.location
                          ? userData.location.city
                          : t('global')}
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Enhanced Dino AI Feelings Recommendation System */}
            <div
              className={`relative mb-12 p-6 sm:p-8 md:p-10 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden border-2 transition-all duration-700 ${isDarkMode
                ? "bg-zinc-900/40 border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.05)]"
                : "bg-white/60 border-emerald-100 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl"
                }`}
            >
              {/* Animated Floating Background Elements */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 10, 0],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-10 right-10 text-emerald-500 pointer-events-none"
              >
                <Sparkles size={40} />
              </motion.div>
              <motion.div
                animate={{
                  y: [0, 15, 0],
                  x: [0, 10, 0],
                  opacity: [0.05, 0.1, 0.05],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute bottom-10 left-10 text-yellow-500 pointer-events-none"
              >
                <Zap size={30} />
              </motion.div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">
                        <Sparkles size={10} className="animate-pulse" />
                        {t('dinoAiPersonalization')}
                      </span>
                    </div>
                    <h2
                      className={`text-3xl md:text-4xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {t('howAreYouFeeling')}{" "}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                        {t('feeling')}
                      </span>{" "}
                      today?
                    </h2>
                    <p
                      className={`text-base font-medium mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {t('moodDescription')}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-2xl flex items-center gap-4 ${isDarkMode ? "bg-zinc-800/50" : "bg-emerald-50/50"} border ${isDarkMode ? "border-zinc-700" : "border-emerald-100/50"}`}
                  >
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border-2 ${isDarkMode ? "border-zinc-800" : "border-white"} bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] text-white font-bold`}
                        >
                          D{i}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-emerald-600"}`}
                      >
                        {t('algorithmStatus')}
                      </p>
                      <p
                        className={`text-xs font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {t('vibesAnalyzed')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2 scroll-smooth">
                  {[
                    {
                      id: "Social",
                      label: t('moodSocial'),
                      icon: <Users size={20} />,
                      color: "from-blue-500 to-indigo-600",
                    },
                    {
                      id: "Chill",
                      label: t('moodChill'),
                      icon: <Clock size={20} />,
                      color: "from-cyan-400 to-blue-500",
                    },
                    {
                      id: "Happy",
                      label: t('moodHappy'),
                      icon: <Smile size={20} />,
                      color: "from-yellow-400 to-orange-500",
                    },
                    {
                      id: "Romantic",
                      label: t('moodRomantic'),
                      icon: <Heart size={20} />,
                      color: "from-rose-400 to-pink-600",
                    },
                    {
                      id: "Adventurous",
                      label: t('moodAdventurous'),
                      icon: <Compass size={20} />,
                      color: "from-emerald-400 to-teal-600",
                    },
                    {
                      id: "Hungry",
                      label: t('moodHungry'),
                      icon: <Utensils size={20} />,
                      color: "from-orange-500 to-red-600",
                    },
                  ].map((mood) => (
                    <motion.button
                      key={mood.id}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setUserMood(mood.id as any)}
                      className={`group relative flex flex-col items-center gap-3 px-6 sm:px-8 py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-black transition-all duration-500 whitespace-nowrap border-2 ${userMood === mood.id
                        ? `bg-gradient-to-br ${mood.color} border-transparent text-white shadow-xl shadow-emerald-500/20`
                        : isDarkMode
                          ? "bg-zinc-800/80 border-zinc-700 text-gray-400 hover:border-emerald-500/30"
                          : "bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:shadow-lg"
                        }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${userMood === mood.id
                          ? "bg-white/20 scale-110 rotate-3"
                          : isDarkMode
                            ? "bg-zinc-700/50 group-hover:bg-emerald-500/10"
                            : "bg-gray-50 group-hover:bg-emerald-50"
                          }`}
                      >
                        <span
                          className={`${userMood === mood.id ? "text-white" : "text-emerald-500 group-hover:scale-110 transition-transform"}`}
                        >
                          {mood.icon}
                        </span>
                      </div>
                      <span className="text-sm tracking-tight">
                        {mood.label}
                      </span>

                      {userMood === mood.id && (
                        <motion.div
                          layoutId="mood-glow"
                          className="absolute inset-0 rounded-3xl bg-white/10 blur-xl -z-10"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Dino AI Recommendations Display with transition effects */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={userMood}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="mt-8"
                  >
                    <DinoDailyMorsels
                      userId={userData?.uid || ""}
                      isDarkMode={isDarkMode}
                      userMood={userMood as any}
                      language={language}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Bento Grid Section Nav */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2
                    className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t('expeditionHub')}
                  </h2>
                  <p
                    className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {t('expeditionHubDescription')}
                  </p>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-zinc-800 to-transparent mx-8 opacity-50" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setHomeSection("restaurants")}
                  className={`group relative overflow-hidden p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[3rem] transition-all duration-500 border-2 text-left ${homeSection === "restaurants"
                    ? "bg-emerald-500 border-emerald-400 shadow-[0_0_60px_-10px_rgba(16,185,129,0.2)]"
                    : isDarkMode
                      ? "bg-zinc-900/80 border-zinc-800 backdrop-blur-xl hover:bg-zinc-800/80"
                      : "bg-white border-emerald-50 shadow-2xl shadow-emerald-500/5"
                    }`}
                >
                  <div
                    className={`absolute top-0 right-0 p-8 transition-all duration-700 pointer-events-none ${homeSection === "restaurants" ? "opacity-30 scale-125" : "opacity-10 grayscale group-hover:grayscale-0"}`}
                  >
                    <Utensils
                      size={120}
                      strokeWidth={0.5}
                      className={
                        homeSection === "restaurants"
                          ? "text-white"
                          : "text-emerald-500"
                      }
                    />
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div
                      className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 transition-all duration-500 overflow-hidden ${homeSection === "restaurants"
                        ? "bg-white text-emerald-600 shadow-xl"
                        : isDarkMode
                          ? "bg-zinc-800 text-emerald-500 border border-zinc-700"
                          : "bg-emerald-50 text-emerald-600"
                        }`}
                    >
                      <motion.div
                        animate={
                          homeSection === "restaurants"
                            ? { rotate: [0, 15, -15, 0] }
                            : {}
                        }
                        transition={{ duration: 0.5 }}
                      >
                        <Utensils size={28} />
                      </motion.div>
                    </div>

                    <div className="mt-auto">
                      <h3
                        className={`text-3xl font-black mb-2 tracking-tight ${homeSection === "restaurants" ? "text-white" : isDarkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {t('restaurants')}
                      </h3>
                      <p
                        className={`text-base font-medium leading-relaxed max-w-[200px] ${homeSection === "restaurants" ? "text-emerald-50" : isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {t('restaurantsNavDescription')}
                      </p>
                    </div>
                  </div>

                  {homeSection === "restaurants" && (
                    <motion.div
                      layoutId="bento-active"
                      className="absolute inset-x-0 bottom-0 h-2 bg-white/40"
                    />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setHomeSection("events")}
                  className={`group relative overflow-hidden p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[3rem] transition-all duration-500 border-2 text-left ${homeSection === "events"
                    ? "bg-purple-600 border-purple-400 shadow-[0_0_60px_-10px_rgba(147,51,234,0.2)]"
                    : isDarkMode
                      ? "bg-zinc-900/80 border-zinc-800 backdrop-blur-xl hover:bg-zinc-800/80"
                      : "bg-white border-purple-50 shadow-2xl shadow-purple-500/5"
                    }`}
                >
                  <div
                    className={`absolute top-0 right-0 p-8 transition-all duration-700 pointer-events-none ${homeSection === "events" ? "opacity-30 scale-125" : "opacity-10 grayscale group-hover:grayscale-0"}`}
                  >
                    <Calendar
                      size={120}
                      strokeWidth={0.5}
                      className={
                        homeSection === "events"
                          ? "text-white"
                          : "text-purple-500"
                      }
                    />
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div
                      className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 transition-all duration-500 overflow-hidden ${homeSection === "events"
                        ? "bg-white text-purple-600 shadow-xl"
                        : isDarkMode
                          ? "bg-zinc-800 text-purple-400 border border-zinc-700"
                          : "bg-purple-50 text-purple-600"
                        }`}
                    >
                      <motion.div
                        animate={
                          homeSection === "events"
                            ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }
                            : {}
                        }
                        transition={{ duration: 0.5 }}
                      >
                        <Calendar size={28} />
                      </motion.div>
                    </div>

                    <div className="mt-auto">
                      <h3
                        className={`text-3xl font-black mb-2 tracking-tight ${homeSection === "events" ? "text-white" : isDarkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {t('events')}
                      </h3>
                      <p
                        className={`text-base font-medium leading-relaxed max-w-[200px] ${homeSection === "events" ? "text-purple-50" : isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {t('eventsNavDescription')}
                      </p>
                    </div>
                  </div>

                  {homeSection === "events" && (
                    <motion.div
                      layoutId="bento-active"
                      className="absolute inset-x-0 bottom-0 h-2 bg-white/40"
                    />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Content based on selection */}
            {homeSection === "restaurants" ? (
              <div className="mb-12">
                <h2
                  className={`text-3xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"} mb-8 flex items-center gap-3`}
                >
                  <Utensils className="text-emerald-500" />
                  {t('featuredRestaurants')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {restaurants.length > 0 ? (
                    restaurants.map((restaurant, idx) => (
                      <PremiumRestaurantCard
                        key={restaurant.id}
                        restaurant={restaurant}
                        isDarkMode={isDarkMode}
                        isFavorite={isItemFavorite(restaurant.id, "restaurant")}
                        isOpen={isRestaurantOpen(restaurant)}
                        onToggleFavorite={toggleFavorite}
                        index={idx}
                        showDinoPick={
                          userPreferences &&
                          getPersonalizationScore(
                            restaurant,
                            userPreferences,
                          ) > 100
                        }
                      />
                    ))
                  ) : (
                    <motion.div
                      key="empty-restaurants"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`col-span-full text-center py-24 ${isDarkMode ? "bg-zinc-900/40" : "bg-white"} rounded-[3rem] border-2 border-dashed ${isDarkMode ? "border-zinc-800" : "border-gray-100"}`}
                    >
                      <div className="mx-auto w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 text-4xl animate-bounce">
                        ðŸ¦–
                      </div>
                      <h3
                        className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} mb-2 tracking-tight`}
                      >
                        Territory Empty
                      </h3>
                      <p
                        className={`text-base font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        No excavations match your filters.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-12">
                <h2
                  className={`text-3xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"} mb-8 flex items-center gap-3`}
                >
                  <Calendar className="text-purple-500" />
                  Featured Events
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {events.length > 0 ? (
                    events.map((event, idx) => (
                      <PremiumEventCard
                        key={event.id}
                        event={event}
                        isDarkMode={isDarkMode}
                        isFavorite={isItemFavorite(event.id, "event")}
                        onToggleFavorite={toggleFavorite}
                        index={idx}
                      />
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`col-span-full text-center py-24 ${isDarkMode ? "bg-zinc-900/40" : "bg-white"} rounded-[3rem] border-2 border-dashed ${isDarkMode ? "border-zinc-800" : "border-gray-100"}`}
                    >
                      <div className="mx-auto w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 text-4xl animate-bounce">
                        ðŸŽŸï¸
                      </div>
                      <h3
                        className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} mb-2 tracking-tight`}
                      >
                        No Events Scheduled
                      </h3>
                      <p
                        className={`text-base font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        Explore another territory or check back soon.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* DineInGo Platform Feedback & Survey Section */}
            <div
              className={`mt-12 mb-8 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden transition-all duration-500 border-2 ${isDarkMode
                ? "bg-zinc-900 border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
                : "bg-white border-emerald-100 shadow-xl shadow-emerald-500/10"
                }`}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-4">
                    <Star size={12} className="fill-emerald-500" />
                    Shape The Future
                  </div>
                  <h2
                    className={`text-3xl md:text-4xl font-black tracking-tight mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    DineInGo Platform Feedback &{" "}
                    <span className="text-emerald-500">Feature Evaluation</span>{" "}
                    Survey
                  </h2>
                  <p
                    className={`text-lg font-medium leading-relaxed max-w-2xl ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {t('surveyDescription')}
                  </p>
                </div>

                <div className="flex-shrink-0 flex flex-col items-center gap-4">
                  <div className="relative group cursor-pointer">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <a
                      href="https://tally.so/r/9q12LK"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all transform hover:scale-[1.05] active:scale-95 shadow-xl shadow-emerald-500/25 flex items-center gap-3"
                    >
                      {t('takeTheSurvey')}
                      <ArrowRight size={20} strokeWidth={3} />
                    </a>
                  </div>
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${isDarkMode ? "text-emerald-400" : "text-black"}`}
                  >
                    {t('surveyEstimate')}
                  </p>
                </div>
              </div>

              {/* Dino Mascot Illustration */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 transform -rotate-12 pointer-events-none">
                <img
                  src="/images/Dino Icon.svg"
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        );
      }
      case "restaurants":
        return (
          <div
            className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} p-4 sm:p-8`}
          >
            <h1
              className={`text-4xl md:text-5xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} mb-10 tracking-tight`}
            >
              {t('allRestaurants')}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {restaurants.map((restaurant, idx) => (
                <PremiumRestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  isDarkMode={isDarkMode}
                  isFavorite={isItemFavorite(restaurant.id, "restaurant")}
                  isOpen={isRestaurantOpen(restaurant)}
                  onToggleFavorite={toggleFavorite}
                  index={idx}
                />
              ))}
            </div>
          </div>
        );
      case "events":
        if (!isEnabled('events')) {
          if (shouldShow('events')) {
            const config = flags.events;
            return <FeatureSticker stickerId={config.sticker} caption={config.caption} mode={config.mode} />;
          }
          setActiveSection('home');
          return null;
        }
        return (
          <div
            className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} p-4 sm:p-8`}
          >
            <h1
              className={`text-4xl md:text-5xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} mb-10 tracking-tight`}
            >
              {t('allEvents')}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event, idx) => (
                <PremiumEventCard
                  key={event.id}
                  event={event}
                  isDarkMode={isDarkMode}
                  isFavorite={isItemFavorite(event.id, "event")}
                  onToggleFavorite={toggleFavorite}
                  index={idx}
                />
              ))}
            </div>
          </div>
        );
      case "bookings":
        // Bookings section
        return (
          <div
            className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} p-4 sm:p-8`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h1
                  className={`text-4xl md:text-5xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} tracking-tight`}
                >
                  {t('culinary')}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                    {t('expeditions')}
                  </span>
                </h1>
                <p
                  className={`text-lg font-medium mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  {t('evolutionTracking').replace('{count}', bookings.length.toString())}
                </p>
              </div>

              <div
                className={`px-5 py-3 rounded-2xl flex items-center gap-3 ${isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white border-emerald-100 shadow-lg shadow-emerald-500/5"} border-2`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Trophy size={20} />
                </div>
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
                  >
                    {t('expeditionRank')}
                  </p>
                  <p
                    className={`text-sm font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t('leadPaleontologist')}
                  </p>
              </div>
            </div>

            {/* Premium AI Insights for Future Section */}
            {bookings.length > 0 && (
              <div
                className={`mb-12 p-8 md:p-10 rounded-[3rem] relative overflow-hidden transition-all duration-700 ${isDarkMode
                  ? "bg-zinc-900/40 border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.05)]"
                  : "bg-white/60 border-emerald-100 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl"
                  } border-2`}
              >
                {/* Decorative floating elements */}
                <motion.div
                  animate={{ y: [0, -15, 0], opacity: [0.1, 0.2, 0.1] }}
                  transition={{ duration: 6, repeat: Infinity }}
                  className="absolute top-6 right-6 text-emerald-500/20"
                >
                  <Sparkles size={40} />
                </motion.div>

                <div className="flex items-center gap-3 mb-10">
                  <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/20">
                    <Zap size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h2
                      className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} tracking-tight`}
                    >
                      {t('dinoIntelligenceReports')}
                    </h2>
                    <p
                      className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {t('analyzingPatterns')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {getAIInsights(bookings).map((insight, idx) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className={`group p-8 rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden ${isDarkMode
                        ? "bg-zinc-900/60 border-zinc-800"
                        : "bg-white border-gray-100 shadow-lg shadow-gray-200/50"
                        } hover:border-emerald-500/40`}
                    >
                      <div
                        className={`absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-500/40" : "text-emerald-600/20"
                          }`}
                      >
                        {t('fossilInsight')}
                      </div>

                      <div className="relative z-10">
                        <div
                          className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${insight.color} flex items-center justify-center mb-6 shadow-lg transform group-hover:rotate-6 transition-transform duration-500`}
                        >
                          <div className="text-white scale-125">
                            {insight.icon}
                          </div>
                        </div>
                        <h3
                          className={`text-xl font-black mb-3 tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
                        >
                          {insight.title}
                        </h3>
                        <p
                          className={`text-sm font-medium leading-relaxed ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}
                        >
                          {insight.description}
                        </p>
                      </div>

                      {/* Decorative background number */}
                      <div className="absolute -bottom-8 -right-4 text-9xl font-black opacity-[0.03] select-none pointer-events-none">
                        {idx + 1}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {!bookings || bookings.length === 0 ? (
              <div>
                <div
                  className={`mb-8 text-center py-12 ${isDarkMode ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600"} rounded-3xl shadow-md p-6`}
                >
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
                  <h3 className="text-xl font-medium mb-2">
                    {t('noBookings')}
                  </h3>
                  <p className="mb-6">
                    {t('bookingsMessage')}
                  </p>

                  {/* Section Selector Similar to Home - Explore options */}
                  <div className="flex gap-4 max-w-md mx-auto">
                    <button
                      onClick={() => {
                        navigate("/");
                        setActiveSection("restaurants");
                      }}
                      className="flex-1 px-6 py-3 rounded-xl text-lg font-semibold transition-colors bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      {t('exploreRestaurants')}
                    </button>
                    <button
                      onClick={() => {
                        navigate("/");
                        setHomeSection("events");
                        setActiveSection("home");
                      }}
                      className="flex-1 px-6 py-3 rounded-xl text-lg font-semibold transition-colors bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      {t('exploreEvents')}
                    </button>
                  </div>
                </div>

                {/* Additional featured restaurants section */}
                <div className="mb-8">
                  <h2
                    className={`text-2xl font-semibold mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t('featuredRestaurants')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restaurants.slice(0, 3).map((restaurant, idx) => (
                      <PremiumRestaurantCard
                        key={restaurant.id}
                        restaurant={restaurant}
                        isDarkMode={isDarkMode}
                        isFavorite={isItemFavorite(restaurant.id, "restaurant")}
                        isOpen={isRestaurantOpen(restaurant)}
                        onToggleFavorite={toggleFavorite}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookings.map((booking) => (
                  <BookingCard
                    key={booking._id || booking.id}
                    booking={booking}
                    onRefresh={() => fetchBookingsFromAPI()}
                    onConfirm={(id) =>
                      handleBookingAction(id as string, "confirm")
                    }
                    onReview={(b) => {
                      const businessId =
                        b.restaurantId?._id ||
                        b.restaurantId?.id ||
                        b.restaurantId ||
                        b.eventId?._id ||
                        b.eventId?.id ||
                        b.eventId;
                      const type =
                        b.restaurantId || b.restaurantName
                          ? "restaurant"
                          : "event";
                      navigate(`/${type}/${businessId}`);
                    }}
                    onGenerateInvoice={(b) => {
                      setSelectedBooking(b);
                      setShowInvoice(true);
                    }}
                    onAddToAppleWallet={(b) => {
                      // Handled via separate service or trigger if needed
                      toast.info("Opening wallet pass generation...");
                      setSelectedBooking(b);
                      setShowInvoice(true); // Re-use the modal or add a specific wallet trigger
                    }}
                    confirmingId={null} // Can be tied to a local state if needed
                  />
                ))}
              </div>
            )}
          </div>
        );
      case "settings": {
        return (
          <div
            className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} p-4 sm:p-8`}
          >
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Report Issue Button */}
              <div
                className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl shadow-sm p-6`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {t('reportIssue')}
                    </h3>
                    <p
                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {t('reportIssueDescription')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportIssueModal(true)}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
                  >
                    <AlertCircle className="w-5 h-5" />
                    {t('reportIssueButton')}
                  </button>
                </div>
              </div>

              <ProfileSettings
                user={
                  userData
                    ? {
                      _id: userData.uid,
                      uid: userData.uid,
                      displayName: userData.displayName,
                      name: userData.name,
                      email: userData.email || "",
                      photoURL: userData.photoURL,
                      locationSettings: {
                        type: "manual",
                        city: userData.location.city,
                        state: userData.location.state,
                        country: userData.location.country || "India",
                      },
                      createdAt: userData.createdAt,
                      lastLogin: userData.lastLogin,
                    }
                    : null
                }
                isDarkMode={isDarkMode}
                currentTheme={theme}
                onThemeChange={handleThemeChange}
                availableLanguages={availableLanguages}
                currentLanguage={language}
                onLanguageChange={handleLanguageChange}
                onToggleTheme={toggleDarkMode}
                onUpdate={async (updates) => {
                  if (!auth.currentUser) return;
                  try {
                    // Update in Firebase Auth if displayName or photoURL is being updated
                    const authUpdates: {
                      displayName?: string;
                      photoURL?: string | null;
                    } = {};

                    if ("displayName" in updates) {
                      authUpdates.displayName = updates.displayName;
                    }
                    if ("photoURL" in updates) {
                      authUpdates.photoURL = updates.photoURL;
                    }

                    if (Object.keys(authUpdates).length > 0) {
                      await updateProfile(auth.currentUser, authUpdates);
                    }

                    // Update in Firestore - filter out undefined values to avoid Firestore errors
                    const firestoreUpdates: any = {
                      updatedAt: new Date(),
                    };

                    // Only add defined values to Firestore update
                    if (updates.displayName !== undefined)
                      firestoreUpdates.displayName = updates.displayName;
                    if (updates.name !== undefined)
                      firestoreUpdates.name = updates.name;
                    if (updates.photoURL !== undefined)
                      firestoreUpdates.photoURL = updates.photoURL;
                    if (updates.email !== undefined)
                      firestoreUpdates.email = updates.email;

                    await userAPI.updateUser(auth.currentUser.uid, firestoreUpdates);

                    // Fetch the latest profile data from backend to ensure sync
                    try {
                      const res = await fetch(
                        `${API_CONFIG.BASE_URL}/api/v1/profile/${auth.currentUser.uid}`,
                      );
                      if (res.ok) {
                        const profile = await res.json();
                        // Update local state with the latest data from backend
                        setUserData((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            displayName:
                              profile.displayName || prev.displayName,
                            name: profile.fullName || profile.name || prev.name,
                            photoURL:
                              profile.currentAvatar ||
                              profile.avatarUrl ||
                              profile.photoURL,
                            avatars: profile.avatars || prev.avatars,
                            createdAt: prev.createdAt,
                            lastLogin: prev.lastLogin,
                          };
                        });
                      }
                    } catch (fetchError) {
                      console.error(
                        "Error fetching updated profile:",
                        fetchError,
                      );
                      // Fallback to updating with the provided updates
                      setUserData((prev) => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          ...(updates.displayName && {
                            displayName: updates.displayName,
                          }),
                          ...(updates.name && { name: updates.name }),
                          ...(updates.photoURL !== undefined && {
                            photoURL: updates.photoURL,
                          }),
                          createdAt: prev.createdAt,
                          lastLogin: prev.lastLogin,
                        };
                      });
                    }

                    // Show success message
                    toast.success("Profile updated successfully!");
                  } catch (error) {
                    console.error("Error updating profile:", error);
                    toast.error("Failed to update profile. Please try again.");
                    throw error;
                  }
                }}
              />
            </div>
          </div>
        );
      }
      case "favorites": {
        // Separate favorites by type
        const favoriteRestaurants = favorites.filter(
          (item) => item.type === "restaurant",
        );
        const favoriteEvents = favorites.filter(
          (item) => item.type === "event",
        );

        return (
          <div
            className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} p-4 md:p-8`}
          >
            {/* Premium Header Card with Gradient */}
            <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-pink-500 to-rose-600 p-6 sm:p-10 mb-8 sm:mb-12 shadow-2xl shadow-pink-500/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-10">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/10 shadow-sm">
                      {t('yourCollection')}
                    </span>
                    <div className="h-1 w-1 rounded-full bg-white/60"></div>
                    <span className="text-pink-50 text-sm font-medium">
                      {favorites.length}{" "}
                      {favorites.length === 1 ? t('favorite') : t('favorites')}
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-sm">
                    {t('myFavorites')}
                  </h1>
                  <p className="text-pink-50 text-lg md:text-xl font-medium max-w-lg leading-relaxed opacity-90">
                    {t('handpickedCollection')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="group relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-300 rounded-2xl px-5 py-4 min-w-[140px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shadow-inner">
                        <Heart size={20} className="fill-white/80" />
                      </div>
                      <div>
                        <p className="text-pink-100 text-xs font-semibold uppercase tracking-wider mb-0.5">
                          {t('total')}
                        </p>
                        <p className="text-white font-bold text-2xl leading-none">
                          {favorites.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {favorites.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center py-20 px-4 rounded-3xl ${isDarkMode ? "bg-gray-800/50" : "bg-white"
                  } border ${isDarkMode ? "border-gray-700/50" : "border-gray-200/50"} backdrop-blur-md`}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-6">
                  <Heart
                    size={40}
                    className={isDarkMode ? "text-pink-400" : "text-pink-500"}
                  />
                </div>
                <h3
                  className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {t('noFavorites')}
                </h3>
                <p
                  className={`text-center max-w-md ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  {t('addFavorites')}
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Favorite Restaurants */}
                {favoriteRestaurants.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-100 text-emerald-600"
                          }`}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                          <path d="M7 2v20" />
                          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                        </svg>
                      </div>
                      <div>
                        <h2
                          className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                        >
                          {t('favoriteRestaurants')}
                        </h2>
                        <p
                          className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {favoriteRestaurants.length}{" "}
                          {favoriteRestaurants.length === 1
                            ? t('restaurant')
                            : t('restaurants')}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {favoriteRestaurants.map((fav, idx) => (
                        <PremiumRestaurantCard
                          key={fav.id}
                          restaurant={fav as any}
                          isDarkMode={isDarkMode}
                          isFavorite={true}
                          isOpen={isRestaurantOpen(fav as any)}
                          onToggleFavorite={toggleFavorite}
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Favorite Events */}
                {favoriteEvents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-purple-100 text-purple-600"
                          }`}
                      >
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h2
                          className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                        >
                          {t('favoriteEvents')}
                        </h2>
                        <p
                          className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {favoriteEvents.length}{" "}
                          {favoriteEvents.length === 1 ? t('event') : t('events')}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {favoriteEvents.map((fav, idx) => (
                        <PremiumEventCard
                          key={fav.id}
                          event={{
                            _id: fav.id,
                            id: fav.id,
                            title: fav.name,
                            name: fav.name,
                            imageUrl: fav.image,
                            image: fav.image,
                            location: fav.location,
                            date: fav.date || "Multiple Dates",
                            time: fav.time || "Varies",
                            price: fav.price || 0,
                            category: fav.category || "Event",
                            description: fav.description || ""
                          } as any}
                          isDarkMode={isDarkMode}
                          isFavorite={true}
                          onToggleFavorite={toggleFavorite}
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
      case "messages": {
        // Map context notifications to the expected structure for rendering
        const mappedNotifications = notificationContextNotifications.map(
          (n: any) => ({
            id: n.id || n._id,
            title: n.title || "Notification",
            message: n.message || n.title || "",
            read: n.isRead || false,
            timestamp: n.createdAt ? new Date(n.createdAt) : new Date(),
          }),
        );

        return (
          <div className="p-4 sm:p-8">
            {mappedNotifications.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center text-center p-8 ${isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? "bg-gray-800" : "bg-gray-100"
                    }`}
                >
                  <Bell size={32} className="text-emerald-500" />
                </div>
                <h3
                  className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {t('noNotifications')}
                </h3>
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                >
                  {t('notificationsHint')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2
                    className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {t('messages')}
                  </h2>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsAsRead()}
                      className={`px-4 py-2 rounded-lg ${isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-gray-200 hover:bg-gray-300"
                        } text-sm font-medium transition-colors`}
                    >
                      {t('markAllAsRead')}
                    </button>
                  )}
                </div>
                {mappedNotifications.map((notification: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => setSelectedNotification(notification)}
                    className={`flex items-start p-4 rounded-xl transition-colors cursor-pointer ${isDarkMode
                      ? notification.read
                        ? "bg-gray-800 hover:bg-gray-750"
                        : "bg-gray-800/80 ring-1 ring-emerald-500 hover:bg-gray-800"
                      : notification.read
                        ? "bg-white hover:bg-gray-50"
                        : "bg-white/90 ring-1 ring-emerald-500 hover:bg-emerald-50"
                      }`}
                  >
                    <Bell
                      className={`flex-shrink-0 ${notification.read
                        ? isDarkMode
                          ? "text-gray-400"
                          : "text-gray-500"
                        : "text-emerald-500"
                        }`}
                      size={20}
                    />
                    <div className="ml-4 flex-1">
                      <h3
                        className={`text-sm font-semibold mb-1 ${isDarkMode ? "text-gray-100" : "text-gray-900"
                          }`}
                      >
                        {notification.title}
                      </h3>
                      <p
                        className={`text-sm line-clamp-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                      >
                        {notification.message}
                      </p>
                      <p
                        className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                      >
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="ml-2 flex-shrink-0">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case "reviews":
        return renderMyReviews();
      case "achievements":
        return (
          <AchievementsSection
            isDarkMode={isDarkMode}
            language={language}
            translations={tProps as any}
            userMood={userMood}
          />
        );
      case "ar-menu":
        if (!isEnabled('arMenus')) {
          if (shouldShow('arMenus')) {
            const config = flags.arMenus;
            return <FeatureSticker stickerId={config.sticker} caption={config.caption} mode={config.mode} />;
          }
          setActiveSection('home');
          return null;
        }
        return (
          <ARMenuSection
            isDarkMode={isDarkMode}
            language={language}
            translations={tProps as any}
            menuItems={arMenuItems}
            isLoading={isArMenuItemsLoading}
          />
        );
      case "pre-orders":
        if (!isEnabled('preOrders')) {
          if (shouldShow('preOrders')) {
            const config = flags.preOrders;
            return <FeatureSticker stickerId={config.sticker} caption={config.caption} mode={config.mode} />;
          }
          setActiveSection('home');
          return null;
        }
        return <div>{t('preOrdersComingSoon')}</div>;
      case "waitlist":
        if (!isEnabled('waitlist')) {
          if (shouldShow('waitlist')) {
            const config = flags.waitlist;
            return <FeatureSticker stickerId={config.sticker} caption={config.caption} mode={config.mode} />;
          }
          setActiveSection('home');
          return null;
        }
        return <div>{t('waitlistComingSoon')}</div>;
      default:
        return null;
    }
  };

  // Fetch menu items for AR Menu section
  useEffect(() => {
    const fetchArMenuItems = async () => {
      if (activeSection === "ar-menu" && arMenuItems.length === 0) {
        setIsArMenuItemsLoading(true);
        try {
          // Find the most relevant booking to show its menu
          const relevantBooking =
            bookings.find(
              (b) => b.status === "confirmed" || b.status === "pending",
            ) || bookings[0];

          if (relevantBooking) {
            const bId =
              (relevantBooking as any).businessId ||
              (relevantBooking.restaurantId as any)?._id ||
              (relevantBooking as any).restaurantId;

            if (bId) {
              const res = await menuApi.getItems(bId);
              const items = Array.isArray(res) ? res : res.data || [];
              if (items.length > 0) {
                setArMenuItems(items);
                return;
              }
            }

            if (restaurants.length > 0) {
              const res = await menuApi.getItems(restaurants[0].id);
              const items = Array.isArray(res) ? res : res.data || [];
              if (items.length > 0) {
                setArMenuItems(items);
                return;
              }
            }
          } else if (restaurants.length > 0) {
            const res = await menuApi.getItems(restaurants[0].id);
            const items = Array.isArray(res) ? res : res.data || [];
            if (items.length > 0) {
              setArMenuItems(items);
              return;
            }
          }

          // Fallback if all API calls return empty (common in dev environment)
          setArMenuItems([
            {
              id: "m1",
              name: "Truffle Burger",
              description:
                "Wagyu beef patty with truffle mayo, caramelized onions, and aged cheddar.",
              price: 18.99,
              ingredients: [
                "Wagyu Beef",
                "Truffle Mayo",
                "Brioche Bun",
                "Cheddar",
              ],
              allergens: ["Dairy", "Gluten", "Eggs"],
              nutrition: {
                calories: 850,
                protein: 45,
                carbs: 42,
                fat: 55,
                fiber: 3,
                sodium: 920,
              },
              cookingMethod: "Grilled to perfection",
              prepTime: 15,
              spiceLevel: 1,
              isVegetarian: false,
              isVegan: false,
              isGlutenFree: false,
              sustainability: {
                score: 85,
                localIngredients: 70,
                carbonFootprint: "Low",
              },
            },
            {
              id: "m2",
              name: "Spicy Pasta",
              description: "Penne arrabbiata with fresh basil and parmesan.",
              price: 14.99,
              ingredients: [
                "Penne",
                "Tomato Sauce",
                "Chili",
                "Garlic",
                "Parmesan",
              ],
              allergens: ["Gluten", "Dairy"],
              nutrition: {
                calories: 650,
                protein: 18,
                carbs: 85,
                fat: 22,
                fiber: 6,
                sodium: 750,
              },
              cookingMethod: "SautÃ©ed",
              prepTime: 12,
              spiceLevel: 3,
              isVegetarian: true,
              isVegan: false,
              isGlutenFree: false,
              sustainability: {
                score: 92,
                localIngredients: 85,
                carbonFootprint: "Very Low",
              },
            },
          ]);
        } catch (err) {
          // Error forcing initials avatar suppressed
        } finally {
          setIsArMenuItemsLoading(false);
        }
      }
    };

    fetchArMenuItems();
  }, [activeSection, bookings, restaurants, arMenuItems.length]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  if (authLoading || isLoading) {
    return <SkeletonLoading isDarkMode={isDarkMode} />;
  }

  return (
    <>
      <div
        className={`min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
      >
        {/* Sidebar */}
        <aside
          className={`hidden lg:flex flex-col fixed top-0 left-0 h-full w-[280px] transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 ${isDarkMode ? "bg-gray-900/80" : "bg-white/80"
            } backdrop-blur-xl border-r ${isDarkMode ? "border-gray-800" : "border-gray-200"} shadow-2xl overflow-y-auto`}
        >
          <div className="p-6 flex flex-col h-full">
            {/* Dineingo Logo */}
            <div className="flex items-center justify-between mb-10">
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => window.location.reload()}
              >
                <div className="relative w-11 h-11 flex items-center justify-center bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-all duration-300">
                  <div className="relative flex items-center mb-0.5">
                    <span className="text-white font-black text-2xl italic tracking-tighter">
                      D
                    </span>
                    <span className="text-white font-black text-2xl italic tracking-tighter relative">
                      i
                      <span className="absolute top-[5px] left-[90%] -translate-x-1/2 w-[6px] h-[6px] bg-red-500 rounded-full shadow-[0_0_4px_rgba(255,0,0,0.6)]"></span>
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
                  <div className="flex items-center">
                    <span className={isDarkMode ? "text-white" : "text-gray-900"}>
                      D
                    </span>
                    <span
                      className={`relative ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      i
                      <span className="absolute top-[3px] left-[50%] -translate-x-1/3 w-2 h-2 bg-red-600 rounded-full shadow-[0_0_3px_rgba(255,0,0,0.5)]"></span>
                    </span>
                    <span className={isDarkMode ? "text-white" : "text-gray-900"}>
                      neIn
                    </span>
                    <span className="text-yellow-400">Go</span>
                  </div>
                  <span className="px-2 py-0.5 text-[8px] font-black bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-500 rounded-lg uppercase tracking-widest shadow-sm">
                    Beta Dev
                  </span>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                className={`lg:hidden p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* User Profile Section */}
            {isLoading ? (
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-200 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center space-x-4 mb-10 p-4 rounded-2xl ${isDarkMode ? "bg-gray-800/50" : "bg-emerald-50/50"} border ${isDarkMode ? "border-gray-700" : "border-emerald-100/50"}`}
              >
                <div className="relative">
                  {userData && userData.photoURL &&
                    typeof userData.photoURL === "string" &&
                    userData.photoURL.trim() !== "" ? (
                    <img
                      src={normalizeImageUrl(userData.photoURL as string)}
                      alt="Profile"
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        forceInitialsAvatar();
                      }}
                    />
                  ) : (
                    <InitialsAvatar
                      name={userData?.displayName ?? ""}
                      className="w-12 h-12 rounded-2xl border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
                    />
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm ring-2 ring-emerald-500/20 animate-pulse"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    className={`text-md font-bold ${isDarkMode ? "text-white" : "text-gray-900"} truncate`}
                  >
                    {userData?.displayName}
                  </h2>
                  <p className="text-xs text-emerald-500 font-medium truncate uppercase tracking-wider">
                    User
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 space-y-1">
              {[
                {
                  id: "home",
                  label: t('home'),
                  icon: <Menu className="w-5 h-5" />,
                },
                {
                  id: "bookings",
                  label: t('bookings'),
                  icon: <Calendar className="w-5 h-5" />,
                },
                {
                  id: "restaurants",
                  label: t('restaurants'),
                  icon: <MapPin className="w-5 h-5" />,
                },
                {
                  id: "events",
                  label: t('events'),
                  icon: <Globe className="w-5 h-5" />,
                },
                {
                  id: "favorites",
                  label: t('favourites'),
                  icon: <Heart className="w-5 h-5" />,
                },
                {
                  id: "achievements",
                  label: t('achievements'),
                  icon: <Trophy className="w-5 h-5" />,
                },
                {
                  id: "ar-menu",
                  label: t('arMenu'),
                  icon: <Camera className="w-5 h-5" />,
                },
                {
                  id: "reviews",
                  label: t('myReviews'),
                  icon: <MessageSquare className="w-5 h-5" />,
                },
                {
                  id: "messages",
                  label: t('messages'),
                  icon: <Bell className="w-5 h-5" />,
                },
                {
                  id: "settings",
                  label: t('settings'),
                  icon: <Settings className="w-5 h-5" />,
                },
              ].filter(item => {
                if (item.id === 'ar-menu') return shouldShow('arMenus');
                if (item.id === 'events') return shouldShow('events');
                if (item.id === 'bookings') return true; // Always show bookings
                // Add other feature-dependent items here if needed
                return true;
              }).map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id === "bookings") {
                      fetchBookingsFromAPI();
                    }
                    handleNavigation(id as Section);
                  }}
                  className={`w-full group flex items-center px-4 py-3 text-left rounded-2xl transition-all duration-300 relative overflow-hidden ${activeSection === id
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 translate-x-1"
                    : isDarkMode
                      ? "text-gray-400 hover:text-white hover:bg-gray-800/50 hover:translate-x-1"
                      : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 hover:translate-x-1"
                    }`}
                >
                  {activeSection === id && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full"
                    />
                  )}
                  <span
                    className={`inline-flex items-center justify-center w-8 transition-transform group-hover:scale-110 ${activeSection === id ? "text-white" : "text-gray-400 group-hover:text-emerald-500"}`}
                  >
                    {icon}
                  </span>
                  <span className="ml-3 text-sm font-bold tracking-tight flex items-center gap-2">
                    {label}
                    {id === "ar-menu" && (
                      <span className="px-1.5 py-0.5 text-[8px] font-black bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-md uppercase tracking-wider animate-pulse border border-white/20 shadow-sm">
                        Beta Dev
                      </span>
                    )}
                  </span>
                  {id === "messages" && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                  {id === "bookings" && bookings.length > 0 && (
                    <span
                      className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-lg ${activeSection === id ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600"}`}
                    >
                      {bookings.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Bottom Actions in Sidebar */}
            <div className="pt-4 space-y-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${isDarkMode
                  ? "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <div className="flex items-center">
                  <span className="inline-flex items-center justify-center w-8">
                    {isDarkMode ? (
                      <Moon className="w-5 h-5" />
                    ) : (
                      <Sun className="w-5 h-5" />
                    )}
                  </span>
                  <span className="ml-3 text-sm font-medium">
                    {isDarkMode
                      ? t('darkMode')
                      : t('lightMode')}
                  </span>
                </div>
                <div
                  className={`w-11 h-6 rounded-full relative transition-colors ${isDarkMode ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <div
                    className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-transform ${isDarkMode ? "translate-x-5" : "translate-x-1.5"}`}
                  ></div>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={`w-full flex items-center px-4 py-3 text-left text-red-600 rounded-xl transition-colors ${isDarkMode ? "hover:bg-red-950/30" : "hover:bg-red-50"
                  }`}
              >
                <span className="inline-flex items-center justify-center w-8">
                  <ArrowLeft className="w-5 h-5" />
                </span>
                <span className="ml-3 text-sm font-medium">
                  {t('logout')}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={toggleSidebar}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div
          className={`min-h-screen pb-20 lg:pb-0 transition-all duration-500 ease-in-out ${isSidebarOpen ? "lg:pl-72" : ""}`}
        >
          {/* Header */}
          <header className="px-3 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 sticky top-0 z-30">
            {/* Mobile Expanded Search */}
            {isSearchExpanded && (
              <div className="sm:hidden mb-3">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    autoFocus
                    className="w-full px-5 py-4 rounded-2xl bg-black/80 backdrop-blur-md border-2 border-white/20 text-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-white/60 transition-all font-medium"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      setIsSearchExpanded(false);
                      setSearchTerm("");
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            <div
              className={`${isDarkMode ? "bg-gray-900/60 border-gray-800" : "bg-emerald-500/90 border-white/20"} backdrop-blur-xl rounded-3xl px-3 sm:px-6 py-3 flex items-center justify-between shadow-2xl border gap-2 sm:gap-4 h-16 sm:h-20`}
            >
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  onClick={toggleSidebar}
                  className={`hidden lg:flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all flex-shrink-0 ${isDarkMode ? "bg-gray-800/50 hover:bg-gray-800 text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}
                  aria-label="Toggle menu"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div
                  className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group min-w-0"
                  onClick={() => window.location.reload()}
                >
                  <div className="text-xl sm:text-2xl font-black tracking-tighter text-white drop-shadow-sm flex items-center whitespace-nowrap">
                    <span>D</span>
                    <span className="relative">
                      i
                      <span className="absolute top-[3px] sm:top-[4px] left-[50%] -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-600 rounded-full shadow-[0_0_8px_rgba(255,0,0,0.6)]"></span>
                    </span>
                    <span>neIn</span>
                    <span className="text-yellow-400">Go</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-2 md:gap-3 flex-1 min-w-0">
                {/* Desktop Search Bar */}
                <div className="relative flex-1 min-w-0 hidden sm:block">
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    className="w-full px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 md:py-3 pr-10 sm:pr-12 md:pr-24 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm sm:text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-white/40 placeholder-white/60 transition-all font-medium"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  <div className="absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5 md:gap-2">
                    <VoiceSearchButton
                      onSearchResult={(query) => handleSearch(query)}
                      language={
                        language === "hindi"
                          ? "hi-IN"
                          : language === "tamil"
                            ? "ta-IN"
                            : language === "kannada"
                              ? "kn-IN"
                              : language === "telugu"
                                ? "te-IN"
                                : language === "malayalam"
                                  ? "ml-IN"
                                  : "en-IN"
                      }
                    />
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-white/70 flex-shrink-0" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* Mobile Search Icon Button */}
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="sm:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 text-white transition-all flex-shrink-0"
                >
                  <Search className="w-5 h-5" />
                </button>

                {/* Notifications - Hidden on Mobile */}
                <button
                  onClick={() => setActiveSection("messages")}
                  className={`hidden sm:flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all relative flex-shrink-0 ${isDarkMode ? "bg-gray-800/50 hover:bg-gray-800 text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}
                >
                  <NotificationBell />
                </button>

                {/* Settings/Avatar */}
                <button
                  className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all flex-shrink-0 ${isDarkMode ? "bg-gray-800/50 hover:bg-gray-800 text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}
                  onClick={() => setIsAvatarModalOpen(true)}
                >
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <div className="w-px h-8 bg-white/20 mx-1 hidden sm:block" />

                {/* Profile */}
                <button
                  className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border-2 border-white/50 shadow-xl flex items-center justify-center overflow-hidden hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                  onClick={() => handleNavigation("settings")}
                >
                  {userData && userData.photoURL &&
                    typeof userData.photoURL === "string" &&
                    userData.photoURL.trim() !== "" ? (
                    <img
                      src={normalizeImageUrl(userData.photoURL as string)}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar
                      name={userData?.displayName ?? ""}
                      className="w-full h-full font-black text-xs"
                    />
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="p-4 sm:p-6 md:p-10 relative overflow-hidden">
            {/* Doodle Art Background - Improved Subtlety */}
            <div className="absolute inset-0 overflow-hidden z-0 opacity-[0.12] pointer-events-none">
              <img
                src="/images/dodle.png"
                alt=""
                className="absolute w-40 h-40 top-10 left-10 transform rotate-12"
                style={{
                  objectFit: "contain",
                  transition: "all 0.5s ease-in-out",
                  filter: "brightness(1.3) contrast(1.1)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1) rotate(0deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(12deg)")
                }
              />
              <img
                src="/images/meatdodle.png"
                alt=""
                className="absolute w-20 h-20 sm:w-28 sm:h-28 top-1/4 right-1/4 sm:top-1/3 sm:right-1/3 transform -rotate-12 opacity-50 sm:opacity-100"
                style={{
                  objectFit: "contain",
                  transition: "all 0.5s ease-in-out",
                  filter: "brightness(1.3) contrast(1.1)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1) rotate(0deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(-12deg)")
                }
              />
              <img
                src="/images/nooddodle.png"
                alt=""
                className="absolute w-24 h-24 sm:w-40 sm:h-40 bottom-10 right-5 sm:bottom-20 sm:right-10 transform rotate-6 hidden xs:block"
                style={{
                  objectFit: "contain",
                  transition: "all 0.5s ease-in-out",
                  filter: "brightness(1.3) contrast(1.1)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1) rotate(0deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(6deg)")
                }
              />
              <img
                src="/images/hotdogdodle.png"
                alt=""
                className="absolute w-24 h-24 sm:w-32 sm:h-32 top-1/2 left-5 sm:left-20 transform -rotate-3 opacity-40 sm:opacity-100 hidden sm:block"
                style={{
                  objectFit: "contain",
                  transition: "all 0.5s ease-in-out",
                  filter: "brightness(1.3) contrast(1.1)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1) rotate(0deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(-3deg)")
                }
              />
              <img
                src="/images/guiterdodle.png"
                alt=""
                className="absolute w-28 h-28 sm:w-36 sm:h-36 bottom-1/4 right-1/4 sm:bottom-1/3 sm:right-1/4 transform rotate-9 opacity-40 sm:opacity-100 hidden lg:block"
                style={{
                  objectFit: "contain",
                  transition: "all 0.5s ease-in-out",
                  filter: "brightness(1.3) contrast(1.1)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1) rotate(0deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(9deg)")
                }
              />
              <img
                src="/images/pioanododle.png"
                alt=""
                className="absolute w-36 h-36 sm:w-44 sm:h-44 top-2/3 left-1/4 sm:left-1/3 transform -rotate-6 opacity-40 sm:opacity-100 hidden md:block"
                style={{
                  objectFit: "contain",
                  transition: "all 0.5s ease-in-out",
                  filter: "brightness(1.3) contrast(1.1)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1) rotate(0deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(-6deg)")
                }
              />
              <img
                src="/images/eventdodle.png"
                alt=""
                className="absolute w-20 h-20 sm:w-28 sm:h-28 top-32 left-1/3 sm:top-40 sm:left-1/2 transform rotate-12 opacity-40 sm:opacity-100 hidden sm:block"
                style={{
                  objectFit: "contain",
                  transition: "all 0.5s ease-in-out",
                  filter: "brightness(1.3) contrast(1.1)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1) rotate(0deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(12deg)")
                }
              />
              <img
                src="/images/teacrosdod.png"
                alt=""
                className="absolute w-24 h-24 sm:w-32 sm:h-32 bottom-32 right-1/3 sm:bottom-40 sm:right-1/2 transform -rotate-9 opacity-40 sm:opacity-100 hidden sm:block"
                style={{
                  objectFit: "contain",
                  transition: "all 0.5s ease-in-out",
                  filter: "brightness(1.3) contrast(1.1)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1) rotate(0deg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "rotate(-9deg)")
                }
              />
            </div>
            <div className="max-w-7xl mx-auto relative z-10">
              {renderSection()}
            </div>
          </main>

          {/* Footer */}
          <footer
            className={`mt-12 text-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"} pb-6`}
          >
            <p>&copy; 2026 DineInGo. {t('allRightsReserved')}</p>
          </footer>
        </div>

        {/* Invoice Modal */}
        {showInvoice && selectedBooking && (
          <InvoiceModal
            booking={selectedBooking as any}
            onClose={() => {
              setShowInvoice(false);
              setSelectedBooking(null);
            }}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Location Modal */}
        {isLocationModalOpen && renderLocationModal()}
        {/* Avatar Modal */}
        {renderAvatarModal()}

        {/* Notification Detail Modal */}
        {selectedNotification && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
            onClick={() => setSelectedNotification(null)}
          >
            <div
              className={`rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                className={`flex items-start justify-between p-6 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
              >
                <div className="flex-1 pr-4">
                  <h2
                    className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                  >
                    {selectedNotification.title}
                  </h2>
                  <p
                    className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                  >
                    {formatTimestamp(selectedNotification.timestamp)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className={`transition-colors ${isDarkMode
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-400 hover:text-gray-600"
                    }`}
                  title="Close"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <div
                  className={`whitespace-pre-line leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                >
                  {selectedNotification.message}
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className={`flex items-center justify-end gap-3 p-6 border-t ${isDarkMode
                  ? "border-gray-700 bg-gray-750"
                  : "border-gray-200 bg-gray-50"
                  }`}
              >
                <button
                  onClick={() => setSelectedNotification(null)}
                  className={`px-6 py-2 border rounded-lg transition-colors ${isDarkMode
                    ? "text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600"
                    : "text-gray-700 bg-white border-gray-300 hover:bg-gray-100"
                    }`}
                >
                  {t('close')}
                </button>
                {!isRead(selectedNotification.id) ? (
                  <button
                    onClick={async () => {
                      setMarkingAsRead(true);
                      try {
                        await markSingleAsRead(selectedNotification.id);
                        setSelectedNotification(null);
                      } finally {
                        setMarkingAsRead(false);
                      }
                    }}
                    disabled={markingAsRead}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={18} />
                    {markingAsRead ? t('marking') : t('markAsRead')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <Check size={18} />
                    {t('alreadyRead')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dino Easter Egg "Where's Dino?" */}
      <div className="fixed bottom-4 left-4 z-[60]">
        <motion.div
          whileHover={{ scale: 1.2, rotate: 10 }}
          onClick={() =>
            toast.success(
              "ðŸ¦– RAWR! You found me! I was busy checking the kitchen for prehistoric snacks! âœ¨",
              {
                position: "bottom-left",
              },
            )
          }
          className="cursor-pointer opacity-10 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
        >
          <img
            src="/images/Dino Icon.svg"
            alt="Hidden Dino"
            className="w-8 h-8"
          />
        </motion.div>
      </div>

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
        userType="user"
        userId={userData?.uid}
        userEmail={userData?.email}
        userName={userData?.displayName || userData?.name}
      />

      {/* Mobile Bottom Navigation (Premium Scrollable Dock) */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-800/50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-0 sm:gap-1 overflow-x-auto hide-scrollbar px-2 sm:px-4 py-1.5 sm:py-2 snap-x snap-mandatory">
          {[
            { id: "home", icon: <Compass strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('home') },
            { id: "restaurants", icon: <MapPin strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('restaurants') },
            { id: "events", icon: <Globe strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('events') },
            { id: "bookings", icon: <Calendar strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('bookings') },
            { id: "messages", icon: <MessageSquare strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('messages') },
            { id: "ar-menu", icon: <Camera strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('arMenu') },
            { id: "reviews", icon: <Star strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('myReviews') },
            { id: "achievements", icon: <Trophy strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('achievements') },
            { id: "theme", icon: isDarkMode ? <Sun strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" /> : <Moon strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: isDarkMode ? t('lightMode') : t('darkMode'), isAction: true, onClick: toggleDarkMode },
            { id: "settings", icon: <Settings strokeWidth={1.5} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />, label: t('settings') },
            { id: "logout", icon: <svg strokeWidth={1.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 sm:w-[22px] sm:h-[22px]"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>, label: t('logout'), isAction: true, onClick: handleLogout }
          ].map((item) => {
            const isActive = !item.isAction && activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => item.isAction && item.onClick ? item.onClick() : setActiveSection(item.id as Section)}
                className={`snap-center flex flex-col items-center gap-1 sm:gap-1.5 min-w-[64px] sm:min-w-[76px] transition-all duration-300 ${isActive
                    ? "text-emerald-500 dark:text-emerald-400 scale-105"
                    : item.id === 'logout' ? "text-rose-500 hover:text-rose-600" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <div className={`p-1.5 sm:p-2 rounded-xl sm:rounded-[14px] transition-all duration-300 ${isActive ? "bg-emerald-500/10 dark:bg-emerald-400/15 shadow-inner" : ""}`}>
                  {item.icon}
                </div>
                <span className={`text-[9px] sm:text-[10px] tracking-wide transition-all ${isActive ? "opacity-100 font-bold" : "opacity-80 font-medium"} whitespace-nowrap`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      </nav>
    </>
  );
}

