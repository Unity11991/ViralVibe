/**
 * Professional Background Removal Processor
 * Uses MediaPipe Selfie Segmentation with temporal smoothing and edge refinement
 */

import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import FrameCache from './FrameCache';

class BackgroundRemovalProcessor {
    constructor() {
        this.segmenter = null;
        this.isInitialized = false;
        this.frameCache = new FrameCache(60);
        this.previousMasks = []; // For temporal smoothing
        this.maxPreviousMasks = 3;
        this.currentQuality = 'balanced';

        // Temporary canvases for processing
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });
        this.compositeCanvas = document.createElement('canvas');
        this.compositeCtx = this.compositeCanvas.getContext('2d', { willReadFrequently: true });
    }

    /**
     * Initialize MediaPipe Selfie Segmentation
     */
    async initialize(quality = 'balanced') {
        if (this.isInitialized) return;

        try {
            this.currentQuality = quality;

            this.segmenter = new SelfieSegmentation({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                }
            });

            // Configure quality preset
            const modelSelection = quality === 'quality' ? 1 : 0; // 0=general (fast), 1=landscape (quality)

            await this.segmenter.setOptions({
                modelSelection: modelSelection,
                selfieMode: false, // false for general videos
            });

            // Set up result handler
            this.segmenter.onResults((results) => {
                this.lastResults = results;
            });

            this.isInitialized = true;
            console.log('BackgroundRemovalProcessor initialized with quality:', quality);
        } catch (error) {
            console.error('Failed to initialize BackgroundRemovalProcessor:', error);
            throw error;
        }
    }

    /**
     * Process a single frame and return segmentation mask
     * @param {HTMLVideoElement|HTMLImageElement} mediaElement 
     * @param {number} timestamp - Current timestamp for caching
     * @param {string} clipId - Clip ID for cache key
     * @returns {Promise<ImageData>} - Segmentation mask as ImageData
     */
    async processFrame(mediaElement, timestamp = 0, clipId = 'default') {
        if (!this.isInitialized) {
            await this.initialize(this.currentQuality);
        }

        // Check cache first
        const cached = this.frameCache.get(clipId, timestamp);
        if (cached) {
            return cached;
        }

        try {
            // Send frame to MediaPipe
            await this.segmenter.send({ image: mediaElement });

            // Wait a bit for results (MediaPipe is async)
            await new Promise(resolve => setTimeout(resolve, 10));

            if (!this.lastResults || !this.lastResults.segmentationMask) {
                console.warn('No segmentation results available');
                return null;
            }

            // Extract mask data
            const maskWidth = this.lastResults.segmentationMask.width;
            const maskHeight = this.lastResults.segmentationMask.height;

            // Resize mask canvas if needed
            if (this.maskCanvas.width !== maskWidth || this.maskCanvas.height !== maskHeight) {
                this.maskCanvas.width = maskWidth;
                this.maskCanvas.height = maskHeight;
            }

            // Draw segmentation mask to canvas
            this.maskCtx.clearRect(0, 0, maskWidth, maskHeight);
            this.maskCtx.drawImage(this.lastResults.segmentationMask, 0, 0, maskWidth, maskHeight);

            // Get mask image data
            let maskData = this.maskCtx.getImageData(0, 0, maskWidth, maskHeight);

            // Apply temporal smoothing
            if (this.previousMasks.length > 0) {
                maskData = this.applyTemporalSmoothing(maskData);
            }

            // Apply edge refinement based on quality
            maskData = this.refineEdges(maskData, this.currentQuality);

            // Store in previous masks for next frame
            this.previousMasks.push(maskData);
            if (this.previousMasks.length > this.maxPreviousMasks) {
                this.previousMasks.shift();
            }

            // Cache the result
            this.frameCache.set(clipId, timestamp, maskData);

            return maskData;
        } catch (error) {
            console.error('Error processing frame:', error);
            return null;
        }
    }

    /**
     * Apply temporal smoothing to reduce flickering
     * Uses exponential moving average with previous frames
     */
    applyTemporalSmoothing(currentMask) {
        if (this.previousMasks.length === 0) return currentMask;

        const smoothed = new ImageData(currentMask.width, currentMask.height);
        const data = currentMask.data;
        const smoothedData = smoothed.data;

        // Get most recent previous mask
        const prevMask = this.previousMasks[this.previousMasks.length - 1];
        const prevData = prevMask.data;

        // Exponential moving average: 70% current, 30% previous
        const alpha = 0.7;

        for (let i = 0; i < data.length; i += 4) {
            // Only smooth the alpha channel (mask values are in R channel for MediaPipe)
            const currentVal = data[i];
            const prevVal = prevData[i] || 0;

            const smoothedVal = alpha * currentVal + (1 - alpha) * prevVal;

            smoothedData[i] = smoothedVal;
            smoothedData[i + 1] = smoothedVal;
            smoothedData[i + 2] = smoothedVal;
            smoothedData[i + 3] = 255; // Full opacity
        }

        return smoothed;
    }

    /**
     * Refine edges based on quality preset
     * Applies feathering/blur to soften edges
     */
    refineEdges(maskData, quality) {
        const width = maskData.width;
        const height = maskData.height;

        // Fast preset: no refinement
        if (quality === 'fast') {
            return maskData;
        }

        // Balanced: 1px feather
        // Quality: 2px feather
        const featherRadius = quality === 'quality' ? 2 : 1;

        const refined = new ImageData(width, height);
        const data = maskData.data;
        const refinedData = refined.data;

        // Simple box blur for feathering
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;

                // Sample neighbors within feather radius
                for (let dy = -featherRadius; dy <= featherRadius; dy++) {
                    for (let dx = -featherRadius; dx <= featherRadius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const idx = (ny * width + nx) * 4;
                            sum += data[idx]; // R channel has mask value
                            count++;
                        }
                    }
                }

                const avgVal = sum / count;
                const idx = (y * width + x) * 4;

                refinedData[idx] = avgVal;
                refinedData[idx + 1] = avgVal;
                refinedData[idx + 2] = avgVal;
                refinedData[idx + 3] = 255;
            }
        }

        return refined;
    }

    /**
     * Composite foreground with mask onto canvas
     * This creates the final output with background removed
     */
    compositeForeground(videoElement, maskData, outputCanvas) {
        if (!maskData || !videoElement) return;

        const ctx = outputCanvas.getContext('2d');
        const width = outputCanvas.width;
        const height = outputCanvas.height;

        // Draw original video
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(videoElement, 0, 0, width, height);

        // Get video image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Resize mask to match video dimensions if needed
        let resizedMask = maskData;
        if (maskData.width !== width || maskData.height !== height) {
            this.maskCanvas.width = width;
            this.maskCanvas.height = height;
            this.maskCtx.clearRect(0, 0, width, height);

            // Draw mask scaled to video size
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = maskData.width;
            tempCanvas.height = maskData.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(maskData, 0, 0);

            this.maskCtx.drawImage(tempCanvas, 0, 0, width, height);
            resizedMask = this.maskCtx.getImageData(0, 0, width, height);
        }

        const maskPixels = resizedMask.data;

        // Apply mask to alpha channel
        for (let i = 0; i < pixels.length; i += 4) {
            const maskValue = maskPixels[i]; // R channel has mask
            pixels[i + 3] = maskValue; // Set alpha based on mask
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Change quality preset
     */
    async setQuality(quality) {
        if (quality !== this.currentQuality) {
            this.currentQuality = quality;
            this.isInitialized = false;
            this.frameCache.clear();
            this.previousMasks = [];
            await this.initialize(quality);
        }
    }

    /**
     * Clear cache for specific clip
     */
    clearClipCache(clipId) {
        this.frameCache.clearClip(clipId);
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.segmenter) {
            this.segmenter.close();
            this.segmenter = null;
        }
        this.frameCache.clear();
        this.previousMasks = [];
        this.isInitialized = false;
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.frameCache.getStats();
    }
}

// Singleton instance
let instance = null;

export const getBackgroundRemovalProcessor = () => {
    if (!instance) {
        instance = new BackgroundRemovalProcessor();
    }
    return instance;
};

export default BackgroundRemovalProcessor;
