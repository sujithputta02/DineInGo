import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  Calendar,
  Trash2,
  Edit2,
  Check,
  Plus,
  BookOpen,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FoodDiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onOpenCapture?: () => void;
}

export interface DiaryEntry {
  _id: string;
  dishName: string;
  mealType: string;
  date: string;
  portionMultiplier: number;
  calculatedNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  provenance: string;
  confidence: number;
  notes?: string;
}

export const FoodDiaryModal: React.FC<FoodDiaryModalProps> = ({
  isOpen,
  onClose,
  userId = 'demo_user',
  onOpenCapture
}) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [targets, setTargets] = useState({
    dailyCaloriesTarget: 2000,
    proteinTargetG: 60,
    carbTargetG: 250,
    fatTargetG: 65
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMultiplier, setEditMultiplier] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(false);

  const loadDiaryData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/food-diary/daily-summary/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotals(data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 });
        if (data.targets) setTargets(data.targets);
      } else {
        // Fallback to localStorage
        loadFromLocalStorage();
      }
    } catch {
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const raw = localStorage.getItem('dineingo_diary_entries');
    if (raw) {
      try {
        const parsed: DiaryEntry[] = JSON.parse(raw);
        setEntries(parsed);
        const t = parsed.reduce((acc, curr) => {
          acc.calories += curr.calculatedNutrition.calories || 0;
          acc.protein += curr.calculatedNutrition.protein || 0;
          acc.carbs += curr.calculatedNutrition.carbs || 0;
          acc.fat += curr.calculatedNutrition.fat || 0;
          return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        setTotals(t);
      } catch {
        setEntries([]);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDiaryData();
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/v1/food-diary/${id}?userId=${userId}`, { method: 'DELETE' });
    } catch {}

    // Update local state and localStorage
    const updated = entries.filter(e => e._id !== id);
    setEntries(updated);
    localStorage.setItem('dineingo_diary_entries', JSON.stringify(updated));

    // Recalculate totals
    const t = updated.reduce((acc, curr) => {
      acc.calories += curr.calculatedNutrition.calories || 0;
      acc.protein += curr.calculatedNutrition.protein || 0;
      acc.carbs += curr.calculatedNutrition.carbs || 0;
      acc.fat += curr.calculatedNutrition.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    setTotals(t);
  };

  const handleUpdatePortion = async (id: string) => {
    try {
      await fetch(`/api/v1/food-diary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portionMultiplier: editMultiplier, userId })
      });
    } catch {}

    const updated = entries.map(e => {
      if (e._id === id) {
        const ratio = editMultiplier / (e.portionMultiplier || 1.0);
        return {
          ...e,
          portionMultiplier: editMultiplier,
          calculatedNutrition: {
            ...e.calculatedNutrition,
            calories: Math.round(e.calculatedNutrition.calories * ratio),
            protein: Math.round(e.calculatedNutrition.protein * ratio * 10) / 10,
            carbs: Math.round(e.calculatedNutrition.carbs * ratio * 10) / 10,
            fat: Math.round(e.calculatedNutrition.fat * ratio * 10) / 10
          }
        };
      }
      return e;
    });

    setEntries(updated);
    localStorage.setItem('dineingo_diary_entries', JSON.stringify(updated));
    setEditingId(null);

    const t = updated.reduce((acc, curr) => {
      acc.calories += curr.calculatedNutrition.calories || 0;
      acc.protein += curr.calculatedNutrition.protein || 0;
      acc.carbs += curr.calculatedNutrition.carbs || 0;
      acc.fat += curr.calculatedNutrition.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    setTotals(t);
  };

  if (!isOpen) return null;

  const calProgress = Math.min(100, Math.round((totals.calories / targets.dailyCaloriesTarget) * 100));
  const remainingCalories = Math.max(0, targets.dailyCaloriesTarget - totals.calories);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-6 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2 border border-emerald-500/30">
                <BookOpen size={13} />
                Daily Food Diary & Progress
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">Confirmed Meal Intake</h3>
              <p className="text-xs text-gray-400 mt-1">Review your real-time nutrition budget, recorded meals, and macro totals.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Daily Progress Dashboard */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-gray-400">Total Energy Consumed</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-amber-400">{totals.calories}</span>
                  <span className="text-xs text-gray-400">/ {targets.dailyCaloriesTarget} kcal</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-emerald-400">Remaining Today</span>
                <p className="text-xl font-black text-white">{remainingCalories} kcal</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${calProgress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {/* Macronutrient Pills */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Protein</span>
                <span className="text-sm font-black text-blue-400">{totals.protein}g</span>
                <span className="text-[10px] text-gray-500 block">/ {targets.proteinTargetG}g</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Carbs</span>
                <span className="text-sm font-black text-emerald-400">{totals.carbs}g</span>
                <span className="text-[10px] text-gray-500 block">/ {targets.carbTargetG}g</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Fat</span>
                <span className="text-sm font-black text-rose-400">{totals.fat}g</span>
                <span className="text-[10px] text-gray-500 block">/ {targets.fatTargetG}g</span>
              </div>
            </div>
          </div>

          {/* Meal Log Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-300">
                Today's Recorded Meals ({entries.length})
              </h4>
              {onOpenCapture && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCapture();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-xs font-bold transition-colors border border-blue-500/30"
                >
                  <Plus size={12} />
                  <span>Scan Food</span>
                </button>
              )}
            </div>

            {entries.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl p-6 space-y-2">
                <Clock className="mx-auto text-gray-500" size={28} />
                <p className="text-sm font-bold text-gray-300">No Meals Confirmed Today</p>
                <p className="text-xs text-gray-500">Scan food or dishes in AR, adjust your portion, and confirm intake to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {entries.map(entry => (
                  <div
                    key={entry._id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{entry.dishName}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                          {entry.mealType}
                        </span>
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                          {entry.portionMultiplier}x
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="text-amber-400 font-bold">{entry.calculatedNutrition.calories} kcal</span>
                        <span>•</span>
                        <span>P: {entry.calculatedNutrition.protein}g</span>
                        <span>•</span>
                        <span>C: {entry.calculatedNutrition.carbs}g</span>
                        <span>•</span>
                        <span>F: {entry.calculatedNutrition.fat}g</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {editingId === entry._id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="5.0"
                            value={editMultiplier}
                            onChange={(e) => setEditMultiplier(parseFloat(e.target.value) || 1.0)}
                            className="w-14 px-2 py-1 bg-black border border-white/20 rounded-lg text-xs font-bold text-white"
                          />
                          <button
                            onClick={() => handleUpdatePortion(entry._id)}
                            className="p-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400"
                            title="Save Portion"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(entry._id);
                            setEditMultiplier(entry.portionMultiplier || 1.0);
                          }}
                          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                          title="Adjust Portion"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
