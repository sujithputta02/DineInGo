import React, { useEffect, useState } from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        return (localStorage.getItem('theme') as Theme) || 'system';
    });

    // Update data-theme attribute
    const updateDocumentTheme = (newTheme: Theme) => {
        const root = document.documentElement;
        let resolvedTheme: 'light' | 'dark';
        
        if (newTheme === 'system') {
            resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
            resolvedTheme = newTheme;
        }
        
        root.setAttribute('data-theme', resolvedTheme);
        // Also update legacy key for backward compatibility
        localStorage.setItem('dineInGoDarkMode', (resolvedTheme === 'dark').toString());
    };

    // Initialize theme
    useEffect(() => {
        updateDocumentTheme(theme);
    }, [theme]);

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (theme === 'system') {
                updateDocumentTheme('system');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const cycleTheme = () => {
        const themes: Theme[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
        updateDocumentTheme(nextTheme);
    };

    return (
        <button
            onClick={cycleTheme}
            className="group relative flex items-center justify-center p-2 rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/30 border border-white/20 backdrop-blur-md transition-all duration-300 shadow-lg"
            aria-label={`Current theme: ${theme}. Click to change.`}
            title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
        >
            <div className="relative w-6 h-6 flex items-center justify-center pointer-events-none">
                {/* Sun icon */}
                <Sun
                    className={`absolute w-6 h-6 text-yellow-400 transition-all duration-500 transform ${theme === 'light'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 rotate-90 scale-50'
                        }`}
                />

                {/* Moon icon */}
                <Moon
                    className={`absolute w-6 h-6 text-blue-300 transition-all duration-500 transform ${theme === 'dark'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 -rotate-90 scale-50'
                        }`}
                />

                {/* System icon */}
                <Laptop
                    className={`absolute w-6 h-6 text-emerald-400 transition-all duration-500 transform ${theme === 'system'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 scale-50'
                        }`}
                />
            </div>
            
            {/* Tooltip hint on hover (optional enhancement) */}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {theme === 'system' ? 'Device Mode' : theme.charAt(0).toUpperCase() + theme.slice(1)}
            </span>
        </button>
    );
};
