import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation } from 'lucide-react';
import { Location as LocationType } from '../utils/apiServices';
import { IndianLocation, findNearestLocation, searchLocations, getAllCities, getAllTowns } from '../utils/indianLocations';

interface LocationDisplayProps {
  location?: LocationType;
  onLocationUpdate: (location: LocationType) => void;
  className?: string;
  isDarkMode?: boolean;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({
  location,
  onLocationUpdate,
  className = '',
  isDarkMode = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IndianLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearestLocation, setNearestLocation] = useState<IndianLocation | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update local state when location prop changes
  useEffect(() => {
    if (location) {
      setError(null);
      setNearestLocation(null);
    }
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const results = searchLocations(query);
    setSearchResults(results);
  };

  const handleLocationSelect = (selected: IndianLocation) => {
    const newLocation: LocationType = {
      city: selected.city,
      state: selected.state,
      country: 'India',
      latitude: selected.coordinates.lat,
      longitude: selected.coordinates.lng
    };

    // Call the parent's update function
    onLocationUpdate(newLocation);

    // Update local state
    setShowDropdown(false);
    setSearchQuery('');
    setError(null);
    setNearestLocation(null);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null); // Clear any existing errors

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Find the nearest city/town from our predefined list
        const nearest = findNearestLocation({ lat: latitude, lng: longitude });
        setNearestLocation(nearest);
        
        // Calculate distance to nearest location (in km)
        const R = 6371; // Earth's radius in km
        const dLat = (nearest.coordinates.lat - latitude) * (Math.PI / 180);
        const dLon = (nearest.coordinates.lng - longitude) * (Math.PI / 180);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(latitude * (Math.PI / 180)) * Math.cos(nearest.coordinates.lat * (Math.PI / 180)) *
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Update location with the nearest city/town
        handleLocationSelect(nearest);
        
        // Show success message with distance information
        if (distance > 1) {
          setError(`Found nearest ${nearest.type}: ${nearest.city} (${Math.round(distance)}km away)`);
        } else {
          setError(`Location set to ${nearest.city}`);
        }
        
        // Clear error after 3 seconds
        setTimeout(() => {
          setError(null);
        }, 3000);
        
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Failed to get your location. Please try searching manually.';
        
        // More specific error messages
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Please allow location access to use this feature';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
        
        // Clear error after 5 seconds
        setTimeout(() => {
          setError(null);
        }, 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const renderLocationGroups = () => {
    if (searchQuery) {
      return searchResults.map((result, index) => (
        <button
          key={`${result.city}-${index}`}
          onClick={() => handleLocationSelect(result)}
          className="w-full px-4 py-2 text-left hover:bg-emerald-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <div className="font-medium text-gray-800 dark:text-white text-sm">{result.city}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{result.state} • {result.type}</div>
          </div>
        </button>
      ));
    }

    // Show cities and towns separately when no search query
    const cities = getAllCities();
    const towns = getAllTowns();

    return (
      <>
        <div className="py-2">
          <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Major Cities</div>
          {cities.slice(0, 5).map((city, index) => (
            <button
              key={`city-${index}`}
              onClick={() => handleLocationSelect(city)}
              className="w-full px-4 py-2 text-left hover:bg-emerald-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-800 dark:text-white text-sm">{city.city}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{city.state}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 py-2">
          <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Popular Towns</div>
          {towns.slice(0, 3).map((town, index) => (
            <button
              key={`town-${index}`}
              onClick={() => handleLocationSelect(town)}
              className="w-full px-4 py-2 text-left hover:bg-emerald-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-800 dark:text-white text-sm">{town.city}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{town.state}</div>
              </div>
            </button>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors ${className}`}
      >
        <MapPin className="h-4 w-4" />
        <span>{location?.city || 'Select location'}</span>
        {location?.state && (
          <span className="text-gray-500">, {location.state}</span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search cities and towns..."
                className="w-full px-4 py-2 pl-9 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/50 placeholder-gray-500 dark:placeholder-gray-400"
                autoFocus
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          </div>

          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-700">
              {nearestLocation ? 'Finding nearest location...' : 'Searching...'}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto border-t border-gray-100 dark:border-gray-700">
            {searchQuery ? (
              searchResults.map((result, index) => (
                <button
                  key={`${result.city}-${index}`}
                  onClick={() => handleLocationSelect(result)}
                  className="w-full px-4 py-2 text-left hover:bg-emerald-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white text-sm">{result.city}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{result.state} • {result.type}</div>
                  </div>
                </button>
              ))
            ) : (
              <>
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Major Cities</div>
                  {getAllCities().slice(0, 5).map((city, index) => (
                    <button
                      key={`city-${index}`}
                      onClick={() => handleLocationSelect(city)}
                      className="w-full px-4 py-2 text-left hover:bg-emerald-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white text-sm">{city.city}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{city.state}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 py-2">
                  <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Popular Towns</div>
                  {getAllTowns().slice(0, 3).map((town, index) => (
                    <button
                      key={`town-${index}`}
                      onClick={() => handleLocationSelect(town)}
                      className="w-full px-4 py-2 text-left hover:bg-emerald-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white text-sm">{town.city}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{town.state}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Navigation className="h-4 w-4" />
              <span>{loading ? 'Detecting...' : 'Use current location'}</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute right-0 mt-2 w-72">
          <div className={`px-3 py-2 rounded-lg text-sm ${
            error.includes('Failed') || error.includes('Please allow')
              ? 'bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400'
              : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
          }`}>
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDisplay; 
