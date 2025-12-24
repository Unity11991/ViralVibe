import { FaceMesh } from '@mediapipe/face_mesh';

/**
 * Process video to apply face retouching (Skin Smoothing) and return a new video URL.
 * @param {string} videoUrl - Source video URL
 * @param {Object} options - Retouch options { smoothSkin: 0-100 }
 * @param {function} onProgress - Callback for progress (0-100)
 * @returns {Promise<string>} - Resolves to Blob URL of the processed video
 */
export const processFaceRetouch = async (videoUrl, options = {}, onProgress) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { smoothSkin = 50 } = options;

            // 1. Setup Video
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = videoUrl;
            video.muted = true;
            await new Promise((r) => (video.onloadedmetadata = r));

            const width = video.videoWidth;
            const height = video.videoHeight;
            const duration = video.duration;

            // 2. Setup Canvases
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Mask Canvas (for skin area)
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext('2d');

            // 3. Setup FaceMesh
            const faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            // Face Mesh Indices (Simplified for Skin Smoothing)
            // We want to smooth the face but EXCLUDE eyes, mouth, eyebrows
            const FACE_OVAL = [
                10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
                397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
                172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
            ];

            const LEFT_EYE = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
            const RIGHT_EYE = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
            const LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
            const LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
            const RIGHT_EYEBROW = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];

            // Load Accessory Images
            const accessories = {
                glasses: null,
                hat: null
            };

            if (options.accessory === 'glasses') {
                accessories.glasses = new Image();
                accessories.glasses.src = '/src/assets/effects/sunglasses.png';
                await new Promise(r => accessories.glasses.onload = r);
            } else if (options.accessory === 'hat') {
                accessories.hat = new Image();
                accessories.hat.src = '/src/assets/effects/hat.png';
                await new Promise(r => accessories.hat.onload = r);
            }

            faceMesh.onResults((results) => {
                // 1. Draw Original Frame
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'none';
                ctx.drawImage(results.image, 0, 0, width, height);

                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    const landmarks = results.multiFaceLandmarks[0];

                    // --- SKIN SMOOTHING ---
                    if (smoothSkin > 0) {
                        // 2. Generate Skin Mask
                        maskCtx.clearRect(0, 0, width, height);
                        maskCtx.fillStyle = '#000000'; // Default black
                        maskCtx.fillRect(0, 0, width, height);

                        maskCtx.fillStyle = '#FFFFFF'; // Skin is white

                        const drawPath = (indices, ctx) => {
                            ctx.beginPath();
                            const first = landmarks[indices[0]];
                            ctx.moveTo(first.x * width, first.y * height);
                            for (let i = 1; i < indices.length; i++) {
                                const point = landmarks[indices[i]];
                                ctx.lineTo(point.x * width, point.y * height);
                            }
                            ctx.closePath();
                        };

                        // Draw Face Oval (White)
                        drawPath(FACE_OVAL, maskCtx);
                        maskCtx.fill();

                        // Exclude Features (Black)
                        maskCtx.globalCompositeOperation = 'destination-out'; // Cut out

                        drawPath(LEFT_EYE, maskCtx);
                        maskCtx.fill();
                        drawPath(RIGHT_EYE, maskCtx);
                        maskCtx.fill();
                        drawPath(LIPS, maskCtx);
                        maskCtx.fill();
                        drawPath(LEFT_EYEBROW, maskCtx);
                        maskCtx.fill();
                        drawPath(RIGHT_EYEBROW, maskCtx);
                        maskCtx.fill();

                        maskCtx.globalCompositeOperation = 'source-over';

                        // 3. Create Blurred Skin Layer
                        const blurAmount = smoothSkin / 5; // Map 0-100 to 0-20px

                        ctx.save();

                        // Create temp canvas for composition
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = width;
                        tempCanvas.height = height;
                        const tempCtx = tempCanvas.getContext('2d');

                        // Draw Mask
                        tempCtx.drawImage(maskCanvas, 0, 0);

                        // Draw Blurred Image Inside Mask
                        tempCtx.globalCompositeOperation = 'source-in';
                        tempCtx.filter = `blur(${blurAmount}px)`;
                        tempCtx.drawImage(results.image, 0, 0, width, height);
                        tempCtx.filter = 'none';

                        // Composite back to Main Canvas
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.globalAlpha = 0.8;
                        ctx.drawImage(tempCanvas, 0, 0);
                        ctx.globalAlpha = 1.0;

                        ctx.restore();
                    }

                    // --- ACCESSORIES ---
                    if (options.accessory) {
                        const getPoint = (index) => ({
                            x: landmarks[index].x * width,
                            y: landmarks[index].y * height
                        });

                        if (options.accessory === 'glasses' && accessories.glasses) {
                            // Anchor: Eyes (33, 263)
                            const leftEye = getPoint(33);
                            const rightEye = getPoint(263);

                            const centerX = (leftEye.x + rightEye.x) / 2;
                            const centerY = (leftEye.y + rightEye.y) / 2;

                            const dx = rightEye.x - leftEye.x;
                            const dy = rightEye.y - leftEye.y;
                            const angle = Math.atan2(dy, dx);
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            const imgWidth = distance * 2.5; // Scale factor
                            const imgHeight = imgWidth * (accessories.glasses.height / accessories.glasses.width);

                            ctx.save();
                            ctx.translate(centerX, centerY);
                            ctx.rotate(angle);
                            ctx.drawImage(accessories.glasses, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
                            ctx.restore();
                        }

                        if (options.accessory === 'hat' && accessories.hat) {
                            // Anchor: Top Head (10) and Sides (234, 454) for width
                            const topHead = getPoint(10);
                            const leftSide = getPoint(234);
                            const rightSide = getPoint(454);

                            const dx = rightSide.x - leftSide.x;
                            const dy = rightSide.y - leftSide.y;
                            const angle = Math.atan2(dy, dx);
                            const faceWidth = Math.sqrt(dx * dx + dy * dy);

                            const imgWidth = faceWidth * 1.5;
                            const imgHeight = imgWidth * (accessories.hat.height / accessories.hat.width);

                            ctx.save();
                            // Position slightly above top of head
                            ctx.translate(topHead.x, topHead.y - (imgHeight * 0.4));
                            ctx.rotate(angle);
                            ctx.drawImage(accessories.hat, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
                            ctx.restore();
                        }
                    }
                }
            });

            const stream = canvas.captureStream(30);
            const mimeTypes = ['video/webm; codecs=vp9', 'video/webm'];
            const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 5000000
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
                faceMesh.close();
                video.remove();
                canvas.remove();
                maskCanvas.remove();
            };

            mediaRecorder.start();

            // 5. Process
            video.play();

            const processFrame = async () => {
                if (video.paused || video.ended) {
                    if (video.ended) mediaRecorder.stop();
                    return;
                }

                await faceMesh.send({ image: video });

                if (onProgress) {
                    onProgress(Math.round((video.currentTime / duration) * 100));
                }

                if (!video.ended) requestAnimationFrame(processFrame);
            };

            processFrame();

        } catch (error) {
            reject(error);
        }
    });
};
