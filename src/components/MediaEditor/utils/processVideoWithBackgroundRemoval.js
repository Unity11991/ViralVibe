/**
 * Process Video with Background Removal
 * Extracts frames, applies MediaPipe segmentation, and re-encodes as transparent video
 */

import { getBackgroundRemovalProcessor } from './BackgroundRemovalProcessor';

/**
 * Process entire video with background removal
 * @param {string} videoSource - Video source URL or blob
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - Blob URL of processed video
 */
export async function processVideoWithBackgroundRemoval(videoSource, onProgress) {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Load video
            const video = document.createElement('video');
            video.src = videoSource;
            video.crossOrigin = 'anonymous';
            video.muted = true;

            await new Promise((res, rej) => {
                video.onloadedmetadata = res;
                video.onerror = () => rej(new Error('Failed to load video'));
            });

            const width = video.videoWidth;
            const height = video.videoHeight;
            const duration = video.duration;

            // Try to detect actual FPS, fallback to 30
            let fps = 30;
            try {
                // Some browsers support this
                if (video.getVideoPlaybackQuality) {
                    video.currentTime = 1;
                    await new Promise(res => setTimeout(res, 100));
                    const quality = video.getVideoPlaybackQuality();
                    if (quality.totalVideoFrames > 0) {
                        fps = Math.round(quality.totalVideoFrames / video.currentTime);
                    }
                }
                // Clamp FPS to reasonable range
                fps = Math.min(60, Math.max(24, fps));
            } catch (e) {
                console.log('Using default 30 fps');
            }

            const totalFrames = Math.floor(duration * fps);

            console.log(`Processing video: ${width}x${height}, ${duration}s, ${fps} fps, ${totalFrames} frames`);

            // 2. Initialize processor
            const processor = getBackgroundRemovalProcessor();
            await processor.initialize('balanced');

            // 3. Create canvas for processing
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // 4. Process ALL frames first and store them
            const processedFrames = [];
            const frameDuration = 1 / fps;

            for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
                const currentTime = frameIndex * frameDuration;

                // Seek to frame
                video.currentTime = currentTime;
                await new Promise(res => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        res();
                    };
                    video.addEventListener('seeked', onSeeked);
                    setTimeout(res, 150); // Longer timeout to ensure frame is ready
                });

                // Draw frame
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(video, 0, 0, width, height);

                // Get segmentation mask
                const maskData = await processor.processFrame(video, currentTime, 'bg-removal-processing');

                if (maskData) {
                    // Apply mask
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const pixels = imageData.data;

                    // Resize mask if needed
                    let maskPixels = maskData.data;
                    if (maskData.width !== width || maskData.height !== height) {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = maskData.width;
                        tempCanvas.height = maskData.height;
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.putImageData(maskData, 0, 0);

                        const scaledCanvas = document.createElement('canvas');
                        scaledCanvas.width = width;
                        scaledCanvas.height = height;
                        const scaledCtx = scaledCanvas.getContext('2d');
                        scaledCtx.drawImage(tempCanvas, 0, 0, width, height);

                        const scaledMask = scaledCtx.getImageData(0, 0, width, height);
                        maskPixels = scaledMask.data;
                    }

                    // Smooth the mask edges for better quality
                    const smoothedMask = smoothMaskEdges(maskPixels, width, height);

                    // Apply smoothed mask to alpha channel
                    for (let i = 0; i < pixels.length; i += 4) {
                        const maskValue = smoothedMask[i]; // R channel = mask
                        pixels[i + 3] = maskValue; // Set alpha
                    }

                    ctx.putImageData(imageData, 0, 0);
                }

                // Save processed frame as blob
                const frameBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
                processedFrames.push(frameBlob);

                // Update progress (0-70% for processing)
                onProgress(Math.round(((frameIndex + 1) / totalFrames) * 70));
            }

            console.log(`Processed ${processedFrames.length} frames, now encoding at ${fps} fps...`);

            // 5. Encode frames into video with precise timing
            // Create a new canvas for playback
            const playbackCanvas = document.createElement('canvas');
            playbackCanvas.width = width;
            playbackCanvas.height = height;
            const playbackCtx = playbackCanvas.getContext('2d');

            // Setup MediaRecorder with higher bitrate
            const stream = playbackCanvas.captureStream(0); // 0 = manual frame pushing
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp8',
                videoBitsPerSecond: 8000000 // 8 Mbps for better quality
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                console.log('Video encoding complete!');
                resolve(url);
            };

            mediaRecorder.start();

            // Playback frames with precise timing using requestAnimationFrame
            let playbackIndex = 0;
            const frameDurationMs = 1000 / fps;
            let lastFrameTime = performance.now();

            const playNextFrame = async () => {
                if (playbackIndex >= processedFrames.length) {
                    // Done - stop recorder after short delay
                    setTimeout(() => mediaRecorder.stop(), 500);
                    return;
                }

                const now = performance.now();
                const elapsed = now - lastFrameTime;

                // Only draw if enough time has passed
                if (elapsed >= frameDurationMs - 2) { // -2ms tolerance
                    // Load and draw frame
                    const img = new Image();
                    const frameBlob = processedFrames[playbackIndex];

                    await new Promise((res) => {
                        img.onload = () => {
                            playbackCtx.clearRect(0, 0, width, height);
                            playbackCtx.drawImage(img, 0, 0);

                            // Request frame from stream track
                            const track = stream.getVideoTracks()[0];
                            if (track.requestFrame) {
                                track.requestFrame();
                            }

                            playbackIndex++;
                            lastFrameTime = now;

                            // Update progress (70-100% for encoding)
                            onProgress(70 + Math.round((playbackIndex / processedFrames.length) * 30));

                            res();
                        };
                        img.onerror = () => res(); // Skip on error
                        img.src = URL.createObjectURL(frameBlob);
                    });
                }

                // Continue to next frame
                requestAnimationFrame(playNextFrame);
            };

            // Start playback
            requestAnimationFrame(playNextFrame);

        } catch (error) {
            console.error('Video processing error:', error);
            reject(error);
        }
    });
}

/**
 * Smooth mask edges using Gaussian blur and feathering
 * @param {Uint8ClampedArray} maskPixels - Mask pixel data
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @returns {Uint8ClampedArray} - Smoothed mask
 */
function smoothMaskEdges(maskPixels, width, height) {
    const smoothed = new Uint8ClampedArray(maskPixels.length);
    const radius = 10; // Maximum blur radius for completely invisible edges
    const sigma = 5.0; // Maximum blur strength

    // Generate Gaussian kernel
    const kernelSize = radius * 2 + 1;
    const kernel = new Float32Array(kernelSize);
    let kernelSum = 0;

    for (let i = 0; i < kernelSize; i++) {
        const x = i - radius;
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernelSum += kernel[i];
    }

    // Normalize kernel
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= kernelSum;
    }

    // Step 1: Maximum erosion to completely remove boundary artifacts
    const eroded = new Uint8ClampedArray(maskPixels.length);
    const erodeRadius = 3; // Maximum erosion
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let minVal = 255;
            for (let dy = -erodeRadius; dy <= erodeRadius; dy++) {
                for (let dx = -erodeRadius; dx <= erodeRadius; dx++) {
                    const py = Math.max(0, Math.min(height - 1, y + dy));
                    const px = Math.max(0, Math.min(width - 1, x + dx));
                    const idx = (py * width + px) * 4;
                    minVal = Math.min(minVal, maskPixels[idx]);
                }
            }
            const idx = (y * width + x) * 4;
            eroded[idx] = eroded[idx + 1] = eroded[idx + 2] = minVal;
            eroded[idx + 3] = 255;
        }
    }

    // Step 2: Triple blur passes for maximum smoothness
    let current = eroded;
    const numPasses = 3; // Apply blur 3 times

    for (let pass = 0; pass < numPasses; pass++) {
        // Horizontal blur pass
        const temp = new Uint8ClampedArray(maskPixels.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                for (let k = -radius; k <= radius; k++) {
                    const px = Math.max(0, Math.min(width - 1, x + k));
                    const idx = (y * width + px) * 4;
                    sum += current[idx] * kernel[k + radius];
                }
                const idx = (y * width + x) * 4;
                temp[idx] = temp[idx + 1] = temp[idx + 2] = sum;
                temp[idx + 3] = 255;
            }
        }

        // Vertical blur pass
        const result = new Uint8ClampedArray(maskPixels.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                for (let k = -radius; k <= radius; k++) {
                    const py = Math.max(0, Math.min(height - 1, y + k));
                    const idx = (py * width + x) * 4;
                    sum += temp[idx] * kernel[k + radius];
                }
                const idx = (y * width + x) * 4;
                result[idx] = result[idx + 1] = result[idx + 2] = sum;
                result[idx + 3] = 255;
            }
        }

        current = result;
    }

    // Step 3: Quad S-curve feathering for completely invisible transitions
    for (let i = 0; i < current.length; i += 4) {
        let maskValue = current[i];

        // Apply feathering to all non-extreme values
        if (maskValue > 2 && maskValue < 253) {
            const normalized = maskValue / 255;

            // Quad S-curve for absolute maximum smoothness
            let curved = normalized * normalized * (3 - 2 * normalized);
            curved = curved * curved * (3 - 2 * curved);
            curved = curved * curved * (3 - 2 * curved);
            curved = curved * curved * (3 - 2 * curved);

            // Maximum range compression for softest possible edges
            curved = curved * 0.85 + 0.075;

            maskValue = curved * 255;
        }

        smoothed[i] = smoothed[i + 1] = smoothed[i + 2] = Math.max(0, Math.min(255, maskValue));
        smoothed[i + 3] = 255;
    }

    return smoothed;
}


export default processVideoWithBackgroundRemoval;
