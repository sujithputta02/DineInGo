import React, { useState } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

interface VoiceSearchButtonProps {
    onSearchResult: (query: string) => void;
    language?: string;
    className?: string;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({
    onSearchResult,
    language = 'en-IN',
    className = ''
}) => {
    const [selectedLanguage, setSelectedLanguage] = useState(language);

    const {
        isListening,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening,
        resetTranscript
    } = useVoiceSearch({
        onResult: (result) => {
            onSearchResult(result);
            resetTranscript();
        },
        language: selectedLanguage,
        continuous: false
    });

    const handleToggle = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    if (!isSupported) {
        return (
            <button
                disabled
                className="p-0 bg-transparent text-gray-300 cursor-not-allowed"
                title="Voice search not supported in this browser"
            >
                <MicOff className="w-5 h-5" />
            </button>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {/* Voice Search Button - Blends into search bar */}
            <button
                onClick={handleToggle}
                className={`p-0 transition-colors duration-200 ${isListening
                        ? 'text-emerald-500 animate-pulse'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                title={isListening ? 'Stop listening' : 'Start voice search'}
            >
                {isListening ? (
                    <div className="relative">
                        <Mic className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    </div>
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>

            {/* Listening Indicator */}
            {isListening && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[250px] z-50">
                    <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Listening...
                        </span>
                    </div>
                    {transcript && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                            "{transcript}"
                        </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Speak your search query
                    </p>
                </div>
            )}

            {/* Error Display */}
            {error && !isListening && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 min-w-[250px] z-50">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                Voice Search Error
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                {error}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
