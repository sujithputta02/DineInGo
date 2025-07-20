import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface RestaurantMapProps {
  address: string;
  name: string;
  isListMode?: boolean;
  className?: string;
}

const RestaurantMap: React.FC<RestaurantMapProps> = ({ 
  address, 
  name, 
  isListMode = false,
  className = '' 
}) => {
  const [coordinates, setCoordinates] = React.useState<[number, number]>([12.9716, 77.5946]); // Default to Bangalore center
  const [error, setError] = React.useState<string | null>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
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
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  React.useEffect(() => {
    const geocodeAddress = async () => {
      try {
        // Split address into parts
        const addressParts = address.split(',').map(part => part.trim());
        
        // Try different combinations to find the most precise location
        const searchQueries = [
          // Try with full restaurant name and complete address
          `${name}, ${address}`,
          // Try with restaurant name and street address
          `${name}, ${addressParts[0]}`,
          // Try with restaurant name and street + area
          `${name}, ${addressParts[0]}, ${addressParts[1] || ''}`,
          // Try with just the street address and restaurant name
          `${addressParts[0]}, ${name}`,
          // Try with just the restaurant name and city
          `${name}, ${addressParts[addressParts.length - 1]}`,
          // Last resort: try with just the address
          address
        ];

        let foundLocation = false;

        for (const query of searchQueries) {
          if (foundLocation) break;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&namedetails=1&countrycodes=in`
          );
          const data = await response.json();

          if (data && data[0]) {
            // Check if the result contains the restaurant name or address parts
            const resultName = data[0].display_name.toLowerCase();
            const restaurantName = name.toLowerCase();
            const streetAddress = addressParts[0].toLowerCase();

            if (
              resultName.includes(restaurantName) ||
              resultName.includes(streetAddress)
            ) {
              setCoordinates([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
              setError(null);
              foundLocation = true;
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

  const mapHeight = isListMode ? '200px' : '300px';

  return (
    <>
      <div 
        className={`w-full rounded-xl overflow-hidden cursor-pointer relative group ${className}`}
        style={{ height: mapHeight }}
        onClick={() => setIsExpanded(true)}
      >
        {error && (
          <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-sm z-10">
            {error}
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
          <span className="text-white font-medium">Click to expand map</span>
        </div>
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          style={{ border: 'none' }}
        />
      </div>

      {/* Expanded Map Modal */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
            ref={modalRef}
            className="bg-white rounded-xl w-full max-w-4xl h-[80vh] relative"
          >
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Close map"
            >
              <X size={24} className="text-gray-600" />
            </button>
            <div className="h-full w-full">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={mapUrl}
                style={{ border: 'none', borderRadius: '0.75rem' }}
              />
            </div>
            <div className="absolute bottom-4 left-4 z-50">
              <a 
                href={`https://www.openstreetmap.org/?mlat=${coordinates[0]}&mlon=${coordinates[1]}#map=20/${coordinates[0]}/${coordinates[1]}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white px-4 py-2 rounded-lg shadow-lg text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View on OpenStreetMap
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RestaurantMap; 