import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { User, UserAddress, LocationSettings } from '../types/user';
import { Loader2, User as LucideUser, X, MapPin, Globe, Moon, Sun, Camera, ChevronRight, Save, LogOut, Sliders, Laptop, Lock, Eye, EyeOff } from 'lucide-react';
import { getAuth, updateProfile, updatePassword, User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import socketService from '../utils/socketService';
import API_CONFIG from '../config/api';
import { DietaryAssistant } from './DietaryAssistant';
import { userPreferenceApi, userAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { applyLiquidGlass } from '../utils/liquidGlass';

// Type guard to check if user has Firebase Auth methods
const hasFirebaseAuth = (user: User | null): user is User & FirebaseUser => {
  return !!user && typeof (user as any).getIdToken === 'function';
};

// Helper function to create image from URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

// Helper function to get cropped image
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to match the cropped area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

interface FormDataState {
  displayName: string;
  name: string;
  phoneNumber: string;
  photoURL: string | null;
  address: UserAddress;
  locationSettings: LocationSettings;
  errors: Record<string, string>;
}

type PageType = 'dashboard' | 'settings' | 'checkout' | 'profile';
type Language = 'english' | 'hindi' | 'tamil' | 'kannada' | 'telugu' | 'malayalam';

interface ProfileSettingsProps {
  user: User | null;
  onUpdate?: (updates: Partial<User>) => Promise<void>;
  isDarkMode?: boolean;
  pageType?: PageType;
  // New props for integrated settings
  availableLanguages?: { code: string; name: string }[];
  currentLanguage?: string;
  onLanguageChange?: (code: Language) => void;
  currentTheme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
  onToggleTheme?: () => void;
  glassLevel?: number;
  onGlassLevelChange?: (level: number) => void;
}

type AuthenticatedUser = User & { getIdToken: () => Promise<string> };

// Function to generate avatar URL from name
const getAvatarUrl = (name: string | null | undefined): string => {
  if (!name || name.trim() === '') {
    name = "User";
  }
  const formattedName = encodeURIComponent(name.trim());
  let hash = 0;
  if (name) {
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  let color = Math.abs(hash).toString(16).substring(0, 6);
  while (color.length < 6) { color += '0'; }
  return `https://ui-avatars.com/api/?name=${formattedName}&background=${color}&color=ffffff&size=200`;
};

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user: propUser,
  onUpdate,
  isDarkMode = false,
  pageType = 'settings',
  availableLanguages = [],
  currentLanguage = 'en',
  onLanguageChange,
  currentTheme = 'system',
  onThemeChange,
  onToggleTheme,
  glassLevel = 100,
  onGlassLevelChange
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'app' | 'security'>('profile');
  const { t } = useLanguage();

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // State for loading and UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabIndicatorRef = useRef<HTMLDivElement>(null);

  // Get the actual Firebase user with auth methods - MUST BE BEFORE ANY CONDITIONAL RETURNS
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);

  // Form state with proper type safety
  const [formData, setFormData] = useState<FormDataState>(() => {
    const defaultAddress: UserAddress = {
      street: '', city: '', state: '', country: 'India', zipCode: ''
    };
    const defaultLocationSettings: LocationSettings = {
      type: 'auto', coordinates: null, address: '', city: '', state: '', country: 'India', zipCode: ''
    };
    return {
      displayName: propUser?.displayName || '',
      name: propUser?.name || '',
      phoneNumber: propUser?.phoneNumber || '',
      photoURL: propUser?.photoURL || null,
      address: propUser?.address || defaultAddress,
      locationSettings: propUser?.locationSettings || defaultLocationSettings,
      errors: {}
    };
  });

  // Cropper State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [filter, setFilter] = useState<string>('none');

  // ALL EFFECTS MUST BE BEFORE CONDITIONAL RETURNS
  useEffect(() => {
    let tabsLg: any = null;
    let indicatorLg: any = null;

    const computedBlur = 16 * (1 - glassLevel / 100);
    const baseScale = isDarkMode ? -110 : -75;
    const computedScale = baseScale * (glassLevel / 100);

    if (tabsRef.current) {
      tabsLg = applyLiquidGlass(tabsRef.current, {
        scale: computedScale,
        chroma: isDarkMode ? 5 : 2,
        border: 0.08,
        mapBlur: 14,
        blur: computedBlur,
        saturate: 1.6,
        radius: 35, // matches same capsule shape as footer
        fallbackBlur: computedBlur,
      });
    }

    if (activeTabIndicatorRef.current) {
      indicatorLg = applyLiquidGlass(activeTabIndicatorRef.current, {
        scale: (isDarkMode ? -75 : -55) * (glassLevel / 100),
        chroma: isDarkMode ? 4 : 2,
        border: 0.08,
        mapBlur: 10,
        blur: computedBlur,
        saturate: isDarkMode ? 1.3 : 1.1,
        radius: 20, // 40px height is radius 20px
        fallbackBlur: computedBlur,
      });
    }

    return () => {
      if (tabsLg) tabsLg.destroy();
      if (indicatorLg) indicatorLg.destroy();
    };
  }, [isDarkMode, glassLevel]);

  useEffect(() => {
    const firebaseAuth = getAuth();
    const unsubscribe = firebaseAuth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser && propUser && firebaseUser.uid === propUser.uid) {
        // Merge the Firebase user with prop user data
        // Use type assertion since we know propUser has the required fields
        setAuthUser({ ...propUser, ...firebaseUser, getIdToken: firebaseUser.getIdToken.bind(firebaseUser) } as AuthenticatedUser);
      } else if (firebaseUser) {
        // Use Firebase user directly if prop user not available
        // Create a compatible user object with required fields
        const compatibleUser = {
          _id: firebaseUser.uid,
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || '',
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          phoneNumber: firebaseUser.phoneNumber || '',
          photoURL: firebaseUser.photoURL,
          getIdToken: firebaseUser.getIdToken.bind(firebaseUser),
        } as AuthenticatedUser;
        setAuthUser(compatibleUser);
      } else {
        setAuthUser(null);
      }
    });

    return () => unsubscribe();
  }, [propUser]);

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!authUser) return;
    try {
      setIsLoading(true);
      const token = await authUser.getIdToken();
      const res = await fetch(API_CONFIG.getFullUrl(`/api/v1/profile/${authUser.uid}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 404) {
        // Profile doesn't exist yet - create one with current auth data
        console.log('Profile not found, using auth data');
        setFormData((prev) => ({
          ...prev,
          displayName: authUser.displayName || '',
          name: authUser.name || authUser.displayName || '',
          phoneNumber: authUser.phoneNumber || '',
          photoURL: authUser.photoURL || null,
        }));
        setPreviewUrl(authUser.photoURL || null);
        setIsLoading(false);
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch profile');
      const profile = await res.json();

      console.log('Loaded profile from DB:', profile);

      const avatarUrl = profile.currentAvatar || profile.avatarUrl || profile.photoURL;
      const fullAvatarUrl = avatarUrl ? API_CONFIG.getAssetUrl(avatarUrl) : null;
      
      setPreviewUrl(fullAvatarUrl);

      setFormData((prev) => {
        const updatedFormData = {
          ...prev,
          displayName: profile.displayName || prev.displayName || '',
          name: profile.fullName || profile.name || prev.name || '',
          phoneNumber: profile.phoneNumber || prev.phoneNumber || '',
          photoURL: fullAvatarUrl || prev.photoURL || null,
          address: profile.address || prev.address,
          locationSettings: profile.locationSettings || prev.locationSettings
        };
        
        console.log('[ProfileSettings] ✅ Address loaded from DB:', profile.address);
        console.log('[ProfileSettings] ✅ Location settings loaded:', profile.locationSettings);
        console.log('[ProfileSettings] ✅ Updated formData.address:', updatedFormData.address);
        
        return updatedFormData;
      });

      try {
        const prefs = await userPreferenceApi.get(authUser.uid);
        if (prefs?.data) setUserPreferences(prefs.data);
      } catch (e) { console.error('Error loading preferences:', e); }

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  // Real-time updates
  useEffect(() => {
    if (!authUser?.uid) return;
    const socket = socketService.connect();
    const handleProfileUpdate = (data: any) => {
      if (data.uid === authUser.uid) {
        // Update logic same as before...
        loadUserData(); // Simplification: just reload
      }
    };
    socket?.on('profile_updated', handleProfileUpdate);
    return () => { socket?.off('profile_updated', handleProfileUpdate); };
  }, [authUser?.uid, loadUserData]);

  // Initial load
  useEffect(() => { 
    if (authUser) {
      loadUserData(); 
    }
  }, [loadUserData, authUser]);

  // OpenStreetMap Autocomplete (Primary) with Google Maps Fallback
  useEffect(() => {
    console.log('[ProfileSettings] Autocomplete useEffect triggered. isEditMode:', isEditMode);
    
    if (!isEditMode) {
      console.log('[ProfileSettings] Not in edit mode, skipping autocomplete setup');
      return;
    }

    const input = document.getElementById('address-autocomplete') as HTMLInputElement;
    console.log('[ProfileSettings] Looking for input element:', input);
    
    if (!input) {
      console.error('[ProfileSettings] Address input element not found!');
      return;
    }

    console.log('[ProfileSettings] Setting up OpenStreetMap autocomplete on input:', input);

    let debounceTimeout: NodeJS.Timeout;
    let suggestionsDiv = document.getElementById('osm-suggestions');
    let osmFailed = false;
    
    // Create suggestions dropdown if it doesn't exist
    if (!suggestionsDiv) {
      suggestionsDiv = document.createElement('div');
      suggestionsDiv.id = 'osm-suggestions';
      suggestionsDiv.style.cssText = `
        position: absolute;
        z-index: 1000;
        background: ${isDarkMode ? '#1f2937' : 'white'};
        border: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
        border-radius: 0.75rem;
        margin-top: 0.25rem;
        max-height: 300px;
        overflow-y: auto;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        display: none;
        width: ${input.offsetWidth}px;
      `;
      input.parentElement?.appendChild(suggestionsDiv);
    }

    const handleInput = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      
      console.log('[ProfileSettings] Address input changed:', value);
      
      clearTimeout(debounceTimeout);
      
      if (value.length < 3) {
        console.log('[ProfileSettings] Value too short, hiding suggestions');
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
        return;
      }

      debounceTimeout = setTimeout(async () => {
        // Try OpenStreetMap first
        try {
          console.log('[ProfileSettings] Trying OpenStreetMap autocomplete...');
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=in,us,gb,ae,sg`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'DineInGo/1.0'
              }
            }
          );

          if (!response.ok) throw new Error('Nominatim API error');

          const results = await response.json();
          
          if (results.length === 0) {
            console.log('[ProfileSettings] No OSM results, falling back to Google Maps...');
            tryGoogleMapsAutocomplete(value);
            return;
          }

          console.log('[ProfileSettings] Using OpenStreetMap results');
          displayOSMResults(results);
        } catch (error) {
          console.error('[ProfileSettings] OpenStreetMap error, falling back to Google Maps:', error);
          tryGoogleMapsAutocomplete(value);
        }
      }, 500);
    };

    function tryGoogleMapsAutocomplete(query: string) {
      if ((window as any).google?.maps?.places) {
        console.log('[ProfileSettings] Falling back to Google Maps autocomplete');
        // Google Maps will handle autocomplete via its own listener
        // Just show a message that we're using fallback
      } else {
        console.log('[ProfileSettings] Google Maps not available');
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
        toast.info('Address lookup unavailable. Please enter manually.');
      }
    }

    function displayOSMResults(results: any[]) {
      if (!suggestionsDiv) return;

      suggestionsDiv.innerHTML = results.map((result: any, index: number) => `
        <div 
          data-index="${index}" 
          class="osm-suggestion-item"
          style="
            padding: 0.75rem 1rem;
            cursor: pointer;
            border-bottom: 1px solid ${isDarkMode ? '#374151' : '#f3f4f6'};
            color: ${isDarkMode ? '#e5e7eb' : '#1f2937'};
            transition: background-color 0.2s;
          "
        >
          <div style="font-weight: 500; font-size: 0.875rem;">${result.display_name}</div>
          <div style="font-size: 0.75rem; color: ${isDarkMode ? '#9ca3af' : '#6b7280'}; margin-top: 0.25rem;">
            <span style="
              padding: 2px 8px;
              border-radius: 9999px;
              background: ${isDarkMode ? '#10b981/20' : '#d1fae5'};
              color: ${isDarkMode ? '#10b981' : '#059669'};
              font-size: 0.65rem;
              font-weight: 600;
            ">OSM</span>
            ${result.type ? ' • ' + result.type.charAt(0).toUpperCase() + result.type.slice(1) : 'Address'}
          </div>
        </div>
      `).join('');

      // Update width
      suggestionsDiv.style.width = `${input.offsetWidth}px`;
      suggestionsDiv.style.display = 'block';

      // Add click handlers
      suggestionsDiv.querySelectorAll('.osm-suggestion-item').forEach((elem) => {
        elem.addEventListener('mouseenter', () => {
          (elem as HTMLElement).style.backgroundColor = isDarkMode ? '#374151' : '#f9fafb';
        });
        elem.addEventListener('mouseleave', () => {
          (elem as HTMLElement).style.backgroundColor = 'transparent';
        });
        elem.addEventListener('click', () => {
          const index = parseInt(elem.getAttribute('data-index') || '0');
          const selected = results[index];
          handleOSMAddressSelected(selected);
          if (suggestionsDiv) suggestionsDiv.style.display = 'none';
        });
      });
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsDiv && !input.contains(e.target as Node) && !suggestionsDiv.contains(e.target as Node)) {
        suggestionsDiv.style.display = 'none';
      }
    };

    function handleOSMAddressSelected(result: any) {
      const address = result.address || {};
      const street = [address.house_number, address.road].filter(Boolean).join(' ') || 
                    [address.suburb, address.neighbourhood].filter(Boolean)[0] ||
                    result.display_name.split(',')[0];
      const city = address.city || address.town || address.village || address.municipality || '';
      const state = address.state || address.region || '';
      const zipCode = address.postcode || '';
      const country = address.country || '';

      console.log('[ProfileSettings] OSM Address selected:', { street, city, state, zipCode, country });

      setFormData(prev => ({
        ...prev,
        address: {
          street: street || prev.address.street,
          city: city || prev.address.city,
          state: state || prev.address.state,
          zipCode: zipCode || prev.address.zipCode,
          country: country || prev.address.country || 'India',
        },
        locationSettings: {
          ...prev.locationSettings,
          type: 'manual',
          coordinates: result.lat && result.lon ? {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          } : prev.locationSettings.coordinates,
          address: result.display_name,
          city,
          state,
          zipCode,
          country: country || 'India',
        }
      }));
    }

    // Setup Google Maps autocomplete as fallback
    let googleAutocomplete: any = null;
    if ((window as any).google?.maps?.places) {
      try {
        googleAutocomplete = new (window as any).google.maps.places.Autocomplete(input, {
          types: ['address'],
          componentRestrictions: { country: ['in', 'us', 'gb', 'ae', 'sg'] },
        });

        googleAutocomplete.addListener('place_changed', () => {
          const place = googleAutocomplete.getPlace();
          
          if (!place.address_components) {
            console.log('[ProfileSettings] No Google address components found');
            return;
          }

          handleGooglePlaceSelected(place);
          if (suggestionsDiv) suggestionsDiv.style.display = 'none';
        });

        console.log('[ProfileSettings] Google Maps fallback ready');
      } catch (error) {
        console.error('[ProfileSettings] Google Maps initialization failed:', error);
      }
    }

    function handleGooglePlaceSelected(place: any) {
      let street = '';
      let city = '';
      let state = '';
      let zipCode = '';
      let country = '';

      for (const component of place.address_components) {
        const types = component.types;

        if (types.includes('street_number')) {
          street = component.long_name + ' ' + street;
        }
        if (types.includes('route')) {
          street += component.long_name;
        }
        if (types.includes('locality') || types.includes('administrative_area_level_2')) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (types.includes('postal_code')) {
          zipCode = component.long_name;
        }
        if (types.includes('country')) {
          country = component.long_name;
        }
      }

      console.log('[ProfileSettings] Google Places selected (fallback):', { street, city, state, zipCode, country });

      setFormData(prev => ({
        ...prev,
        address: {
          street: street || place.formatted_address || '',
          city: city || prev.address.city,
          state: state || prev.address.state,
          zipCode: zipCode || prev.address.zipCode,
          country: country || prev.address.country || 'India',
        },
        locationSettings: {
          ...prev.locationSettings,
          type: 'manual',
          coordinates: place.geometry?.location ? {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          } : prev.locationSettings.coordinates,
          address: place.formatted_address || street,
          city,
          state,
          zipCode,
          country: country || 'India',
        }
      }));
    }

    input.addEventListener('input', handleInput);
    document.addEventListener('click', handleClickOutside);

    return () => {
      clearTimeout(debounceTimeout);
      input.removeEventListener('input', handleInput);
      document.removeEventListener('click', handleClickOutside);
      
      // Clean up Google Maps
      if (googleAutocomplete && (window as any).google?.maps?.event) {
        (window as any).google.maps.event.clearInstanceListeners(googleAutocomplete);
      }
      
      // Clean up suggestions dropdown
      const osmSuggestions = document.getElementById('osm-suggestions');
      if (osmSuggestions) {
        osmSuggestions.remove();
      }
    };
  }, [isEditMode, isDarkMode]);

  const showCropModal = (file: File) => {
    setSelectedImage(file);
    setCropModalOpen(true);
    // Remove focus from the file input button to prevent aria-hidden warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // File handling
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    showCropModal(file);
  }, [authUser]);

  // Validation
  const validateIndianPhoneNumber = (phoneNumber: string) => /^[6-9]\d{9}$/.test(phoneNumber.replace(/\D/g, ''));

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    console.log('Validating form data:', {
      name: formData.name,
      phoneNumber: formData.phoneNumber,
      displayName: formData.displayName
    });
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
      console.error('Name validation failed');
    }
    
    // Only validate phone number if it's provided
    if (formData.phoneNumber.trim()) {
      const cleanPhone = formData.phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length > 0 && !validateIndianPhoneNumber(formData.phoneNumber)) {
        errors.phoneNumber = 'Valid Indian phone number required (10 digits starting with 6-9)';
        console.error('Phone validation failed:', formData.phoneNumber);
      }
    }
    
    console.log('Validation errors:', errors);
    setFormData(prev => ({ ...prev, errors }));
    
    if (Object.keys(errors).length > 0) {
      const errorMessage = Object.values(errors).join(', ');
      return errorMessage;
    }
    
    return null;
  }, [formData]);

  // Input Change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        if ((parent === 'address' || parent === 'locationSettings') && child) {
          return { ...prev, [parent]: { ...prev[parent as keyof FormDataState] as any, [child]: value } };
        }
      }
      return { ...prev, [name]: value, errors: { ...prev.errors, [name]: '' } };
    });
  }, []);

  // Save Logic (simplified for readability, mostly same as original but cleaner)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authUser) {
      toast.error('Not authenticated');
      return;
    }
    
    console.log('[ProfileSettings] Form submitted, validating...');
    const validationError = validateForm();
    
    if (validationError) {
      console.error('[ProfileSettings] Validation failed:', validationError);
      toast.error(validationError);
      return;
    }
    
    console.log('[ProfileSettings] Validation passed, starting save...');

    try {
      setIsLoading(true);

      // 1. Avatar Upload if needed
      let avatarUrl = formData.photoURL;

      if ((formData as any)._pendingAvatarBlob) {
        setIsUploading(true);
        
        try {
          // Convert blob to base64
          const blob = (formData as any)._pendingAvatarBlob;
          
          // Check blob size (limit to 5MB)
          if (blob.size > 5 * 1024 * 1024) {
            throw new Error('Image too large. Please use an image smaller than 5MB.');
          }
          
          const reader = new FileReader();
          
          const base64Promise = new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Image conversion timeout'));
            }, 30000); // 30 second timeout
            
            reader.onloadend = () => {
              clearTimeout(timeout);
              resolve(reader.result as string);
            };
            reader.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Failed to read image'));
            };
            reader.readAsDataURL(blob);
          });
          
          const base64Image = await base64Promise;
          console.log('[ProfileSettings] Converted image to base64, length:', base64Image.length);
          
          // Send base64 to backend with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
          
          const token = await authUser.getIdToken();
          const res = await fetch(API_CONFIG.getFullUrl(`/api/v1/profile/${authUser.uid}/avatar`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ base64Image }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Avatar upload failed');
          }
          
          const data = await res.json();
          avatarUrl = API_CONFIG.getAssetUrl(data.profile?.currentAvatar || data.avatarUrl);
          
          console.log('[ProfileSettings] Avatar uploaded successfully:', avatarUrl);
          toast.success('Avatar uploaded successfully');
        } catch (uploadError: any) {
          console.error('[ProfileSettings] Avatar upload error:', uploadError);
          
          if (uploadError.name === 'AbortError') {
            toast.error('Avatar upload timeout. Please try a smaller image.');
          } else {
            toast.error(uploadError.message || 'Failed to upload avatar');
          }
          
          // Continue with profile update even if avatar fails
          setIsUploading(false);
        }
      }

      // 2. Prepare Updates
      const updates: any = {
        displayName: formData.displayName.trim(),
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
        photoURL: avatarUrl,
        currentAvatar: avatarUrl,
        address: formData.address,
        locationSettings: formData.locationSettings,
        updatedAt: new Date().toISOString()
      };

      console.log('[ProfileSettings] Saving profile updates:', updates);

      // 3. Update Firebase Auth
      const firebaseAuth = getAuth();
      if (firebaseAuth.currentUser) {
        await updateProfile(firebaseAuth.currentUser, {
          displayName: updates.displayName, photoURL: updates.photoURL
        });
        console.log('[ProfileSettings] Firebase auth updated');
        
        // Also update custom backend/mongo
        const result = await userAPI.updateUser(authUser.uid, updates);
        console.log('[ProfileSettings] Backend DB updated:', result);
      }

      toast.success('Profile updated successfully');
      setIsEditMode(false);
      
      // Reload the data from database to confirm save
      console.log('[ProfileSettings] Reloading profile data from DB...');
      await loadUserData();
      
      if (onUpdate) {
        await onUpdate(updates);
      }

      // Clear pending blob
      setFormData(prev => {
        const { _pendingAvatarBlob, ...rest } = prev as any;
        return rest;
      });

    } catch (error) {
      console.error('[ProfileSettings] Save error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  // Location Detect with Reverse Geocoding (OpenStreetMap Primary, Google Maps Fallback)
  const handleLocationDetect = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    
    setIsLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        console.log('[ProfileSettings] Location detected:', { lat, lng });
        
        // Update coordinates first
        setFormData(prev => ({
          ...prev,
          locationSettings: {
            ...prev.locationSettings,
            type: 'auto',
            coordinates: { lat, lng }
          }
        }));

        // Try OpenStreetMap reverse geocoding first
        try {
          console.log('[ProfileSettings] Trying OpenStreetMap reverse geocoding...');
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'DineInGo/1.0'
              }
            }
          );

          if (!response.ok) throw new Error('Nominatim reverse geocoding failed');

          const result = await response.json();
          const address = result.address || {};
          
          const street = [address.house_number, address.road].filter(Boolean).join(' ') || result.display_name.split(',')[0];
          const city = address.city || address.town || address.village || '';
          const state = address.state || '';
          const zipCode = address.postcode || '';
          const country = address.country || '';

          console.log('[ProfileSettings] OpenStreetMap reverse geocoded:', { street, city, state, zipCode, country });

          setFormData(prev => ({
            ...prev,
            address: {
              street: street || prev.address.street,
              city: city || prev.address.city,
              state: state || prev.address.state,
              zipCode: zipCode || prev.address.zipCode,
              country: country || prev.address.country || 'India',
            },
            locationSettings: {
              ...prev.locationSettings,
              type: 'auto',
              coordinates: { lat, lng },
              address: result.display_name,
              city,
              state,
              zipCode,
              country: country || 'India',
            }
          }));
          
          toast.success('Location and address detected via OpenStreetMap');
          setIsLoading(false);
        } catch (osmError) {
          console.error('[ProfileSettings] OpenStreetMap reverse geocoding failed, trying Google Maps fallback:', osmError);
          
          // Fallback to Google Maps reverse geocoding
          if ((window as any).google?.maps) {
            try {
              console.log('[ProfileSettings] Using Google Maps reverse geocoding (fallback)...');
              const geocoder = new (window as any).google.maps.Geocoder();
              const latlng = { lat, lng };
              
              geocoder.geocode({ location: latlng }, (results: any[], status: string) => {
                if (status === 'OK' && results && results[0]) {
                  const place = results[0];
                  let street = '';
                  let city = '';
                  let state = '';
                  let zipCode = '';
                  let country = '';

                  for (const component of place.address_components) {
                    const types = component.types;

                    if (types.includes('street_number')) {
                      street = component.long_name + ' ' + street;
                    }
                    if (types.includes('route')) {
                      street += component.long_name;
                    }
                    if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                      city = component.long_name;
                    }
                    if (types.includes('administrative_area_level_1')) {
                      state = component.long_name;
                    }
                    if (types.includes('postal_code')) {
                      zipCode = component.long_name;
                    }
                    if (types.includes('country')) {
                      country = component.long_name;
                    }
                  }

                  console.log('[ProfileSettings] Google Maps reverse geocoded (fallback):', { street, city, state, zipCode, country });

                  setFormData(prev => ({
                    ...prev,
                    address: {
                      street: street || place.formatted_address || prev.address.street,
                      city: city || prev.address.city,
                      state: state || prev.address.state,
                      zipCode: zipCode || prev.address.zipCode,
                      country: country || prev.address.country || 'India',
                    },
                    locationSettings: {
                      ...prev.locationSettings,
                      type: 'auto',
                      coordinates: { lat, lng },
                      address: place.formatted_address,
                      city,
                      state,
                      zipCode,
                      country: country || 'India',
                    }
                  }));
                  
                  toast.success('Location and address detected via Google Maps');
                  setIsLoading(false);
                } else {
                  toast.success('Location detected (address lookup failed)');
                  setIsLoading(false);
                }
              });
            } catch (googleError) {
              console.error('[ProfileSettings] Google Maps reverse geocoding also failed:', googleError);
              toast.success('Location detected (address lookup failed)');
              setIsLoading(false);
            }
          } else {
            console.log('[ProfileSettings] Google Maps not available for fallback');
            toast.success('Location detected (address lookup failed)');
            setIsLoading(false);
          }
        }
      },
      (err) => {
        console.error('[ProfileSettings] Geolocation error:', err);
        setIsLoading(false);
        toast.error('Location detection failed');
      }
    );
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    try {
      setIsChangingPassword(true);

      // 1. Update in Backend Database (Verify current password)
      const res = await userAPI.changePassword(authUser.uid, currentPassword, newPassword);
      
      if (!res.success) {
        throw new Error(res.message || 'Failed to update password in database');
      }

      // 2. Update in Firebase Auth
      const firebaseAuth = getAuth();
      if (firebaseAuth.currentUser) {
        try {
          await updatePassword(firebaseAuth.currentUser, newPassword);
        } catch (firebaseError: any) {
          if (firebaseError.code === 'auth/requires-recent-login') {
            toast.warning('Security: Please log out and log back in to finalize this change.');
          } else {
            console.error('Firebase password update failed:', firebaseError);
            toast.error('Internal DB updated, but Firebase sync failed. Please contact support.');
          }
        }
      }

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // --- Render Helpers ---

  const renderTabButton = (id: typeof activeTab, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        className={`relative flex-1 flex items-center justify-center w-full h-11 rounded-full transition-all duration-300 select-none z-20 ${
          isActive
            ? isDarkMode ? 'text-white font-bold scale-102' : 'text-emerald-700 font-bold scale-102'
            : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <span className="relative z-10 flex items-center justify-center gap-1.5 md:gap-2">
          {icon}
          <span className="hidden sm:inline whitespace-nowrap">{label}</span>
        </span>
      </button>
    );
  };

  const activeIndex = activeTab === 'profile' ? 0 : 
                      activeTab === 'preferences' ? 1 : 
                      activeTab === 'app' ? 2 : 3;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} -m-4 md:-m-8 p-4 md:p-8`}>
      {/* Premium Header Card with Gradient */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-8 md:p-10 mb-8 shadow-2xl shadow-emerald-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/10 shadow-sm">
                Profile & Settings
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-sm">
              Manage Your Account
            </h1>
            <p className="text-emerald-50 text-base md:text-lg font-medium max-w-lg leading-relaxed opacity-90">
              Update your personal information and preferences
            </p>
          </div>

          {!isEditMode && activeTab === 'profile' && (
            <button
              onClick={() => setIsEditMode(true)}
              className="group relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 rounded-2xl px-6 py-4 min-w-[160px] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shadow-inner">
                  <LucideUser size={20} />
                </div>
                <div>
                  <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-0.5">{t('action')}</p>
                  <p className="text-white font-bold text-base leading-none">{t('editProfile')}</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <div className={`rounded-[2.5rem] overflow-hidden shadow-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200/50'
        } backdrop-blur-md`}>

        {/* Tabs Segmented Control Dock */}
        <div className="px-4 py-4 md:px-8 md:py-6 max-w-2xl mx-auto w-full">
          <div
            ref={tabsRef}
            className="w-full h-[58px] grid grid-cols-4 items-center px-1.5 relative"
            style={{
              borderRadius: "35px",
              background: isDarkMode
                ? "linear-gradient(180deg, rgba(20, 20, 25, 0.75), rgba(10, 10, 15, 0.9))"
                : "linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(245, 245, 250, 0.8))",
              boxShadow: isDarkMode
                ? `
                  0 12px 40px rgba(0, 0, 0, 0.4),
                  inset 0 1px 0px rgba(255, 255, 255, 0.35),
                  inset 0 0 0 1px rgba(255, 255, 255, 0.1)
                `
                : `
                  0 12px 40px rgba(0, 0, 0, 0.08),
                  inset 0 1px 0px rgba(255, 255, 255, 0.8),
                  inset 0 0 0 1px rgba(0, 0, 0, 0.08)
                `,
            }}
          >
            {/* Persistent Sliding Active Indicator Capsule */}
            <div className="absolute inset-x-1.5 top-0 bottom-0 pointer-events-none z-10">
              <motion.div
                className="absolute top-0 bottom-0 left-0 w-[25%] flex items-center justify-center"
                animate={{ x: `${activeIndex * 100}%` }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              >
                <div
                  ref={activeTabIndicatorRef}
                  className="w-[92%] h-10 rounded-full"
                  style={{
                    background: isDarkMode 
                      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08))"
                      : "linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))",
                    boxShadow: isDarkMode
                      ? `
                        inset 0 1px 0px rgba(255, 255, 255, 0.5),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.2),
                        0 4px 12px rgba(0, 0, 0, 0.3)
                      `
                      : `
                        inset 0 1px 0px rgba(255, 255, 255, 0.9),
                        inset 0 0 0 1px rgba(0, 0, 0, 0.08),
                        0 4px 12px rgba(0, 0, 0, 0.08)
                      `,
                  }}
                />
              </motion.div>
            </div>

            {/* Main Buttons */}
            {renderTabButton('profile', t('personalInfo'), <LucideUser size={18} />)}
            {renderTabButton('preferences', t('preferences'), <Sliders size={18} />)}
            {renderTabButton('app', t('appSettings'), <Save size={18} />)}
            {renderTabButton('security', t('security'), <Lock size={18} />)}
          </div>
        </div>


        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <form onSubmit={handleSubmit}>
                  {/* Profile Picture */}
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                      <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${isDarkMode ? 'border-gray-700' : 'border-white'} shadow-2xl`}>
                        {previewUrl ? (
                          <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <LucideUser size={40} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                          </div>
                        )}
                      </div>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-1 right-1 p-2.5 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-transform hover:scale-105 active:scale-95"
                        >
                          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleFileChange} />
                    </div>

                    <div className="text-center md:text-left space-y-2">
                      <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formData.displayName || 'User'}
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formData.name || 'Set your full name'}
                      </p>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = getAvatarUrl(formData.displayName);
                            setFormData(prev => ({ ...prev, photoURL: url }));
                            setPreviewUrl(url);
                          }}
                          className="text-xs text-emerald-500 font-semibold hover:text-emerald-400"
                        >
                          Generate Avatar from Name
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('fullName')}</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={!isEditMode}
                        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                          formData.errors.name ? 'border-red-500' : ''
                        } ${isDarkMode
                          ? 'bg-gray-900/50 border-gray-700 text-white focus:border-emerald-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                      />
                      {formData.errors.name && (
                        <p className="text-red-500 text-sm">{formData.errors.name}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('phoneNumber')}</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        disabled={!isEditMode}
                        placeholder="+91"
                        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                          formData.errors.phoneNumber ? 'border-red-500' : ''
                        } ${isDarkMode
                          ? 'bg-gray-900/50 border-gray-700 text-white focus:border-emerald-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                      />
                      {formData.errors.phoneNumber && (
                        <p className="text-red-500 text-sm">{formData.errors.phoneNumber}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('emailAddress')}</label>
                      <input
                        type="email"
                        name="email"
                        value={authUser?.email || ''}
                        disabled
                        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode
                          ? 'bg-gray-900/50 border-gray-700 text-gray-400'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                          } opacity-60 cursor-not-allowed`}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t('emailLockedNote')}
                      </p>
                    </div>

                    {/* Address form fields... simplified for this specific user request to "enhance UI" */}
                    <div className="md:col-span-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('deliveryAddress')}</h4>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={handleLocationDetect}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                            Auto Detect
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 relative">
                          <input
                            type="text"
                            id="address-autocomplete"
                            name="address.street"
                            value={formData.address.street}
                            onChange={handleChange}
                            disabled={!isEditMode}
                            placeholder={!isEditMode && !formData.address.street ? "No address set" : "Start typing your address..."}
                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400'
                              } disabled:opacity-60`}
                          />
                        </div>
                        <input
                          type="text"
                          name="address.city"
                          value={formData.address.city}
                          onChange={handleChange}
                          disabled={!isEditMode}
                          placeholder={!isEditMode && !formData.address.city ? "No city" : "City"}
                          className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400'
                            } disabled:opacity-60`}
                        />
                        <input
                          type="text"
                          name="address.state"
                          value={formData.address.state}
                          onChange={handleChange}
                          disabled={!isEditMode}
                          placeholder={!isEditMode && !formData.address.state ? "No state" : "State"}
                          className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400'
                            } disabled:opacity-60`}
                        />
                        <input
                          type="text"
                          name="address.zipCode"
                          value={formData.address.zipCode}
                          onChange={handleChange}
                          disabled={!isEditMode}
                          placeholder={!isEditMode && !formData.address.zipCode ? "No ZIP" : "ZIP Code"}
                          className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400'
                            } disabled:opacity-60`}
                        />
                        <input
                          type="text"
                          name="address.country"
                          value={formData.address.country}
                          onChange={handleChange}
                          disabled={!isEditMode}
                          placeholder={!isEditMode && !formData.address.country ? "No country" : "Country"}
                          className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 placeholder:text-gray-400'
                            } disabled:opacity-60`}
                        />
                      </div>
                    </div>
                  </div>

                  {isEditMode && (
                    <div className="flex gap-4 pt-6">
                      <button
                        type="submit"
                        disabled={isLoading || isUploading}
                        className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isLoading || isUploading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                        {isUploading ? 'Uploading Avatar...' : isLoading ? 'Saving...' : t('saveChanges')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsEditMode(false); loadUserData(); }}
                        disabled={isLoading || isUploading}
                        className={`px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <div>
                      <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('dietaryPreferences')}</h3>
                      <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Customize your dining experience. We'll prioritize food that matches your lifestyle.
                      </p>
                      <DietaryAssistant
                        userPreferences={userPreferences?.dietaryPreferences || []}
                        onPreferenceChange={async (prefs) => {
                          if (!authUser) return;
                          const updated = { ...userPreferences, userId: authUser.uid, dietaryPreferences: prefs };
                          await userPreferenceApi.upsert(updated);
                          setUserPreferences(updated);
                          toast.success('Preferences updated');
                        }}
                      />
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('cuisineInterests')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {userPreferences?.cuisines?.length > 0 ? (
                          userPreferences.cuisines.map((c: any) => (
                            <div key={c.name} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              }`}>
                              <span className="font-medium text-sm">{c.name}</span>
                              <button
                                type="button"
                                className="hover:text-red-500 transition-colors"
                                onClick={async () => {
                                  const updatedCuisines = userPreferences.cuisines.filter((u: any) => u.name !== c.name);
                                  const updated = { ...userPreferences, cuisines: updatedCuisines };
                                  await userPreferenceApi.upsert(updated);
                                  setUserPreferences(updated);
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">Explore restaurants to build your taste profile!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'app' && (
                <motion.div
                  key="app"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Appearance */}
                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                          {currentTheme === 'dark' ? <Moon size={24} /> : currentTheme === 'light' ? <Sun size={24} /> : <Laptop size={24} />}
                        </div>
                        <div>
                          <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('appearance')}</h4>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {currentTheme === 'system' ? t('deviceMode') : `${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} Mode Active`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                        <button
                          type="button"
                          onClick={() => onThemeChange?.('light')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border ${currentTheme === 'light'
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg'
                            : isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Sun size={20} />
                          <span className="text-xs font-bold">Light</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => onThemeChange?.('dark')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border ${currentTheme === 'dark'
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg'
                            : isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Moon size={20} />
                          <span className="text-xs font-bold">Dark</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => onThemeChange?.('system')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border ${currentTheme === 'system'
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg'
                            : isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Laptop size={20} />
                          <span className="text-xs font-bold">Device</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Liquid Glass Customizer */}
                  <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                          <Sliders size={24} />
                        </div>
                        <div>
                          <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Liquid Glass Customizer</h4>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Adjust refraction optics from frosted matte to pure crystal glass
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <span>Matte (Frosted)</span>
                          <span className={isDarkMode ? "text-emerald-400" : "text-emerald-600"}>
                            {glassLevel}% {glassLevel === 0 ? "(Matte)" : glassLevel === 100 ? "(Pure)" : ""}
                          </span>
                          <span>Pure (Refractive)</span>
                        </div>
                        <div className="relative flex items-center h-8">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={glassLevel}
                            aria-label="Liquid glass intensity"
                            aria-valuetext={`${glassLevel}%`}
                            onChange={(e) => onGlassLevelChange?.(parseInt(e.target.value, 10))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none transition-all"
                            style={{
                              background: `linear-gradient(to right, #10b981 0%, #10b981 ${glassLevel}%, ${
                                isDarkMode ? "#374151" : "#e5e7eb"
                              } ${glassLevel}%, ${isDarkMode ? "#374151" : "#e5e7eb"} 100%)`,
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className={`text-xs p-3 rounded-xl leading-relaxed ${
                        isDarkMode ? "bg-gray-800/40 text-gray-400" : "bg-gray-100 text-gray-500"
                      }`}>
                        ⚙️ <strong className={isDarkMode ? "text-white" : "text-gray-900"}>How it works:</strong> At 0% the system uses a standard Apple frosted backdrop blur (`blur: 16px`). As you slide toward 100%, the blur reduces to 0px while the displacement refraction maps increase, creating a crystal-clear liquid glass lens.
                      </div>
                    </div>
                  </div>

                  {/* Language */}
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-600'}`}>
                        <Globe size={24} />
                      </div>
                      <div>
                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('language')}</h4>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('selectPreferredLanguage')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {availableLanguages.map(lang => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => onLanguageChange?.(lang.code as Language)}
                          className={`py-2 px-4 rounded-xl text-sm font-semibold transition-all border ${currentLanguage === lang.code
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                            : isDarkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location Manual/Auto */}
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          <MapPin size={24} />
                        </div>
                        <div>
                          <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('autoDetectLocation')}</h4>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t('useGpsDescription')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLocationDetect}
                        className={`relative w-14 h-8 rounded-full transition-colors ${formData.locationSettings.type === 'auto' ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                      >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${formData.locationSettings.type === 'auto' ? 'translate-x-6' : 'translate-x-0'
                          }`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="text-center md:text-left">
                      <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('security')}</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('securitySettingsDescription')}
                      </p>
                    </div>

                    <form onSubmit={handlePasswordChangeSubmit} className="space-y-5">
                      {/* Current Password */}
                      <div className="space-y-2">
                        <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('currentPassword')}</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border outline-none transition-all ${isDarkMode
                              ? 'bg-gray-900/50 border-gray-700 text-white focus:border-red-500'
                              : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                              }`}
                            required
                          />
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div className="space-y-2">
                        <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('newPassword')}</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t('passwordLengthHint')}
                            className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border outline-none transition-all ${isDarkMode
                              ? 'bg-gray-900/50 border-gray-700 text-white focus:border-emerald-500'
                              : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                              }`}
                            required
                          />
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div className="space-y-2">
                        <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('confirmNewPassword')}</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('repeatPasswordHint')}
                            className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition-all ${isDarkMode
                              ? 'bg-gray-900/50 border-gray-700 text-white focus:border-emerald-500'
                              : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                              }`}
                            required
                          />
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full mt-4 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:shadow-none"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isChangingPassword ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            {t('processing')}
                          </>
                        ) : (
                          <>
                            <Save size={20} />
                            {t('updatePassword')}
                          </>
                        )}
                      </motion.button>
                    </form>

                    <div className={`p-5 rounded-2xl border flex items-start gap-4 ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-100 text-amber-800'
                      }`}>
                      <div className={`shrink-0 p-2 rounded-lg ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-200/50'}`}>
                        <Lock size={20} className="text-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm">{t('proTipTitle')}</p>
                        <p className="text-xs leading-relaxed opacity-80">
                          {t('proTipDescription')}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        {/* Cropper Modal */}
        <Dialog 
          open={cropModalOpen} 
          onClose={() => setCropModalOpen(false)} 
          maxWidth="sm" 
          fullWidth
          disableRestoreFocus
          disableEnforceFocus={false}
        >
          <DialogContent style={{ position: 'relative', height: 400, background: isDarkMode ? '#222' : '#fff' }}>
            {selectedImage && (
              <>
                <Cropper
                  image={URL.createObjectURL(selectedImage)}
                  crop={crop} zoom={zoom} aspect={1}
                  onCropChange={setCrop} onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                  style={{ mediaStyle: { filter } }}
                />
                <div style={{ 
                  position: 'absolute', 
                  bottom: 20, 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  width: '80%',
                  zIndex: 1000
                }}>
                  <div style={{ 
                    background: 'rgba(0,0,0,0.5)', 
                    padding: '10px 20px', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ color: 'white', fontSize: '14px', minWidth: '40px' }}>Zoom</span>
                    <Slider
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      onChange={(_, value) => setZoom(value as number)}
                      sx={{
                        color: '#10b981',
                        '& .MuiSlider-thumb': {
                          width: 20,
                          height: 20,
                        }
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCropModalOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!selectedImage || !croppedAreaPixels) return;
              
              try {
                // Get the cropped image as a blob
                const croppedBlob = await getCroppedImg(
                  URL.createObjectURL(selectedImage),
                  croppedAreaPixels
                );
                
                // Store the blob in formData for upload on save
                setFormData(prev => ({
                  ...prev,
                  _pendingAvatarBlob: croppedBlob
                } as any));
                
                // Create preview URL
                const previewUrl = URL.createObjectURL(croppedBlob);
                setPreviewUrl(previewUrl);
                
                // Close modal
                setCropModalOpen(false);
                
                toast.success('Avatar ready! Click Save to upload.');
              } catch (error) {
                console.error('Error cropping image:', error);
                toast.error('Failed to crop image');
              }
            }} variant="contained" style={{ background: '#10b981', color: 'white' }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default ProfileSettings;
