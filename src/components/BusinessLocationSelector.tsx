import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { MapPin, Navigation, Map, CheckCircle } from 'lucide-react';

const API_BASE = API_CONFIG.BASE_URL;

interface LocationData {
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface BusinessLocationSelectorProps {
  onLocationSelect: (location: LocationData) => void;
  onInputChange?: (value: string) => void;
  initialValue?: string;
  initialLocation?: string;
  initialLocationData?: any;
  placeholder?: string;
}

const BusinessLocationSelector: React.FC<BusinessLocationSelectorProps> = ({ 
  onLocationSelect, 
  onInputChange,
  initialValue = '',
  initialLocation = '',
  initialLocationData,
  placeholder = 'Enter business address...' 
}) => {
  const defaultQuery = initialLocation || initialValue || '';
  const [searchQuery, setSearchQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(initialLocationData || null);

  useEffect(() => {
    if (initialValue && !searchQuery) {
      setSearchQuery(initialValue);
    }
  }, [initialValue]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (onInputChange) {
      onInputChange(query);
    }
    
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Location search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    const locationData: LocationData = {
      address: suggestion.display_name,
      city: suggestion.address.city || suggestion.address.town || suggestion.address.suburb || '',
      state: suggestion.address.state || suggestion.address.province || '',
      country: suggestion.address.country || '',
      zipCode: suggestion.address.postcode || '',
      pincode: suggestion.address.postcode || '',
      latitude: lat,
      longitude: lng,
      coordinates: {
        lat: lat,
        lng: lng
      }
    };

    setSelectedLocation(suggestion);
    setSearchQuery(suggestion.display_name);
    setSuggestions([]);
    onLocationSelect(locationData);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-50 last:border-0"
            >
              <Navigation className="text-slate-400 mt-1 shrink-0" size={14} />
              <div>
                <p className="text-sm font-bold text-slate-800 line-clamp-1">{suggestion.display_name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{suggestion.type}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedLocation && (
        <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3 animate-in zoom-in-95 duration-200">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle className="text-emerald-600" size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800">Location Verified</p>
            <p className="text-[10px] text-emerald-600 font-medium">Ready to serve customers here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessLocationSelector;