import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ThreatMapProps {
  logs: any[];
}

// Function to generate deterministic pseudo-random lat/lng from IP string
const getCoordinates = (ip: string) => {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ip.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generates lat: -50 to +60, lng: -120 to +140
  const lat = ((Math.abs(hash) % 110) - 50); 
  const lng = ((Math.abs(hash >> 8) % 260) - 120);
  return { lat, lng };
};

const createCustomIcon = (severity: string) => {
  const colorClass = 
    severity === 'critical' ? 'bg-red-500 shadow-red-500' :
    severity === 'high' ? 'bg-orange-500 shadow-orange-500' :
    severity === 'medium' ? 'bg-yellow-500 shadow-yellow-500' :
    'bg-emerald-500 shadow-emerald-500';

  const borderClass = 
    severity === 'critical' ? 'border-red-500' :
    severity === 'high' ? 'border-orange-500' :
    severity === 'medium' ? 'border-yellow-500' :
    'border-emerald-500';

  const html = `
    <div class="relative flex items-center justify-center w-full h-full hover:z-50 cursor-crosshair">
      <div class="absolute w-2 h-2 rounded-full ${colorClass} shadow-[0_0_10px_currentColor]"></div>
      <div class="absolute w-8 h-8 rounded-full border ${borderClass} animate-ping" style="animation-duration: 2s;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-threat-marker bg-transparent border-none',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const MapController: React.FC<{ threats: any[] }> = ({ threats }) => {
  const map = useMap();
  
  useEffect(() => {
    // Optionally trigger map relayout if container size changes
    map.invalidateSize();
  }, [map]);

  return null;
};

const ThreatMap: React.FC<ThreatMapProps> = ({ logs }) => {
  const currentThreats = useMemo(() => {
    return logs.slice(0, 20).map(log => {
      const { lat, lng } = getCoordinates(log.ip || '');
      return {
        id: log._id,
        lat,
        lng,
        severity: log.severity,
        ip: log.ip
      };
    });
  }, [logs]);

  return (
    <div className="relative w-full aspect-[21/9] lg:aspect-[2/1] bg-slate-950 rounded-3xl overflow-hidden group min-h-[400px]">
      
      {/* 1. Technical Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-10" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      {/* 2. Real World Map via Leaflet */}
      <div className="absolute inset-0 z-0 [&_.leaflet-container]:bg-slate-950">
        <MapContainer 
          center={[20, 0]} 
          zoom={2.5} 
          minZoom={2}
          maxZoom={6}
          className="w-full h-full outline-none" 
          zoomControl={false} 
          attributionControl={false}
          scrollWheelZoom={true} // Allow zooming into specific active attacks!
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            opacity={0.8}
            className="hue-rotate-15 contrast-125 saturate-50" // Stylizing map for tactical vibe
          />
          
          <MapController threats={currentThreats} />

          {currentThreats.map((threat) => (
             <Marker 
               position={[threat.lat, threat.lng]} 
               icon={createCustomIcon(threat.severity)} 
               key={threat.id}
             >
               <Popup className="[&_.leaflet-popup-content-wrapper]:bg-slate-900/90 [&_.leaflet-popup-content-wrapper]:backdrop-blur-md [&_.leaflet-popup-content-wrapper]:border [&_.leaflet-popup-content-wrapper]:border-white/10 [&_.leaflet-popup-tip]:bg-slate-900/90">
                  <div className="p-1 min-w-[120px]">
                    <p className="text-[10px] font-mono font-bold text-slate-300 leading-none uppercase tracking-wider mb-2">ID_{threat.id.substr(0,4)}</p>
                    <p className="text-xs font-mono text-white leading-none mb-2">{threat.ip}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                      <p className="text-[10px] font-bold uppercase text-emerald-400">Threat Info</p>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${
                        threat.severity === 'critical' ? 'text-red-500' :
                        threat.severity === 'high' ? 'text-orange-500' :
                        threat.severity === 'medium' ? 'text-yellow-500' : 'text-emerald-500'
                      }`}>
                        [{threat.severity}]
                      </p>
                    </div>
                  </div>
               </Popup>
             </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 3. Rotating Radar Sweep */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-70"
        style={{
          background: 'conic-gradient(from 0deg, transparent 60%, rgba(16, 185, 129, 0.15) 100%)'
        }}
      />

      {/* 4. Coordinate Crosshair (Moves with mouse) */}
      <div className="absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none z-10">
        <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-emerald-500/50"></div>
        <div className="absolute left-1/2 top-0 w-[0.5px] h-full bg-emerald-500/50"></div>
      </div>

      {/* 5. Dashboard HUD Elements */}
      <div className="absolute top-5 left-6 flex items-center gap-3 pointer-events-none z-20">
        <div className="flex gap-1.5">
           <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></motion.div>
           <div className="w-2.5 h-2.5 bg-emerald-500/20 rounded-full"></div>
           <div className="w-2.5 h-2.5 bg-emerald-500/20 rounded-full"></div>
        </div>
        <div className="flex flex-col">
           <span className="text-[10px] font-black text-white tracking-widest uppercase mb-0.5">Global Watchtower V3 (GeoSync)</span>
           <span className="text-[7px] font-mono text-emerald-500/60 font-bold">Live Intercept Map &bull; Cartesian Grid</span>
        </div>
      </div>

      <div className="absolute bottom-5 right-6 text-right pointer-events-none z-20">
         <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg backdrop-blur-sm">
            <Zap size={10} className="text-emerald-500 animate-bounce" />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Mode: Interactive_HUD</span>
         </div>
         <p className="mt-2 text-[7px] font-mono text-white/40 uppercase tracking-[0.3em]">Sat_Sync: Active</p>
      </div>

      <div className="absolute top-5 right-6 flex flex-col items-end opacity-60 pointer-events-none z-20">
         <span className="text-[8px] font-mono text-gray-400 uppercase leading-none mb-1">Network_Traffic</span>
         <div className="flex gap-0.5">
            {[...Array(12)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ height: [4, Math.random() * 12 + 4, 4] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 bg-emerald-500"
              />
            ))}
         </div>
      </div>
    </div>
  );
};

export default ThreatMap;
