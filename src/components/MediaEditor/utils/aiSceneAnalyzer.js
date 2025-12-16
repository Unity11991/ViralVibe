/**
 * AI Scene Analyzer
 * Analyzes video content using AI vision models and computer vision techniques
 * Matches Architecture Diagram: Video Analyzer -> Scene, Mood, Action, Color
 */

import Groq from "groq-sdk";
import globalQueue from './aiRequestQueue';

// Cache for video analysis results
const videoAnalysisCache = new Map();

/**
 * Analyzes a single video frame using AI vision
 * @param {HTMLVideoElement} videoElement - Video element at specific timestamp
 * @param {number} timestamp - Current timestamp in video
 * @param {string} apiKey - Groq API key
 * @returns {Promise<Object>} Frame analysis result
 */
export const analyzeVideoFrame = async (videoElement, timestamp, apiKey) => {
    if (!apiKey) {
        return {
            mood: 'neutral',
            actionLevel: 0.5,
            dominantColors: ['#808080'],
            description: 'No AI analysis available',
            timestamp
        };
    }

    try {
        // Capture frame as base64
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(videoElement, 0, 0);

        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        console.log(`[AI Debug] Frame ${timestamp.toFixed(2)}s Captured. Image Size: ${base64Image.length} chars`);

        // Extract dominant colors before AI analysis
        const dominantColors = extractDominantColors(ctx, canvas.width, canvas.height);

        const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

        const prompt = `
            Analyze this video frame image precisely. Do NOT use default or generic values.
            Look at the specific lighting, colors, and mood of THIS image.
            
            Return JSON with all values on a scale of -100 to +100 (except Hue which is -180 to 180):
            {
                "mood": "action" | "calm" | "dramatic" | "happy" | "sad" | "tense",
                "actionLevel": 0.0-1.0 (how much movement/action is visible),
                "sceneType": "indoor" | "outdoor" | "studio" | "nature" | "urban",
                "lighting": "bright" | "dark" | "natural" | "artificial" | "dramatic",
                "description": "Brief 1-sentence description of what's happening",
                "colorGrading": {
                    "exposure": -100 to 100 (0=normal, negative=darker, positive=brighter),
                    "contrast": -100 to 100 (0=normal, negative=flat, positive=punchy),
                    "brightness": -100 to 100 (0=normal, negative=darker, positive=brighter),
                    "highlights": -100 to 100 (0=normal, negative=dim highlights, positive=boost),
                    "shadows": -100 to 100 (0=normal, negative=crush blacks, positive=lift shadows),
                    
                    "saturation": -100 to 100 (0=normal, negative=desaturated, positive=vibrant),
                    "vibrance": -100 to 100 (0=normal, negative=muted, positive=popping),
                    "temp": -100 to 100 (0=normal, -100=cold/blue, 100=warm/orange),
                    "tint": -100 to 100 (0=normal, -100=green, 100=magenta),
                    
                    "hue": -180 to 180 (0=normal, degrees),
                    "hslSaturation": -100 to 100 (0=normal),
                    "hslLightness": -100 to 100 (0=normal),
                    
                    "sharpen": 0 to 100 (0=off),
                    "blur": 0 to 100 (0=off),
                    "vignette": 0 to 100 (0=off),
                    "grain": 0 to 100 (0=off),
                    "fade": 0 to 100 (0=off),
                    "grayscale": 0 to 100 (0=off),
                    "sepia": 0 to 100 (0=off)
                }
            }
            
            CRITICAL INSTRUCTIONS:
            - Use the full -100 to +100 range significantly. Don't just stay around 0.
            - If it's dark, use Exposure +20 to +50.
            - If it's dull, use Saturation +20 to +40.
            - If it's disjointed, use Temp to unify (-20 or +20).
            - Avoid extreme values like +/-100 unless necessary for style.
            
            IMPORTANT: You must provide the response in valid JSON format with all fields.
        `;

        const processRequest = async () => {
            // Internal retry loop inside the queue slot
            let currentRetries = 3;
            let currentDelay = 2000;

            while (true) {
                try {
                    const completion = await groq.chat.completions.create({
                        messages: [{
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: base64Image } }
                            ]
                        }],
                        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
                        temperature: 0.7,
                        max_tokens: 1000,
                        response_format: { type: "json_object" }
                    });
                    return completion;
                } catch (error) {
                    if (error.status === 429 && currentRetries > 0) {
                        console.warn(`Rate limit hit. Retrying in ${currentDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, currentDelay));
                        currentRetries--;
                        currentDelay *= 2;
                        continue;
                    }
                    throw error;
                }
            }
        };

        const completion = await globalQueue.enqueue(processRequest);

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No content generated");

        const analysis = JSON.parse(content);
        const fallbackGrading = getDefaultColorGrading(analysis.lighting, analysis.mood);
        const finalColorGrading = { ...fallbackGrading, ...analysis.colorGrading };
        const usedFallback = !analysis.colorGrading;

        console.log(`[AI Analysis] Frame ${timestamp.toFixed(2)}s:`, {
            mood: analysis.mood,
            colorGrading: finalColorGrading,
            isFallback: usedFallback,
            rawAI_Grading: analysis.colorGrading
        });

        return {
            ...analysis,
            dominantColors,
            timestamp,
            // Ensure colorGrading exists with defaults if AI didn't provide
            colorGrading: finalColorGrading
        };

    } catch (error) {
        console.error('Frame analysis failed:', error);
        // Fallback to basic analysis
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(videoElement, 0, 0);

        return {
            mood: 'neutral',
            actionLevel: 0.5,
            dominantColors: extractDominantColors(ctx, canvas.width, canvas.height),
            sceneType: 'unknown',
            lighting: 'natural',
            description: 'Analysis unavailable',
            timestamp,
            colorGrading: getDefaultColorGrading('natural', 'neutral')
        };
    }
};

/**
 * Analyzes entire video by sampling multiple frames
 * @param {string} videoUrl - Video URL
 * @param {number} sampleCount - Number of frames to sample (default: 5)
 * @param {string} apiKey - Groq API key
 * @returns {Promise<Object>} Aggregated video analysis
 */
export const analyzeVideoContent = async (videoUrl, sampleCount = 5, apiKey) => {
    // Check cache
    const cacheKey = `video-${videoUrl}-${sampleCount}`;
    if (videoAnalysisCache.has(cacheKey)) {
        return videoAnalysisCache.get(cacheKey);
    }

    // Safety check for URL
    if (!videoUrl) {
        console.error('analyzeVideoContent called with no videoUrl');
        return createFallbackAnalysis('unknown', 'No URL provided');
    }

    try {
        // Create video element
        const video = document.createElement('video');
        video.src = videoUrl;
        // Only set crossOrigin for external URLs, not blob URLs
        if (!videoUrl.startsWith('blob:')) {
            video.crossOrigin = 'anonymous';
        }
        video.muted = true;
        video.preload = 'metadata';

        // Wait for metadata with better error handling
        await new Promise((resolve, reject) => {
            const handleLoad = () => {
                cleanup();
                resolve();
            };

            const handleError = (e) => {
                cleanup();
                reject(new Error(`Video load failed: ${e.message || 'Unknown error'}`));
            };

            const cleanup = () => {
                video.removeEventListener('loadedmetadata', handleLoad);
                video.removeEventListener('error', handleError);
            };

            video.addEventListener('loadedmetadata', handleLoad);
            video.addEventListener('error', handleError);

            // Longer timeout for large videos
            setTimeout(() => {
                cleanup();
                reject(new Error('Video load timeout after 15s'));
            }, 15000);
        });

        const duration = video.duration;
        if (!duration || duration === 0 || isNaN(duration)) {
            throw new Error('Invalid video duration');
        }

        const frameAnalyses = [];

        // Sample frames evenly throughout the video
        for (let i = 0; i < sampleCount; i++) {
            const timestamp = (duration / (sampleCount + 1)) * (i + 1);
            video.currentTime = timestamp;

            // Wait for seek
            await new Promise((resolve) => {
                video.onseeked = resolve;
                setTimeout(resolve, 500); // Fallback timeout
            });

            // Analyze this frame
            const frameAnalysis = await analyzeVideoFrame(video, timestamp, apiKey);
            frameAnalyses.push(frameAnalysis);

            // Rate Limit Protection: Wait 2 seconds between requests
            // Note: globalQueue handles the actual API wait, but this keeps the UI loop calm
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Aggregate results
        const aggregated = aggregateFrameAnalyses(frameAnalyses, videoUrl, duration);

        // Cache result
        videoAnalysisCache.set(cacheKey, aggregated);

        return aggregated;

    } catch (error) {
        console.error('Video content analysis failed:', error);
        // Return fallback analysis instead of throwing
        return createFallbackAnalysis(videoUrl, error.message);
    }
};

/**
 * Creates a safe fallback analysis object
 */
const createFallbackAnalysis = (id, errorMessage) => ({
    id: id || 'unknown',
    duration: 5, // Default duration
    mood: 'neutral',
    actionLevel: 0.5,
    dominantColors: ['#808080'],
    sceneType: 'unknown',
    lighting: 'natural',
    suggestedColorGrade: 'normal',
    error: errorMessage
});

/**
 * Aggregates multiple frame analyses into a single video analysis
 */
const aggregateFrameAnalyses = (frameAnalyses, videoUrl, duration) => {
    if (frameAnalyses.length === 0) {
        return createFallbackAnalysis(videoUrl, 'No frames analyzed');
    }

    // Count mood occurrences
    const moodCounts = {};
    frameAnalyses.forEach(frame => {
        moodCounts[frame.mood] = (moodCounts[frame.mood] || 0) + 1;
    });
    const dominantMood = Object.keys(moodCounts).reduce((a, b) =>
        moodCounts[a] > moodCounts[b] ? a : b
    );

    // Average action level
    const avgActionLevel = frameAnalyses.reduce((sum, frame) =>
        sum + (frame.actionLevel || 0.5), 0
    ) / frameAnalyses.length;

    // Collect all dominant colors
    const allColors = frameAnalyses.flatMap(frame => frame.dominantColors || []);
    const uniqueColors = [...new Set(allColors)].slice(0, 5);

    // Most common scene type
    const sceneTypeCounts = {};
    frameAnalyses.forEach(frame => {
        if (frame.sceneType) {
            sceneTypeCounts[frame.sceneType] = (sceneTypeCounts[frame.sceneType] || 0) + 1;
        }
    });
    const dominantSceneType = Object.keys(sceneTypeCounts).length > 0
        ? Object.keys(sceneTypeCounts).reduce((a, b) =>
            sceneTypeCounts[a] > sceneTypeCounts[b] ? a : b
        )
        : 'unknown';

    // Suggest color grade based on mood and lighting
    const suggestedColorGrade = selectColorGradeForMood(dominantMood, dominantSceneType);

    return {
        id: videoUrl,
        duration,
        mood: dominantMood,
        actionLevel: avgActionLevel,
        dominantColors: uniqueColors,
        sceneType: dominantSceneType,
        lighting: frameAnalyses[0]?.lighting || 'natural',
        suggestedColorGrade,
        colorGrading: calculateAverageColorGrading(frameAnalyses),
        frameAnalyses // Keep individual frame data for advanced use
    };
};

/**
 * Calculates average color grading from multiple frame analyses
 */
const calculateAverageColorGrading = (frameAnalyses) => {
    if (!frameAnalyses || frameAnalyses.length === 0) return {};

    const validFrames = frameAnalyses.filter(f => f.colorGrading);
    if (validFrames.length === 0) return {};

    const keys = Object.keys(validFrames[0].colorGrading);
    const result = {};

    keys.forEach(key => {
        // Skip non-numeric values just in case
        if (typeof validFrames[0].colorGrading[key] !== 'number') return;

        const sum = validFrames.reduce((acc, frame) => {
            return acc + (frame.colorGrading[key] || 0);
        }, 0);

        // Round to 1 decimal place
        result[key] = Math.round((sum / validFrames.length) * 10) / 10;
    });

    return result;
};

/**
 * Extracts dominant colors from a canvas context
 */
const extractDominantColors = (ctx, width, height) => {
    try {
        // Sample colors from a grid
        const sampleSize = 20;
        const stepX = Math.floor(width / sampleSize);
        const stepY = Math.floor(height / sampleSize);

        const colorCounts = {};

        for (let x = 0; x < width; x += stepX) {
            for (let y = 0; y < height; y += stepY) {
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                // Quantize to reduce color space
                const r = Math.floor(pixel[0] / 32) * 32;
                const g = Math.floor(pixel[1] / 32) * 32;
                const b = Math.floor(pixel[2] / 32) * 32;
                const hex = rgbToHex(r, g, b);
                colorCounts[hex] = (colorCounts[hex] || 0) + 1;
            }
        }

        // Get top 3 colors
        const sortedColors = Object.entries(colorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => entry[0]);

        return sortedColors.length > 0 ? sortedColors : ['#808080'];

    } catch (error) {
        console.error('Color extraction failed:', error);
        return ['#808080'];
    }
};

/**
 * Converts RGB to hex color
 */
const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};

/**
 * Generates default color grading adjustments based on lighting and mood
 * Used as fallback when AI doesn't provide suggestions or API key is unavailable
 * UPDATED: Returns values in -100 to +100 scale
 */
const getDefaultColorGrading = (lighting, mood) => {
    // Base adjustments (0 = normal)
    let adjustments = {
        exposure: 0,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        vibrance: 0,
        temp: 0, // Changed from temperature to temp to match prompt
        tint: 0,
        highlights: 0,
        shadows: 0,
        hue: 0,
        hslSaturation: 0, // Added to match prompt
        hslLightness: 0,  // Added to match prompt
        sharpen: 0,
        blur: 0,
        vignette: 0,
        grain: 0,
        fade: 0,
        grayscale: 0,
        sepia: 0
    };

    // Lighting-based adjustments
    switch (lighting) {
        case 'dark':
            adjustments.brightness = 15; // Brighten dark scenes
            adjustments.contrast = 20; // Increase contrast for depth
            adjustments.shadows = 20; // Lift shadows
            break;
        case 'bright':
            adjustments.brightness = -10; // Reduce overly bright scenes
            adjustments.highlights = -20; // Recover highlights
            break;
        case 'dramatic':
            adjustments.contrast = 30; // Higher contrast for drama
            adjustments.saturation = -10; // Slightly desaturated
            adjustments.vignette = 30; // Add vignette
            break;
        case 'natural':
            adjustments.temp = 5; // Slightly warm
            adjustments.vibrance = 15; // Healthy saturation
            break;
        case 'artificial':
            adjustments.temp = -5; // Slightly cool
            break;
    }

    // Mood-based adjustments (on top of lighting)
    switch (mood) {
        case 'dramatic':
        case 'tense':
            adjustments.saturation -= 20; // Desaturate for tension
            adjustments.contrast += 20; // More contrast
            adjustments.temp -= 10; // Cooler tones
            adjustments.grain = 20; // Add some grit
            break;
        case 'happy':
            adjustments.saturation += 20; // Boost saturation
            adjustments.vibrance += 20;
            adjustments.temp += 15; // Warmer tones
            adjustments.brightness += 5; // Slightly brighter
            break;
        case 'sad':
            adjustments.saturation -= 40; // Desaturate
            adjustments.temp -= 15; // Cooler tones
            adjustments.brightness -= 10; // Slightly darker
            adjustments.fade = 20; // Faded look
            break;
        case 'calm':
            adjustments.saturation += 5; // Natural saturation boost
            adjustments.tint = 5; // Slight magenta for calmness
            adjustments.blur = 0; // Softness? No, maybe just soft contrast
            adjustments.contrast = -10; // Softer
            break;
        case 'action':
            adjustments.saturation += 15; // Vibrant colors
            adjustments.contrast += 25; // High contrast
            adjustments.temp += 10; // Warm action tones
            adjustments.sharpen = 20; // Sharper details
            break;
    }

    // Clamp values to safe ranges
    // Let's just return the object, the renderer handles logical clamping usually, 
    // but robust defaults are good.
    return adjustments;
};

/**
 * Selects appropriate color grade based on mood
 */
const selectColorGradeForMood = (mood, sceneType) => {
    const moodToFilter = {
        'action': 'cinematic-3', // Blockbuster
        'calm': 'nature-1', // Golden Hour
        'dramatic': 'cinematic-2', // Noir
        'happy': 'film-1', // Kodak Gold (warm)
        'sad': 'mood-1', // Melancholy
        'tense': 'genre-1', // Horror
        'neutral': 'normal'
    };

    return moodToFilter[mood] || 'normal';
};

/**
 * Detects scene changes within a video
 * @param {string} videoUrl - Video URL
 * @returns {Promise<number[]>} Array of timestamps where scene changes occur
 */
export const detectSceneChanges = async (videoUrl) => {
    try {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.muted = true;

        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
        });

        const duration = video.duration;
        const sceneChanges = [];
        const sampleRate = 0.5; // Check every 0.5 seconds

        let previousHistogram = null;

        for (let time = 0; time < duration; time += sampleRate) {
            video.currentTime = time;
            await new Promise(resolve => {
                video.onseeked = resolve;
                setTimeout(resolve, 200);
            });

            const canvas = document.createElement('canvas');
            canvas.width = 160; // Small size for performance
            canvas.height = 90;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const histogram = calculateHistogram(ctx, canvas.width, canvas.height);

            if (previousHistogram) {
                const difference = compareHistograms(histogram, previousHistogram);
                if (difference > 0.3) { // Threshold for scene change
                    sceneChanges.push(time);
                }
            }

            previousHistogram = histogram;
        }

        return sceneChanges;

    } catch (error) {
        console.error('Scene change detection failed:', error);
        return [];
    }
};

/**
 * Calculates color histogram for scene change detection
 */
const calculateHistogram = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const histogram = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0) };

    for (let i = 0; i < data.length; i += 4) {
        histogram.r[data[i]]++;
        histogram.g[data[i + 1]]++;
        histogram.b[data[i + 2]]++;
    }

    return histogram;
};

/**
 * Compares two histograms
 */
const compareHistograms = (hist1, hist2) => {
    let difference = 0;
    const channels = ['r', 'g', 'b'];

    channels.forEach(channel => {
        for (let i = 0; i < 256; i++) {
            difference += Math.abs(hist1[channel][i] - hist2[channel][i]);
        }
    });

    // Normalize
    return difference / (256 * 3 * 255);
};

/**
 * Clears the video analysis cache
 */
export const clearVideoAnalysisCache = () => {
    videoAnalysisCache.clear();
};
