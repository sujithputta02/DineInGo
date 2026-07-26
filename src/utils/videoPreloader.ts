/**
 * Video Preloader Utility
 * Preloads videos for faster retrieval and smoother user experience
 */

import { getAllVideoMetadata, VideoMetadata } from '../config/videoMetadata';

class VideoPreloader {
  private preloadedVideos: Map<string, HTMLVideoElement> = new Map();
  private preloadQueue: Set<string> = new Set();
  private isPreloading = false;

  /**
   * Preload a specific video
   */
  async preloadVideo(src: string): Promise<HTMLVideoElement> {
    // Return cached video if already preloaded
    if (this.preloadedVideos.has(src)) {
      return this.preloadedVideos.get(src)!;
    }

    // Skip if already in queue
    if (this.preloadQueue.has(src)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.preloadedVideos.has(src)) {
            clearInterval(checkInterval);
            resolve(this.preloadedVideos.get(src)!);
          }
        }, 100);
      });
    }

    this.preloadQueue.add(src);

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;

      video.onloadeddata = () => {
        this.preloadedVideos.set(src, video);
        this.preloadQueue.delete(src);
        resolve(video);
      };

      video.onerror = () => {
        this.preloadQueue.delete(src);
        reject(new Error(`Failed to preload video: ${src}`));
      };

      video.src = src;
    });
  }

  /**
   * Preload all videos marked for preloading in metadata
   */
  async preloadAllVideos(): Promise<void> {
    if (this.isPreloading) {
      return;
    }

    this.isPreloading = true;
    const allMetadata = getAllVideoMetadata();

    const preloadPromises = allMetadata
      .filter((metadata) => metadata.preload)
      .flatMap((metadata) => [
        this.preloadVideo(metadata.lightMode),
        this.preloadVideo(metadata.darkMode),
      ]);

    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Some videos failed to preload:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload videos based on current theme
   */
  async preloadThemeVideos(theme: 'light' | 'dark' | 'system'): Promise<void> {
    const allMetadata = getAllVideoMetadata();
    const resolvedTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    const preloadPromises = allMetadata
      .filter((metadata) => metadata.preload)
      .map((metadata) =>
        this.preloadVideo(
          resolvedTheme === 'dark' ? metadata.darkMode : metadata.lightMode
        )
      );

    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Some theme videos failed to preload:', error);
    }
  }

  /**
   * Clear preloaded videos from memory
   */
  clearCache(): void {
    this.preloadedVideos.forEach((video) => {
      video.src = '';
      video.load();
    });
    this.preloadedVideos.clear();
    this.preloadQueue.clear();
  }

  /**
   * Get preload status
   */
  getPreloadStatus(): {
    preloaded: number;
    pending: number;
    total: number;
  } {
    const total = getAllVideoMetadata().filter((m) => m.preload).length * 2; // light + dark
    return {
      preloaded: this.preloadedVideos.size,
      pending: this.preloadQueue.size,
      total,
    };
  }

  /**
   * Check if a video is preloaded
   */
  isVideoPreloaded(src: string): boolean {
    return this.preloadedVideos.has(src);
  }
}

// Singleton instance
export const videoPreloader = new VideoPreloader();

/**
 * Hook to initialize video preloading on app start
 */
export function initializeVideoPreloader(): void {
  // Preload videos after page load
  if (document.readyState === 'complete') {
    videoPreloader.preloadAllVideos();
  } else {
    window.addEventListener('load', () => {
      videoPreloader.preloadAllVideos();
    });
  }

  // Listen for theme changes and preload relevant videos
  window.addEventListener('themechange', () => {
    const theme = (localStorage.getItem('theme') || 'system') as
      | 'light'
      | 'dark'
      | 'system';
    videoPreloader.preloadThemeVideos(theme);
  });

  // Clear cache before page unload
  window.addEventListener('beforeunload', () => {
    videoPreloader.clearCache();
  });
}
