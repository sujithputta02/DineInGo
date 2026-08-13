/**
 * Backend Video Metadata Model
 * Used for storing and retrieving video information from database
 */

export interface IVideoMetadata {
  id: string;
  name: string;
  lightModeUrl: string;
  darkModeUrl: string;
  category: 'sticker' | 'intro' | 'feature' | 'tutorial';
  mode?: 'development' | 'maintenance' | 'testing' | 'coming_soon';
  preload: boolean;
  duration?: number;
  format: string;
  fileSize?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Video Metadata Schema for MongoDB
 */
export const VideoMetadataSchema = {
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  lightModeUrl: {
    type: String,
    required: true,
  },
  darkModeUrl: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['sticker', 'intro', 'feature', 'tutorial'],
    index: true,
  },
  mode: {
    type: String,
    enum: ['development', 'maintenance', 'testing', 'coming_soon'],
    index: true,
  },
  preload: {
    type: Boolean,
    default: false,
  },
  duration: {
    type: Number,
  },
  format: {
    type: String,
    default: 'video/mp4',
  },
  fileSize: {
    type: Number,
  },
  width: {
    type: Number,
  },
  height: {
    type: Number,
  },
  thumbnailUrl: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
};

/**
 * Type for video retrieval queries
 */
export interface VideoQuery {
  category?: string;
  mode?: string;
  preload?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Helper function to get the appropriate video URL based on theme
 */
export function getVideoUrlForTheme(
  video: IVideoMetadata,
  theme: 'light' | 'dark' | 'system'
): string {
  if (theme === 'system') {
    // In backend, we can't determine system preference, so return both
    // or default to light mode
    return video.lightModeUrl;
  }
  return theme === 'dark' ? video.darkModeUrl : video.lightModeUrl;
}

/**
 * Helper function to format video metadata for API response
 */
export function formatVideoMetadata(video: IVideoMetadata): {
  id: string;
  name: string;
  urls: {
    light: string;
    dark: string;
  };
  category: string;
  mode?: string;
  preload: boolean;
  metadata: {
    duration?: number;
    format: string;
    fileSize?: number;
    dimensions?: { width: number; height: number };
    thumbnail?: string;
  };
} {
  return {
    id: video.id,
    name: video.name,
    urls: {
      light: video.lightModeUrl,
      dark: video.darkModeUrl,
    },
    category: video.category,
    mode: video.mode,
    preload: video.preload,
    metadata: {
      duration: video.duration,
      format: video.format,
      fileSize: video.fileSize,
      dimensions:
        video.width && video.height
          ? { width: video.width, height: video.height }
          : undefined,
      thumbnail: video.thumbnailUrl,
    },
  };
}
