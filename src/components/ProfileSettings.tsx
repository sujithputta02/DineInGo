import * as React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { User, UserAddress, LocationSettings } from '@/types/user';
import { Camera, Loader2, User as LucideUser } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Cropper from 'react-easy-crop';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import socketService from '../utils/socketService';
import API_CONFIG from '../config/api';

// Type guard to check if user has Firebase Auth methods
const hasFirebaseAuth = (user: User | null): user is User & FirebaseUser => {
  return !!user && typeof (user as any).getIdToken === 'function';
};

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

interface ProfileSettingsProps {
  user: User | null;
  onUpdate?: (updates: Partial<User>) => Promise<void>;
  isDarkMode?: boolean;
  pageType?: PageType;
}

type AuthenticatedUser = User & { getIdToken: () => Promise<string> };

// Function to generate avatar URL from name
const getAvatarUrl = (name: string | null | undefined): string => {
  if (!name || name.trim() === '') {
    name = "User";
  }

  // Use ui-avatars.com API to generate avatar
  const formattedName = encodeURIComponent(name.trim());

  // Generate a consistent color based on name
  let hash = 0;
  if (name) {
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
  }

  // Convert hash to a hex color
  let color = Math.abs(hash).toString(16).substring(0, 6);
  // Ensure color is 6 digits
  while (color.length < 6) {
    color += '0';
  }

  return `https://ui-avatars.com/api/?name=${formattedName}&background=${color}&color=ffffff&size=200`;
};

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user: propUser,
  onUpdate,
  isDarkMode = false,
  pageType = 'settings',
}) => {
  // Define styles based on page type
  const pageStyles = useMemo(() => {
    const baseStyles = {
      container: {
        padding: '1.5rem',
        borderRadius: '0.5rem',
        margin: '0 auto',
        maxWidth: '100%',
      },
      title: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1.5rem',
      },
      form: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1.5rem',
      },
    };

    switch (pageType) {
      case 'dashboard':
        return {
          ...baseStyles,
          container: {
            ...baseStyles.container,
            padding: '1rem',
            backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          },
          title: {
            ...baseStyles.title,
            fontSize: '1.25rem',
            marginBottom: '1rem',
          },
        };
      case 'checkout':
        return {
          ...baseStyles,
          container: {
            ...baseStyles.container,
            padding: '1.25rem',
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
          },
        };
      case 'profile':
        return {
          ...baseStyles,
          container: {
            ...baseStyles.container,
            maxWidth: '48rem',
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        };
      case 'settings':
      default:
        return {
          ...baseStyles,
          container: {
            ...baseStyles.container,
            maxWidth: '56rem',
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            padding: '2rem',
          },
        };
    }
  }, [pageType, isDarkMode]);
  // State for loading and UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Type guard to ensure user has required methods
  const authUser = useMemo<AuthenticatedUser | null>(() => {
    if (!propUser) return null;
    return propUser as AuthenticatedUser;
  }, [propUser]);

  // Form state with proper type safety
  const [formData, setFormData] = useState<FormDataState>(() => {
    const defaultAddress: UserAddress = {
      street: '',
      city: '',
      state: '',
      country: 'India',
      zipCode: ''
    };

    const defaultLocationSettings: LocationSettings = {
      type: 'auto',
      coordinates: null,
      address: '',
      city: '',
      state: '',
      country: 'India',
      zipCode: ''
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

  // Ensure we return a valid JSX element
  if (!authUser) {
    return <div>Please sign in to view profile settings</div>;
  }

  // Load user data from Firestore when component mounts or user changes
  const loadUserData = useCallback(async () => {
    if (!authUser) return;
    try {
      setIsLoading(true);
      // Get user data from backend profile API
      const res = await fetch(`/api/profile/${authUser.uid}`);
      if (res.status === 404) {
        // Auto-create a new profile if not found
        await fetch(`/api/profile/${authUser.uid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: authUser.uid,
            displayName: authUser.displayName || '',
            name: authUser.displayName || '',
            phoneNumber: '',
            avatars: [],
            currentAvatar: null,
            address: {},
          })
        });
        toast.success('Profile created!');
        return loadUserData();
      }
      if (!res.ok) throw new Error('Failed to fetch profile');
      const profile = await res.json();
      console.log('Loaded profile data:', profile);

      // Get avatar URL with full backend URL
      const avatarUrl = profile.currentAvatar || profile.avatarUrl || profile.photoURL;
      const fullAvatarUrl = API_CONFIG.getAssetUrl(avatarUrl);

      console.log('Avatar URL:', fullAvatarUrl);
      setPreviewUrl(fullAvatarUrl);

      setFormData((prev: FormDataState) => ({
        ...prev,
        displayName: profile.displayName || prev.displayName,
        name: profile.fullName || profile.name || prev.name,
        phoneNumber: profile.phoneNumber || prev.phoneNumber,
        photoURL: fullAvatarUrl || prev.photoURL,
        address: profile.address || prev.address,
      }));
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  // Real-time profile updates via Socket.IO
  useEffect(() => {
    if (!authUser?.uid) return;

    const socket = socketService.connect();

    const handleProfileUpdate = (data: any) => {
      if (data.uid === authUser.uid) {
        const profile = data.profile;
        setPreviewUrl(profile.currentAvatar || profile.avatarUrl || null);
        setFormData((prev: FormDataState) => ({
          ...prev,
          displayName: profile.displayName || prev.displayName,
          name: profile.fullName || prev.name,
          phoneNumber: profile.phoneNumber || prev.phoneNumber,
          photoURL: profile.currentAvatar || profile.avatarUrl || prev.photoURL,
          address: profile.address || prev.address,
        }));
      }
    };

    socket.on('profile_updated', handleProfileUpdate);

    return () => {
      // Only remove the listener, don't disconnect
      socket.off('profile_updated', handleProfileUpdate);
    };
  }, [authUser?.uid]);

  // Handle file upload
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

  // Validate Indian phone number (more lenient validation)
  const validateIndianPhoneNumber = useCallback((phoneNumber: string): boolean => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    return /^[6-9]\d{9}$/.test(cleaned);
  }, []);

  // Format phone number for display
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');

    // Format as +91 XXXXXXXXXX
    if (cleaned.length <= 2) return `+${cleaned}`;
    if (cleaned.length <= 12) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 12)}`;
  };

  // Validate form
  const validateForm = useCallback((): string | null => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!validateIndianPhoneNumber(formData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid Indian phone number';
    }

    setFormData(prev => ({
      ...prev,
      errors
    }));

    return Object.keys(errors).length > 0 ? 'Please fix the errors in the form' : null;
  }, [formData, validateIndianPhoneNumber]);

  // Prepare user updates for submission
  const prepareUserUpdates = useCallback(() => {
    const updates: any = {
      displayName: formData.displayName.trim(),
      name: formData.name.trim(),
      photoURL: formData.photoURL, // Preserve null to use initials
      currentAvatar: formData.photoURL, // Set currentAvatar same as photoURL
      phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
      address: {
        street: formData.address?.street?.trim() || '',
        city: formData.address?.city?.trim() || '',
        state: formData.address?.state?.trim() || '',
        country: formData.address?.country?.trim() || 'India',
        zipCode: formData.address?.zipCode?.trim() || '',
      },
      locationSettings: {
        type: formData.locationSettings?.type || 'manual',
        coordinates: formData.locationSettings?.coordinates || null,
        address: formData.locationSettings?.address?.trim() || '',
        city: formData.locationSettings?.city?.trim() || '',
        state: formData.locationSettings?.state?.trim() || '',
        country: formData.locationSettings?.country?.trim() || 'India',
        zipCode: formData.locationSettings?.zipCode?.trim() || '',
        searchRadius: formData.locationSettings?.searchRadius || 10
      },
      updatedAt: new Date().toISOString()
    };
    return updates;
  }, [formData]);

  // Save user data to MongoDB via API
  const saveUserData = useCallback(async (updates: Partial<User>) => {
    if (!authUser) {
      const error = 'No user found in saveUserData';
      console.error(error);
      throw new Error(error);
    }

    try {
      console.log('Preparing user data for MongoDB...');

      // Get Firebase ID token from Firebase Auth (not from the prop user)
      const firebaseAuth = getAuth();
      const currentUser = firebaseAuth.currentUser;

      if (!currentUser) {
        throw new Error('No authenticated user found. Please sign in again.');
      }

      const idToken = await currentUser.getIdToken().catch(tokenError => {
        console.error('Error getting ID token:', tokenError);
        throw new Error('Failed to authenticate. Please try signing in again.');
      });

      // Prepare user data for MongoDB
      const userData = {
        userId: authUser.uid, // Changed from _id to userId to match API expectation
        updates: {
          displayName: (updates.displayName || authUser.displayName || '').trim(),
          name: (updates.name || '').trim(),
          phoneNumber: updates.phoneNumber || '',
          photoURL: updates.photoURL || authUser.photoURL || null,
          address: {
            street: (updates.address?.street || '').trim(),
            city: (updates.address?.city || '').trim(),
            state: (updates.address?.state || '').trim(),
            country: (updates.address?.country || 'India').trim(),
            zipCode: (updates.address?.zipCode || '').trim()
          },
          locationSettings: updates.locationSettings || {}
        }
      };

      // Validate required fields
      if (!userData.updates.name) {
        throw new Error('Name is required');
      }
      if (!userData.updates.phoneNumber) {
        throw new Error('Phone number is required');
      }
      if (!validateIndianPhoneNumber(userData.updates.phoneNumber)) {
        throw new Error('Please enter a valid Indian phone number');
      }

      console.log('Sending user data to API...');

      // Log the data that would be sent to the API
      console.log('User data to be saved:', JSON.stringify(userData, null, 2));

      // Make API call to save to MongoDB
      const apiUrl = '/api/users/update';
      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });

      const responseText = await response.text();
      console.log('API Response Status:', response.status);
      console.log('API Response:', responseText);

      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(
          responseData.error ||
          responseData.message ||
          `Failed to save user data (${response.status} ${response.statusText})`
        );
      }

      console.log('User data successfully saved to MongoDB');
      return true;

      // Uncomment the following code when the API endpoint is ready
      /*
      // Make API call to save to MongoDB
      const apiUrl = '/api/users/update';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });
      
      const responseText = await response.text();
      console.log('API Response Status:', response.status);
      console.log('API Response:', responseText);
      
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        throw new Error(
          responseData.message || 
          `Failed to save user data (${response.status} ${response.statusText})`
        );
      }
      
      console.log('User data successfully saved to MongoDB');
      return true;
      */

    } catch (error) {
      console.error('Error in saveUserData:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }, [authUser]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      let avatarUrl = formData.photoURL;
      let avatarsArr: string[] = [];
      // If a new avatar blob is pending, upload it first
      if ((formData as any)._pendingAvatarBlob && authUser) {
        setIsUploading(true);
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('avatar', (formData as any)._pendingAvatarBlob, 'avatar.jpg');

          const res = await fetch(`${API_CONFIG.BASE_URL}/api/profile/${authUser.uid}/avatar`, {
            method: 'POST',
            body: formDataUpload,
          });

          if (!res.ok) {
            const errorText = await res.text();
            console.error('Avatar upload failed:', errorText);
            throw new Error('Failed to upload avatar');
          }

          const data = await res.json();
          console.log('Avatar upload response:', data);

          // Get the avatar URL with full backend URL
          const relativeUrl = data.profile?.currentAvatar || data.avatarUrl;
          avatarUrl = API_CONFIG.getAssetUrl(relativeUrl);

          // Get avatars array with full URLs
          avatarsArr = (data.profile?.avatars || []).map((url: string) =>
            API_CONFIG.getAssetUrl(url)
          ).filter(Boolean) as string[];

          console.log('Avatar URL:', avatarUrl);
          console.log('Avatars array:', avatarsArr);
        } catch (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          toast.error('Failed to upload avatar. Please try again.');
          throw uploadError;
        } finally {
          setIsUploading(false);
        }
      }
      // Prepare updates
      const updates = prepareUserUpdates();
      updates.photoURL = avatarUrl;
      updates.currentAvatar = avatarUrl; // Set currentAvatar

      // Add avatarUrl to avatars array if not present
      if (avatarUrl) {
        if (!avatarsArr.length) {
          avatarsArr = [avatarUrl];
        } else if (!avatarsArr.includes(avatarUrl)) {
          avatarsArr.push(avatarUrl);
        }
        updates.avatars = avatarsArr;
      }

      console.log('Prepared updates:', updates);
      // Update profile in Firebase Auth if display name or photo URL changed
      const firebaseAuth = getAuth();
      const currentUser = firebaseAuth.currentUser;

      if (currentUser) {
        try {
          await updateProfile(currentUser, {
            displayName: updates.displayName || currentUser.displayName || undefined,
            photoURL: updates.photoURL
          });
        } catch (authError) {
          console.error('Error updating Firebase Auth profile:', authError);
          toast.warning('Profile updated, but could not update authentication details');
        }
      }
      // Save user data to MongoDB
      const saved = await saveUserData(updates);
      if (saved) {
        toast.success('Profile updated successfully!');
        if (onUpdate) {
          // Create user update object, filtering out undefined values
          const userUpdate: any = {
            uid: authUser.uid,
            email: authUser.email || '',
            emailVerified: false,
          };

          // Only add defined values from updates
          const updatesAny = updates as any;
          if (updates.displayName !== undefined) userUpdate.displayName = updates.displayName;
          if (updates.name !== undefined) userUpdate.name = updates.name;
          if (updates.photoURL !== undefined) userUpdate.photoURL = updates.photoURL;
          if (updates.phoneNumber !== undefined) userUpdate.phoneNumber = updates.phoneNumber;
          if (updates.address !== undefined) userUpdate.address = updates.address;
          if (updates.locationSettings !== undefined) userUpdate.locationSettings = updates.locationSettings;
          if (updates.avatars !== undefined) userUpdate.avatars = updates.avatars;
          if (updatesAny.currentAvatar !== undefined) userUpdate.currentAvatar = updatesAny.currentAvatar;

          try {
            await onUpdate(userUpdate as User);
          } catch (updateError) {
            console.error('Error in onUpdate callback:', updateError);
            // Don't fail the entire operation if onUpdate fails
          }
        }
        // Remove pending avatar blob from state
        setFormData(prev => {
          const { _pendingAvatarBlob, ...rest } = prev as any;
          return rest;
        });

        // Switch back to view mode after successful save
        setIsEditMode(false);

        return true;
      }
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while updating your profile';
      toast.error(errorMessage);
      setFormData(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          form: errorMessage
        },
        isSubmitting: false
      }));
      return false;
    } finally {
      setFormData(prev => ({
        ...prev,
        isSubmitting: false
      }));
    }
  };

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [filter, setFilter] = useState<string>('none');

  // Polling for real-time profile updates
  useEffect(() => {
    if (!authUser) return;
    const interval = setInterval(() => {
      loadUserData();
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [authUser, loadUserData]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCropModal = (file: File) => {
    setSelectedImage(file);
    setCropModalOpen(true);
  };

  const getCroppedImg = async (imageSrc: string, crop: any, filter: string) => {
    const createImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    // Apply filter
    ctx.filter = filter;
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas is empty'));
      }, 'image/jpeg');
    });
  };

  // Only update preview and local form state on crop save
  const handleCropSave = useCallback(async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    setIsUploading(true);
    try {
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedImage);
      });
      const croppedBlob = await getCroppedImg(imageDataUrl, croppedAreaPixels, filter);
      // Create a preview URL for the cropped image
      const previewUrl = URL.createObjectURL(croppedBlob);
      setPreviewUrl(previewUrl);
      setFormData(prev => ({ ...prev, photoURL: previewUrl, _pendingAvatarBlob: croppedBlob }));
      setCropModalOpen(false);
      setSelectedImage(null);
    } catch (err) {
      toast.error('Failed to crop avatar');
    } finally {
      setIsUploading(false);
    }
  }, [selectedImage, croppedAreaPixels, filter]);

  // Pre-validate image URL before setting as preview
  const setSafePreviewUrl = (url: string) => {
    const img = new window.Image();
    img.onload = () => setPreviewUrl(url);
    img.onerror = () => {
      const avatarUrl = getAvatarUrl(formData.displayName || formData.name);
      setPreviewUrl(avatarUrl);
      setFormData(prev => ({
        ...prev,
        photoURL: avatarUrl
      }));
    };
    img.src = url;
  };

  // Handle form input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: FormDataState) => {
      // Handle nested fields (address.* and locationSettings.*)
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        if ((parent === 'address' || parent === 'locationSettings') && child) {
          return {
            ...prev,
            [parent]: {
              ...prev[parent],
              [child]: value
            },
            errors: {
              ...prev.errors,
              [name]: ''
            }
          };
        }
      }
      // Handle regular fields
      return {
        ...prev,
        [name]: value,
        errors: {
          ...prev.errors,
          [name]: ''
        }
      };
    });
  }, []);

  // Toggle location type between auto and manual
  const toggleLocationType = useCallback(() => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      locationSettings: {
        ...prev.locationSettings,
        type: prev.locationSettings.type === 'auto' ? 'manual' : 'auto',
      },
    }));
  }, []);

  // Handle location detection
  const handleLocationDetect = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    try {
      setIsLoading(true);
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      setFormData((prev: FormDataState) => ({
        ...prev,
        locationSettings: {
          ...prev.locationSettings,
          type: 'auto',
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        },
      }));
      toast.success('Location detected successfully!');
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Failed to detect location. Please try again or enter manually.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Render the form
  return (
    <div
      style={pageStyles.container}
      className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 style={pageStyles.title} className="mb-0">
          {pageType === 'dashboard' ? 'Profile' : 'Profile Settings'}
        </h1>

        {!isEditMode && (
          <button
            type="button"
            onClick={() => setIsEditMode(true)}
            className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6663 1.44775C12.914 1.44775 13.1592 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17513 14.3137 2.383 14.4084 2.61178C14.5032 2.84055 14.552 3.08575 14.552 3.33337C14.552 3.58099 14.5032 3.82619 14.4084 4.05497C14.3137 4.28374 14.1748 4.49161 13.9997 4.66671L5.33301 13.3334L1.33301 14.6667L2.66634 10.6667L11.333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={pageStyles.form}>
        {/* Profile Picture Upload */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            {previewUrl ? (
              <img
                src={typeof previewUrl === 'string' ? previewUrl : ''}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <LucideUser className="w-12 h-12 text-gray-400" />
              </div>
            )}
            {isEditMode && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors border-2 border-white"
                style={{ transform: 'translate(30%, 30%)' }}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 4V16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <path d="M4 10H16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={isUploading || !isEditMode}
            />
          </div>
          <div>
            <h2 className="text-lg font-medium">Profile Picture</h2>
            <p className="text-sm text-gray-500">Recommended size: 200x200 pixels</p>
            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  // Generate avatar URL based on name
                  const avatarUrl = getAvatarUrl(formData.displayName || formData.name);

                  // Update form data with the generated avatar URL
                  setFormData(prev => ({
                    ...prev,
                    photoURL: avatarUrl
                  }));
                  setSafePreviewUrl(avatarUrl);

                  // Update Firebase Auth if available
                  const firebaseAuth = getAuth();
                  const currentUser = firebaseAuth.currentUser;

                  if (currentUser) {
                    updateProfile(currentUser, {
                      photoURL: avatarUrl
                    }).then(() => {
                      toast.success("Using generated avatar");
                    }).catch(err => {
                      console.error("Error setting generated avatar:", err);
                    });
                  }
                }}
                className={`mt-2 px-3 py-1 text-sm rounded-md transition-colors ${!previewUrl || previewUrl.includes('ui-avatars.com')
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-gray-200 hover:bg-gray-300"
                  }`}
              >
                {!previewUrl || previewUrl.includes('ui-avatars.com') ? "Using Initials" : "Use Initials Avatar"}
              </button>
            )}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium mb-1">
            Display Name
          </label>
          {isEditMode ? (
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName || ""}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${formData.errors.displayName ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your display name"
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
              {formData.displayName || "Not set"}
            </div>
          )}
          {formData.errors.displayName && (
            <p className="mt-1 text-sm text-red-600">{formData.errors.displayName}</p>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full Name *
          </label>
          {isEditMode ? (
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${formData.errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your full name"
              required
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
              {formData.name || "Not set"}
            </div>
          )}
          {formData.errors.name && (
            <p className="mt-1 text-sm text-red-600">{formData.errors.name}</p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
            Phone Number *
          </label>
          {isEditMode ? (
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber || ""}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${formData.errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your phone number"
              required
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
              {formData.phoneNumber || "Not set"}
            </div>
          )}
          {formData.errors.phoneNumber && (
            <p className="mt-1 text-sm text-red-600">{formData.errors.phoneNumber}</p>
          )}
        </div>

        {/* Address Section */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-medium mb-4">Address</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="address.street" className="block text-sm font-medium mb-1">
                Street Address
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  id="address.street"
                  name="address.street"
                  value={formData.address.street || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter street address"
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                  {formData.address.street || "Not set"}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="address.city" className="block text-sm font-medium mb-1">
                City
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  id="address.city"
                  name="address.city"
                  value={formData.address.city || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter city"
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                  {formData.address.city || "Not set"}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="address.state" className="block text-sm font-medium mb-1">
                State
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  id="address.state"
                  name="address.state"
                  value={formData.address.state || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter state"
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                  {formData.address.state || "Not set"}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="address.zipCode" className="block text-sm font-medium mb-1">
                ZIP Code
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  id="address.zipCode"
                  name="address.zipCode"
                  value={formData.address.zipCode || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter ZIP code"
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                  {formData.address.zipCode || "Not set"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location Settings */}
        {isEditMode && (
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Location Settings</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm">
                  {formData.locationSettings.type === 'auto' ? 'Automatic' : 'Manual'}
                </span>
                <button
                  type="button"
                  onClick={toggleLocationType}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${formData.locationSettings.type === 'auto' ? 'bg-blue-500' : 'bg-gray-200'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.locationSettings.type === 'auto' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            </div>

            {formData.locationSettings.type === 'auto' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  We'll use your device's location to find restaurants near you.
                </p>
                <button
                  type="button"
                  onClick={handleLocationDetect}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isLoading ? 'Detecting...' : 'Detect My Location'}
                </button>
                {formData.locationSettings.coordinates && (
                  <div className="mt-2 text-sm">
                    <p>Latitude: {formData.locationSettings.coordinates.lat.toFixed(6)}</p>
                    <p>Longitude: {formData.locationSettings.coordinates.lng.toFixed(6)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="locationSettings.address" className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="locationSettings.address"
                    name="locationSettings.address"
                    value={formData.locationSettings.address || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter your address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="locationSettings.city" className="block text-sm font-medium mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="locationSettings.city"
                      name="locationSettings.city"
                      value={formData.locationSettings.city || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label htmlFor="locationSettings.state" className="block text-sm font-medium mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      id="locationSettings.state"
                      name="locationSettings.state"
                      value={formData.locationSettings.state || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter state"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="locationSettings.country" className="block text-sm font-medium mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      id="locationSettings.country"
                      name="locationSettings.country"
                      value={formData.locationSettings.country || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter country"
                    />
                  </div>

                  <div>
                    <label htmlFor="locationSettings.zipCode" className="block text-sm font-medium mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      id="locationSettings.zipCode"
                      name="locationSettings.zipCode"
                      value={formData.locationSettings.zipCode || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter ZIP code"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="locationSettings.searchRadius" className="block text-sm font-medium mb-1">
                    Search Radius (km)
                  </label>
                  <input
                    type="number"
                    id="locationSettings.searchRadius"
                    name="locationSettings.searchRadius"
                    value={formData.locationSettings.searchRadius !== undefined && formData.locationSettings.searchRadius !== null ? String(formData.locationSettings.searchRadius) : ""}
                    onChange={handleChange}
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter search radius in kilometers"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button - Only show in edit mode */}
        {isEditMode && (
          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false);
                // Reload data to discard changes
                loadUserData();
              }}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </form>

      {/* Cropper Modal */}
      <Dialog open={cropModalOpen} onClose={() => setCropModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent style={{ position: 'relative', height: 400, background: isDarkMode ? '#222' : '#fff' }}>
          <div className="flex gap-2 mb-2 justify-center">
            <button type="button" className={`px-2 py-1 rounded ${filter === 'none' ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`} onClick={() => setFilter('none')}>None</button>
            <button type="button" className={`px-2 py-1 rounded ${filter === 'grayscale(1)' ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`} onClick={() => setFilter('grayscale(1)')}>Grayscale</button>
            <button type="button" className={`px-2 py-1 rounded ${filter === 'sepia(1)' ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`} onClick={() => setFilter('sepia(1)')}>Sepia</button>
            <button type="button" className={`px-2 py-1 rounded ${filter === 'brightness(1.2)' ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`} onClick={() => setFilter('brightness(1.2)')}>Bright</button>
            <button type="button" className={`px-2 py-1 rounded ${filter === 'contrast(1.5)' ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`} onClick={() => setFilter('contrast(1.5)')}>Contrast</button>
          </div>
          {selectedImage ? (
            <Cropper
              image={URL.createObjectURL(selectedImage)}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                mediaStyle: {
                  filter: filter,
                }
              }}
            />
          ) : null}
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(_, value) => setZoom(Number(value))}
            style={{ marginTop: 16 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCropModalOpen(false)} color="secondary">Cancel</Button>
          <Button onClick={handleCropSave} color="primary" disabled={isUploading}>{isUploading ? 'Uploading...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ProfileSettings;
