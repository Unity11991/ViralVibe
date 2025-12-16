/**
 * Texture Cache for MediaEditor
 * Pre-generates and caches reusable textures/effects to avoid expensive re-computation
 */

class TextureCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 20; // Maximum cached textures
        this.accessOrder = []; // For LRU eviction
    }

    /**
     * Get a cached texture or generate it
     */
    get(key, generator, width, height) {
        const cacheKey = `${key}_${width}_${height}`;

        if (this.cache.has(cacheKey)) {
            // Update access order for LRU
            this.updateAccess(cacheKey);
            return this.cache.get(cacheKey);
        }

        // Generate new texture
        const texture = generator(width, height);
        this.set(cacheKey, texture);
        return texture;
    }

    /**
     * Set a texture in cache
     */
    set(key, texture) {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldest = this.accessOrder.shift();
            this.cache.delete(oldest);
        }

        this.cache.set(key, texture);
        this.accessOrder.push(key);
    }

    /**
     * Update access order for LRU
     */
    updateAccess(key) {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
            this.accessOrder.push(key);
        }
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    /**
     * Remove specific texture
     */
    remove(key) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }
}

// Singleton instance
const textureCache = new TextureCache();

/**
 * Generate grain texture (expensive, so we cache it)
 */
export const getGrainTexture = (width, height, intensity = 50) => {
    return textureCache.get(`grain_${intensity}`, (w, h) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });

        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        const amount = intensity / 100;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * amount * 255;
            data[i] = 128 + noise;     // R
            data[i + 1] = 128 + noise; // G
            data[i + 2] = 128 + noise; // B
            data[i + 3] = amount * 255; // A (opacity)
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }, width, height);
};

/**
 * Generate vignette gradient (cached)
 */
export const getVignetteGradient = (width, height, intensity = 50) => {
    return textureCache.get(`vignette_${intensity}`, (w, h) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: true });

        const gradient = ctx.createRadialGradient(
            w / 2, h / 2, w * 0.2,
            w / 2, h / 2, w * 0.8
        );

        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${intensity / 100})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        return canvas;
    }, width, height);
};

/**
 * Clear texture cache (call when memory is low or on cleanup)
 */
export const clearTextureCache = () => {
    textureCache.clear();
};

export default textureCache;
