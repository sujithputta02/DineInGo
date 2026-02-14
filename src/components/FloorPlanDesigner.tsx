import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  RotateCw,
  Copy,
  Save,
  Eye,
  Grid,
  Move,
  Square,
  Circle,
  Minus,
  Users,
  MapPin,
  Store,
  Wine,
  DoorOpen,
  Layers,
  X,
  ChevronRight,
  Building,
  Settings,
  FlipHorizontal,
  FlipVertical
} from 'lucide-react';
import { businessApi } from '../services/api';

// Types matching the customer view
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
  flipX?: boolean;
  flipY?: boolean;
}

interface Floor {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: Table[];
  features: Feature[];
}

// Element templates for dragging
const TABLE_TEMPLATES = [
  { shape: 'circle' as TableShape, seats: 2, label: '2-Seat Round' },
  { shape: 'circle' as TableShape, seats: 4, label: '4-Seat Round' },
  { shape: 'circle' as TableShape, seats: 6, label: '6-Seat Round' },
  { shape: 'square' as TableShape, seats: 2, label: '2-Seat Square' },
  { shape: 'square' as TableShape, seats: 4, label: '4-Seat Square' },
  { shape: 'rectangle' as TableShape, seats: 6, label: '6-Seat Rectangle' },
  { shape: 'rectangle' as TableShape, seats: 8, label: '8-Seat Rectangle' },
];

// Feature templates
const FEATURE_TEMPLATES = [
  { type: 'entrance' as FeatureType, label: 'Main Entrance', width: 20, height: 4 },
  { type: 'entrance' as FeatureType, label: 'Side Entrance', width: 15, height: 4 },
  { type: 'entrance' as FeatureType, label: 'Emergency Exit', width: 12, height: 4 },
  { type: 'entrance' as FeatureType, label: 'Staff Entrance', width: 10, height: 4 },
  { type: 'reception' as FeatureType, label: 'Reception Desk', width: 15, height: 8 },
  { type: 'reception' as FeatureType, label: 'Host Stand', width: 8, height: 6 },
  { type: 'bar' as FeatureType, label: 'Bar Counter', width: 40, height: 12 },
  { type: 'bar' as FeatureType, label: 'Wine Bar', width: 25, height: 10 },
  { type: 'window' as FeatureType, label: 'Large Window', width: 30, height: 4 },
  { type: 'window' as FeatureType, label: 'Small Window', width: 15, height: 4 },
  { type: 'plant' as FeatureType, label: 'Plant Decoration', width: 6, height: 6 },
  { type: 'wall' as FeatureType, label: 'Partition Wall', width: 2, height: 30 },
];

// Floor templates for quick setup
const FLOOR_TEMPLATES = [
  {
    id: 'casual-dining',
    name: 'Casual Dining',
    description: 'Mixed seating with bar area',
    tables: [
      { id: 'T1', label: 'T1', seats: 4, category: 'standard', shape: 'circle', x: 20, y: 30 },
      { id: 'T2', label: 'T2', seats: 4, category: 'standard', shape: 'circle', x: 50, y: 30 },
      { id: 'T3', label: 'T3', seats: 4, category: 'standard', shape: 'circle', x: 80, y: 30 },
      { id: 'T4', label: 'T4', seats: 2, category: 'standard', shape: 'square', x: 20, y: 55 },
      { id: 'T5', label: 'T5', seats: 2, category: 'standard', shape: 'square', x: 50, y: 55 },
      { id: 'T6', label: 'T6', seats: 6, category: 'premium', shape: 'rectangle', x: 30, y: 75 },
      { id: 'T7', label: 'T7', seats: 8, category: 'vip', shape: 'rectangle', x: 70, y: 75 },
    ],
    features: [
      { id: 'bar-1', type: 'bar', label: 'Bar', x: 50, y: 15, width: 40, height: 10 },
      { id: 'entrance-1', type: 'entrance', x: 50, y: 92, width: 20, height: 4 },
      { id: 'reception-1', type: 'reception', label: 'Reception', x: 15, y: 85, width: 15, height: 8 },
    ]
  }
];

// Draggable Table Component
const DraggableTable: React.FC<{
  table: Table;
  isSelected: boolean;
  isPreviewMode: boolean;
  onSelect: () => void;
  onDrag: (x: number, y: number) => void;
}> = ({ table, isSelected, isPreviewMode, onSelect, onDrag }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onSelect();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Canvas dimensions: 800px x 600px (4:3 aspect ratio from max-w-[800px] aspect-[4/3])
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    // Calculate table size in pixels (matching getTableSize function)
    const baseSize = table.seats <= 2 ? 40 : table.seats <= 4 ? 50 : table.seats <= 6 ? 60 : 70;
    const tableWidth = table.shape === 'rectangle' ? baseSize * 1.5 : baseSize;
    const tableHeight = table.shape === 'rectangle' ? baseSize * 0.8 : baseSize;

    // Convert pixel sizes to percentage margins (element is centered, so margin is half the size)
    const marginX = (tableWidth / 2 / CANVAS_WIDTH) * 100;
    const marginY = (tableHeight / 2 / CANVAS_HEIGHT) * 100;

    const newX = Math.max(marginX, Math.min(100 - marginX, table.x + (deltaX / 8)));
    const newY = Math.max(marginY, Math.min(100 - marginY, table.y + (deltaY / 8)));
    onDrag(newX, newY);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, table.x, table.y, table.seats, table.shape, onDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getTableColor = () => {
    if (isSelected && !isPreviewMode) return 'bg-emerald-500 border-emerald-400';
    switch (table.category) {
      case 'vip': return 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-500';
      case 'premium': return 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500';
      default: return 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500';
    }
  };

  const getTableShape = () => {
    switch (table.shape) {
      case 'circle': return 'rounded-full';
      case 'square': return 'rounded-lg';
      case 'rectangle': return 'rounded-lg';
      default: return 'rounded-lg';
    }
  };

  const getTableSize = () => {
    const baseSize = table.seats <= 2 ? 40 : table.seats <= 4 ? 50 : table.seats <= 6 ? 60 : 70;
    const width = table.shape === 'rectangle' ? baseSize * 1.5 : baseSize;
    const height = table.shape === 'rectangle' ? baseSize * 0.8 : baseSize;
    return { width, height };
  };

  const { width, height } = getTableSize();
  const style = {
    left: `${table.x}%`,
    top: `${table.y}%`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(-50%, -50%) rotate(${table.rotation || 0}deg)`,
    cursor: isPreviewMode ? 'default' : isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div
      className={`absolute flex items-center justify-center transition-all duration-300 ${getTableColor()} ${getTableShape()} border-2 shadow-xl backdrop-blur-sm`}
      style={style}
      onMouseDown={handleMouseDown}
    >
      <div className="text-center">
        <div className="text-white font-bold text-xs">{table.label}</div>
        <div className="text-white/80 text-[10px]">{table.seats} seats</div>
      </div>

      {/* Seat indicators */}
      {Array.from({ length: table.seats }).map((_, i) => {
        const angle = (i * (360 / table.seats)) * (Math.PI / 180);
        const radius = width / 2 + 8;
        const seatX = Math.cos(angle) * radius;
        const seatY = Math.sin(angle) * radius;

        return (
          <div
            key={`seat-indicator-${table.id}-${i}`}
            className={`absolute w-1.5 h-1.5 rounded-full ${isSelected && !isPreviewMode ? 'bg-emerald-500' : 'bg-slate-600'} opacity-40`}
            style={{
              left: `calc(50% + ${seatX}px)`,
              top: `calc(50% + ${seatY}px)`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        );
      })}
    </div>
  );
};

// Draggable Feature Component
const DraggableFeature: React.FC<{
  feature: Feature;
  isSelected: boolean;
  isPreviewMode: boolean;
  onSelect: () => void;
  onDrag: (x: number, y: number) => void;
}> = ({ feature, isSelected, isPreviewMode, onSelect, onDrag }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onSelect();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Features use percentage-based width/height, so margins are already in percentages
    const marginX = feature.width / 2;
    const marginY = feature.height / 2;

    const newX = Math.max(marginX, Math.min(100 - marginX, feature.x + (deltaX / 8)));
    const newY = Math.max(marginY, Math.min(100 - marginY, feature.y + (deltaY / 8)));
    onDrag(newX, newY);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, feature.x, feature.y, feature.width, feature.height, onDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const style = {
    left: `${feature.x}%`,
    top: `${feature.y}%`,
    width: `${feature.width}%`,
    height: `${feature.height}%`,
    transform: `translate(-50%, -50%) rotate(${feature.rotation || 0}deg) scaleX(${feature.flipX ? -1 : 1}) scaleY(${feature.flipY ? -1 : 1})`,
    cursor: isPreviewMode ? 'default' : isDragging ? 'grabbing' : 'grab'
  };

  const baseClasses = `border-2 ${isSelected && !isPreviewMode ? 'border-emerald-500' : 'border-transparent'} transition-all duration-300`;

  const getFeatureContent = () => {
    switch (feature.type) {
      case 'reception':
        return (
          <div className={`flex flex-col items-center justify-center bg-slate-800 rounded-lg border-2 border-slate-600 shadow-xl h-full w-full ${baseClasses}`}>
            <Store size={14} className="text-amber-500 mb-1" />
            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">{feature.label}</span>
          </div>
        );
      case 'window':
        return (
          <div className={`bg-cyan-900/20 border border-cyan-500/30 backdrop-blur-sm flex items-center justify-center overflow-hidden h-full w-full ${baseClasses}`}>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent"></div>
            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider relative z-10">WINDOW</span>
          </div>
        );
      case 'entrance':
        return (
          <div className={`flex flex-col items-center justify-end pb-1 border-b-4 border-emerald-500 h-full w-full ${baseClasses}`}>
            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.2em]">ENTRANCE</span>
          </div>
        );
      case 'bar':
        return (
          <div className={`bg-slate-800 rounded-xl flex items-center justify-center shadow-lg border-b-4 border-slate-900 h-full w-full ${baseClasses}`}>
            <Wine size={14} className="text-purple-400 mr-2" />
            <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">{feature.label}</span>
          </div>
        );
      case 'plant':
        return (
          <div className={`bg-emerald-900/50 rounded-full border border-emerald-800/50 flex items-center justify-center h-full w-full ${baseClasses}`}>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          </div>
        );
      case 'wall':
        return (
          <div className={`bg-slate-800 border-x border-slate-700 shadow-inner h-full w-full ${baseClasses}`}></div>
        );
      default:
        return <div className={`bg-slate-700 rounded h-full w-full ${baseClasses}`}></div>;
    }
  };

  return (
    <div className="absolute" style={style} onMouseDown={handleMouseDown}>
      {getFeatureContent()}

      {/* Rotation/Flip indicator */}
      {(isSelected && !isPreviewMode && ((feature.rotation && feature.rotation !== 0) || feature.flipX || feature.flipY)) && (
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] px-1 py-0.5 rounded-full flex items-center gap-0.5">
          {feature.rotation && feature.rotation !== 0 && (
            <span>{feature.rotation}°</span>
          )}
          {feature.flipX && (
            <FlipHorizontal size={8} />
          )}
          {feature.flipY && (
            <FlipVertical size={8} />
          )}
        </div>
      )}
    </div>
  );
};
const FloorPlanDesigner: React.FC<{
  businessId?: string;
  onSave?: (floorPlan: any) => void;
  readOnly?: boolean;
}> = ({ businessId, onSave, readOnly = false }) => {
  const [floors, setFloors] = useState<Floor[]>([
    {
      id: 'floor-1',
      name: 'Ground Floor',
      width: 100,
      height: 100,
      tables: [],
      features: []
    }
  ]);

  const [activeFloorId, setActiveFloorId] = useState('floor-1');
  const [selectedElement, setSelectedElement] = useState<{ type: 'table' | 'feature'; id: string } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFloorSettings, setShowFloorSettings] = useState(false);
  const [nextTableId, setNextTableId] = useState(1);
  const [nextFeatureId, setNextFeatureId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch floor plan data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        let activeBusinessId = businessId;

        // If no businessId provided, fetch owner's businesses and take the first one
        if (!activeBusinessId) {
          const businesses = await businessApi.getOwnerBusinesses();
          const businessData = Array.isArray(businesses) ? businesses : (businesses.businesses || businesses.data || []);
          if (businessData && businessData.length > 0) {
            activeBusinessId = businessData[0].id || businessData[0]._id;
          }
        }

        if (activeBusinessId) {
          const response = await businessApi.getById(activeBusinessId);
          const bizData = response.data || response;

          if (bizData && bizData.floorPlan) {
            const fp = bizData.floorPlan;
            if (fp.floors && fp.floors.length > 0) {
              setFloors(fp.floors);
              if (fp.activeFloorId) setActiveFloorId(fp.activeFloorId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching floor plan:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [businessId]);

  // Set initial preview mode if read-only
  useEffect(() => {
    if (readOnly) {
      setIsPreviewMode(true);
    }
  }, [readOnly]);

  const activeFloor = floors.find(f => f.id === activeFloorId);
  const selectedTable = selectedElement?.type === 'table' ? activeFloor?.tables.find(t => t.id === selectedElement.id) : null;
  const selectedFeature = selectedElement?.type === 'feature' ? activeFloor?.features.find(f => f.id === selectedElement.id) : null;

  // Add table
  const addTable = (template: typeof TABLE_TEMPLATES[0]) => {
    const newTable: Table = {
      id: `T${nextTableId}`,
      label: `T${nextTableId}`,
      seats: template.seats,
      status: 'available',
      category: 'standard',
      shape: template.shape,
      x: 50,
      y: 50,
      rotation: 0
    };

    setFloors(prev => prev.map(f =>
      f.id === activeFloorId
        ? { ...f, tables: [...f.tables, newTable] }
        : f
    ));
    setNextTableId(prev => prev + 1);
  };

  // Add feature
  const addFeature = (template: typeof FEATURE_TEMPLATES[0]) => {
    // Ensure feature starts within boundaries
    const marginX = template.width / 2;
    const marginY = template.height / 2;
    const safeX = Math.max(marginX, Math.min(100 - marginX, 50));
    const safeY = Math.max(marginY, Math.min(100 - marginY, 50));

    const newFeature: Feature = {
      id: `F${nextFeatureId}`,
      type: template.type,
      label: template.label,
      x: safeX,
      y: safeY,
      width: template.width,
      height: template.height,
      rotation: 0,
      flipX: false,
      flipY: false
    };

    setFloors(prev => prev.map(f =>
      f.id === activeFloorId
        ? { ...f, features: [...f.features, newFeature] }
        : f
    ));
    setNextFeatureId(prev => prev + 1);
  };

  // Update table position
  const updateTablePosition = (tableId: string, x: number, y: number) => {
    setFloors(prev => prev.map(f =>
      f.id === activeFloorId
        ? {
          ...f,
          tables: f.tables.map(t =>
            t.id === tableId ? { ...t, x, y } : t
          )
        }
        : f
    ));
  };

  // Update feature position
  const updateFeaturePosition = (featureId: string, x: number, y: number) => {
    setFloors(prev => prev.map(f =>
      f.id === activeFloorId
        ? {
          ...f,
          features: f.features.map(feat =>
            feat.id === featureId ? { ...feat, x, y } : feat
          )
        }
        : f
    ));
  };

  // Update table property
  const updateTableProperty = (tableId: string, property: keyof Table, value: any) => {
    setFloors(prev => prev.map(f =>
      f.id === activeFloorId
        ? {
          ...f,
          tables: f.tables.map(t =>
            t.id === tableId ? { ...t, [property]: value } : t
          )
        }
        : f
    ));
  };

  // Delete selected element
  const deleteSelected = () => {
    if (!selectedElement) return;

    if (selectedElement.type === 'table') {
      setFloors(prev => prev.map(f =>
        f.id === activeFloorId
          ? { ...f, tables: f.tables.filter(t => t.id !== selectedElement.id) }
          : f
      ));
    } else if (selectedElement.type === 'feature') {
      setFloors(prev => prev.map(f =>
        f.id === activeFloorId
          ? { ...f, features: f.features.filter(feat => feat.id !== selectedElement.id) }
          : f
      ));
    }

    setSelectedElement(null);
  };

  // Apply template
  const applyTemplate = (template: typeof FLOOR_TEMPLATES[0]) => {
    setFloors(prev => prev.map(f =>
      f.id === activeFloorId
        ? {
          ...f,
          tables: template.tables.map(t => ({
            ...t,
            status: 'available' as TableStatus,
            category: t.category as TableCategory,
            shape: t.shape as TableShape
          })),
          features: template.features.map(feat => {
            // Ensure features are within boundaries
            const marginX = feat.width / 2;
            const marginY = feat.height / 2;
            const safeX = Math.max(marginX, Math.min(100 - marginX, feat.x));
            const safeY = Math.max(marginY, Math.min(100 - marginY, feat.y));

            return {
              ...feat,
              x: safeX,
              y: safeY,
              type: feat.type as FeatureType,
              rotation: 0,
              flipX: false,
              flipY: false
            };
          })
        }
        : f
    ));
  };

  // Save floor plan
  const saveFloorPlan = async () => {
    if (!businessId && !onSave) {
      console.warn('No businessId provided and no onSave callback - cannot save floor plan');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const floorPlanData = {
        floors,
        activeFloorId,
        metadata: {
          version: '1.0',
          lastModified: new Date().toISOString(),
          totalTables: floors.reduce((sum, floor) => sum + floor.tables.length, 0),
          totalFeatures: floors.reduce((sum, floor) => sum + floor.features.length, 0)
        }
      };

      if (onSave) {
        // Use callback if provided (for business onboarding)
        onSave(floorPlanData);
        setSaveMessage('Floor plan saved successfully!');
      } else if (businessId) {
        // Save to business API
        await businessApi.update(businessId, { floorPlan: floorPlanData });
        setSaveMessage('Floor plan saved to business successfully!');
      }

      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving floor plan:', error);
      setSaveMessage('Error saving floor plan. Please try again.');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200">
      {/* Left Sidebar - Element Palette - Only show if not read-only */}
      {!readOnly && (
        <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col max-h-full">
          <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
            <h2 className="text-lg font-bold text-white mb-2">Floor Plan Designer</h2>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isPreviewMode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                <Eye size={16} />
                {isPreviewMode ? 'Edit Mode' : 'Preview'}
              </button>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showGrid
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
              >
                <Grid size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors text-sm"
              >
                <Copy size={16} />
                Templates
              </button>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {!isPreviewMode && (
              <div>
                {/* Templates Section */}
                {showTemplates && (
                  <div className="p-4 border-b border-slate-700/50">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Floor Templates</h3>
                    <div className="space-y-2">
                      {FLOOR_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors"
                        >
                          <div className="text-sm font-medium text-slate-200">{template.name}</div>
                          <div className="text-xs text-slate-400 mt-1">{template.description}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {template.tables.length} tables, {template.features.length} features
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tables Section */}
                <div className="p-4 border-b border-slate-700/50">
                  <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Tables</h3>
                  <div className="space-y-2">
                    {TABLE_TEMPLATES.map((template, index) => (
                      <button
                        key={`table-template-${template.shape}-${index}`}
                        onClick={() => addTable(template)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-left"
                      >
                        {template.shape === 'circle' ? <Circle size={16} /> :
                          template.shape === 'square' ? <Square size={16} /> :
                            <Minus size={16} className="rotate-90" />}
                        <div>
                          <div className="text-sm font-medium text-slate-200">{template.label}</div>
                          <div className="text-xs text-slate-400">{template.seats} seats</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Features Section */}
                <div className="p-4 border-b border-slate-700/50">
                  <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Features</h3>
                  <div className="space-y-2">
                    {FEATURE_TEMPLATES.map((template, index) => (
                      <button
                        key={`feature-template-${template.type}-${index}`}
                        onClick={() => addFeature(template)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-left"
                      >
                        {template.type === 'entrance' ? <DoorOpen size={16} /> :
                          template.type === 'reception' ? <Store size={16} /> :
                            template.type === 'bar' ? <Wine size={16} /> :
                              <MapPin size={16} />}
                        <div className="text-sm font-medium text-slate-200">{template.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Properties Panel */}
            {selectedElement && !isPreviewMode && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Properties</h3>
                  <button
                    onClick={deleteSelected}
                    className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {selectedTable && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Table ID</label>
                      <input
                        type="text"
                        value={selectedTable.label}
                        onChange={(e) => updateTableProperty(selectedTable.id, 'label', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Seats</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={selectedTable.seats}
                        onChange={(e) => updateTableProperty(selectedTable.id, 'seats', parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Category</label>
                      <select
                        value={selectedTable.category}
                        onChange={(e) => updateTableProperty(selectedTable.id, 'category', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      >
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Shape</label>
                      <select
                        value={selectedTable.shape}
                        onChange={(e) => updateTableProperty(selectedTable.id, 'shape', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      >
                        <option value="circle">Circle</option>
                        <option value="square">Square</option>
                        <option value="rectangle">Rectangle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Rotation</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="15"
                          value={selectedTable.rotation || 0}
                          onChange={(e) => updateTableProperty(selectedTable.id, 'rotation', parseInt(e.target.value))}
                          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-slate-400 w-12 text-right">{selectedTable.rotation || 0}°</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => updateTableProperty(selectedTable.id, 'rotation', 0)}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                        >
                          0°
                        </button>
                        <button
                          onClick={() => updateTableProperty(selectedTable.id, 'rotation', 90)}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                        >
                          90°
                        </button>
                        <button
                          onClick={() => updateTableProperty(selectedTable.id, 'rotation', 180)}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                        >
                          180°
                        </button>
                        <button
                          onClick={() => updateTableProperty(selectedTable.id, 'rotation', 270)}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                        >
                          270°
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedFeature && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Label</label>
                      <input
                        type="text"
                        value={selectedFeature.label || ''}
                        onChange={(e) => {
                          setFloors(prev => prev.map(f =>
                            f.id === activeFloorId
                              ? {
                                ...f,
                                features: f.features.map(feat =>
                                  feat.id === selectedFeature.id ? { ...feat, label: e.target.value } : feat
                                )
                              }
                              : f
                          ));
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Width (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={selectedFeature.width}
                        onChange={(e) => {
                          setFloors(prev => prev.map(f =>
                            f.id === activeFloorId
                              ? {
                                ...f,
                                features: f.features.map(feat =>
                                  feat.id === selectedFeature.id ? { ...feat, width: parseInt(e.target.value) } : feat
                                )
                              }
                              : f
                          ));
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Height (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={selectedFeature.height}
                        onChange={(e) => {
                          setFloors(prev => prev.map(f =>
                            f.id === activeFloorId
                              ? {
                                ...f,
                                features: f.features.map(feat =>
                                  feat.id === selectedFeature.id ? { ...feat, height: parseInt(e.target.value) } : feat
                                )
                              }
                              : f
                          ));
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Rotation</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="15"
                          value={selectedFeature.rotation || 0}
                          onChange={(e) => {
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? { ...feat, rotation: parseInt(e.target.value) } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-slate-400 w-12 text-right">{selectedFeature.rotation || 0}°</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => {
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? { ...feat, rotation: 0 } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                        >
                          0°
                        </button>
                        <button
                          onClick={() => {
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? { ...feat, rotation: 90 } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                        >
                          90°
                        </button>
                        <button
                          onClick={() => {
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? { ...feat, rotation: 180 } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                        >
                          180°
                        </button>
                        <button
                          onClick={() => {
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? { ...feat, rotation: 270 } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 rounded"
                        >
                          270°
                        </button>
                        <button
                          onClick={() => {
                            const currentRotation = selectedFeature.rotation || 0;
                            const newRotation = (currentRotation + 90) % 360;
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? { ...feat, rotation: newRotation } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-1"
                          title="Rotate 90° clockwise"
                        >
                          <RotateCw size={10} />
                          +90°
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Transform Controls</label>
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => {
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? {
                                      ...feat,
                                      rotation: 0,
                                      flipX: false,
                                      flipY: false
                                    } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                        >
                          <X size={12} />
                          Reset Transform
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Flip</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? { ...feat, flipX: !feat.flipX } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className={`flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${selectedFeature.flipX
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                            }`}
                        >
                          <FlipHorizontal size={12} />
                          Flip X
                        </button>
                        <button
                          onClick={() => {
                            setFloors(prev => prev.map(f =>
                              f.id === activeFloorId
                                ? {
                                  ...f,
                                  features: f.features.map(feat =>
                                    feat.id === selectedFeature.id ? { ...feat, flipY: !feat.flipY } : feat
                                  )
                                }
                                : f
                            ));
                          }}
                          className={`flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${selectedFeature.flipY
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                            }`}
                        >
                          <FlipVertical size={12} />
                          Flip Y
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="p-4 border-t border-slate-700/50 space-y-2 flex-shrink-0">
            {saveMessage && (
              <div className={`text-xs p-2 rounded-lg text-center ${saveMessage.includes('Error')
                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                : 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                }`}>
                {saveMessage}
              </div>
            )}
            <button
              onClick={saveFloorPlan}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Layout'}
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex items-center justify-center p-4 md:p-8">
          <div
            className="relative w-full max-w-[800px] aspect-[4/3] bg-slate-800/30 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-sm"
            onClick={() => !isPreviewMode && setSelectedElement(null)}
          >
            {/* Grid overlay */}
            {showGrid && !isPreviewMode && (
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#475569" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            )}

            {/* Features Layer */}
            {activeFloor?.features.map(feature => (
              <DraggableFeature
                key={feature.id}
                feature={feature}
                isSelected={selectedElement?.type === 'feature' && selectedElement.id === feature.id}
                isPreviewMode={isPreviewMode}
                onSelect={() => setSelectedElement({ type: 'feature', id: feature.id })}
                onDrag={(x, y) => updateFeaturePosition(feature.id, x, y)}
              />
            ))}

            {/* Tables Layer */}
            {activeFloor?.tables.map(table => (
              <DraggableTable
                key={table.id}
                table={table}
                isSelected={selectedElement?.type === 'table' && selectedElement.id === table.id}
                isPreviewMode={isPreviewMode}
                onSelect={() => setSelectedElement({ type: 'table', id: table.id })}
                onDrag={(x, y) => updateTablePosition(table.id, x, y)}
              />
            ))}

            {/* Empty state */}
            {(!activeFloor?.tables.length && !activeFloor?.features.length) && (
              <div className="absolute inset-4 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Building size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Floor Plan Canvas</p>
                  <p className="text-sm mt-2">Add tables and features from the sidebar</p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800/80 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-4 shadow-2xl border border-slate-700/50 overflow-x-auto max-w-[90vw]">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-500 shadow-sm"></div>
              <span className="text-xs font-semibold text-slate-300 uppercase">Available</span>
            </div>
            {!isPreviewMode && (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400 shadow-sm"></div>
                <span className="text-xs font-semibold text-slate-300 uppercase">Selected</span>
              </div>
            )}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-3 h-3 rounded bg-slate-900 border border-slate-800 shadow-sm"></div>
              <span className="text-xs font-semibold text-slate-300 uppercase">Booked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanDesigner;