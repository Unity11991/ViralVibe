/**
 * Performance Optimizer for MediaEditor
 * Monitors performance and adaptively adjusts quality settings
 */

class PerformanceOptimizer {
    constructor() {
        this.frameTimings = [];
        this.maxFrameTimings = 60; // Track last 60 frames
        this.targetFPS = 30;
        this.currentQuality = 'high'; // 'high', 'medium', 'low'
        this.performanceMode = 'auto'; // 'auto', 'high-quality', 'high-performance'
        this.lastFrameTime = 0;
        this.droppedFrames = 0;
        this.totalFrames = 0;
    }

    /**
     * Record frame timing
     */
    recordFrame(startTime, endTime) {
        const frameTime = endTime - startTime;
        this.frameTimings.push(frameTime);

        if (this.frameTimings.length > this.maxFrameTimings) {
            this.frameTimings.shift();
        }

        this.totalFrames++;

        // Track dropped frames (if frame took longer than 33ms for 30fps)
        if (frameTime > 33.33) {
            this.droppedFrames++;
        }

        // Auto-adjust quality if in auto mode
        if (this.performanceMode === 'auto') {
            this.autoAdjustQuality();
        }
    }

    /**
     * Get average frame time
     */
    getAverageFrameTime() {
        if (this.frameTimings.length === 0) return 0;
        const sum = this.frameTimings.reduce((a, b) => a + b, 0);
        return sum / this.frameTimings.length;
    }

    /**
     * Get current FPS
     */
    getCurrentFPS() {
        const avgFrameTime = this.getAverageFrameTime();
        if (avgFrameTime === 0) return 0;
        return Math.round(1000 / avgFrameTime);
    }

    /**
     * Get dropped frame percentage
     */
    getDroppedFramePercentage() {
        if (this.totalFrames === 0) return 0;
        return (this.droppedFrames / this.totalFrames) * 100;
    }

    /**
     * Auto-adjust quality based on performance
     */
    autoAdjustQuality() {
        const avgFPS = this.getCurrentFPS();
        const droppedPercent = this.getDroppedFramePercentage();

        // Degrade quality if performance is poor
        if (avgFPS < 20 || droppedPercent > 30) {
            if (this.currentQuality === 'high') {
                this.currentQuality = 'medium';
                console.log('[PerformanceOptimizer] Reduced quality to medium (FPS:', avgFPS, ')');
            } else if (this.currentQuality === 'medium') {
                this.currentQuality = 'low';
                console.log('[PerformanceOptimizer] Reduced quality to low (FPS:', avgFPS, ')');
            }
        }
        // Upgrade quality if performance is good
        else if (avgFPS > 28 && droppedPercent < 10) {
            if (this.currentQuality === 'low') {
                this.currentQuality = 'medium';
                console.log('[PerformanceOptimizer] Increased quality to medium (FPS:', avgFPS, ')');
            } else if (this.currentQuality === 'medium') {
                this.currentQuality = 'high';
                console.log('[PerformanceOptimizer] Increased quality to high (FPS:', avgFPS, ')');
            }
        }
    }

    /**
     * Get recommended settings based on current quality
     */
    getRecommendedSettings() {
        switch (this.currentQuality) {
            case 'high':
                return {
                    targetFPS: 30,
                    applyFilters: true,
                    applyEffects: true,
                    imageSmoothingEnabled: true,
                    skipHeavyEffects: false,
                    canvasScale: 1.0
                };
            case 'medium':
                return {
                    targetFPS: 24,
                    applyFilters: true,
                    applyEffects: false, // Skip heavy effects
                    imageSmoothingEnabled: true,
                    skipHeavyEffects: true,
                    canvasScale: 0.8
                };
            case 'low':
                return {
                    targetFPS: 20,
                    applyFilters: false, // Only basic filters
                    applyEffects: false,
                    imageSmoothingEnabled: false,
                    skipHeavyEffects: true,
                    canvasScale: 0.6
                };
            default:
                return this.getRecommendedSettings(); // Default to high
        }
    }

    /**
     * Set performance mode
     */
    setPerformanceMode(mode) {
        this.performanceMode = mode;

        if (mode === 'high-quality') {
            this.currentQuality = 'high';
        } else if (mode === 'high-performance') {
            this.currentQuality = 'low';
        }
        // 'auto' will adjust dynamically
    }

    /**
     * Reset statistics
     */
    reset() {
        this.frameTimings = [];
        this.droppedFrames = 0;
        this.totalFrames = 0;
    }

    /**
     * Get performance stats
     */
    getStats() {
        return {
            fps: this.getCurrentFPS(),
            avgFrameTime: Math.round(this.getAverageFrameTime() * 100) / 100,
            droppedFrames: this.droppedFrames,
            droppedPercent: Math.round(this.getDroppedFramePercentage() * 100) / 100,
            currentQuality: this.currentQuality,
            performanceMode: this.performanceMode
        };
    }

    /**
     * Check if we should skip this frame (for frame dropping)
     */
    shouldSkipFrame(timestamp) {
        const settings = this.getRecommendedSettings();
        const targetInterval = 1000 / settings.targetFPS;

        if (timestamp - this.lastFrameTime < targetInterval) {
            return true; // Too soon, skip this frame
        }

        this.lastFrameTime = timestamp;
        return false;
    }
}

// Singleton instance
const performanceOptimizer = new PerformanceOptimizer();

export default performanceOptimizer;

/**
 * Hook-friendly wrapper functions
 */
export const recordFrame = (startTime, endTime) => performanceOptimizer.recordFrame(startTime, endTime);
export const getRecommendedSettings = () => performanceOptimizer.getRecommendedSettings();
export const getCurrentFPS = () => performanceOptimizer.getCurrentFPS();
export const getPerformanceStats = () => performanceOptimizer.getStats();
export const setPerformanceMode = (mode) => performanceOptimizer.setPerformanceMode(mode);
export const resetPerformanceStats = () => performanceOptimizer.reset();
export const shouldSkipFrame = (timestamp) => performanceOptimizer.shouldSkipFrame(timestamp);
