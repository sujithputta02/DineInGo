import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Compass } from 'lucide-react';

interface VisitedLocation {
  latitude: number;
  longitude: number;
  name: string;
}

interface AggregatedLocation extends VisitedLocation {
  count: number;
}

interface DinoTerritoryMapProps {
  locations: VisitedLocation[];
  isDarkMode: boolean;
}

const DinoTerritoryMap: React.FC<DinoTerritoryMapProps> = ({ locations = [], isDarkMode }) => {
  // Aggregate locations by name/coords for the list and heatmap weights
  const aggregatedLocations = locations.reduce((acc: AggregatedLocation[], curr) => {
    const existing = acc.find(l => l.name === curr.name);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ ...curr, count: 1 });
    }
    return acc;
  }, []);

  const isLushSpot = (name: string) => {
    // Mock logic: hidden gems or eco-spots based on community 'vibes'
    return name.length % 3 === 0;
  };

  const communityLushness = aggregatedLocations.filter(l => isLushSpot(l.name)).length * 15;

  return (
    <div className={`relative p-8 rounded-[2.5rem] overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-gray-200'} border-2 shadow-2xl min-h-[400px]`}>
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Dino's Territory</h2>
            <p className={`${isDarkMode ? 'text-zinc-500' : 'text-gray-500'} font-bold text-xs uppercase tracking-widest mt-1 italic`}>exploration heatmap</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Living City Legend */}
            <div className={`px-4 py-2 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'} border flex items-center gap-3`}>
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Compass size={16} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                </div>
              </div>
              <div className="leading-tight">
                <p className="text-[10px] uppercase font-black tracking-tighter opacity-70">City Ecosystem</p>
                <p className="text-emerald-500 font-black text-sm">{communityLushness}% Lush</p>
              </div>
            </div>
            
            <div className="p-3 bg-yellow-500 rounded-2xl text-black shadow-lg">
              <Compass size={24} />
            </div>
          </div>
        </div>

        {locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-5xl mb-4">🌋</div>
            <p className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-600'} font-medium`}>
              No territory conquered yet.<br/>Book a meal to start your expedition!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Abstract Visual Map */}
            <div className={`h-64 rounded-[2rem] relative overflow-hidden ${isDarkMode ? 'bg-black/40' : 'bg-gray-100 border-gray-100 border-2'}`}>
               <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[100px] opacity-10 grayscale">🗺️</span>
               </div>
               
               {/* Grid highlights based on exploration */}
               <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-30">
                  {Array.from({length: 100}).map((_, i) => (
                    <div key={i} className={`border-[0.5px] ${isDarkMode ? 'border-white/5' : 'border-black/5'}`} />
                  ))}
               </div>

               {/* Visual Markers */}
               {aggregatedLocations.map((loc, idx) => (
                 <React.Fragment key={idx}>
                   {/* Lushness Foliage */}
                   {isLushSpot(loc.name) && (
                     <motion.div
                       initial={{ opacity: 0, scale: 0 }}
                       animate={{ opacity: 0.6, scale: 1 }}
                       transition={{ delay: idx * 0.2 }}
                       style={{ 
                         position: 'absolute',
                         left: `${((loc.longitude + 180) % 360) / 3.6}%`, 
                         top: `${((90 - loc.latitude) % 180) / 1.8}%`,
                         transform: 'translate(-50%, -100%)',
                       }}
                       className="text-lg pointer-events-none z-10"
                     >
                       🌿
                     </motion.div>
                   )}

                   <motion.div
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ delay: idx * 0.1 }}
                     style={{ 
                       position: 'absolute',
                       left: `${((loc.longitude + 180) % 360) / 3.6}%`, 
                       top: `${((90 - loc.latitude) % 180) / 1.8}%`,
                     }}
                     className="group cursor-help z-20"
                   >
                      <div className={`w-4 h-4 rounded-full animate-pulse shadow-lg ${isLushSpot(loc.name) ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-orange-500 shadow-orange-500/50'}`} />
                      <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black text-white text-[10px] p-2 rounded-lg whitespace-nowrap z-50 font-bold border border-white/10">
                          {isLushSpot(loc.name) && "🌿 COMMUNITY GEM: "}{loc.name} ({loc.count} visits)
                      </div>
                   </motion.div>
                 </React.Fragment>
               ))}
               
               {/* Heatmap-like Glows */}
               {aggregatedLocations.map((loc, idx) => (
                 <div
                   key={`glow-${idx}`}
                   style={{ 
                     position: 'absolute',
                     left: `${((loc.longitude + 180) % 360) / 3.6}%`, 
                     top: `${((90 - loc.latitude) % 180) / 1.8}%`,
                     width: `${Math.min(loc.count * 60, 150)}px`,
                     height: `${Math.min(loc.count * 60, 150)}px`,
                     transform: 'translate(-50%, -50%)',
                   }}
                   className={`${isLushSpot(loc.name) ? 'bg-emerald-500/10' : 'bg-orange-500/10'} blur-3xl rounded-full`}
                 />
               ))}
            </div>

            {/* Expediton List */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
               <div className="flex items-center justify-between sticky top-0 bg-transparent py-1 blur-wrapper">
                 <h4 className="text-xs font-black uppercase tracking-widest opacity-50">Conquered Sites</h4>
                 <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-transparent rounded-full opacity-30" />
               </div>
               {aggregatedLocations.map((loc, idx) => (
                 <div key={idx} className={`flex items-center gap-4 p-3 rounded-2xl ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-white hover:shadow-lg'} transition-all border ${isDarkMode ? 'border-white/5' : 'border-gray-100'} group`}>
                    <div className={`p-2 rounded-lg transition-colors ${isLushSpot(loc.name) ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                       <MapPin size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="font-black text-sm truncate uppercase tracking-tight flex items-center gap-1.5">
                         {loc.name}
                         {isLushSpot(loc.name) && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full ring-1 ring-emerald-500/20">LUSH</span>}
                       </p>
                       <p className="text-[10px] opacity-50 font-bold uppercase tracking-tighter">
                         Coordinates: {loc.latitude?.toFixed(2) || '0.00'}, {loc.longitude?.toFixed(2) || '0.00'}
                       </p>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className={`font-black text-lg ${isLushSpot(loc.name) ? 'text-emerald-500' : 'text-yellow-500'}`}>{loc.count}</span>
                       <span className="text-[8px] uppercase font-bold opacity-30">Visits</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(234, 179, 8, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DinoTerritoryMap;
