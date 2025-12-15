/**
 * Video Thumbnail Cache Manager
 * Provides utilities to manage the global thumbnail cache
 */

// Export function to clear thumbnail cache if needed
export const clearThumbnailCache = () => {
    // This will be updated to work with the cache in VideoThumbnails.jsx
    if (typeof window !== 'undefined' && window.__thumbnailCache) {
        window.__thumbnailCache.clear();
        console.log('Thumbnail cache cleared');
    }
};

// Export function to get cache stats
export const getThumbnailCacheStats = () => {
    if (typeof window !== 'undefined' && window.__thumbnailCache) {
        return {
            size: window.__thumbnailCache.size,
            maxSize: 50
        };
    }
    return { size: 0, maxSize: 50 };
};
