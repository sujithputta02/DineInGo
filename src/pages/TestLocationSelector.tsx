import React, { useState } from 'react';
import BusinessLocationSelector from '../components/BusinessLocationSelector';

interface LocationData {
  address: string;
  buildingDetails?: string;
  street?: string;
  area?: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
  latitude: number;
  longitude: number;
}

const TestLocationSelector: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    console.log('Selected location:', location);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Location Selector Test</h1>
          <p className="text-slate-600 mb-8">
            Test the enhanced location selector with Indian address formats
          </p>

          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Try These Sample Addresses:</h2>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Complex Format:</strong> First & Second Floor, 2989/B, 2989/B, 12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008</p>
                <p><strong>Shop Format:</strong> Shop No. 15, Ground Floor, Phoenix Mall, Whitefield, Bangalore, Karnataka 560066</p>
                <p><strong>Office Format:</strong> 3rd Floor, Building A, Cyber City, DLF Phase 2, Gurgaon, Haryana 122002</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Location Selector</h2>
              <BusinessLocationSelector
                onLocationSelect={handleLocationSelect}
                placeholder="Enter your business address"
              />
            </div>

            {selectedLocation && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-emerald-800 mb-4">Selected Location Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Complete Address:</strong></p>
                    <p className="text-slate-700 mb-3">{selectedLocation.address}</p>
                    
                    {selectedLocation.buildingDetails && (
                      <>
                        <p><strong>Building Details:</strong></p>
                        <p className="text-slate-700 mb-3">{selectedLocation.buildingDetails}</p>
                      </>
                    )}
                    
                    {selectedLocation.street && (
                      <>
                        <p><strong>Street:</strong></p>
                        <p className="text-slate-700 mb-3">{selectedLocation.street}</p>
                      </>
                    )}
                    
                    {selectedLocation.area && (
                      <>
                        <p><strong>Area/Locality:</strong></p>
                        <p className="text-slate-700 mb-3">{selectedLocation.area}</p>
                      </>
                    )}
                  </div>
                  
                  <div>
                    <p><strong>City:</strong></p>
                    <p className="text-slate-700 mb-3">{selectedLocation.city}</p>
                    
                    <p><strong>State:</strong></p>
                    <p className="text-slate-700 mb-3">{selectedLocation.state}</p>
                    
                    <p><strong>Country:</strong></p>
                    <p className="text-slate-700 mb-3">{selectedLocation.country}</p>
                    
                    {selectedLocation.pincode && (
                      <>
                        <p><strong>PIN Code:</strong></p>
                        <p className="text-slate-700 mb-3">{selectedLocation.pincode}</p>
                      </>
                    )}
                    
                    {selectedLocation.latitude !== 0 && selectedLocation.longitude !== 0 && (
                      <>
                        <p><strong>Coordinates:</strong></p>
                        <p className="text-slate-700 mb-3">
                          {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-white rounded border">
                  <p className="font-medium text-slate-800 mb-2">JSON Output:</p>
                  <pre className="text-xs text-slate-600 overflow-x-auto">
                    {JSON.stringify(selectedLocation, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">How It Works:</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• <strong>Multi-strategy search:</strong> Searches using direct address, city+state, area+city, and PIN code</li>
                <li>• <strong>Enhanced parsing:</strong> Extracts building details, street, area, city, state, and PIN code</li>
                <li>• <strong>Manual fallback:</strong> If search fails, you can manually enter the address</li>
                <li>• <strong>Smart validation:</strong> Validates and structures the address data for business use</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestLocationSelector;