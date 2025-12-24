/**
 * MediaSourceManager - Centralized manager for media decoders
 * Ensures one persistent decoder (video element) per source URL.
 * Handles synchronization and pre-buffering.
 */

class MediaSourceManager {
    constructor() {
        this.sources = new Map(); // url -> { element, type, lastActiveTime }
        this.maxIdleTime = 30000; // 30 seconds before potential cleanup
    }

    /**
     * Get or create a media element for a source
     */
    /**
     * Get or create a media element for a source
     * @param {string} url - Source URL
     * @param {string} type - 'video', 'image', 'audio'
     * @param {string} variant - Optional variant key (e.g. 'main', 'transition') to allow multiple instances
     */
    getMedia(url, type, variant = 'main') {
        if (!url) return null;

        const key = `${url}::${variant}`;

        if (this.sources.has(key)) {
            const entry = this.sources.get(key);
            entry.lastActiveTime = Date.now();
            return entry.element;
        }

        let element;

        // Handle 'sticker' type by detecting extension
        let resolvedType = type;
        if (type === 'sticker') {
            const urlPath = url.split('?')[0];
            const isVideo = urlPath.match(/\.(mp4|webm|mov|gifv)$/i);
            resolvedType = isVideo ? 'video' : 'image';
        }

        if (resolvedType === 'video') {
            element = document.createElement('video');
            element.crossOrigin = 'anonymous';
            element.preload = 'auto';
            element.muted = true; // Preview is usually muted, main audio handled separately or by specific clips
            element.dataset.source = url;
            element.src = url;
            element.load();
        } else if (resolvedType === 'image') {
            element = new Image();
            element.crossOrigin = 'anonymous';
            element.src = url;
        } else if (resolvedType === 'audio') {
            element = new Audio();
            // element.crossOrigin = 'anonymous'; // Removed to allow opaque playback from external sources
            element.preload = 'auto';
            element.src = url;
            element.load();
        } else {
            return null;
        }

        this.sources.set(key, {
            element,
            type: resolvedType,
            lastActiveTime: Date.now()
        });

        return element;
    }

    /**
     * Synchronize a specific media element to the global clock
     */
    syncMedia(url, clipTime, isPlaying, playbackRate = 1, variant = 'main') {
        const key = `${url}::${variant}`;
        const entry = this.sources.get(key);
        if (!entry || (entry.type !== 'video' && entry.type !== 'audio')) return;

        const media = entry.element;
        if (media.readyState < 1) return; // Wait for metadata

        // Calculate expected time on the source
        // Calculate expected time on the source
        // Helper to get safe time
        let safeTime = clipTime;
        if (Number.isFinite(media.duration)) {
            // Just clamp to duration. If we are past it, we hold the last frame.
            safeTime = Math.min(clipTime, media.duration);
        }

        const drift = Math.abs(media.currentTime - safeTime);

        // SYNC LOGIC:
        if (isPlaying) {
            // Check if we reached the end and should just hold
            const isAtEnd = Number.isFinite(media.duration) && Math.abs(media.currentTime - media.duration) < 0.1 && safeTime >= media.duration;

            if (isAtEnd) {
                // Do nothing, let it rest at the end.
                // Ensure it's paused to save resources?
                if (!media.paused) media.pause();
                return;
            }

            // While playing, rely on playback unless drift is large (> 0.2s)
            // Also never interrupt if already seeking
            if (drift > 0.2 && !media.seeking) {
                media.currentTime = safeTime;
            }

            // Ensure playing
            if (media.paused && !isAtEnd) {
                // Avoid spamming play() if a promise is pending (though browser handles this mostly)
                media.play().catch(() => { });
            }
        } else {
            // While paused/scrubbing, we want exact frame (tight tolerance)
            if (drift > 0.05 && !media.seeking) {
                media.currentTime = safeTime;
            }

            // Ensure paused
            if (!media.paused) {
                media.pause();
            }
        }

        if (media.playbackRate !== playbackRate) {
            media.playbackRate = playbackRate;
        }
    }

    /**
     * Pre-seek a video that will be used soon
     */
    prepare(url, clipTime, variant = 'main') {
        const key = `${url}::${variant}`;
        const entry = this.sources.get(key);
        if (!entry || (entry.type !== 'video' && entry.type !== 'audio')) return;

        const media = entry.element;
        if (media.readyState < 1) return;

        const drift = Math.abs(media.currentTime - clipTime);
        if (drift > 0.05) {
            media.currentTime = clipTime;
        }
    }

    /**
     * Pause all active videos (used for global pause)
     */
    pauseAll() {
        this.sources.forEach(entry => {
            if ((entry.type === 'video' || entry.type === 'audio') && !entry.element.paused) {
                entry.element.pause();
            }
        });
    }

    /**
     * Cleanup old/unused sources to save memory
     */
    cleanup() {
        const now = Date.now();
        this.sources.forEach((entry, url) => {
            if (now - entry.lastActiveTime > this.maxIdleTime) {
                if (entry.type === 'video' || entry.type === 'audio') {
                    entry.element.pause();
                    entry.element.removeAttribute('src');
                    entry.element.load();
                }
                this.sources.delete(url);
            }
        });
    }

    destroy() {
        this.sources.forEach(entry => {
            if (entry.type === 'video' || entry.type === 'audio') {
                entry.element.pause();
                entry.element.src = '';
                entry.element.load();
            }
        });
        this.sources.clear();
    }
}

export const mediaSourceManager = new MediaSourceManager();
export default mediaSourceManager;
