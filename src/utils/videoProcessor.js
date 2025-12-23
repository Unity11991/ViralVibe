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

            selfieSegmentation.setOptions({
                modelSelection: 1, // 1 = Landscape (better quality), 0 = General
                selfieMode: false,
            });

            selfieSegmentation.onResults((results) => {
                // 1. Draw raw mask to a temp canvas to process it
                // We can process pixels directly on the main canvas if we draw mask first

                // Draw Mask (Grayscale)
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(results.segmentationMask, 0, 0, width, height);

                // Process Mask Pixels (Thresholding for Sharp Edges)
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i]; // Red channel is usually the mask value
                    // Threshold: If > 100, make it 255 (Opaque), else 0 (Transparent)
                    // Or use a smoothstep for slightly softer but sharp edges
                    // CapCut style: Hard cut
                    const threshold = 128;
                    const val = alpha > threshold ? 255 : 0;

                    data[i] = 0; // R
                    data[i + 1] = 0; // G
                    data[i + 2] = 0; // B
                    data[i + 3] = val; // Alpha
                }
                ctx.putImageData(imageData, 0, 0);

                // Now we have a sharp Alpha Mask on the canvas.
                // We want to draw the video frame INSIDE this mask.
                // Use source-in: Retains content where mask is opaque.

                ctx.globalCompositeOperation = 'source-in';
                ctx.drawImage(results.image, 0, 0, width, height);

                // Reset
                ctx.globalCompositeOperation = 'source-over';
            });

            await selfieSegmentation.initialize();

            // 4. Setup MediaRecorder
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
