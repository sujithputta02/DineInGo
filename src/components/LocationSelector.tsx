import React, { useState, useEffect, useRef } from 'react';
import type { Location } from '../utils/apiServices';
import { Search, MapPin, Navigation } from 'lucide-react';

interface LocationSelectorProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
}

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const majorCities = {
  'Andhra Pradesh': ['Hyderabad', 'Visakhapatnam', 'Vijayawada', 'Guntur'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur'],
  'Goa': ['Panaji', 'Vasco da Gama', 'Margao'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Chandigarh'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela'],
  'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur'],
  'Sikkim': ['Gangtok', 'Namchi', 'Mangan'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur']
};

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationSelect, initialLocation }) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(initialLocation);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setShowDropdown(true);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${import.meta.env.VITE_MAPBOX_API_KEY}&country=IN&types=place,locality,neighborhood`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data = await response.json();
      const locations: Location[] = data.features.map((feature: any) => {
        const context = feature.context || [];
        return {
          city: feature.text,
          state: context.find((c: any) => c.id.includes('region'))?.text || '',
          country: context.find((c: any) => c.id.includes('country'))?.text || 'India',
          pincode: context.find((c: any) => c.id.includes('postcode'))?.text || '',
          latitude: feature.center[1],
          longitude: feature.center[0]
        };
      });

      setSearchResults(locations);
    } catch (error) {
      console.error('Error searching locations:', error);
      setError('Failed to search locations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = async () => {
    if ("geolocation" in navigator) {
      try {
        setIsLoading(true);
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = position.coords;
        
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${import.meta.env.VITE_MAPBOX_API_KEY}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch location details');
        }

        const data = await response.json();
        const features = data.features[0];
        const context = features.context;

        const location: Location = {
          city: context.find((c: any) => c.id.includes('place'))?.text || '',
          state: context.find((c: any) => c.id.includes('region'))?.text || '',
          country: context.find((c: any) => c.id.includes('country'))?.text || '',
          pincode: context.find((c: any) => c.id.includes('postcode'))?.text || '',
          latitude,
          longitude
        };

        setSelectedLocation(location);
        onLocationSelect(location);
        setError(null);
      } catch (error) {
        console.error('Error getting location:', error);
        setError('Failed to get your location. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSearchResultSelect = (location: Location) => {
    setSelectedLocation(location);
    onLocationSelect(location);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setError(null);
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      {selectedLocation ? (
        <div className="flex items-center gap-2 text-black">
          <MapPin className="h-5 w-5 text-emerald-600" />
          <span className="font-medium">{selectedLocation.city}</span>
          {selectedLocation.state && (
            <span className="text-gray-600">, {selectedLocation.state}</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="h-5 w-5" />
          <span>Select location</span>
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-1 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Search className="h-5 w-5 text-black" />
        </button>

        {showDropdown && (
          <div className="absolute z-50 top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search your location..."
                  className="w-full px-4 py-2 pl-9 rounded-lg bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto border-t border-gray-100">
                {searchResults.map((location, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchResultSelect(location)}
                    className="w-full px-4 py-2 text-left hover:bg-emerald-50 flex items-center gap-2 border-b border-gray-100 last:border-0"
                  >
                    <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{location.city}</div>
                      <div className="text-xs text-gray-500">{location.state}, {location.country}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="p-2 border-t border-gray-100">
              <button
                onClick={handleLocationSelect}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Navigation className="h-4 w-4" />
                <span>{isLoading ? 'Detecting...' : 'Use current location'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-2">
          <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        </div>
      )}
    </div>
  );
};

export default LocationSelector; 
