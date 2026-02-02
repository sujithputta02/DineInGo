import React, { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { VoiceSearchButton } from '../components/VoiceSearchButton';
import { DietaryAssistant } from '../components/DietaryAssistant';
import { SustainabilityBadge } from '../components/SustainabilityBadge';
import { Sparkles, Mic, Leaf, Moon } from 'lucide-react';

export default function FeaturesDemo() {
    const [searchQuery, setSearchQuery] = useState('');
    const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);

    const handleVoiceSearch = (query: string) => {
        setSearchQuery(query);
        console.log('Voice search query:', query);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Header with Theme Toggle */}
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-emerald-500" />
                                DineInGo 2026 Features Demo
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Explore the new features we just added!
                            </p>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Feature Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* 1. Dark Mode Demo */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                <Moon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Dark Mode
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Toggle in the top-right corner
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    ✨ Automatic system preference detection
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    💾 Persistent theme selection
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    🎨 Smooth 200ms transitions
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Voice Search Demo */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <Mic className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Voice Search
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Try speaking your search
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search restaurants..."
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                />
                                <VoiceSearchButton
                                    onSearchResult={handleVoiceSearch}
                                    className="group"
                                />
                            </div>

                            {searchQuery && (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                                        Search Query: "{searchQuery}"
                                    </p>
                                </div>
                            )}

                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <p>💡 Try saying:</p>
                                <p className="pl-4">"Find Italian restaurants near me"</p>
                                <p className="pl-4">"Show vegan options"</p>
                                <p className="pl-4">"मेरे पास रेस्तरां खोजें" (Hindi)</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. Sustainability Badges Demo */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                <Leaf className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Sustainability Badges
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Eco-friendly certifications
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Excellent Restaurant (Score: 85)
                                </p>
                                <SustainabilityBadge
                                    score={85}
                                    localSourcing={true}
                                    ecoFriendly={true}
                                    carbonNeutral={true}
                                />
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Good Restaurant (Score: 65)
                                </p>
                                <SustainabilityBadge
                                    score={65}
                                    localSourcing={true}
                                    ecoFriendly={false}
                                />
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Fair Restaurant (Score: 45)
                                </p>
                                <SustainabilityBadge
                                    score={45}
                                    localSourcing={false}
                                    ecoFriendly={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4. PWA Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    PWA Features
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Install as an app
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                    📱 Install to Home Screen
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Look for the install icon in your browser's address bar (Chrome/Edge)
                                </p>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                    📡 Offline Support
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Disconnect your internet and reload - cached content will still work!
                                </p>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                    ⚡ Fast Loading
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Smart caching makes repeat visits lightning fast
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Dietary Assistant - Full Width */}
                <div className="mt-8">
                    <DietaryAssistant
                        userPreferences={dietaryPreferences}
                        onPreferenceChange={setDietaryPreferences}
                    />
                </div>

                {/* Quick Access Guide */}
                <div className="mt-8 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-emerald-200 dark:border-emerald-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        🚀 Quick Access Guide
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white mb-2">Component Locations:</p>
                            <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                                <li>• <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">ThemeToggle</code> - Already in Header</li>
                                <li>• <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">VoiceSearchButton</code> - Add to search pages</li>
                                <li>• <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">DietaryAssistant</code> - Add to profile/booking</li>
                                <li>• <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">SustainabilityBadge</code> - Add to restaurant cards</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white mb-2">File Paths:</p>
                            <ul className="space-y-1 text-gray-700 dark:text-gray-300 text-xs">
                                <li>• src/components/ThemeToggle.tsx</li>
                                <li>• src/components/VoiceSearchButton.tsx</li>
                                <li>• src/components/DietaryAssistant.tsx</li>
                                <li>• src/components/SustainabilityBadge.tsx</li>
                                <li>• src/hooks/useVoiceSearch.ts</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
