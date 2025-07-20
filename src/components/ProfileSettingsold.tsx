import * as React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { User, UserAddress, LocationSettings } from '@/types/user';
import { Camera, Loader2, User as LucideUser } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, updateProfile, User as FirebaseUser } from 'firebase/auth';

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

interface ProfileSettingsProps {
  user: User | null;
  onUpdate?: (updates: Partial<User>) => Promise<void>;
  isDarkMode?: boolean;
}

type AuthenticatedUser = User & { getIdToken: () => Promise<string> };

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user: propUser,
  onUpdate,
  isDarkMode = false,
}) => {
  // State for loading and UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Type guard to ensure user has required methods
  const user = useMemo<AuthenticatedUser | null>(() => {
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
  if (!user) {
    return <div>Please sign in to view profile settings</div>;
  }

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setPreviewUrl(user.photoURL || null);
      setFormData((prev: FormDataState) => ({
        ...prev,
        displayName: user.displayName || '',
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        photoURL: user.photoURL || null,
        address: user.address || prev.address,
        locationSettings: user.locationSettings || prev.locationSettings
      }));
    }
  }, [user]);

  // Format Indian phone number
  const formatIndianPhoneNumber = (value: string): string => {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 10)}`;
  };

  const validateIndianPhoneNumber = (value: string): boolean => {
    // A proper Indian phone number check (10 digits, optional spaces/punctuation)
    const cleanedNumber = value.replace(/[\s-]/g, '');
    return /^[6-9]\d{9}$/.test(cleanedNumber);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle phone number formatting and validation
    if (name === 'phoneNumber') {
      const numericValue = value.replace(/\D/g, '');
      setFormData((prev: FormDataState) => ({
        ...prev,
        phoneNumber: formatIndianPhoneNumber(numericValue),
        errors: {
          ...prev.errors,
          phoneNumber: numericValue
            ? validateIndianPhoneNumber(numericValue)
              ? ''
              : 'Please enter a valid Indian phone number'
            : 'Phone number is required'
        }
      }));
      return;
    }
    
    // Handle nested fields (address, locationSettings)
    if (name.startsWith('address.')) {
      const field = name.split('.')[1] as keyof UserAddress;
      setFormData((prev: FormDataState) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        },
        errors: {
          ...prev.errors,
          [name]: ''
        }
      }));
      return;
    }
    
    if (name.startsWith('locationSettings.')) {
      const field = name.split('.')[1];
      setFormData((prev: FormDataState) => ({
        ...prev,
        locationSettings: {
          ...prev.locationSettings,
          [field]: field === 'searchRadius' ? Number(value) : value
        },
        errors: {
          ...prev.errors,
          [name]: ''
        }
      }));
      return;
    }
    
    // Handle regular fields
    setFormData((prev: FormDataState) => ({
      ...prev,
      [name]: value,
      errors: {
        ...prev.errors,
        [name]: ''
      }
    }));
  };

  const toggleLocationType = () => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      locationSettings: {
        ...prev.locationSettings,
        type: prev.locationSettings.type === 'auto' ? 'manual' : 'auto',
      },
    }));
  };

  const handleLocationDetect = async () => {
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
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate form
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare updates
      const updates: Partial<User> = {
        displayName: formData.displayName.trim(),
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        photoURL: formData.photoURL,
        address: formData.address,
        locationSettings: formData.locationSettings
      };

      // Update profile in Firebase Auth if display name or photo URL changed
      if (hasFirebaseAuth(user)) {
        const auth = getAuth();
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: updates.displayName,
            photoURL: updates.photoURL || null
          });
        }
      }

      // Call the onUpdate prop if provided
      if (onUpdate) {
        await onUpdate(updates);
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, onUpdate, user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', user.uid);

      // Get the authentication token
      const token = await (user as AuthenticatedUser).getIdToken();

      const response = await fetch('/api/upload-profile-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const data = await response.json() as { url: string };
      
      // Update the form data with the new photo URL
      setFormData((prev: FormDataState) => ({
        ...prev,
        photoURL: data.url
      }));

      // Update the preview URL
      setPreviewUrl(data.url);
      
      // Call onUpdate if provided
      if (onUpdate) {
        await onUpdate({ photoURL: data.url });
      }
      
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = (): string | null => {
    setFormData((prev: FormDataState) => ({
      ...prev,
      errors: {},
    }));

    const errors: Record<string, string> = {};

    if (formData.phoneNumber) {
      const phoneNumber = formData.phoneNumber.replace(/\D/g, '');
      if (!validateIndianPhoneNumber(phoneNumber)) {
        errors.phoneNumber = 'Please enter a valid Indian phone number';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormData((prev: FormDataState) => ({
        ...prev,
        errors,
      }));
      return 'Please fix the errors in the form';
    }

    return null;
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-3xl p-6 mb-8`}>
      <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6`}>
        Profile Settings
      </h2>
      
      {/* Profile Picture Upload */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-emerald-500">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <LucideUser className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 transition-colors ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={isUploading}
          />
        </div>
        <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Click the camera icon to change photo
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
              Display Name
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className={`w-full ${
                isDarkMode 
                  ? 'bg-gray-700/50 text-white border-gray-600' 
                  : 'bg-gray-100 text-gray-900 border-gray-300'
              } rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`w-full ${
                  isDarkMode 
                    ? 'bg-gray-700/50 text-white border-gray-600' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                } rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  formData.errors.phoneNumber ? 'border-red-500' : ''
                }`}
                placeholder="98765 43210 (10-digit Indian number)"
                maxLength={14}
                onBlur={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value) {
                    const formatted = value.length > 5 ? 
                      `${value.slice(0, 5)} ${value.slice(5, 10)}` : 
                      value;
                    setFormData(prev => ({
                      ...prev,
                      phoneNumber: formatted,
                      errors: {
                        ...prev.errors,
                        phoneNumber: validateIndianPhoneNumber(value) ? '' : 'Please enter a valid 10-digit Indian phone number'
                      }
                    }));
                  }
                }}
              />
              {formData.errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-500">
                  {formData.errors.phoneNumber}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Format: 98765 43210 or 9876543210
              </p>
            </div>
          </div>
          
          {/* Location Settings */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Location Settings
              </h3>
              <button
                type="button"
                onClick={toggleLocationType}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {formData.locationSettings.type === 'auto' ? 'Switch to Manual' : 'Switch to Auto'}
              </button>
            </div>

            {formData.locationSettings.type === 'auto' ? (
              <div className={`p-4 rounded-xl ${
                isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Your location will be automatically detected for better service.
                </p>
                <button
                  type="button"
                  onClick={handleLocationDetect}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isLoading ? 'Detecting...' : 'Detect My Location'}
                </button>
                {formData.locationSettings.coordinates && (
                  <p className="mt-2 text-sm text-emerald-500">
                    Location set: {formData.locationSettings.coordinates.lat.toFixed(4)}, {formData.locationSettings.coordinates.lng.toFixed(4)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    className={`w-full ${
                      isDarkMode 
                        ? 'bg-gray-700/50 text-white border-gray-600' 
                        : 'bg-gray-100 text-gray-900 border-gray-300'
                    } rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                      City
                    </label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleChange}
                      className={`w-full ${
                        isDarkMode 
                          ? 'bg-gray-700/50 text-white border-gray-600' 
                          : 'bg-gray-100 text-gray-900 border-gray-300'
                      } rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleChange}
                      className={`w-full ${
                        isDarkMode 
                          ? 'bg-gray-700/50 text-white border-gray-600' 
                          : 'bg-gray-100 text-gray-900 border-gray-300'
                      } rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                      placeholder="NY"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                      Country
                    </label>
                    <input
                      type="text"
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleChange}
                      className={`w-full ${
                        isDarkMode 
                          ? 'bg-gray-700/50 text-white border-gray-600' 
                          : 'bg-gray-100 text-gray-900 border-gray-300'
                      } rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                      placeholder="United States"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                      ZIP/Postal Code
                    </label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={formData.address.zipCode}
                      onChange={handleChange}
                      className={`w-full ${
                        isDarkMode 
                          ? 'bg-gray-700/50 text-white border-gray-600' 
                          : 'bg-gray-100 text-gray-900 border-gray-300'
                      } rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full ${
                isDarkMode 
                  ? 'bg-gray-700/50 text-white border-gray-600' 
                  : 'bg-gray-100 text-gray-900 border-gray-300'
              } rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              className={`w-full ${
                isDarkMode 
                  ? 'bg-gray-700/50 text-gray-400 border-gray-600' 
                  : 'bg-gray-100 text-gray-500 border-gray-300'
              } rounded-xl px-4 py-3 border focus:outline-none`}
              readOnly
              disabled
            />
          </div>
        </div>
        <div className="mt-8">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
