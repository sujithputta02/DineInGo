import React from 'react';
import { Leaf, Droplet, Recycle, Award } from 'lucide-react';

interface SustainabilityBadgeProps {
    score?: number; // 0-100
    localSourcing?: boolean;
    ecoFriendly?: boolean;
    carbonNeutral?: boolean;
    className?: string;
}

export const SustainabilityBadge: React.FC<SustainabilityBadgeProps> = ({
    score = 0,
    localSourcing = false,
    ecoFriendly = false,
    carbonNeutral = false,
    className = ''
}) => {
    // Calculate overall sustainability level
    const getLevel = () => {
        if (score >= 80) return { label: 'Excellent', color: 'emerald', icon: Award };
        if (score >= 60) return { label: 'Good', color: 'green', icon: Leaf };
        if (score >= 40) return { label: 'Fair', color: 'yellow', icon: Recycle };
        return { label: 'Basic', color: 'gray', icon: Droplet };
    };

    const level = getLevel();
    const Icon = level.icon;

    if (score === 0 && !localSourcing && !ecoFriendly && !carbonNeutral) {
        return null; // Don't show badge if no sustainability data
    }

    return (
        <div className={`inline-flex flex-col gap-2 ${className}`}>
            {/* Main Score Badge */}
            {score > 0 && (
                <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${level.color}-50 dark:bg-${level.color}-900/20 border border-${level.color}-200 dark:border-${level.color}-700`}
                >
                    <Icon className={`w-4 h-4 text-${level.color}-600 dark:text-${level.color}-400`} />
                    <span className={`text-sm font-medium text-${level.color}-700 dark:text-${level.color}-300`}>
                        {level.label} Sustainability
                    </span>
                    <span className={`text-xs font-semibold text-${level.color}-600 dark:text-${level.color}-400`}>
                        {score}/100
                    </span>
                </div>
            )}

            {/* Additional Badges */}
            <div className="flex flex-wrap gap-1.5">
                {localSourcing && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                        <Leaf className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Local Sourcing
                        </span>
                    </div>
                )}

                {ecoFriendly && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                        <Recycle className="w-3 h-3 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                            Eco-Friendly
                        </span>
                    </div>
                )}

                {carbonNeutral && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                        <Droplet className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            Carbon Neutral
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
