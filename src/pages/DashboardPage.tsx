import { useState, useEffect } from "react";
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
} from "lucide-react";
import InvoiceModal from "../components/InvoiceModal";
import { signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import BookingCard from "../components/BookingCard";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { userAPI, bookingsApi, userPreferenceApi, normalizeImageUrl } from "../services/api";
import { API_CONFIG } from "../config/api";
import { toast } from "react-toastify";
import { Location as GeoLocation, Event as AppEvent } from "../types";
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
import { favoritesApi } from "../services/favoritesApi";
import socketService from "../utils/socketService";
import { VoiceSearchButton } from "../components/VoiceSearchButton";
import { trackEvent } from "../utils/analytics";
import { SustainabilityBadge } from "../components/SustainabilityBadge";
import AchievementsSection from "../components/AchievementsSection";
import ARMenuSection from "../components/ARMenuSection";
import StarRating from "../components/StarRating";
import EmojiPicker from "../components/EmojiPicker";
import { menuApi } from "../services/api";
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

interface Translation {
  welcome: string;
  exploreRestaurants: string;
  exploreEvents: string;
  home: string;
  bookings: string;
  restaurants: string;
  events: string;
  favourites: string;
  messages: string;
  settings: string;
  logout: string;
  lightMode: string;
  darkMode: string;
  upcomingEvents: string;
  eventsDescription: string;
  welcomeMessage: string;
  discoverMessage: string;
  searchPlaceholder: string;
  language: string;
  noFavorites: string;
  addFavorites: string;
  noBookings: string;
  bookingsMessage: string;
  unreadMessages: string;
  allRightsReserved: string;
  featuredRestaurants: string;
  price: string;
  rating: string;
  locationLabel: string;
  updateLocation: string;
  useCurrentLocation: string;
  searchCities: string;
  profileSettings: string;
  displayName: string;
  email: string;
  locationSettings: string;
  languageSettings: string;
  themeSettings: string;
  lightModeDescription: string;
  darkModeDescription: string;
  noNotifications: string;
  notificationsDescription: string;
  cuisine: string;
  openNow: string;
  closed: string;
  registered: string;
  capacity: string;
  category: string;
  date: string;
  time: string;
  achievements: string;
  arMenu: string;
  gamification: string;
  rewardsSystem: string;
  cuisineExplorer: string;
  localHero: string;
  sustainableDiner: string;
  socialFoodie: string;
  progress: string;
  unlocked: string;
  locked: string;
  arExperience: string;
  scanMenu: string;
  nutritionInfo: string;
  ingredients: string;
  cookingMethod: string;
  myReviews: string;
}

type Language =
  | "english"
  | "hindi"
  | "tamil"
  | "kannada"
  | "telugu"
  | "malayalam";
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
  | "reviews";
type Translations = Record<Language, Translation>;

const translations: Translations = {
  english: {
    welcome: "Welcome",
    exploreRestaurants: "Explore Restaurants",
    exploreEvents: "Explore Events",
    home: "Home",
    bookings: "Expeditions",
    restaurants: "Restaurants",
    events: "Events",
    favourites: "Favourites",
    messages: "Messages",
    settings: "Settings",
    logout: "Logout",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    upcomingEvents: "Upcoming Events",
    eventsDescription: "Discover and launch exciting expeditions",
    welcomeMessage: "Welcome to Dineingo",
    discoverMessage: "Discover amazing restaurants and events",
    searchPlaceholder: "Search restaurants or events...",
    language: "Language",
    noFavorites: "No favorites yet",
    addFavorites: "Add some favorites to see them here",
    noBookings: "No expeditions launched yet",
    bookingsMessage: "Your upcoming expeditions will appear here",
    unreadMessages: "Unread Messages",
    allRightsReserved: "All rights reserved",
    featuredRestaurants: "Featured Restaurants",
    price: "Price",
    rating: "Rating",
    locationLabel: "Location",
    updateLocation: "Update Location",
    useCurrentLocation: "Use Current Location",
    searchCities: "Search cities...",
    profileSettings: "Profile Settings",
    displayName: "Display Name",
    email: "Email",
    locationSettings: "Location Settings",
    languageSettings: "Language Settings",
    themeSettings: "Theme Settings",
    lightModeDescription: "Classic bright interface",
    darkModeDescription: "Easier on the eyes in low light",
    noNotifications: "No notifications yet",
    notificationsDescription:
      "When you receive new notifications about your expeditions, events, or special offers, they will appear here",
    cuisine: "Cuisine",
    openNow: "Open Now",
    closed: "Closed",
    registered: "Registered",
    capacity: "Capacity",
    category: "Category",
    date: "Date",
    time: "Time",
    achievements: "Dino Awards",
    arMenu: "AR Menu",
    gamification: "Gamification & Rewards",
    rewardsSystem: "Rewards System",
    cuisineExplorer: "Cuisine Explorer",
    localHero: "Local Hero",
    sustainableDiner: "Sustainable Diner",
    socialFoodie: "Social Foodie",
    progress: "Progress",
    unlocked: "Unlocked",
    locked: "Locked",
    arExperience: "AR Experience",
    scanMenu: "Scan Menu",
    nutritionInfo: "Nutrition Info",
    ingredients: "Ingredients",
    cookingMethod: "Cooking Method",
    myReviews: "My Reviews",
  },
  hindi: {
    welcome: "स्वागत है",
    exploreRestaurants: "रेस्तरां खोजें",
    exploreEvents: "कार्यक्रम खोजें",
    home: "होम",
    bookings: "बुकिंग",
    restaurants: "रेस्तरां",
    events: "कार्यक्रम",
    favourites: "पसंदीदा",
    messages: "संदेश",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",
    lightMode: "लाइट मोड",
    darkMode: "डार्क मोड",
    upcomingEvents: "आगामी कार्यक्रम",
    eventsDescription: "रोमांचक कार्यक्रमों की खोज और बुकिंग करें",
    welcomeMessage: "डाइनिंगो में आपका स्वागत है",
    discoverMessage: "शानदार रेस्तरां और कार्यक्रमों की खोज करें",
    searchPlaceholder: "रेस्तरां या कार्यक्रम खोजें...",
    language: "भाषा",
    noFavorites: "अभी तक कोई पसंदीदा नहीं",
    addFavorites: "यहां देखने के लिए कुछ पसंदीदा जोड़ें",
    noBookings: "अभी तक कोई बुकिंग नहीं",
    bookingsMessage: "आपकी आगामी बुकिंग यहां दिखाई देंगी",
    unreadMessages: "अपठित संदेश",
    allRightsReserved: "सर्वाधिकार सुरक्षित",
    featuredRestaurants: "विशेष रेस्तरां",
    price: "कीमत",
    rating: "रेटिंग",
    locationLabel: "स्थान",
    updateLocation: "स्थान अपडेट करें",
    useCurrentLocation: "वर्तमान स्थान का उपयोग करें",
    searchCities: "शहर खोजें...",
    profileSettings: "प्रोफ़ाइल सेटिंग्स",
    displayName: "प्रदर्शित नाम",
    email: "ईमेल",
    locationSettings: "स्थान सेटिंग्स",
    languageSettings: "भाषा सेटिंग्स",
    themeSettings: "थीम सेटिंग्स",
    lightModeDescription: "क्लासिक उज्जवल इंटरफ़ेस",
    darkModeDescription: "कम रोशनी में आंखों के लिए आरामदायक",
    noNotifications: "कोई सूचना नहीं",
    notificationsDescription:
      "जब आपको अपनी बुकिंग, कार्यक्रमों या विशेष ऑफ़र के बारे में नई सूचनाएं प्राप्त होंगी, तो वे यहां दिखाई देंगी",
    cuisine: "व्यंजन",
    openNow: "अभी खुला है",
    closed: "बंद है",
    registered: "पंजीकृत",
    capacity: "क्षमता",
    category: "श्रेणी",
    date: "दिनांक",
    time: "समय",
    achievements: "उपलब्धियां",
    arMenu: "एआर मेनू",
    gamification: "गेमिफिकेशन और पुरस्कार",
    rewardsSystem: "पुरस्कार प्रणाली",
    cuisineExplorer: "व्यंजन खोजकर्ता",
    localHero: "स्थानीय हीरो",
    sustainableDiner: "टिकाऊ भोजन",
    socialFoodie: "सामाजिक खाद्य प्रेमी",
    progress: "प्रगति",
    unlocked: "अनलॉक",
    locked: "लॉक",
    arExperience: "एआर अनुभव",
    scanMenu: "मेनू स्कैन करें",
    nutritionInfo: "पोषण संबंधी जानकारी",
    ingredients: "सामग्री",
    cookingMethod: "बनाने की विधि",
    myReviews: "मेरी समीक्षाएं",
  },
  tamil: {
    welcome: "வரவேற்பு",
    exploreRestaurants: "உணவகங்களை ஆராயுங்கள்",
    exploreEvents: "நிகழ்வுகளை ஆராயுங்கள்",
    home: "முகப்பு",
    bookings: "முன்பதிவுகள்",
    restaurants: "உணவகங்கள்",
    events: "நிகழ்வுகள்",
    favourites: "பிடித்தவை",
    messages: "செய்திகள்",
    settings: "அமைப்புகள்",
    logout: "வெளியேறு",
    lightMode: "ஒளி பயன்முறை",
    darkMode: "இருள் பயன்முறை",
    upcomingEvents: "வரவிருக்கும் நிகழ்வுகள்",
    eventsDescription:
      "சுவாரஸ்யமான நிகழ்வுகளைக் கண்டறிந்து முன்பதிவு செய்யுங்கள்",
    welcomeMessage: "டைனிங்கோவிற்கு வரவேற்கிறோம்",
    discoverMessage: "அற்புதமான உணவகங்கள் மற்றும் நிகழ்வுகளைக் கண்டறியுங்கள்",
    searchPlaceholder: "உணவகங்கள் அல்லது நிகழ்வுகளைத் தேடுங்கள்...",
    language: "மொழி",
    noFavorites: "இதுவரை பிடித்தவை எதுவும் இல்லை",
    addFavorites: "இங்கே காண சில பிடித்தவற்றைச் சேர்க்கவும்",
    noBookings: "இதுவரை முன்பதிவுகள் எதுவும் இல்லை",
    bookingsMessage: "உங்கள் வரவிருக்கும் முன்பதிவுகள் இங்கே தோன்றும்",
    unreadMessages: "படிக்காத செய்திகள்",
    allRightsReserved: "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை",
    featuredRestaurants: "சிறப்பு உணவகங்கள்",
    price: "விலை",
    rating: "மதிப்பீடு",
    locationLabel: "இடம்",
    updateLocation: "இடத்தைப் புதுப்பிக்கவும்",
    useCurrentLocation: "தற்போதைய இடத்தைப் பயன்படுத்தவும்",
    searchCities: "நகரங்களைத் தேடுங்கள்...",
    profileSettings: "சுயவிவர அமைப்புகள்",
    displayName: "காட்சிப் பெயர்",
    email: "மின்னஞ்சல்",
    locationSettings: "இட அமைப்புகள்",
    languageSettings: "மொழி அமைப்புகள்",
    themeSettings: "தீம் அமைப்புகள்",
    lightModeDescription: "பாரம்பரிய பிரகாசமான இடைமுகம்",
    darkModeDescription: "குறைந்த ஒளியில் கண்களுக்கு எளிதானது",
    noNotifications: "இதுவரை அறிவிப்புகள் எதுவும் இல்லை",
    notificationsDescription:
      "உங்கள் முன்பதிவுகள், நிகழ்வுகள் அல்லது சிறப்பு சலுகைகள் பற்றிய புதிய அறிவிப்புகளைப் பெறும்போது, அவை இங்கே தோன்றும்",
    cuisine: "உணவு வகை",
    openNow: "இப்போது திறந்துள்ளது",
    closed: "மூடப்பட்டுள்ளது",
    registered: "பதிவு செய்யப்பட்டது",
    capacity: "கொள்ளளவு",
    category: "வகை",
    date: "தேதி",
    time: "நேரம்",
    achievements: "சாதனைகள்",
    arMenu: "ஏஆர் மெனு",
    gamification: "கேமிஃபிகேஷன் மற்றும் வெகுமதிகள்",
    rewardsSystem: "வெகுமதி அமைப்பு",
    cuisineExplorer: "உணவு ஆராய்ச்சியாளர்",
    localHero: "உள்ளூர் ஹீரோ",
    sustainableDiner: "நிலையான உணவு",
    socialFoodie: "சமூக உணவு பிரியர்",
    progress: "முன்னேற்றம்",
    unlocked: "திறக்கப்பட்டது",
    locked: "பூட்டப்பட்டது",
    arExperience: "ஏஆர் அனுபவம்",
    scanMenu: "மெனுவை ஸ்கேன் செய்யுங்கள்",
    nutritionInfo: "ஊட்டச்சத்து தகவல்",
    ingredients: "தேவையான பொருட்கள்",
    cookingMethod: "சமைக்கும் முறை",
    myReviews: "என் விமர்சனங்கள்",
  },
  kannada: {
    welcome: "ಸ್ವಾಗತ",
    exploreRestaurants: "ರೆಸ್ಟೋರೆಂಟ್‌ಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
    exploreEvents: "ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
    home: "ಮುಖಪುಟ",
    bookings: "ಬುಕ್ಕಿಂಗ್‌ಗಳು",
    restaurants: "ರೆಸ್ಟೋರೆಂಟ್‌ಗಳು",
    events: "ಕಾರ್ಯಕ್ರಮಗಳು",
    favourites: "ಮೆಚ್ಚಿನವುಗಳು",
    messages: "ಸಂದೇಶಗಳು",
    settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    logout: "ಲಾಗ್ ಔಟ್",
    lightMode: "ಲೈಟ್ ಮೋಡ್",
    darkMode: "ಡಾರ್ಕ್ ಮೋಡ್",
    upcomingEvents: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು",
    eventsDescription: "ರೋಮಾಂಚಕ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಕಂಡುಹಿಡಿಯಿರಿ ಮತ್ತು ಬುಕ್ ಮಾಡಿ",
    welcomeMessage: "ಡೈನಿಂಗೋಗೆ ಸ್ವಾಗತ",
    discoverMessage:
      "ಅದ್ಭುತ ರೆಸ್ಟೋರೆಂಟ್‌ಗಳು ಮತ್ತು ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಕಂಡುಹಿಡಿಯಿರಿ",
    searchPlaceholder: "ರೆಸ್ಟೋರೆಂಟ್‌ಗಳು ಅಥವಾ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಹುಡುಕಿ...",
    language: "ಭಾಷೆ",
    noFavorites: "ಇನ್ನೂ ಯಾವುದೇ ಮೆಚ್ಚಿನವುಗಳಿಲ್ಲ",
    addFavorites: "ಇಲ್ಲಿ ನೋಡಲು ಕೆಲವು ಮೆಚ್ಚಿನವುಗಳನ್ನು ಸೇರಿಸಿ",
    noBookings: "ಇನ್ನೂ ಯಾವುದೇ ಬುಕ್ಕಿಂಗ್‌ಗಳಿಲ್ಲ",
    bookingsMessage: "ನಿಮ್ಮ ಮುಂಬರುವ ಬುಕ್ಕಿಂಗ್‌ಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ",
    unreadMessages: "ಓದದ ಸಂದೇಶಗಳು",
    allRightsReserved: "ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ",
    featuredRestaurants: "ವಿಶೇಷ ರೆಸ್ಟೋರೆಂಟ್‌ಗಳು",
    price: "ಬೆಲೆ",
    rating: "ರೇಟಿಂಗ್",
    locationLabel: "ಸ್ಥಳ",
    updateLocation: "ಸ್ಥಳ ನವೀಕರಿಸಿ",
    useCurrentLocation: "ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ",
    searchCities: "ನಗರಗಳನ್ನು ಹುಡುಕಿ...",
    profileSettings: "ಪ್ರೊಫೈಲ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    displayName: "ಪ್ರದರ್ಶನ ಹೆಸರು",
    email: "ಇಮೇಲ್",
    locationSettings: "ಸ್ಥಳ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    languageSettings: "ಭಾಷಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    themeSettings: "ಥೀಮ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    lightModeDescription: "ಸಾಂಪ್ರದಾಯಿಕ ಪ್ರಕಾಶಮಾನ ಇಂಟರ್‌ಫೇಸ್",
    darkModeDescription: "ಕುಱೈನ್ನ ಬೆಳಕಿನಲ್ಲಿ ಕಣ್ಣುಗಳಿಗೆ ಸುಲಭ",
    noNotifications: "ಇತುವರೆ ಅಧಿಸೂಚನೆಗಳು ಎತುವುಮಿಲ್ಲ",
    notificationsDescription:
      "ನಿಮ್ಮ ಬುಕ್ಕಿಂಗ್‌ಗಳು, ಕಾರ್ಯಕ್ರಮಗಳು ಅಥವಾ ವಿಶೇಷ ಕೊಡುಗೆಗಳ ಬಗ್ಗೆ ನೀವು ಹೊಸ ಅಧಿಸೂಚನೆಗಳನ್ನು ಸ್ವೀಕರಿಸಿದಾಗ, ಅವು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ",
    cuisine: "ಆಹಾರ ಪದ್ಧತಿ",
    openNow: "ಈಗ ತೆರೆದಿದೆ",
    closed: "ಮೂಸಿದೆ",
    registered: "ನೋಂದಾಯಿತ",
    capacity: "ಕೊಳ್ಳಳವು",
    category: "ವರ್ಗ",
    date: "ದಿನಾಂಕ",
    time: "ಸಮಯ",
    achievements: "ಸಾಧನೆಗಳು",
    arMenu: "ಎಆರ್ ಮೆನು",
    gamification: "ಗೇಮಿಫಿಕೇಶನ್ ಮತ್ತು ಪ್ರತಿಫಲಗಳು",
    rewardsSystem: "ಪ್ರತಿಫಲ ವ್ಯವಸ್ಥೆ",
    cuisineExplorer: "ಪಾಕಪದ್ಧತಿ ಅನ್ವೇಷಕ",
    localHero: "ಸ್ಥಳೀಯ ಹೀರೋ",
    sustainableDiner: "ಸಮರ್ಥನೀಯ ಭೋಜನ",
    socialFoodie: "ಸಾಮಾಜಿಕ ಆಹಾರ ಪ್ರಿಯ",
    progress: "ಪ್ರಗತಿ",
    unlocked: "ಅನ್‌ಲಾಕ್ ಮಾಡಲಾಗಿದೆ",
    locked: "ಲಾಕ್ ಮಾಡಲಾಗಿದೆ",
    arExperience: "ಎಆರ್ ಅನುಭವ",
    scanMenu: "ಮೆನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    nutritionInfo: "ಪೌಷ್ಟಿಕಾಂಶದ ಮಾಹಿತಿ",
    ingredients: "ಪದಾರ್ಥಗಳು",
    cookingMethod: "ಅಡುಗೆ ವಿಧಾನ",
    myReviews: "ನನ್ನ ವಿಮರ್ಶೆಗಳು",
  },
  telugu: {
    welcome: "స్వాగతం",
    exploreRestaurants: "రెస్టారెంట్లను అన్వేషించండి",
    exploreEvents: "ఈవెంట్లను అన్వేషించండి",
    home: "హోం",
    bookings: "బుక్కింగ్స్",
    restaurants: "రెస్టారెంట్లు",
    events: "ఈవెంట్లు",
    favourites: "ఇష్టమైనవి",
    messages: "సందేశాలు",
    settings: "సెట్టింగ్స్",
    logout: "లాగ్అవుట్",
    lightMode: "లైట్ మోడ్",
    darkMode: "డార్క్ మోడ్",
    upcomingEvents: "రాబోయే ఈవెంట్లు",
    eventsDescription: "ఆసక్తికరమైన ఈవెంట్లను కనుగొని బుక్ చేయండి",
    welcomeMessage: "డైనింగోకు స్వాగతం",
    discoverMessage: "అద్భుత రెస్టారెంట్లు మరియు ఈవెంట్లను కనుగొనండి",
    searchPlaceholder: "రెస్టారెంట్లు లేదా ఈవెంట్లను వెతకండి...",
    language: "భాష",
    noFavorites: "ఇంకా ఇష్టమైనవి ఏవీ లేవు",
    addFavorites: "ఇక్కడ చూడటానికి కొన్ని ఇష్టమైనవి జోడించండి",
    noBookings: "ఇంకా బుక్కింగ్స్ ఏవీ లేవు",
    bookingsMessage: "మీ రాబోయే బుక్కింగ్స్ ఇక్కడ కనిపిస్తాయి",
    unreadMessages: "చదవని సందేశాలు",
    allRightsReserved: "అన్ని హక్కులు రక్షించబడ్డాయి",
    featuredRestaurants: "ఫీచర్డ్ రెస్టారెంట్లు",
    price: "ధర",
    rating: "రేటింగ్",
    locationLabel: "స్థానం",
    updateLocation: "సస్ధానాన్ని నవీకరించండి",
    useCurrentLocation: "ప్రస్తుత స్థానాన్ని ఉపయోగించండి",
    searchCities: "నగరాలను వెతకండి...",
    profileSettings: "ప్రొఫైల్ సెట్టింగ్స్",
    displayName: "ప్రదర్శన పేరు",
    email: "ఇమెయిల్",
    locationSettings: "స్థాన సెట్టింగ్‌లు",
    languageSettings: "భాష సెట్టింగ్‌లు",
    themeSettings: "థీమ్ సెట్టింగ్‌లు",
    lightModeDescription: "సాంప్రదాయ ప్రకాశవంతమైన ఇంటర్‌ఫేస్",
    darkModeDescription: "తక్కువ కాంతిలో కళ్లకు సౌకర్యవంతం",
    noNotifications: "ఇతువరె అధిసూచనెలు లేవు",
    notificationsDescription:
      "మీ బుక్కింగ్స్, ఈవెంట్స్ లేదా ప్రత్యేక ఆఫర్ల గురించి కొత్త అధిసૂచనెలు వచ్చినప్పుడు, అవి ఇక్కడ కనిపిస్తాయి",
    cuisine: "వంటకాలు",
    openNow: "ఇప్పుడు తెరిచి ఉంది",
    closed: "మూసివేయబడింది",
    registered: "నమోదు చేయబడింది",
    capacity: "సామర్థ్యం",
    category: "వర్గం",
    date: "తేదీ",
    time: "సమయం",
    achievements: "విజయాలు",
    arMenu: "ఏఆర్ మెనూ",
    gamification: "గేమిఫికేషన్ మరియు రివార్డ్స్",
    rewardsSystem: "రివార్డ్ సిస్టమ్",
    cuisineExplorer: "వంటకాల అన్వేషకుడు",
    localHero: "స్థానిక హీరో",
    sustainableDiner: "స్థిరమైన భోజనం",
    socialFoodie: "సామాజిక ఆహార ప్రియుడు",
    progress: "పురోగతి",
    unlocked: "అన్‌లాక్ చేయబడింది",
    locked: "లాక్ చేయబడింది",
    arExperience: "ఏఆర్ అనుభవం",
    scanMenu: "మెనూని స్కాన్ చేయండి",
    nutritionInfo: "పోషకాహార సమాచారం",
    ingredients: "కావలసిన పదార్థాలు",
    cookingMethod: "తయారీ విధానం",
    myReviews: "నా సమీక్షలు",
  },
  malayalam: {
    welcome: "സ്വാഗതം",
    exploreRestaurants: "റെസ്റ്റോറന്റുകൾ പര്യവേക്ഷണം ചെയ്യുക",
    exploreEvents: "ഇവന്റുകൾ പര്യവേക്ഷണം ചെയ്യുക",
    home: "ഹോം",
    bookings: "ബുക്കിംഗുകൾ",
    restaurants: "റെസ്റ്റോറന്റുകൾ",
    events: "ഇവന്റുകൾ",
    favourites: "പ്രിയപ്പെട്ടവ",
    messages: "സന്ദേശങ്ങൾ",
    settings: "സെറ്റിംഗുകൾ",
    logout: "ലോഗൗട്ട്",
    lightMode: "ലൈറ്റ് മോഡ്",
    darkMode: "ഡാർക്ക് മോഡ്",
    upcomingEvents: "വരാനിരിക്കുന്ന ഇവന്റുകൾ",
    eventsDescription: "രസകരമായ ഇവന്റുകൾ കണ്ടെത്തി ബുക്ക് ചെയ്യുക",
    welcomeMessage: "ഡൈനിംഗോയിലേക്ക് സ്വാഗതം",
    discoverMessage:
      "അതിശയിപ്പിക്കുന്ന റെസ്റ്റോറന്റുകളും ഇവന്റുകളും കണ്ടെത്തുക",
    searchPlaceholder: "റെസ്റ്റോറന്റുകൾ അല്ലെങ്കിൽ ഇവന്റുകൾ തിരയുക...",
    language: "ഭാഷ",
    noFavorites: "ഇതുവരെ പ്രിയപ്പെട്ടവ ഒന്നുമില്ല",
    addFavorites: "ഇവിടെ കാണാൻ ചില പ്രിയപ്പെട്ടവ ചേർക്കുക",
    noBookings: "ഇതുവരെ ബുക്കിംഗുകൾ ഒന്നുമില്ല",
    bookingsMessage: "നിങ്ങളുടെ വരാനിരിക്കുന്ന ബുക്കിംഗുകൾ ഇവിടെ കാണാം",
    unreadMessages: "വായിക്കാത്ത സന്ദേശങ്ങൾ",
    allRightsReserved: "എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം",
    featuredRestaurants: "പ്രത്യേക റെസ്റ്റോറന്റുകൾ",
    price: "വില",
    rating: "റേറ്റിംഗ്",
    locationLabel: "സ്ഥലം",
    updateLocation: "സ്ഥലം അപ്ഡേറ്റ് ചെയ്യുക",
    useCurrentLocation: "നിലവിലെ സ്ഥലം ഉപയോഗിക്കുക",
    searchCities: "നഗരങ്ങൾ തിരയുക...",
    profileSettings: "പ്രൊഫൈൽ സെറ്റിംഗുകൾ",
    displayName: "പ്രദർശന നാമം",
    email: "ഇമെയിൽ",
    locationSettings: "സ്ഥല സെറ്റിംഗുകൾ",
    languageSettings: "ഭാഷാ സെറ്റിംഗുകൾ",
    themeSettings: "തീം സെറ്റിംഗുകൾ",
    lightModeDescription: "ക്ലാസിക്ക് തെളിഞ്ഞ ഇന്റർഫേസ്",
    darkModeDescription: "കുറഞ്ഞ പ്രകാശത്തിൽ കണ്ണുകൾക്ക് സുഖകരം",
    noNotifications: "ഇതുവരെ അറിയിപ്പുകൾ ഒന്നുമില്ല",
    notificationsDescription:
      "നിങ്ങളുടെ ബുക്കിംഗുകൾ, ഇവന്റുകൾ അല്ലെങ്കിൽ പ്രത്യക ഓഫറുകൾ സംബന്ധിച്ച് പുതിയ അറിയിപ്പുകൾ ലഭിക്കുമ്പോൾ, അവ ഇവിടെ കാണാം",
    cuisine: "പാചകരീതി",
    openNow: "ഇപ്പോൾ തുറന്നിരിക്കുന്നു",
    closed: "അടച്ചിരിക്കുന്നു",
    registered: "നമോദീകരിച്ചത്",
    capacity: "ശേഷി",
    category: "വിഭാഗം",
    date: "തീയതി",
    time: "സമയം",
    achievements: "നേട്ടങ്ങൾ",
    arMenu: "എആർ മെനു",
    gamification: "ഗെയിമിഫിക്കേഷനും പുരസ്കാരങ്ങളും",
    rewardsSystem: "പുരസ്കാര സംവിധാനം",
    cuisineExplorer: "പാചക പര്യവേക്ഷകൻ",
    localHero: "പ്രാദേശിക നായകൻ",
    sustainableDiner: "സുസ്ഥിര ഭക്ഷണം",
    socialFoodie: "സാമൂഹിക ഭക്ഷണ പ്രേമി",
    progress: "പുരോഗതി",
    unlocked: "അൺലോക്ക് ചെയ്തു",
    locked: "ലോക്ക് ചെയ്തു",
    arExperience: "എആർ അനുഭവം",
    scanMenu: "മെനു സ്കാൻ ചെയ്യുക",
    nutritionInfo: "പോഷകാഹാര വിവരങ്ങൾ",
    ingredients: "ചേരുവകൾ",
    cookingMethod: "പാചക രീതി",
    myReviews: "എന്റെ അവലോകനങ്ങൾ",
  },
};

// Available Indian languages
const availableLanguages: { code: Language; name: string }[] = [
  { code: "english", name: "English" },
  { code: "hindi", name: "Hindi" },
  { code: "tamil", name: "Tamil" },
  { code: "kannada", name: "Kannada" },
  { code: "telugu", name: "Telugu" },
  { code: "malayalam", name: "Malayalam" },
];

// Use the imported Event type directly
type DashboardEvent = AppEvent;

interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: Date;
}

export interface Booking {
  _id?: string;
  id?: string;
  userId?: string;
  restaurantName: string;
  date: string;
  time: string;
  guests: string | number;
  table?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  occasion?: string;
  specialRequest?: string;
  status: string;
  createdAt?: string;
  // Add these for backend-populated fields
  restaurantId?: { name: string };
  eventId?: { title: string; name?: string };
  eventName?: string;
}

interface AvatarOption {
  id: string;
  src: string;
  alt: string;
}

// Add missing interfaces and constants
interface FavoriteItem {
  id: string;
  name: string;
  image: string;
  location: GeoLocation;
  type: "restaurant" | "event" | "location";
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

const defaultLocation: GeoLocation = {
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
};

// Add formatTimestamp function
const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
};
// Fallback avatar generation has been moved to InitialsAvatar component

// Add this function for generating fallback avatar URLs
const getAvatarUrl = (name: string | null | undefined): string => {
  if (!name || name.trim() === "") {
    name = "User";
  }

  // Use ui-avatars.com API to generate avatar
  const formattedName = encodeURIComponent(name.trim());
  return `https://ui-avatars.com/api/?name=${formattedName}&background=random&color=fff&size=200`;
};

// Helper to calculate personalization score for a restaurant
const getPersonalizationScore = (restaurant: any, preferences: any): number => {
  let score = 0;

  if (!preferences) return 0;

  // Cuisine matches
  if (restaurant.cuisine && preferences.cuisines) {
    restaurant.cuisine.forEach((c: string) => {
      const prefCuisine = preferences.cuisines.find(
        (pc: any) => pc.name.toLowerCase() === c.toLowerCase(),
      );
      if (prefCuisine) {
        score += prefCuisine.score || 50;
      }
    });
  }

  // Dietary preferences (Check if restaurant cuisines/tags match)
  // This is a bit complex without explicit dish tags, but we can boost matching types
  if (
    preferences.dietaryPreferences &&
    preferences.dietaryPreferences.length > 0
  ) {
    const dietaryMatch = restaurant.cuisine?.some((c: string) =>
      preferences.dietaryPreferences.some((dp: string) =>
        c.toLowerCase().includes(dp.toLowerCase()),
      ),
    );
    if (dietaryMatch) score += 30;
  }

  // Price match
  if (restaurant.priceLevel && preferences.averageSpend) {
    const estPrice = restaurant.priceLevel * 500;
    const diff = Math.abs(estPrice - preferences.averageSpend);
    if (diff < 500) score += 20;
  }

  return score;
};

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
  const [language, setLanguage] = useState<Language>("english");
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

  const { isEnabled } = useFeatureFlags();

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
      const { businessApi } = await import("../services/api");

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
    const { businessApi } = await import("../services/api");
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
    const { businessApi } = await import("../services/api");
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
    const { businessApi } = await import("../services/api");
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
    toast.error("Please log in to add favorites");
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
        toast.success(`Removed ${itemName} from favorites`);
      } else {
        await favoritesApi.addRestaurant(userData.uid, item.id);
        toast.success(`Added ${itemName} to favorites`);
      }
    } else {
      // Event
      if (
        favorites.some((fav) => fav.id === item.id && fav.type === "event")
      ) {
        await favoritesApi.removeEvent(userData.uid, item.id);
        toast.success(`Removed ${itemName} from favorites`);
      } else {
        await favoritesApi.addEvent(userData.uid, item.id);
        toast.success(`Added ${itemName} to favorites`);
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

  // Save language preference to MongoDB
  if (userData?.uid) {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/v1/users/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userData.uid,
            updates: {
              language: newLanguage,
            },
          }),
        },
      );

      if (response.ok) {

        toast.success(
          `Language changed to ${newLanguage.charAt(0).toUpperCase() + newLanguage.slice(1)}`,
          {
            autoClose: 2000,
          },
        );
      } else {
        console.error("Failed to save language preference");
      }
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
        const { userAPI } = await import("../services/api");
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
      toast.error("Invalid booking ID");
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

    toast.success(
      `Booking ${action === "delete" ? "deleted" : action + "ed"} successfully`,
    );
    fetchBookingsFromAPI();
  } catch (error) {
    console.error(`Error ${action}ing booking:`, error);
    toast.error(`Failed to ${action} booking. Please try again.`);
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

      setUserData((prev) =>
        prev
          ? {
            ...prev,
            location: {
              city: nearestCity.city,
              state: nearestCity.state,
              country: nearestCity.country,
            },
            uid: prev.uid,
            createdAt: prev.createdAt,
            lastLogin: new Date(),
          }
          : null,
      );

      // Save to localStorage
      localStorage.setItem(
        "dineInGoLocation",
        JSON.stringify({
          city: nearestCity.city,
          state: nearestCity.state,
          country: nearestCity.country,
        }),
      );

      // Close the modal
      setIsLocationModalOpen(false);
    }
  } catch (error) {
    console.error("Error detecting location:", error);
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
        toast.success(`Reservation confirmed at ${venueName}!`, {
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
          {translations[language].myReviews}
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
                        ★
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
          placeholder="Search cities..."
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
            Choose Your Identity
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
          Excavation Search Results
        </h1>

        {/* Territories (Restaurants) Results */}
        {filteredRestaurants.length > 0 && (
          <div className="mb-12">
            <h2
              className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"} mb-6 flex items-center gap-2`}
            >
              <Utensils size={24} className="text-emerald-500" />
              Territories Found
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
              Live Happenings
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
            <div className="text-6xl mb-4">🔦</div>
            <h3
              className={`text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} mb-2`}
            >
              No Fossils Found
            </h3>
            <p
              className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Our scanners couldn't find any "{searchTerm}" in this territory.
            </p>
          </div>
        )}
      </div>
    );
  }
  switch (section) {
    case "home":
      return (
        <div
          className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
        >
          {/* Premium Header 2.0: Immersive Greeting */}
          <div className="relative mb-12 group">
            <div
              className={`absolute inset-0 rounded-[3rem] overflow-hidden transition-all duration-700 ${isDarkMode ? "bg-zinc-900" : "bg-emerald-500"
                }`}
            >
              {/* Parallax / Layered Background Elements */}
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: [-15, -10, -15], scale: [0.8, 0.85, 0.8] }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px]"
              />
              <motion.div
                initial={{ rotate: 15, x: 0 }}
                animate={{ x: [0, 50, 0], rotate: [15, 20, 15] }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-yellow-400/20 rounded-full blur-[80px]"
              />

              {/* Decorative Pattern Layer */}
              <div
                className="absolute inset-0 opacity-[0.03] select-none pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "40px 40px",
                }}
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
                        ? "Morning Expedition"
                        : new Date().getHours() < 18
                          ? "Afternoon Scout"
                          : "Evening Hunt"}
                    </span>
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40 shadow-glow animate-pulse" />
                  <span className="text-white/70 text-sm font-black tracking-tight">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6 drop-shadow-2xl">
                  Hello, <br className="md:hidden" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/60">
                    {userData?.displayName?.split(" ")[0] || "Explorer"}!
                  </span>
                </h1>

                <p className="text-white/80 text-xl font-medium max-w-xl leading-relaxed">
                  Ready to track down the finest culinary fossils and local
                  legends in{" "}
                  <span className="text-white font-black underline decoration-yellow-400/60 transition-colors hover:decoration-yellow-400">
                    your territory?
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
                      Assigned Territory
                    </p>
                    <p className="text-white font-black text-3xl tracking-tight">
                      {typeof userData?.location === "object" &&
                        userData?.location &&
                        "city" in userData.location
                        ? userData.location.city
                        : "Global"}
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
                      Dino AI Personalization
                    </span>
                  </div>
                  <h2
                    className={`text-3xl md:text-4xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    How are you{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                      feeling
                    </span>{" "}
                    today?
                  </h2>
                  <p
                    className={`text-base font-medium mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Our paleontological algorithms will match your vibe with
                    perfection.
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
                      Algorithm Status
                    </p>
                    <p
                      className={`text-xs font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    >
                      1.2k Vibes Analyzed
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2 scroll-smooth">
                {[
                  {
                    id: "Social",
                    label: "Social",
                    icon: <Users size={20} />,
                    color: "from-blue-500 to-indigo-600",
                  },
                  {
                    id: "Chill",
                    label: "Chill",
                    icon: <Clock size={20} />,
                    color: "from-cyan-400 to-blue-500",
                  },
                  {
                    id: "Happy",
                    label: "Happy",
                    icon: <Smile size={20} />,
                    color: "from-yellow-400 to-orange-500",
                  },
                  {
                    id: "Romantic",
                    label: "Romantic",
                    icon: <Heart size={20} />,
                    color: "from-rose-400 to-pink-600",
                  },
                  {
                    id: "Adventurous",
                    label: "Adventurous",
                    icon: <Compass size={20} />,
                    color: "from-emerald-400 to-teal-600",
                  },
                  {
                    id: "Hungry",
                    label: "Hungry",
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
                  Expedition Hub
                </h2>
                <p
                  className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  Choose your excavation target
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
                      Restaurants
                    </h3>
                    <p
                      className={`text-base font-medium leading-relaxed max-w-[200px] ${homeSection === "restaurants" ? "text-emerald-50" : isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Find the world's rarest culinary excavation sites.
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
                      Events
                    </h3>
                    <p
                      className={`text-base font-medium leading-relaxed max-w-[200px] ${homeSection === "events" ? "text-purple-50" : isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Scout out live happenings across your territory.
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
                Featured Restaurants
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
                      🦖
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
                      🎟️
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
                  Help us build the perfect dining companion! Share your
                  feedback and help evaluate upcoming features. Your voice
                  matters in the Dino kingdom! 🦖✨
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
                    Take The Survey
                    <ArrowRight size={20} strokeWidth={3} />
                  </a>
                </div>
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${isDarkMode ? "text-emerald-400" : "text-black"}`}
                >
                  Estimated Time: 2 Minutes • Anonymous
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
    case "restaurants":
      return (
        <div
          className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} p-4 sm:p-8`}
        >
          <h1
            className={`text-4xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"} mb-8`}
          >
            All Restaurants
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
      return (
        <div
          className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} p-4 sm:p-8`}
        >
          <h1
            className={`text-4xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"} mb-8`}
          >
            All Events
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
                Culinary{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                  Expeditions
                </span>
              </h1>
              <p
                className={`text-lg font-medium mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Tracking your evolution across {bookings.length} excavation
                sites
              </p>
            </div>

            <div
              className={`px-5 py-3 rounded-2xl flex items-center gap-3 ${isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white border-emerald-100 shadow-lg shadow-emerald-500/5"} border-2`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Trophy size={20} />
              </div>
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.15em] ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
                >
                  Expedition Rank
                </p>
                <p
                  className={`text-sm font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  Lead Paleontologist
                </p>
              </div>
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
                    className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Dino Intelligence Reports
                  </h2>
                  <p
                    className={`text-sm font-semibold opacity-60 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Analyzing your historical eating patterns
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
                    {/* Subtitle/Category */}
                    <div
                      className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl bg-gradient-to-r ${insight.color} text-[10px] font-black uppercase tracking-[0.2em] text-white/80`}
                    >
                      Fossil Insight
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
                  {translations[language].noBookings}
                </h3>
                <p className="mb-6">
                  {translations[language].bookingsMessage}
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
                    {translations[language].exploreRestaurants}
                  </button>
                  <button
                    onClick={() => {
                      navigate("/");
                      setHomeSection("events");
                      setActiveSection("home");
                    }}
                    className="flex-1 px-6 py-3 rounded-xl text-lg font-semibold transition-colors bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    {translations[language].exploreEvents}
                  </button>
                </div>
              </div>

              {/* Additional featured restaurants section */}
              <div className="mb-8">
                <h2
                  className={`text-2xl font-semibold mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {translations[language].featuredRestaurants}
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
                    className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"} mb-1`}
                  >
                    Report an Issue
                  </h3>
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Found a bug or have feedback? Let us know!
                  </p>
                </div>
                <button
                  onClick={() => setShowReportIssueModal(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <AlertCircle className="w-5 h-5" />
                  Report Issue
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
                    Your Collection
                  </span>
                  <div className="h-1 w-1 rounded-full bg-white/60"></div>
                  <span className="text-pink-50 text-sm font-medium">
                    {favorites.length}{" "}
                    {favorites.length === 1 ? "Favorite" : "Favorites"}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-sm">
                  My Favorites
                </h1>
                <p className="text-pink-50 text-lg md:text-xl font-medium max-w-lg leading-relaxed opacity-90">
                  Your handpicked restaurants and events, all in one place
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
                        Total
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
                {translations[language].noFavorites}
              </h3>
              <p
                className={`text-center max-w-md ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {translations[language].addFavorites}
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
                        className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                      >
                        Favorite Restaurants
                      </h2>
                      <p
                        className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {favoriteRestaurants.length}{" "}
                        {favoriteRestaurants.length === 1
                          ? "restaurant"
                          : "restaurants"}
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
                        className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                      >
                        Favorite Events
                      </h2>
                      <p
                        className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {favoriteEvents.length}{" "}
                        {favoriteEvents.length === 1 ? "event" : "events"}
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
                className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
              >
                No notifications yet
              </h3>
              <p
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
              >
                You'll see notifications here when there are updates about
                your bookings, events, or other activities.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {translations[language].messages}
                </h2>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead()}
                    className={`px-4 py-2 rounded-lg ${isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-gray-200 hover:bg-gray-300"
                      } text-sm font-medium transition-colors`}
                  >
                    Mark all as read
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
          translations={translations[language]}
          userMood={userMood}
        />
      );
    case "ar-menu":
      if (!isEnabled('arMenus')) {
        setActiveSection('home');
        return null;
      }
      return (
        <ARMenuSection
          isDarkMode={isDarkMode}
          language={language}
          translations={translations[language]}
          menuItems={arMenuItems}
          isLoading={isArMenuItemsLoading}
        />
      );
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
            cookingMethod: "Sautéed",
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
        className={`fixed top-0 left-0 h-full w-[280px] transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
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
              <div className="text-2xl font-black tracking-tighter flex items-center">
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
                label: translations[language].home,
                icon: <Menu className="w-5 h-5" />,
              },
              {
                id: "bookings",
                label: translations[language].bookings,
                icon: <Calendar className="w-5 h-5" />,
              },
              {
                id: "restaurants",
                label: translations[language].restaurants,
                icon: <MapPin className="w-5 h-5" />,
              },
              {
                id: "events",
                label: translations[language].events,
                icon: <Globe className="w-5 h-5" />,
              },
              {
                id: "favorites",
                label: translations[language].favourites,
                icon: <Heart className="w-5 h-5" />,
              },
              {
                id: "achievements",
                label: translations[language].achievements,
                icon: <Trophy className="w-5 h-5" />,
              },
              {
                id: "ar-menu",
                label: translations[language].arMenu,
                icon: <Camera className="w-5 h-5" />,
              },
              {
                id: "reviews",
                label: translations[language].myReviews,
                icon: <MessageSquare className="w-5 h-5" />,
              },
              {
                id: "messages",
                label: translations[language].messages,
                icon: <Bell className="w-5 h-5" />,
              },
              {
                id: "settings",
                label: translations[language].settings,
                icon: <Settings className="w-5 h-5" />,
              },
            ].filter(item => {
              if (item.id === 'ar-menu') return isEnabled('arMenus');
              if (item.id === 'events') return isEnabled('events');
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
                <span className="ml-3 text-sm font-bold tracking-tight">
                  {label}
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
                    ? translations[language].darkMode
                    : translations[language].lightMode}
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
                {translations[language].logout}
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
        className={`min-h-screen transition-all duration-500 ease-in-out ${isSidebarOpen ? "lg:pl-72" : ""}`}
      >
        {/* Header */}
        <header className="px-3 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 sticky top-0 z-30">
          {/* Mobile Expanded Search */}
          {isSearchExpanded && (
            <div className="sm:hidden mb-3">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder={translations[language].searchPlaceholder}
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
                className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all flex-shrink-0 ${isDarkMode ? "bg-gray-800/50 hover:bg-gray-800 text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}
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
                  placeholder={translations[language].searchPlaceholder}
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
          <p>&copy;DineInGo2026 {translations[language].allRightsReserved}</p>
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
                Close
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
                  {markingAsRead ? "Marking..." : "Mark as Read"}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Check size={18} />
                  Already Read
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
            "🦖 RAWR! You found me! I was busy checking the kitchen for prehistoric snacks! ✨",
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
  </>
  );
}

