/**
 * Video Metadata Configuration
 * Centralizes video information for faster retrieval and theme-aware display
 */

export interface VideoMetadata {
  id: string;
  lightMode: string;
  darkMode: string;
  preload?: boolean;
  duration?: number;
  format?: string;
}

/**
 * Sticker Video Metadata
 * Maps mode identifiers to their respective light and dark theme videos
 * Note: If light mode video is missing, use dark mode video as fallback
 */
export const stickerVideos: Record<string, VideoMetadata> = {
  development: {
    id: 'development',
    lightMode: '/stickers/dino_development.mp4',
    darkMode: '/stickers/dino_development_dark.mp4',
    preload: true,
    format: 'video/mp4',
  },
  maintenance: {
    id: 'maintenance',
    lightMode: '/stickers/dino_maintenance_dark.mp4', // Using dark version as fallback
    darkMode: '/stickers/dino_maintenance_dark.mp4',
    preload: true,
    format: 'video/mp4',
  },
  testing: {
    id: 'testing',
    lightMode: '/stickers/dino_testing.mp4',
    darkMode: '/stickers/dino_testing_dark.mp4',
    preload: true,
    format: 'video/mp4',
  },
  coming_soon: {
    id: 'coming_soon',
    lightMode: '/stickers/dino_coming_soon_dark.mp4', // Using dark version as fallback
    darkMode: '/stickers/dino_coming_soon_dark.mp4',
    preload: true,
    format: 'video/mp4',
  },
};

/**
 * Get video source based on current theme and device preference
 * @param mode - The sticker mode (development, maintenance, testing, coming_soon)
 * @param theme - Current theme setting ('light' | 'dark' | 'system')
 * @returns The appropriate video source URL
 */
export const getVideoSource = (mode: string, theme?: string): string => {
  const metadata = stickerVideos[mode] || stickerVideos.development;
  
  // Get theme from localStorage or document attribute if not provided
  const currentTheme = theme || localStorage.getItem('theme') || 'system';
  
  // Resolve system preference
  let resolvedTheme: 'light' | 'dark';
  if (currentTheme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolvedTheme = currentTheme as 'light' | 'dark';
  }
  
  // Return appropriate video source
  return resolvedTheme === 'dark' ? metadata.darkMode : metadata.lightMode;
};

/**
 * Get all video metadata for preloading
 * @returns Array of all video metadata
 */
export const getAllVideoMetadata = (): VideoMetadata[] => {
  return Object.values(stickerVideos);
};

/**
 * Check if a video should be preloaded
 * @param mode - The sticker mode
 * @returns Whether the video should be preloaded
 */
export const shouldPreloadVideo = (mode: string): boolean => {
  return stickerVideos[mode]?.preload ?? false;
};
