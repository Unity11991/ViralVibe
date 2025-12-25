/**
 * Frame Cache for Background Removal
 * LRU cache to store processed segmentation masks and improve performance
 */

class FrameCache {
    constructor(maxSize = 60) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessOrder = [];
    }

    /**
     * Generate cache key from clip ID and timestamp
     */
    getKey(clipId, timestamp) {
        // Round timestamp to nearest 33ms (30fps) for better cache hits
        const roundedTime = Math.round(timestamp * 30) / 30;
        return `${clipId}_${roundedTime.toFixed(3)}`;
    }

    /**
     * Get cached mask if available
     */
    get(clipId, timestamp) {
        const key = this.getKey(clipId, timestamp);
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        return null;
    }

    /**
     * Store mask in cache
     */
    set(clipId, timestamp, maskData) {
        const key = this.getKey(clipId, timestamp);

        // If cache is full, remove least recently used
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const lruKey = this.accessOrder.shift();
            if (lruKey) {
                this.cache.delete(lruKey);
            }
        }

        this.cache.set(key, maskData);

        // Update access order
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessOrder.push(key);
    }

    /**
     * Clear all cached masks
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    /**
     * Clear cache for specific clip
     */
    clearClip(clipId) {
        const keysToRemove = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${clipId}_`)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            this.cache.delete(key);
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        });
    }

    /**
     * Get current cache size
     */
    size() {
        return this.cache.size;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilizationPercent: (this.cache.size / this.maxSize) * 100
        };
    }
}

export default FrameCache;
