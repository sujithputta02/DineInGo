import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Map, CheckCircle } from 'lucide-react';

interface LocationData {
  address: string;
  buildingDetails?: string; // Floor, building number, etc.
  street?: string; // Street/road name
  area?: string; // Area/locality
  city: string;
  state: string;
  country: string;
  pincode?: string;
  latitude: number;
  longitude: number;
}

interface BusinessLocationSelectorProps {
  onLocationSelect: (location: LocationData) => void;
  onInputChange?: (value: string) => void;
  initialLocation?: string;
  initialLocationData?: LocationData;
  placeholder?: string;
}

const BusinessLocationSelector: React.FC<BusinessLocationSelectorProps> = ({
  onLocationSelect,
  onInputChange,
  initialLocation = '',
  initialLocationData,
  placeholder = "Enter your business location"
}) => {
  const [searchQuery, setSearchQuery] = useState(initialLocation);
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(initialLocationData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialLocationData) {
      setSelectedLocation(initialLocationData);
      setSearchQuery(initialLocationData.address);
    }
  }, [initialLocationData]);

  // Debounced search function
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onInputChange) {
      onInputChange(query);
    }
    setError(null);

    if (query.length < 2) { // Reduced from 3 to 2 characters
      setSearchResults([]);
      setShowDropdown(false);
      // If query is cleared, clear selection
      if (query.length === 0) {
        setSelectedLocation(null);
      }
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300); // Reduced from 500ms to 300ms for faster response
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    setShowDropdown(true);

    try {
      // Enhanced search with multiple strategies for Indian addresses
      const searchPromises = [];

      // Strategy 1: Direct address search
      searchPromises.push(
        fetch(
          `http://localhost:5001/api/geocoding/search?` +
          `q=${encodeURIComponent(query)}&` +
          `countrycodes=in&` +
          `limit=3&` +
          `addressdetails=1&` +
          `extratags=1&` +
          `namedetails=1`
        )
      );

      // Strategy 2: Extract key parts for better search
      const addressParts = query.split(',').map(part => part.trim());
      if (addressParts.length >= 3) {
        // For Indian addresses, try searching with city + state combination
        const cityState = addressParts.slice(-2).join(', '); // Last 2 parts usually city, state+PIN
        searchPromises.push(
          fetch(
            `http://localhost:5001/api/geocoding/search?` +
            `q=${encodeURIComponent(cityState)}&` +
            `countrycodes=in&` +
            `limit=2&` +
            `addressdetails=1&` +
            `extratags=1`
          )
        );

        // Try searching with area + city (skip building details)
        if (addressParts.length >= 4) {
          const areaCity = addressParts.slice(-4, -1).join(', '); // Area, City, State (without PIN)
          searchPromises.push(
            fetch(
              `http://localhost:5001/api/geocoding/search?` +
              `` +
              `q=${encodeURIComponent(areaCity)}&` +
              `countrycodes=in&` +
              `limit=2&` +
              `addressdetails=1`,
              {
                headers: {
                }
              }
            )
          );
        }
      }

      // Strategy 3: Search for PIN code if present
      const pincodeMatch = query.match(/\b\d{6}\b/);
      if (pincodeMatch) {
        searchPromises.push(
          fetch(
            `http://localhost:5001/api/geocoding/search?` +
            `` +
            `postalcode=${pincodeMatch[0]}&` +
            `countrycodes=in&` +
            `limit=2&` +
            `addressdetails=1`,
            {
              headers: {
              }
            }
          )
        );
      }

      const responses = await Promise.allSettled(searchPromises);
      const allResults: any[] = [];

      // Collect all successful results
      for (const response of responses) {
        if (response.status === 'fulfilled' && response.value.ok) {
          const data = await response.value.json();
          allResults.push(...data);
        }
      }

      // Remove duplicates based on coordinates (within 100m)
      const uniqueResults: any[] = [];
      for (const result of allResults) {
        const isDuplicate = uniqueResults.some(existing => {
          const distance = Math.sqrt(
            Math.pow((parseFloat(result.lat) - parseFloat(existing.lat)) * 111000, 2) +
            Math.pow((parseFloat(result.lon) - parseFloat(existing.lon)) * 111000, 2)
          );
          return distance < 100; // 100 meters threshold
        });

        if (!isDuplicate) {
          uniqueResults.push(result);
        }
      }

      // Sort by relevance and importance
      uniqueResults.sort((a, b) => {
        const aExact = a.display_name.toLowerCase().includes(query.toLowerCase());
        const bExact = b.display_name.toLowerCase().includes(query.toLowerCase());

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        return (parseFloat(b.importance) || 0) - (parseFloat(a.importance) || 0);
      });

      const locations: LocationData[] = uniqueResults.slice(0, 5).map((item: any) => {
        const address = item.display_name;
        const addressParts = item.address || {};

        // Parse the original query to extract building details
        const queryParts = query.split(',').map(part => part.trim());
        let buildingDetails = '';
        let street = '';
        let area = '';

        // Enhanced parsing for Indian address format
        if (queryParts.length >= 6) {
          // Format: Building, Building2, Street, Area1, Area2, City, State PIN
          buildingDetails = queryParts.slice(0, 2).join(', ');
          street = queryParts[2] || addressParts.road || addressParts.street || '';
          area = queryParts.slice(3, -2).join(', ') ||
            addressParts.suburb ||
            addressParts.neighbourhood ||
            addressParts.residential ||
            addressParts.commercial || '';
        } else if (queryParts.length >= 3) {
          buildingDetails = queryParts[0] || '';
          street = addressParts.road || addressParts.street || '';
          area = addressParts.suburb ||
            addressParts.neighbourhood ||
            addressParts.residential ||
            addressParts.commercial || '';
        } else {
          street = addressParts.road || addressParts.street || '';
          area = addressParts.suburb ||
            addressParts.neighbourhood ||
            addressParts.residential ||
            addressParts.commercial || '';
        }

        return {
          address: address,
          buildingDetails: buildingDetails,
          street: street,
          area: area,
          city: addressParts.city ||
            addressParts.town ||
            addressParts.village ||
            addressParts.municipality ||
            addressParts.county || '',
          state: addressParts.state || addressParts.region || '',
          country: addressParts.country || 'India',
          pincode: addressParts.postcode || pincodeMatch?.[0] || '',
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon)
        };
      }).filter((location: LocationData) =>
        location.city || location.area || location.address.includes('India')
      );

      setSearchResults(locations);
    } catch (error) {
      console.error('Error searching locations:', error);
      setError('Failed to search locations. Please try again.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding using Nominatim
      const response = await fetch(
        `http://localhost:5001/api/geocoding/search?` +
        `` +
        `lat=${latitude}&` +
        `lon=${longitude}&` +
        `addressdetails=1&` +
        `extratags=1`,
        {
          headers: {
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get location details');
      }

      const data = await response.json();
      const addressParts = data.address || {};

      const location: LocationData = {
        address: data.display_name,
        city: addressParts.city || addressParts.town || addressParts.village || addressParts.suburb || '',
        state: addressParts.state || '',
        country: addressParts.country || 'India',
        pincode: addressParts.postcode || '',
        latitude,
        longitude
      };

      setSelectedLocation(location);
      setSearchQuery(location.address);
      onLocationSelect(location);
      setShowDropdown(false);
    } catch (error) {
      console.error('Error getting current location:', error);
      setError('Failed to get your current location. Please try again or search manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    setSearchQuery(location.address);
    onLocationSelect(location);
    setShowDropdown(false);
    setError(null);
  };

  const handleManualSubmit = () => {
    if (!manualAddress.trim()) {
      setError('Please enter a valid address');
      return;
    }

    // Enhanced parsing for Indian address format
    const parts = manualAddress.split(',').map(part => part.trim());

    // Extract PIN code
    const pincodeMatch = manualAddress.match(/\b\d{6}\b/);
    const pincode = pincodeMatch ? pincodeMatch[0] : '';

    // Parse address components
    let buildingDetails = '';
    let street = '';
    let area = '';
    let city = '';
    let state = '';

    if (parts.length >= 6) {
      // Format: Building, Building2, Street, Area1, Area2, City, State PIN
      // Example: "First & Second Floor, 2989/B, 2989/B, 12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008"
      buildingDetails = parts.slice(0, 2).join(', '); // First 2 parts are building details
      street = parts[2] || '';
      area = parts.slice(3, -2).join(', '); // Middle parts are area/locality
      city = parts[parts.length - 2] || '';

      // Extract state from last part (remove PIN code)
      const lastPart = parts[parts.length - 1] || '';
      state = lastPart.replace(/\s*\d{6}\s*$/, '').trim();
    } else if (parts.length >= 4) {
      // Simpler format: Building, Street, Area, City, State PIN
      buildingDetails = parts[0] || '';
      street = parts[1] || '';
      area = parts[2] || '';
      city = parts[3] || '';

      // Extract state from last part (remove PIN code)
      const lastPart = parts[parts.length - 1] || '';
      state = lastPart.replace(/\s*\d{6}\s*$/, '').trim();
    } else if (parts.length >= 2) {
      // Very simple format
      area = parts[parts.length - 3] || '';
      city = parts[parts.length - 2] || '';

      // Extract state from last part (remove PIN code)
      const lastPart = parts[parts.length - 1] || '';
      state = lastPart.replace(/\s*\d{6}\s*$/, '').trim();
    }

    const location: LocationData = {
      address: manualAddress,
      buildingDetails: buildingDetails,
      street: street,
      area: area,
      city: city,
      state: state,
      country: 'India',
      pincode: pincode,
      latitude: 0, // Will be 0 for manual entries
      longitude: 0
    };

    setSelectedLocation(location);
    setSearchQuery(manualAddress);
    onLocationSelect(location);
    setShowManualInput(false);
    setShowDropdown(false);
    setError(null);
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="Type your address, landmark, or area name..."
          className="w-full px-4 py-3 pl-12 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
        />
        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />

        {selectedLocation && (
          <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />
        )}
      </div>

      {/* Helpful examples */}
      {!selectedLocation && searchQuery.length === 0 && (
        <div className="mt-2 text-xs text-slate-500">
          <p className="mb-1">Examples of supported address formats:</p>
          <div className="space-y-1">
            <p>• "First & Second Floor, 2989/B, 12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008"</p>
            <p>• "Shop No. 15, Ground Floor, Phoenix Mall, Whitefield, Bangalore, Karnataka 560066"</p>
            <p>• "3rd Floor, Building A, Cyber City, DLF Phase 2, Gurgaon, Haryana 122002"</p>
          </div>
        </div>
      )}

      {/* Current Location Button */}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Navigation size={16} />
          {isLoading ? 'Detecting location...' : 'Use current location'}
        </button>

        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <MapPin size={16} />
          Enter manually
        </button>
      </div>

      {/* Manual Address Input */}
      {showManualInput && (
        <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Enter your complete address manually
          </label>
          <textarea
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="e.g., 123 Main Street, MG Road, Bangalore, Karnataka, India"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleManualSubmit}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              Use This Address
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualInput(false);
                setManualAddress('');
              }}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-64 overflow-y-auto"
        >
          {isLoading && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-sm text-slate-600 mt-2">Searching locations...</p>
            </div>
          )}

          {!isLoading && searchResults.length > 0 && (
            <div className="py-2">
              {searchResults.map((location, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleLocationSelect(location)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-start gap-3 border-b border-slate-100 last:border-0 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-emerald-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm">
                      {location.area && location.city ? (
                        <>
                          {location.area}, {location.city}
                          {location.state && `, ${location.state}`}
                        </>
                      ) : location.city ? (
                        <>
                          {location.city}
                          {location.state && `, ${location.state}`}
                        </>
                      ) : (
                        // If no city, show first meaningful part of address
                        location.address.split(',').slice(0, 2).join(', ')
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {location.address}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {location.pincode && (
                        <div className="text-xs text-slate-400">
                          PIN: {location.pincode}
                        </div>
                      )}
                      {location.street && (
                        <div className="text-xs text-slate-400">
                          {location.street}
                        </div>
                      )}
                      <div className="text-xs text-slate-400">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              <Map className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No locations found</p>
              <p className="text-xs mt-1">Try:</p>
              <ul className="text-xs mt-2 space-y-1">
                <li>• Adding more details (street, area, city)</li>
                <li>• Using landmarks or well-known places</li>
                <li>• Checking spelling</li>
                <li>• Using "Current Location" button</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800">Selected Location</p>

              {/* Building Details */}
              {selectedLocation.buildingDetails && (
                <p className="text-xs text-emerald-700 mt-1">
                  <span className="font-medium">Building:</span> {selectedLocation.buildingDetails}
                </p>
              )}

              {/* Street */}
              {selectedLocation.street && (
                <p className="text-xs text-emerald-700 mt-1">
                  <span className="font-medium">Street:</span> {selectedLocation.street}
                </p>
              )}

              {/* Area & City */}
              <p className="text-xs text-emerald-700 mt-1">
                <span className="font-medium">Location:</span> {' '}
                {selectedLocation.area && `${selectedLocation.area}, `}
                {selectedLocation.city}
                {selectedLocation.state && `, ${selectedLocation.state}`}
                {selectedLocation.pincode && ` - ${selectedLocation.pincode}`}
              </p>

              {/* Coordinates (only if available) */}
              {selectedLocation.latitude !== 0 && selectedLocation.longitude !== 0 && (
                <p className="text-xs text-emerald-600 mt-1">
                  <span className="font-medium">Coordinates:</span> {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
              )}

              {/* Full Address */}
              <p className="text-xs text-emerald-600 mt-2 p-2 bg-emerald-100 rounded border-l-2 border-emerald-300">
                <span className="font-medium">Complete Address:</span><br />
                {selectedLocation.address}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

export default BusinessLocationSelector;