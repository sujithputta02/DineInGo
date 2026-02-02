import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface DietaryPreference {
    id: string;
    label: string;
    icon: string;
}

interface AllergenInfo {
    name: string;
    severity: 'high' | 'medium' | 'low';
    present: boolean;
}

interface DietaryAssistantProps {
    menuItems?: any[];
    userPreferences?: string[];
    onPreferenceChange?: (preferences: string[]) => void;
}

const DIETARY_PREFERENCES: DietaryPreference[] = [
    { id: 'vegan', label: 'Vegan', icon: '🌱' },
    { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
    { id: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
    { id: 'dairy-free', label: 'Dairy-Free', icon: '🥛' },
    { id: 'keto', label: 'Keto', icon: '🥑' },
    { id: 'halal', label: 'Halal', icon: '☪️' },
    { id: 'jain', label: 'Jain', icon: '🙏' },
    { id: 'low-carb', label: 'Low-Carb', icon: '🍖' },
];

const COMMON_ALLERGENS: AllergenInfo[] = [
    { name: 'Peanuts', severity: 'high', present: false },
    { name: 'Tree Nuts', severity: 'high', present: false },
    { name: 'Dairy', severity: 'medium', present: false },
    { name: 'Eggs', severity: 'medium', present: false },
    { name: 'Soy', severity: 'medium', present: false },
    { name: 'Wheat/Gluten', severity: 'high', present: false },
    { name: 'Shellfish', severity: 'high', present: false },
    { name: 'Fish', severity: 'medium', present: false },
];

export const DietaryAssistant: React.FC<DietaryAssistantProps> = ({
    menuItems = [],
    userPreferences = [],
    onPreferenceChange
}) => {
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>(userPreferences);
    const [showAllergens, setShowAllergens] = useState(false);
    const [allergens, setAllergens] = useState<AllergenInfo[]>(COMMON_ALLERGENS);

    const togglePreference = (prefId: string) => {
        const newPreferences = selectedPreferences.includes(prefId)
            ? selectedPreferences.filter(p => p !== prefId)
            : [...selectedPreferences, prefId];

        setSelectedPreferences(newPreferences);
        onPreferenceChange?.(newPreferences);
    };

    const getSeverityColor = (severity: AllergenInfo['severity']) => {
        switch (severity) {
            case 'high': return 'red';
            case 'medium': return 'yellow';
            case 'low': return 'green';
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Info className="w-5 h-5 text-emerald-500" />
                        Dietary Assistant
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Customize your dining preferences and allergen alerts
                    </p>
                </div>
            </div>

            {/* Dietary Preferences */}
            <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Dietary Preferences
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DIETARY_PREFERENCES.map((pref) => (
                        <button
                            key={pref.id}
                            onClick={() => togglePreference(pref.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${selectedPreferences.includes(pref.id)
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                : 'border-gray-700 bg-gray-700/30 hover:border-gray-600 text-gray-300'
                                }`}
                        >
                            <span className="text-lg">{pref.icon}</span>
                            <span className="text-sm font-medium">{pref.label}</span>
                            {selectedPreferences.includes(pref.id) && (
                                <CheckCircle className="w-4 h-4 ml-auto" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Allergen Alerts */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-300">
                        Allergen Alerts
                    </h4>
                    <button
                        onClick={() => setShowAllergens(!showAllergens)}
                        className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                        {showAllergens ? 'Hide' : 'Show'} Allergens
                    </button>
                </div>

                {showAllergens && (
                    <div className="space-y-2">
                        {allergens.map((allergen, index) => (
                            <div
                                key={allergen.name}
                                className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <AlertCircle
                                        className={`w-5 h-5 ${allergen.severity === 'high' ? 'text-red-500' :
                                                allergen.severity === 'medium' ? 'text-yellow-500' :
                                                    'text-green-500'
                                            }`}
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {allergen.name}
                                        </p>
                                        <p className="text-xs text-gray-400 capitalize">
                                            {allergen.severity} Risk
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const newAllergens = [...allergens];
                                        newAllergens[index].present = !newAllergens[index].present;
                                        setAllergens(newAllergens);
                                    }}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${allergen.present
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        : 'bg-gray-600 text-gray-300'
                                        }`}
                                >
                                    {allergen.present ? 'Allergic' : 'Safe'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Filters Summary */}
            {selectedPreferences.length > 0 && (
                <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                    <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-emerald-100">
                                Active Filters
                            </p>
                            <p className="text-sm text-emerald-300 mt-1">
                                Showing only {selectedPreferences.map(id =>
                                    DIETARY_PREFERENCES.find(p => p.id === id)?.label
                                ).join(', ')} options
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Health Goals (Future Enhancement) */}
            <div className="pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-400 text-center">
                    💡 Tip: Set your preferences once and we'll remember them for all your bookings
                </p>
            </div>
        </div>
    );
};
