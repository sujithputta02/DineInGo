import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, ExternalLink, Map as MapIcon, Eye, Map as MapType, Camera } from 'lucide-react';

import { GeocodingService } from '../services/geocodingService';

interface RestaurantMapProps {
  address: string;
  name: string;
  lat?: number;
  lon?: number;
  isListMode?: boolean;
  className?: string;
}

const RestaurantMap: React.FC<RestaurantMapProps> = ({
  address,
  name,
  lat,
  lon,
  isListMode = false,
  className = ''
}) => {
  const [coordinates, setCoordinates] = useState<[number, number]>(lat && lon ? [lat, lon] : [0, 0]);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStreetView, setIsStreetView] = useState(!!(lat && lon && lat !== 0 && lon !== 0));
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded]);

  React.useEffect(() => {
    if (lat && lon && lat !== 0 && lon !== 0) {
      setCoordinates([lat, lon]);
      setError(null);
      return;
    }

    const geocodeAddress = async () => {
      try {
        const addressParts = address.split(',').map(part => part.trim());
        const searchQueries = [
          `${name}, ${address}`,
          `${name}, ${addressParts[0]}, ${addressParts[addressParts.length - 1]}`,
          `${name}, ${addressParts[0]}`,
          `${address}, ${name}`,
          address
        ];

        let foundLocation = false;

        // 1. Try Google Places API (Highest Precision - Finds the exact Business Name)
        for (const query of searchQueries) {
          if (foundLocation) break;
          const data = await GeocodingService.searchGooglePlaces(query);
          if (data && data[0]) {
            setCoordinates([data[0].geometry.location.lat, data[0].geometry.location.lng]);
            setError(null);
            foundLocation = true;
            console.log('Google Places found exact business for:', query);
          }
        }

        // 2. Try Google Geocoding (High Precision - Finds the exact Address)
        if (!foundLocation) {
          for (const query of searchQueries) {
            if (foundLocation) break;
            const data = await GeocodingService.searchGoogle(query);
            if (data && data[0]) {
              setCoordinates([data[0].geometry.location.lat, data[0].geometry.location.lng]);
              setError(null);
              foundLocation = true;
              console.log('Google Geocoding found address for:', query);
            }
          }
        }

        // Fallback to Nominatim if Google fails
        if (!foundLocation) {
          for (const query of searchQueries) {
            if (foundLocation) break;
            const data = await GeocodingService.searchNominatim(query);
            if (data && data[0]) {
              setCoordinates([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
              setError(null);
              foundLocation = true;
              console.log('Nominatim found location for:', query);
            }
          }
        }

        if (!foundLocation) {
          setError('Could not find exact restaurant location. Showing approximate area.');
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
        setError('Error finding location. Showing approximate area.');
      }
    };

    geocodeAddress();
  }, [address, name]);

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${coordinates[1] - 0.001},${coordinates[0] - 0.001},${coordinates[1] + 0.001},${coordinates[0] + 0.001}&layer=mapnik&marker=${coordinates[0]},${coordinates[1]}`;
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  // Removed hardcoded heading/pitch to let Google AI find the best front-facing view automatically
  const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${googleMapsApiKey}&location=${coordinates[0]},${coordinates[1]}&fov=90`;
  const mapHeight = isListMode ? '200px' : '300px';

  // Improved Apple Maps URL for better cross-platform reliability
  // Precision URLs using exact coordinates to prevent "City Center" fallback
  const appleMapsUrl = coordinates[0] !== 0 
    ? `https://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${coordinates[0]},${coordinates[1]}&z=20`
    : `https://maps.apple.com/?q=${encodeURIComponent(`${name}, ${address}`)}`;
    
  const googleMapsUrl = coordinates[0] !== 0
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates[0]},${coordinates[1]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
    
  const googleStreetViewUrl = coordinates[0] !== 0
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coordinates[0]},${coordinates[1]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}&map_action=pano`;

  const modalContent = (
    <AnimatePresence>
      {isExpanded && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[9999] flex items-center justify-center p-0 sm:p-6 md:p-10"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            ref={modalRef}
            className="bg-zinc-950 sm:rounded-[2.5rem] w-full max-w-7xl h-full sm:h-[90vh] relative overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] border-0 sm:border border-white/10"
          >
            {/* Map Frame - Set to absolute fill */}
            <div className="absolute inset-0 z-0">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={isStreetView ? streetViewUrl : mapUrl.replace('marker=', 'marker=').replace('zoom=15', 'zoom=18')}
                style={{ border: 'none', filter: isStreetView ? 'none' : 'contrast(1.1) brightness(1.05)' }}
                title={isStreetView ? "Street View" : "Map View"}
              />
            </div>

            {/* Header Overlay - Responsive Padding & Size */}
            <div className="absolute top-4 sm:top-8 left-4 sm:left-8 right-4 sm:right-8 z-20 flex items-start justify-between pointer-events-none">
              <div className="bg-black/60 backdrop-blur-2xl px-4 sm:px-8 py-3 sm:py-5 rounded-2xl sm:rounded-[2rem] border border-white/10 shadow-2xl pointer-events-auto max-w-[75%] sm:max-w-[80%]">
                <h3 className="text-white font-black text-sm sm:text-2xl tracking-tighter mb-0.5 sm:mb-1 truncate">{name}</h3>
                <div className="flex items-center gap-2 sm:gap-3 text-emerald-400">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] truncate">{address}</p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-4 pointer-events-auto">
                <button
                  onClick={() => setIsStreetView(!isStreetView)}
                  className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[8px] sm:text-[10px] transition-all active:scale-95 border-2 ${
                    isStreetView 
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]' 
                      : 'bg-black/60 backdrop-blur-xl border-white/10 text-white hover:bg-black/80'
                  }`}
                >
                  {isStreetView ? <MapType size={18} /> : <Camera size={18} />}
                  <span>{isStreetView ? 'Map View' : 'Live Street View'}</span>
                </button>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-10 h-10 sm:w-16 sm:h-16 bg-white text-black rounded-xl sm:rounded-3xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all hover:rotate-90 pointer-events-auto flex-shrink-0"
                >
                  <X size={20} className="sm:hidden" />
                  <X size={32} className="hidden sm:block" />
                </button>
              </div>
            </div>

            {/* Navigation Actions Footer - Stacked on Mobile, Row on Tablet/Desktop */}
            <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-10 right-4 sm:right-10 z-20 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center justify-center">
              <motion.a
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                href={googleStreetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 sm:gap-4 bg-emerald-500 text-white px-6 sm:px-10 py-3.5 sm:py-5 rounded-xl sm:rounded-[2rem] shadow-2xl transition-all font-black text-[9px] sm:text-[11px] uppercase tracking-[0.2em] border border-emerald-400/20"
              >
                <Eye size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
                Open External Street View
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-3 sm:gap-4 px-6 sm:px-10 py-3.5 sm:py-5 rounded-xl sm:rounded-[2rem] shadow-2xl transition-all font-black text-[9px] sm:text-[11px] uppercase tracking-[0.2em] border ${
                  coordinates[0] === 0 
                    ? 'bg-gray-800 text-gray-500 border-transparent cursor-not-allowed pointer-events-none' 
                    : 'bg-white text-gray-900 border-gray-100'
                }`}
              >
                <img src="https://cdn-icons-png.flaticon.com/512/2991/2991231.png" alt="" className="w-4 h-4 sm:w-5 sm:h-5" />
                {coordinates[0] === 0 ? 'Locating...' : 'Google Maps'}
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                href={appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 sm:gap-4 bg-black text-white px-6 sm:px-10 py-3.5 sm:py-5 rounded-xl sm:rounded-[2rem] shadow-2xl transition-all font-black text-[9px] sm:text-[11px] uppercase tracking-[0.2em] border border-white/20"
              >
                <svg viewBox="0 0 384 512" className="w-4 h-4 sm:w-5 sm:h-5 fill-current">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </svg>
                Apple Maps
              </motion.a>
              
              <motion.a
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                href={`https://www.openstreetmap.org/?mlat=${coordinates[0]}&mlon=${coordinates[1]}#map=20/${coordinates[0]}/${coordinates[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-2xl px-6 sm:px-10 py-3.5 sm:py-5 rounded-xl sm:rounded-[2rem] shadow-2xl text-white hover:bg-black/60 transition-all font-black text-[9px] sm:text-[11px] uppercase tracking-[0.2em] border border-white/10"
              >
                <ExternalLink size={14} className="sm:hidden" />
                <ExternalLink size={18} className="hidden sm:block" />
                Source
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div
        className={`w-full rounded-3xl overflow-hidden relative group shadow-2xl border border-white/5 bg-zinc-900 ${className}`}
        style={{ height: mapHeight }}
      >
        {error && (
          <div className="absolute top-5 left-5 bg-amber-500 text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest z-20 shadow-2xl">
            {error}
          </div>
        )}
        
        <div 
          className="absolute inset-0 z-10 cursor-pointer bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
        />

        <div className="absolute top-5 right-5 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
          <button 
            className="w-14 h-14 bg-white text-black rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <Maximize2 size={24} />
          </button>
        </div>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
           <div className="bg-black/80 backdrop-blur-2xl text-white px-8 py-3 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-2xl border border-white/10 whitespace-nowrap">
             {isStreetView ? 'Enter Street View' : 'Explore Territory'}
           </div>
        </div>

        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={isStreetView ? streetViewUrl : mapUrl}
          style={{ border: 'none', pointerEvents: 'none', opacity: isStreetView ? 1 : 0.8 }}
          title={isStreetView ? "Street View Preview" : "Map Preview"}
        />
      </div>

      {createPortal(modalContent, document.body)}
    </>
  );
};

export default RestaurantMap; 