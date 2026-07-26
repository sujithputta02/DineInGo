# Video Metadata System

## Overview

The DineInGo application now includes a comprehensive video metadata system for faster video retrieval and theme-aware video display. This system automatically selects the appropriate video based on the user's theme preference (light, dark, or system/device preference).

## Key Features

✅ **Centralized Video Metadata** - All video information stored in a single configuration file
✅ **Theme-Aware Video Selection** - Automatically displays correct video for light/dark modes
✅ **Device Preference Support** - Respects system theme settings when set to "device preference"
✅ **Faster Video Retrieval** - Metadata allows for quick lookups without file system scanning
✅ **Automatic Video Preloading** - Optional preloading for better performance
✅ **Real-Time Theme Switching** - Videos update instantly when theme changes

## File Structure

```
src/
├── config/
│   └── videoMetadata.ts          # Central video metadata configuration
├── utils/
│   └── videoPreloader.ts         # Video preloading utility
└── components/
    ├── FeatureSticker.tsx        # Theme-aware video display component
    └── ThemeToggle.tsx           # Theme management with event dispatch

backend/src/
└── models/
    └── VideoMetadata.ts          # Backend video metadata model
```

## How It Works

### 1. Video Naming Convention

Videos are stored with a specific naming pattern:
- **Light mode**: `video_name.mp4`
- **Dark mode**: `video_name_dark.mp4`

Example:
```
/public/stickers/dino_development.mp4
/public/stickers/dino_development_dark.mp4
```

### 2. Metadata Configuration

All videos are registered in `src/config/videoMetadata.ts`:

```typescript
export const stickerVideos: Record<string, VideoMetadata> = {
  development: {
    id: 'development',
    lightMode: '/stickers/dino_development.mp4',
    darkMode: '/stickers/dino_development_dark.mp4',
    preload: true,
    format: 'video/mp4',
  },
  // ... more videos
};
```

### 3. Theme Detection Logic

The system determines which video to display based on:

```typescript
// Priority order:
1. Check localStorage theme setting ('light' | 'dark' | 'system')
2. If 'system', check device preference via matchMedia
3. Return appropriate video URL
```

**Example:**
- User sets theme to **Light** → Shows `dino_development.mp4`
- User sets theme to **Dark** → Shows `dino_development_dark.mp4`
- User sets theme to **Device Preference** + OS is in dark mode → Shows `dino_development_dark.mp4`

### 4. Real-Time Updates

The system listens for theme changes via:
- **localStorage events** - Cross-tab theme sync
- **matchMedia events** - System preference changes
- **Custom 'themechange' event** - Manual theme toggle

## Usage

### Getting Video Source

```typescript
import { getVideoSource } from '../config/videoMetadata';

// Get appropriate video for current theme
const videoSrc = getVideoSource('development');

// Get video for specific theme
const lightVideo = getVideoSource('development', 'light');
const darkVideo = getVideoSource('development', 'dark');
```

### Using in Components

```typescript
import { getVideoSource, stickerVideos } from '../config/videoMetadata';

function MyComponent({ mode }) {
  const [videoSrc, setVideoSrc] = useState(() => getVideoSource(mode));
  
  useEffect(() => {
    const handleThemeChange = () => {
      setVideoSrc(getVideoSource(mode));
    };
    
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, [mode]);
  
  return <video src={videoSrc} autoPlay loop muted />;
}
```

### Video Preloading

```typescript
import { videoPreloader, initializeVideoPreloader } from '../utils/videoPreloader';

// Initialize on app start
initializeVideoPreloader();

// Or manually preload specific video
await videoPreloader.preloadVideo('/stickers/dino_development.mp4');

// Check preload status
const status = videoPreloader.getPreloadStatus();
console.log(`Preloaded: ${status.preloaded}/${status.total}`);
```

## Adding New Videos

### 1. Add Video Files

Place both light and dark versions in `/public/stickers/`:
```
/public/stickers/your_video_name.mp4
/public/stickers/your_video_name_dark.mp4
```

### 2. Register in Metadata

Update `src/config/videoMetadata.ts`:

```typescript
export const stickerVideos: Record<string, VideoMetadata> = {
  // ... existing videos
  your_new_mode: {
    id: 'your_new_mode',
    lightMode: '/stickers/your_video_name.mp4',
    darkMode: '/stickers/your_video_name_dark.mp4',
    preload: true,  // Set to false if shouldn't preload
    format: 'video/mp4',
  },
};
```

### 3. Use in FeatureSticker

```typescript
<FeatureSticker 
  stickerId="your_new_mode"
  caption="Your Caption Here"
  mode="your_new_mode"
/>
```

## Performance Benefits

### Before Metadata System
- ❌ Multiple file system scans to find videos
- ❌ No preloading capability
- ❌ Slower initial video load
- ❌ Manual theme-video mapping in each component

### After Metadata System
- ✅ O(1) lookup time via metadata
- ✅ Optional preloading for instant display
- ✅ Faster page loads
- ✅ Centralized configuration
- ✅ Automatic theme-aware selection

## Theme Behavior Examples

| User Setting | OS Theme | Video Displayed |
|--------------|----------|-----------------|
| Light | Light | `video.mp4` |
| Light | Dark | `video.mp4` |
| Dark | Light | `video_dark.mp4` |
| Dark | Dark | `video_dark.mp4` |
| System | Light | `video.mp4` |
| System | Dark | `video_dark.mp4` |

## API Reference

### `getVideoSource(mode, theme?)`
Returns the appropriate video URL based on mode and theme.

**Parameters:**
- `mode` (string): Video mode identifier
- `theme` (string, optional): Force specific theme ('light' | 'dark' | 'system')

**Returns:** string - Video URL

### `getAllVideoMetadata()`
Returns array of all registered video metadata.

**Returns:** `VideoMetadata[]`

### `shouldPreloadVideo(mode)`
Checks if a video should be preloaded.

**Parameters:**
- `mode` (string): Video mode identifier

**Returns:** boolean

### `videoPreloader.preloadVideo(src)`
Preloads a specific video.

**Parameters:**
- `src` (string): Video URL

**Returns:** `Promise<HTMLVideoElement>`

### `videoPreloader.preloadAllVideos()`
Preloads all videos marked with `preload: true`.

**Returns:** `Promise<void>`

### `videoPreloader.preloadThemeVideos(theme)`
Preloads only videos for specific theme.

**Parameters:**
- `theme` ('light' | 'dark' | 'system')

**Returns:** `Promise<void>`

## Troubleshooting

### Video Not Changing on Theme Switch
**Issue:** Video doesn't update when theme changes.

**Solution:** 
- Ensure `ThemeToggle.tsx` dispatches the 'themechange' event
- Check that the component listens for the event
- Verify both light and dark videos exist in metadata

### Video Loading Slowly
**Issue:** Videos take time to load on first view.

**Solution:**
- Set `preload: true` in metadata
- Call `initializeVideoPreloader()` in your app entry point
- Check video file sizes (optimize if > 5MB)

### Wrong Video Displayed
**Issue:** Light video shows in dark mode or vice versa.

**Solution:**
- Check localStorage theme value: `localStorage.getItem('theme')`
- Verify video file naming matches convention
- Confirm metadata URLs are correct

## Future Enhancements

- [ ] Progressive video loading for large files
- [ ] Video quality selection based on network speed
- [ ] Thumbnail generation for faster initial rendering
- [ ] CDN integration for global video delivery
- [ ] Video format detection (WebM, MP4, etc.)
- [ ] Lazy loading for off-screen videos

## Maintenance

### Video Optimization Guidelines
- Keep video files under 5MB for optimal load times
- Use H.264 codec for maximum compatibility
- Maintain 16:9 aspect ratio for consistency
- Include both light and dark versions
- Test on low-bandwidth connections

### Regular Tasks
- Monitor preload cache size
- Review and update preload flags
- Optimize video file sizes
- Audit unused videos
- Update metadata documentation

---

**Last Updated:** 2026-07-26
**Maintained By:** DineInGo Development Team
