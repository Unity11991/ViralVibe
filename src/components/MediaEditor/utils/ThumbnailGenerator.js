/**
 * ThumbnailGenerator Service
 * 
 * Manages a queue of thumbnail generation requests to prevent
 * creating excessive video elements and to handle concurrency efficiently.
 */

class ThumbnailGenerator {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.videoPool = []; // Pool of video elements
        this.maxPoolSize = 2; // Max concurrent video elements
        this.cache = new Map(); // Cache: sourceUrl -> Map<timestamp, dataUrl>
    }

    /**
     * Request a thumbnail for a specific source and time.
     * @param {string} source - Video source URL
     * @param {number} time - Timestamp in seconds
     * @returns {Promise<string>} - Data URL of the thumbnail
     */
    async requestThumbnail(source, time) {
        // Check cache first
        if (!this.cache.has(source)) {
            this.cache.set(source, new Map());
        }
        const sourceCache = this.cache.get(source);

        // Round time to avoid float precision issues (2 decimal places)
        const roundedTime = parseFloat(time.toFixed(2));

        if (sourceCache.has(roundedTime)) {
            return sourceCache.get(roundedTime);
        }

        // If not in cache, queue request
        return new Promise((resolve, reject) => {
            this.queue.push({
                source,
                time: roundedTime,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    /**
     * Process the queue of requests.
     */
    async processQueue() {
        if (this.queue.length === 0) return;

        // Find an available video element
        let videoEntry = this.videoPool.find(v => !v.busy);

        if (!videoEntry) {
            if (this.videoPool.length < this.maxPoolSize) {
                // Create new video element
                const video = document.createElement('video');
                video.muted = true;
                video.crossOrigin = 'anonymous';
                video.preload = 'metadata';

                // Create canvas for drawing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false });

                videoEntry = {
                    id: Date.now(),
                    video,
                    canvas,
                    ctx,
                    busy: false,
                    currentSource: null
                };
                this.videoPool.push(videoEntry);
            } else {
                // All busy, wait
                return;
            }
        }

        // Take the next task
        // Optimization: Try to find a task that matches the current source of the video element
        // to avoid reloading the source.
        let taskIndex = -1;
        if (videoEntry.currentSource) {
            taskIndex = this.queue.findIndex(t => t.source === videoEntry.currentSource);
        }

        // If no matching source task, just take the first one
        if (taskIndex === -1) {
            taskIndex = 0;
        }

        const task = this.queue[taskIndex];
        this.queue.splice(taskIndex, 1);

        videoEntry.busy = true;

        try {
            const result = await this.generate(videoEntry, task.source, task.time);

            // Cache result
            const sourceCache = this.cache.get(task.source);
            sourceCache.set(task.time, result);

            task.resolve(result);
        } catch (error) {
            console.warn(`Thumbnail generation failed for ${task.time}s:`, error);
            task.reject(error);
        } finally {
            videoEntry.busy = false;
            this.processQueue();
        }
    }

    /**
     * Generate the thumbnail using the video element.
     */
    async generate(videoEntry, source, time) {
        const { video, canvas, ctx } = videoEntry;

        // Load source if changed
        if (videoEntry.currentSource !== source) {
            video.src = source;
            videoEntry.currentSource = source;

            await new Promise((resolve, reject) => {
                video.onloadedmetadata = resolve;
                video.onerror = reject;
                // Timeout safety
                setTimeout(() => reject(new Error('Load timeout')), 10000);
            });
        }

        // Seek
        video.currentTime = time;

        await new Promise((resolve, reject) => {
            const onSeek = () => resolve();
            video.addEventListener('seeked', onSeek, { once: true });
            // Timeout safety
            setTimeout(() => {
                video.removeEventListener('seeked', onSeek);
                reject(new Error('Seek timeout'));
            }, 5000);
        });

        // Draw
        // Calculate Dimensions (Max 160px width)
        const MAX_DIMENSION = 160;
        const videoAspect = video.videoWidth / video.videoHeight;
        let drawWidth = MAX_DIMENSION;
        let drawHeight = drawWidth / videoAspect;

        if (canvas.width !== Math.floor(drawWidth) || canvas.height !== Math.floor(drawHeight)) {
            canvas.width = Math.floor(drawWidth);
            canvas.height = Math.floor(drawHeight);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.5); // Low quality for speed
    }
}

// Export singleton
export const thumbnailGenerator = new ThumbnailGenerator();
