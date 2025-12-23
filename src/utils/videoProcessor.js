import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

/**
 * Process video to remove background and return a transparent WebM Blob URL.
 * @param {string} videoUrl - Source video URL
 * @param {function} onProgress - Callback for progress (0-100)
 * @returns {Promise<string>} - Resolves to Blob URL of the processed video
 */
export const processVideoBackgroundRemoval = async (videoUrl, onProgress) => {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Setup Video Element
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = videoUrl;
            video.muted = true;
            await new Promise((r) => (video.onloadedmetadata = r));

            const width = video.videoWidth;
            const height = video.videoHeight;
            const duration = video.duration;

            // 2. Setup Canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // 3. Setup MediaPipe
            const selfieSegmentation = new SelfieSegmentation({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
            });

            // 4. Configure MediaPipe
            selfieSegmentation.setOptions({
                modelSelection: 0, // 0 = General (Better for full body/distance), 1 = Landscape
                selfieMode: false,
            });

            // Temporal Smoothing Buffer
            let previousAlphaData = null;
            const SMOOTHING_FACTOR = 0.7;

            selfieSegmentation.onResults((results) => {
                // 1. Draw raw mask to a temp canvas
                ctx.globalCompositeOperation = 'source-over';

                // Blur to reduce jitter
                ctx.filter = 'blur(2px)';
                ctx.drawImage(results.segmentationMask, 0, 0, width, height);
                ctx.filter = 'none';

                // Process Mask Pixels
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                // Initialize previous buffer
                if (!previousAlphaData) {
                    previousAlphaData = new Uint8Array(data.length / 4);
                }

                // Temporary buffer for Erode operation
                const erodedAlpha = new Uint8Array(data.length / 4);

                // Pass 1: Temporal Smoothing
                for (let i = 0; i < data.length; i += 4) {
                    const pixelIndex = i / 4;
                    let alpha = data[i];

                    // Temporal Smoothing
                    if (previousAlphaData) {
                        alpha = (alpha * (1 - SMOOTHING_FACTOR)) + (previousAlphaData[pixelIndex] * SMOOTHING_FACTOR);
                        previousAlphaData[pixelIndex] = alpha;
                    }

                    erodedAlpha[pixelIndex] = alpha;
                }

                // Pass 2: Erode (Shrink Mask) - Removes Halo
                // Increased strength to cut into the subject slightly and remove background edges
                const erodeAmount = 2; // Stronger halo removal

                for (let y = erodeAmount; y < height - erodeAmount; y++) {
                    for (let x = erodeAmount; x < width - erodeAmount; x++) {
                        const idx = (y * width + x);

                        // Find minimum alpha in neighborhood
                        let minAlpha = 255;

                        // Extended neighborhood for erodeAmount = 2
                        const neighbors = [
                            idx,                // Center
                            idx - 1, idx + 1,   // Horizontal 1px
                            idx - 2, idx + 2,   // Horizontal 2px
                            idx - width, idx + width, // Vertical 1px
                            idx - (width * 2), idx + (width * 2) // Vertical 2px
                        ];

                        for (const nIdx of neighbors) {
                            if (erodedAlpha[nIdx] < minAlpha) minAlpha = erodedAlpha[nIdx];
                        }

                        // Apply Tighter Soft Threshold to the ERODED value
                        const lower = 130; // Aggressive cut
                        const upper = 180;
                        let val = 0;

                        if (minAlpha < lower) val = 0;
                        else if (minAlpha > upper) val = 255;
                        else {
                            val = ((minAlpha - lower) / (upper - lower)) * 255;
                        }

                        const dataIdx = idx * 4;
                        data[dataIdx] = 0;
                        data[dataIdx + 1] = 0;
                        data[dataIdx + 2] = 0;
                        data[dataIdx + 3] = val; // Alpha
                    }
                }

                ctx.putImageData(imageData, 0, 0);

                // Now we have a smooth Alpha Mask on the canvas.
                // We want to draw the video frame INSIDE this mask.

                ctx.globalCompositeOperation = 'source-in';
                ctx.drawImage(results.image, 0, 0, width, height);

                // Reset
                ctx.globalCompositeOperation = 'source-over';
            });

            await selfieSegmentation.initialize();

            // 5. Setup MediaRecorder
            const stream = canvas.captureStream(30); // Capture at 30fps (or match video fps if possible)

            // Check supported mime types
            const mimeTypes = [
                'video/webm; codecs=vp9',
                'video/webm; codecs=vp8',
                'video/webm'
            ];
            const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

            if (!mimeType) {
                reject(new Error('Browser does not support WebM recording with alpha channel.'));
                return;
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: 5000000 // 5 Mbps
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                resolve(url);

                // Cleanup
                selfieSegmentation.close();
                video.remove();
                canvas.remove();
            };

            mediaRecorder.start();

            // 5. Process Frames
            // We use video.play() and requestVideoFrameCallback for sync processing
            // However, MediaPipe is async. To ensure we don't drop frames, we might need to pause/seek.
            // But for simplicity and speed, playing at 1x speed is usually fine for MediaPipe on modern devices.
            // If it lags, the recorder might skip frames.
            // A safer approach for "Baked" quality is to seek frame-by-frame.

            // Let's try the seek approach for perfect quality (slower but reliable)
            // Actually, MediaRecorder records real-time. If we seek slowly, the output video will be slow.
            // We can't easily change the timestamp in MediaRecorder.
            // So we MUST play in real-time.

            video.play();

            const processFrame = async () => {
                if (video.paused || video.ended) {
                    if (video.ended) {
                        mediaRecorder.stop();
                    }
                    return;
                }

                await selfieSegmentation.send({ image: video });

                if (onProgress) {
                    onProgress(Math.round((video.currentTime / duration) * 100));
                }

                if (!video.ended) {
                    requestAnimationFrame(processFrame);
                }
            };

            processFrame();

        } catch (err) {
            reject(err);
        }
    });
};
