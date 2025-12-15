/**
 * Video Processor Service (Canvas Recording Version)
 * Handles frame-by-frame video processing with face retouching
 * Uses canvas-to-blob approach for reliable frame capture
 */

import { detectFaces, applySkinSmoothing, applyTeethWhitening } from './aiFaceService';

/**
 * Process entire video with face retouching baked in
 * Captures each frame as an image and re-encodes to video
 * @param {HTMLVideoElement} videoElement - Source video element
 * @param {Object} faceRetouchSettings - { smoothSkin: 0-100, whitenTeeth: 0-100 }
 * @param {Function} onProgress - Progress callback (progress, status, frameInfo)
 * @param {AbortSignal} signal - Abort signal for cancellation
 * @returns {Promise<Blob>} Processed video blob
 */
export const processVideoWithFaceRetouch = async (
    videoElement,
    faceRetouchSettings,
    onProgress,
    signal
) => {
    const { smoothSkin = 0, whitenTeeth = 0 } = faceRetouchSettings;

    if (smoothSkin === 0 && whitenTeeth === 0) {
        throw new Error('No face retouch settings applied');
    }

    // Get video properties
    const duration = videoElement.duration;
    const fps = 30; // Target FPS for output
    const totalFrames = Math.ceil(duration * fps);
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    // Create canvas for frame processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;

    // Collect all processed frames as blobs
    const frameBlobs = [];

    // Process frames
    let processedFrames = 0;
    const frameInterval = 1 / fps;
    let currentTime = 0;

    onProgress?.(0, 'Processing frames...', { current: 0, total: totalFrames });

    while (currentTime < duration && !signal?.aborted) {
        // Seek to frame time
        videoElement.currentTime = currentTime;

        // Wait for video to seek properly
        await new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100;

            const checkSeek = () => {
                attempts++;
                const timeDiff = Math.abs(videoElement.currentTime - currentTime);

                if ((timeDiff < 0.05 && videoElement.readyState >= 2) || attempts >= maxAttempts) {
                    setTimeout(resolve, 20);
                } else {
                    requestAnimationFrame(checkSeek);
                }
            };
            checkSeek();
        });

        // Clear and draw current frame
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(videoElement, 0, 0, width, height);

        // Detect faces on EVERY frame (no caching for consistent quality)
        const faces = await detectFaces(videoElement);

        // Apply face retouching if faces detected
        if (faces && faces.length > 0) {
            const canvasFaces = faces.map(face => ({
                x: face.x,
                y: face.y,
                width: face.width,
                height: face.height,
                landmarks: face.landmarks
            }));

            if (smoothSkin > 0) {
                applySkinSmoothing(ctx, canvasFaces, smoothSkin);
            }

            if (whitenTeeth > 0) {
                applyTeethWhitening(ctx, canvasFaces, whitenTeeth);
            }
        }

        // Capture frame as blob (JPEG for faster processing)
        const frameBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });

        frameBlobs.push(frameBlob);

        processedFrames++;
        currentTime += frameInterval;

        // Update progress
        onProgress?.(
            (processedFrames / totalFrames) * 90, // Reserve 10% for encoding
            `Processing frame ${processedFrames}/${totalFrames}...`,
            { current: processedFrames, total: totalFrames }
        );
    }

    // Now encode all frames to video using MediaRecorder with fixed timing
    onProgress?.(90, 'Encoding video...', { current: totalFrames, total: totalFrames });

    const videoBlob = await encodeFramesToVideo(frameBlobs, width, height, fps, onProgress);

    onProgress?.(100, 'Complete!', { current: totalFrames, total: totalFrames });

    return videoBlob;
};

/**
 * Encode frame blobs to video using MediaRecorder with precise timing
 */
const encodeFramesToVideo = async (frameBlobs, width, height, fps, onProgress) => {
    // Create a canvas for playback
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Setup MediaRecorder
    const stream = canvas.captureStream(fps);
    const chunks = [];

    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

    const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000 // 8 Mbps for high quality
    });

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    recorder.start();

    // Play back each frame at exact intervals
    const frameDuration = 1000 / fps;

    for (let i = 0; i < frameBlobs.length; i++) {
        const img = await createImageBitmap(frameBlobs[i]);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        img.close();

        // Wait for exact frame duration
        await new Promise(resolve => setTimeout(resolve, frameDuration));

        if (i % 30 === 0) {
            onProgress?.(
                90 + (i / frameBlobs.length) * 10,
                `Encoding frame ${i}/${frameBlobs.length}...`,
                { current: i, total: frameBlobs.length }
            );
        }
    }

    // Stop recording
    recorder.stop();

    // Wait for final data
    const blob = await new Promise((resolve, reject) => {
        recorder.onstop = () => {
            resolve(new Blob(chunks, { type: mimeType }));
        };
        recorder.onerror = reject;
        setTimeout(() => reject(new Error('Encoding timeout')), 30000);
    });

    return blob;
};

/**
 * Download processed video
 */
export const downloadProcessedVideo = (blob, filename = 'processed-video.webm') => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Estimate processing time
 */
export const estimateProcessingTime = (duration, fps = 30) => {
    const totalFrames = Math.ceil(duration * fps);
    const avgTimePerFrame = 0.2; // Slower now due to per-frame face detection
    return Math.ceil(totalFrames * avgTimePerFrame);
};
