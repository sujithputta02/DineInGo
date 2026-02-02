import React, { useState, useMemo } from 'react';
import { Layers, Users, Check, X, MapPin, ChevronRight, Info, DoorOpen, Store, Armchair, Utensils, Music, Wine } from 'lucide-react';

// --- Types ---
type TableStatus = 'available' | 'selected' | 'occupied' | 'reserved';
type TableShape = 'circle' | 'square' | 'rectangle';
type TableCategory = 'standard' | 'premium' | 'vip';
type FeatureType = 'entrance' | 'window' | 'reception' | 'plant' | 'bar' | 'wall';

interface Table {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  category: TableCategory;
  shape: TableShape;
  x: number; 
  y: number; 
  rotation?: number;
}

interface Feature {
  id: string;
  type: FeatureType;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

interface Floor {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: Table[];
  features: Feature[];
}

// --- Configuration / Mock Data ---
const INITIAL_DATA: Floor[] = [
  {
    id: 'floor-g',
    name: 'Ground Floor',
    width: 800,
    height: 600,
    features: [
      { id: 'ent-g', type: 'entrance', x: 50, y: 98, width: 20, height: 2 },
      { id: 'rec-g', type: 'reception', label: 'Reception', x: 50, y: 85, width: 20, height: 8 },
      { id: 'win-g-l', type: 'window', x: 2, y: 40, width: 2, height: 60 },
      { id: 'win-g-r', type: 'window', x: 98, y: 40, width: 2, height: 60 },
      { id: 'plant-g1', type: 'plant', x: 10, y: 10, width: 5, height: 5 },
      { id: 'plant-g2', type: 'plant', x: 90, y: 10, width: 5, height: 5 },
    ],
    tables: [
      { id: 'G1', label: 'G1', seats: 4, category: 'standard', status: 'available', shape: 'circle', x: 20, y: 30 },
      { id: 'G2', label: 'G2', seats: 4, category: 'standard', status: 'occupied', shape: 'circle', x: 50, y: 30 },
      { id: 'G3', label: 'G3', seats: 4, category: 'standard', status: 'available', shape: 'circle', x: 80, y: 30 },
      { id: 'G4', label: 'G4', seats: 2, category: 'standard', status: 'available', shape: 'square', x: 20, y: 55 },
      { id: 'G5', label: 'G5', seats: 2, category: 'standard', status: 'available', shape: 'square', x: 50, y: 55 },
      { id: 'G6', label: 'G6', seats: 2, category: 'standard', status: 'available', shape: 'square', x: 80, y: 55 },
      { id: 'G7', label: 'G7', seats: 6, category: 'premium', status: 'reserved', shape: 'rectangle', x: 30, y: 15 },
      { id: 'G8', label: 'G8', seats: 6, category: 'premium', status: 'available', shape: 'rectangle', x: 70, y: 15 },
    ],
  },
  {
    id: 'floor-1',
    name: 'First Floor',
    width: 800,
    height: 600,
    features: [
      { id: 'bar-1', type: 'bar', label: 'Lounge Bar', x: 50, y: 10, width: 40, height: 12 },
      { id: 'win-1-l', type: 'window', x: 2, y: 50, width: 2, height: 80 },
      { id: 'win-1-r', type: 'window', x: 98, y: 50, width: 2, height: 80 },
    ],
    tables: [
      { id: 'F1', label: 'F1', seats: 2, category: 'premium', status: 'available', shape: 'circle', x: 20, y: 35 },
      { id: 'F2', label: 'F2', seats: 2, category: 'premium', status: 'available', shape: 'circle', x: 80, y: 35 },
      { id: 'F3', label: 'F3', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 35, y: 45 },
      { id: 'F4', label: 'F4', seats: 4, category: 'standard', status: 'occupied', shape: 'square', x: 65, y: 45 },
      { id: 'F5', label: 'F5', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 20, y: 65 },
      { id: 'F6', label: 'F6', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 50, y: 65 },
      { id: 'F7', label: 'F7', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 80, y: 65 },
      { id: 'F8', label: 'F8', seats: 8, category: 'vip', status: 'reserved', shape: 'rectangle', x: 50, y: 85 },
    ],
  },
  {
    id: 'floor-2',
    name: 'Second Floor',
    width: 800,
    height: 600,
    features: [
      { id: 'win-2-f', type: 'window', x: 50, y: 2, width: 80, height: 2 },
    ],
    tables: [
      { id: 'S1', label: 'S1', seats: 4, category: 'vip', status: 'available', shape: 'rectangle', x: 25, y: 20 },
      { id: 'S2', label: 'S2', seats: 4, category: 'vip', status: 'available', shape: 'rectangle', x: 75, y: 20 },
      { id: 'S3', label: 'S3', seats: 2, category: 'standard', status: 'available', shape: 'circle', x: 20, y: 50 },
      { id: 'S4', label: 'S4', seats: 2, category: 'standard', status: 'available', shape: 'circle', x: 40, y: 50 },
      { id: 'S5', label: 'S5', seats: 2, category: 'standard', status: 'available', shape: 'circle', x: 60, y: 50 },
      { id: 'S6', label: 'S6', seats: 2, category: 'standard', status: 'available', shape: 'circle', x: 80, y: 50 },
      { id: 'S7', label: 'S7', seats: 6, category: 'premium', status: 'occupied', shape: 'rectangle', x: 30, y: 80 },
      { id: 'S8', label: 'S8', seats: 6, category: 'premium', status: 'available', shape: 'rectangle', x: 70, y: 80 },
    ],
  },
  {
    id: 'floor-3',
    name: 'Third Floor',
    width: 800,
    height: 600,
    features: [
      { id: 'wall-3', type: 'wall', x: 50, y: 50, width: 2, height: 60 },
    ],
    tables: [
      { id: 'T1', label: 'T1', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 20, y: 25 },
      { id: 'T2', label: 'T2', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 20, y: 50 },
      { id: 'T3', label: 'T3', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 20, y: 75 },
      { id: 'T4', label: 'T4', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 80, y: 25 },
      { id: 'T5', label: 'T5', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 80, y: 50 },
      { id: 'T6', label: 'T6', seats: 4, category: 'standard', status: 'available', shape: 'square', x: 80, y: 75 },
      { id: 'T7', label: 'T7', seats: 2, category: 'vip', status: 'available', shape: 'circle', x: 50, y: 20 },
      { id: 'T8', label: 'T8', seats: 2, category: 'vip', status: 'available', shape: 'circle', x: 50, y: 80 },
    ],
  },
];

// --- Sub-Components ---
const FeatureRenderer = ({ feature }: { feature: Feature }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${feature.x}%`,
    top: `${feature.y}%`,
    width: `${feature.width}%`,
    height: `${feature.height}%`,
    transform: `translate(-50%, -50%) rotate(${feature.rotation || 0}deg)`,
  };

  switch (feature.type) {
    case 'reception':
      return (
        <div style={style} className="flex flex-col items-center justify-center bg-slate-800 rounded-lg border-2 border-slate-600 shadow-xl">
          <Store size={14} className="text-amber-500 mb-1"/>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{feature.label}</span>
        </div>
      );
    case 'window':
      return (
        <div style={style} className="bg-cyan-900/20 border border-cyan-500/30 backdrop-blur-sm flex items-center justify-center overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="w-full h-[1px] bg-cyan-500/20 absolute top-1/3"></div>
          <div className="w-full h-[1px] bg-cyan-500/20 absolute top-2/3"></div>
        </div>
      )
    case 'entrance':
      return (
        <div style={style} className="flex flex-col items-center justify-end pb-1 border-b-4 border-emerald-500">
          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.2em] animate-pulse">Entrance</span>
        </div>
      );
    case 'bar':
      return (
        <div style={style} className="bg-slate-800 rounded-xl flex items-center justify-center shadow-lg border-b-4 border-slate-900">
          <Wine size={14} className="text-purple-400 mr-2" />
          <span className="text-purple-200 text-xs font-bold tracking-widest uppercase">{feature.label}</span>
        </div>
      )
    case 'plant':
      return (
        <div style={style} className="bg-emerald-900/50 rounded-full border border-emerald-800/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        </div>
      )
    case 'wall':
      return (
        <div style={style} className="bg-slate-800 border-x border-slate-700 shadow-inner"></div>
      )
    default:
      return null;
  }
};

const TableRenderer = ({ table, isSelected, onClick }: { table: Table, isSelected: boolean, onClick: () => void }) => {
  let bgGradient = "";
  let borderColor = "";
  let textColor = "";
  let shadowColor = "";

  if (table.category === 'vip') {
    bgGradient = "bg-gradient-to-br from-amber-600 to-amber-900";
    borderColor = "border-amber-500";
    textColor = "text-amber-100";
    shadowColor = "shadow-amber-900/50";
  } else if (table.category === 'premium') {
    bgGradient = "bg-gradient-to-br from-purple-600 to-purple-900";
    borderColor = "border-purple-500";
    textColor = "text-purple-100";
    shadowColor = "shadow-purple-900/50";
  } else {
    bgGradient = "bg-gradient-to-br from-slate-600 to-slate-800";
    borderColor = "border-slate-500";
    textColor = "text-slate-300";
    shadowColor = "shadow-slate-900/50";
  }

  if (isSelected) {
    bgGradient = "bg-green-500";
    borderColor = "border-green-400";
    textColor = "text-white";
    shadowColor = "shadow-green-500/50";
  } else if (table.status === 'occupied') {
    bgGradient = "bg-slate-900";
    borderColor = "border-slate-800";
    textColor = "text-slate-700";
    shadowColor = "shadow-none";
  } else if (table.status === 'reserved') {
    bgGradient = "bg-slate-800"; 
    borderColor = "border-slate-700";
    textColor = "text-slate-600";
  }

  let w = 'w-12 md:w-16'; 
  let h = 'h-12 md:h-16';
  let r = 'rounded-lg';
  
  if (table.shape === 'circle') { r = 'rounded-full'; } 
  if (table.shape === 'rectangle') { w = 'w-20 md:w-24'; h = 'h-12 md:h-14'; r = 'rounded-lg'; }

  return (
    <div className="absolute flex items-center justify-center transition-all duration-300"
      style={{ 
        left: `${table.x}%`, 
        top: `${table.y}%`, 
        transform: 'translate(-50%, -50%)',
        zIndex: 10
      }}
    >
      {Array.from({ length: table.seats }).map((_, i) => {
        const angle = (i * (360 / table.seats)) * (Math.PI / 180);
        const radius = 60;
        return (
          <div key={i}
            className={`absolute w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-green-500' : 'bg-slate-600'} opacity-40`}
            style={{
              top: `${50 + (radius * Math.sin(angle))}%`,
              left: `${50 + (radius * Math.cos(angle))}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )
      })}

      <button
        onClick={onClick}
        disabled={table.status === 'occupied' || table.status === 'reserved'}
        className={`relative flex items-center justify-center border-t-2 border-b-4 ${borderColor} ${bgGradient} ${textColor}
          shadow-lg ${shadowColor}
          transition-all active:scale-95 active:border-b-0 active:translate-y-1
          ${w} ${h} ${r}`}
      >
        <div className="flex flex-col items-center leading-none">
          <span className="font-bold text-sm md:text-base drop-shadow-md">{table.label}</span>
          {table.seats > 0 && <span className="text-[9px] opacity-60 mt-0.5">{table.seats} Seats</span>}
        </div>
      </button>
    </div>
  );
};

// --- Main App Component ---
export default function RestaurantTableLayout() {
  const [floors, setFloors] = useState<Floor[]>(INITIAL_DATA);
  const [activeFloorId, setActiveFloorId] = useState<string>(INITIAL_DATA[0].id);

  const activeFloor = useMemo(() => floors.find(f => f.id === activeFloorId), [floors, activeFloorId]);

  const selectedTables = useMemo(() => {
    return floors.flatMap(f => f.tables.filter(t => t.status === 'selected').map(t => ({
      ...t, 
      floorName: f.name
    })));
  }, [floors]);

  const handleTableClick = (floorId: string, tableId: string) => {
    setFloors(prev => prev.map(f => {
      if (f.id !== floorId) return f;
      return {
        ...f,
        tables: f.tables.map(t => {
          if (t.id !== tableId) return t;
          if (t.status === 'occupied' || t.status === 'reserved') return t;
          return { ...t, status: t.status === 'selected' ? 'available' : 'selected' };
        })
      };
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200 font-sans">
      {/* Header - Simplified without branding */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 flex justify-between items-center z-30 shadow-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-300">Table Selection</h2>
        </div>

        {/* Floor Tabs */}
        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700 overflow-x-auto max-w-[200px] md:max-w-none gap-1">
          {floors.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFloorId(f.id)}
              className={`px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeFloorId === f.id 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* --- MAP CANVAS --- */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col items-center justify-center p-4 md:p-8">
          {/* The Floor Container */}
          <div className="relative w-full max-w-[700px] aspect-[4/3] bg-slate-800/30 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-sm transition-all duration-500 p-4">
            {/* Features Layer */}
            {activeFloor?.features.map(feat => (
              <FeatureRenderer key={feat.id} feature={feat} />
            ))}

            {/* Tables Layer */}
            {activeFloor?.tables.map(table => (
              <TableRenderer 
                key={table.id} 
                table={table} 
                isSelected={table.status === 'selected'}
                onClick={() => handleTableClick(activeFloor.id, table.id)}
              />
            ))}
          </div>

          {/* --- LEGEND --- */}
          <div className="mt-6 bg-slate-800/80 backdrop-blur-md rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl border border-slate-700/50 overflow-x-auto max-w-[90vw]">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-4 h-4 rounded bg-amber-600 border border-amber-800 shadow-sm"></div>
              <span className="text-xs font-semibold text-slate-300 uppercase">VIP</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-4 h-4 rounded bg-purple-700 border border-purple-900 shadow-sm"></div>
              <span className="text-xs font-semibold text-slate-300 uppercase">Premium</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-4 h-4 rounded bg-slate-500 border border-slate-700 shadow-sm"></div>
              <span className="text-xs font-semibold text-slate-300 uppercase">Standard</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-4 h-4 rounded bg-green-500 border border-green-600 shadow-sm"></div>
              <span className="text-xs font-semibold text-slate-300 uppercase">Selected</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-4 h-4 rounded bg-slate-900 border border-slate-800 shadow-sm"></div>
              <span className="text-xs font-semibold text-slate-300 uppercase">Booked</span>
            </div>
          </div>
        </div>

        {/* --- SIDEBAR SUMMARY --- */}
        {selectedTables.length > 0 && (
          <div className="absolute bottom-0 w-full md:static md:w-80 bg-slate-800/95 backdrop-blur-md border-t md:border-t-0 md:border-l border-slate-700/50 flex flex-col z-40 shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white tracking-tight">Your Selection</h2>
              <p className="text-sm text-slate-400 mt-1">{selectedTables.length} table{selectedTables.length > 1 ? 's' : ''} selected</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[200px] md:max-h-none">
              {selectedTables.map((t) => (
                <div key={t.id} className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center group hover:bg-slate-900/70 transition-colors">
                  <div>
                    <div className="font-bold text-white">
                      {t.label} 
                      <span className="text-xs font-normal text-slate-400 uppercase ml-2 bg-slate-700/50 px-2 py-0.5 rounded">
                        {t.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                      <Layers size={12} className="text-slate-600" />
                      {t.floorName} • {t.seats} Guests
                    </div>
                  </div>
                  <button 
                    onClick={() => handleTableClick(floors.find(f => f.name === t.floorName)!.id, t.id)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-700/50 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 bg-slate-900/50 border-t border-slate-700/50">
              <button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-4 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transform active:scale-95">
                Confirm Booking
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
