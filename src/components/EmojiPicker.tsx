import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isDarkMode?: boolean;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'],
  'Gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Celebration': ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🥳', '🎆', '🎇', '✨', '🎄', '🎃', '🎗️', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟'],
  'Food': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧈', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌮', '🌯', '🥙', '🥗', '🥘', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪'],
  'Drinks': ['☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
  'Nature': ['🌸', '🌺', '🌻', '🌷', '🌹', '🥀', '🌼', '🌱', '🌿', '🍀', '🌾', '🌵', '🌴', '🌳', '🌲', '🌊', '🌈', '⭐', '🌟', '✨', '⚡', '🔥', '💧', '❄️', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️'],
  'Objects': ['💼', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '📷', '📸', '📹', '🎥', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏰', '⏱️', '⏲️', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳'],
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, isDarkMode = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${
          isDarkMode 
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        title="Add emoji"
      >
        <Smile size={20} />
      </button>

      {isOpen && (
        <div 
          className={`absolute bottom-full mb-2 right-0 w-80 rounded-2xl shadow-2xl border z-50 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
          style={{ maxHeight: '400px' }}
        >
          {/* Header */}
          <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Emoji
            </h3>
          </div>

          {/* Category Tabs */}
          <div className={`flex gap-1 px-2 py-2 border-b overflow-x-auto ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className="p-3 overflow-y-auto" style={{ maxHeight: '280px' }}>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className={`text-2xl p-2 rounded-lg transition-all hover:scale-110 ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
