import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchSuggestionsProps {
  searchTerm: string;
  onSuggestionClick: (suggestion: string) => void;
  isDarkMode: boolean;
}

// Common search suggestions based on restaurants and events
const commonSuggestions = [
  'Italian restaurants',
  'Chinese food',
  'Indian cuisine',
  'Pizza places',
  'Sushi restaurants',
  'Vegetarian food',
  'Birthday events',
  'Music concerts',
  'Food festivals',
  'Wedding venues',
  'Catering services',
  'Live music',
  'Dance events',
  'Cultural festivals',
  'Food delivery'
];

export default function SearchSuggestions({ searchTerm, onSuggestionClick, isDarkMode }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]);
      return;
    }

    const lowerTerm = searchTerm.toLowerCase();
    const filtered = commonSuggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(lowerTerm)
    );
    setSuggestions(filtered.slice(0, 5)); // Show top 5 suggestions
  }, [searchTerm]);

  if (suggestions.length === 0) return null;

  return (
    <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg z-50 ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-500 hover:text-white transition-colors ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          <Search size={16} />
          <span>{suggestion}</span>
        </button>
      ))}
    </div>
  );
} 