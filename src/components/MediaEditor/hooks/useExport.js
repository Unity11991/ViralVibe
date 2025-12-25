import { useState, useRef, useCallback } from 'react';
import * as Mp4Muxer from 'mp4-muxer';
import { renderFrame } from '../utils/canvasUtils';
import { getFrameState } from '../utils/renderLogic';
import mediaSourceManager from '../utils/MediaSourceManager';
import VideoDecoderManager from '../utils/VideoDecoderManager';

/**
 * Hook for High Quality Video Export using WebCodecs and mp4-muxer
 */
export const useExport = (timelineState, canvasRef) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState(''); // 'rendering', 'encoding', 'saving'
    const [exportError, setExportError] = useState(null);

    const abortControllerRef = useRef(null);

    const exportVideo = useCallback(async (config = {
        width: 1920,
        height: 1080,
        fps: 30,
        bitrate: 5000000, // 5 Mbps
        filename: 'video-export.mp4'
    }) => {
        if (isExporting) return;

        try {
            setIsExporting(true);
            setExportProgress(0);
            setExportStatus('Initializing...');
            setExportError(null);
            abortControllerRef.current = new AbortController();

            const { width, height, fps, bitrate } = config;
            const duration = timelineState.duration;
            const totalFrames = Math.ceil(duration * fps);

            // Determine Codec Level based on resolution and FPS
            let codec = 'avc1.42001f'; // Default Level 3.1 (720p)
            if (width > 1920 || height > 1080 || fps > 60) {
                codec = 'avc1.420033'; // Level 5.1 (4K or High FPS)
            } else if (width > 1280 || height > 720 || fps > 30) {
                codec = 'avc1.42002a'; // Level 4.2 (1080p @ 60fps)
            }

            // 1. Initialize Muxer with Audio Support
            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width,
                    height
                },
                audio: {
                    codec: 'aac',
                    numberOfChannels: 2,
                    sampleRate: 48000
                },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset',
            });

            let encoderError = null;

            // 2. Initialize Encoders
            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => {
                    console.error("VideoEncoder error:", e);
                    encoderError = e;
                }
            });

            videoEncoder.configure({
                codec: codec,
                width,
                height,
                bitrate,
                framerate: fps,
            });

            const audioEncoder = new AudioEncoder({
                output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                error: (e) => {
                    console.error("AudioEncoder error:", e);
                    encoderError = e;
                }
            });

            audioEncoder.configure({
                codec: 'mp4a.40.2', // AAC-LC
                sampleRate: 48000,
                numberOfChannels: 2,
                bitrate: 128000
            });

            // 3. Setup Audio Rendering (Offline)
            const audioBufferCache = new Map();
            const getAudioBuffer = async (url) => {
                if (audioBufferCache.has(url)) return audioBufferCache.get(url);
                try {
                    const response = await fetch(url);
                    const arrayBuffer = await response.arrayBuffer();
                    const tempCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
                    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
                    await tempCtx.close();
                    audioBufferCache.set(url, audioBuffer);
                    return audioBuffer;
                } catch (e) {
                    console.error('Error decoding audio:', url, e);
                    return null;
                }
            };

            // 4. Prepare Canvas for Rendering
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = width;
            exportCanvas.height = height;
            const ctx = exportCanvas.getContext('2d', {
                alpha: false,
                willReadFrequently: false,
                desynchronized: false // Explicitly disable to prevent flickering
            });

            // 5. Video Render Loop
            setExportStatus('Initializing Decoders...');

            // Initialize Decoders for all video clips
            const decoders = new Map(); // url -> VideoDecoderManager

            // Collect unique video sources
            const videoSources = new Set();
            timelineState.tracks.forEach(t => {
                if (t.type === 'video') {
                    t.clips.forEach(c => {
                        if (c.source && c.source.toLowerCase().includes('mp4')) { // Simple check for V1
                            videoSources.add(c.source);
                        }
                    });
                }
            });

            // Init Managers
            const initPromises = Array.from(videoSources).map(async (url) => {
                const manager = new VideoDecoderManager(url);
                try {
                    await manager.prepare();
                    decoders.set(url, manager);
                } catch (e) {
                    console.warn(`Failed to init decoder for ${url}, falling back to legacy seeking.`, e);
                }
            });

            await Promise.all(initPromises);


            setExportStatus('Rendering video frames...');
            for (let i = 0; i < totalFrames; i++) {
                if (abortControllerRef.current.signal.aborted) {
                    decoders.forEach(d => d.release()); // Cleanup
                    throw new Error('Export cancelled');
                }

                if (encoderError) {
                    decoders.forEach(d => d.release());
                    throw new Error(`Encoding failed: ${encoderError.message}`);
                }

                const time = i / fps;
                setExportProgress(Math.round((i / totalFrames) * 80));

                const seekPromises = [];
                const activeDecodedFrames = new Map(); // url -> VideoFrame (to be closed after render)

                // Legacy Seek Function (Fallback)
                const seekVideo = async (videoEl, targetTime) => {
                    if (videoEl.readyState < 2) {
                        await new Promise(resolve => {
                            const onCanPlay = () => {
                                videoEl.removeEventListener('canplay', onCanPlay);
                                resolve();
                            };
                            videoEl.addEventListener('canplay', onCanPlay, { once: true });
                            setTimeout(resolve, 300);
                        });
                    }
                    videoEl.currentTime = targetTime;
                    if (videoEl.seeking || Math.abs(videoEl.currentTime - targetTime) > 0.001) {
                        await new Promise(resolve => {
                            const onSeeked = () => {
                                videoEl.removeEventListener('seeked', onSeeked);
                                resolve();
                            };
                            videoEl.addEventListener('seeked', onSeeked, { once: true });
                            setTimeout(resolve, 300);
                        });
                    }
                    if (videoEl.requestVideoFrameCallback) {
                        await new Promise(resolve => {
                            videoEl.requestVideoFrameCallback(() => resolve());
                            setTimeout(resolve, 20);
                        });
                    } else {
                        await new Promise(r => setTimeout(r, 20));
                    }
                };

                // Prepare Sources (Mixed Mode: Decoder vs Legacy)
                const processingPromises = [];

                timelineState.tracks.forEach(track => {
                    const clip = track.clips.find(c => time >= c.startTime && time < (c.startTime + c.duration));
                    if (clip && clip.source && (track.type === 'video' || track.type === 'image')) {
                        // Check if we have a fast decoder
                        const decoder = decoders.get(clip.source);

                        if (decoder && track.type === 'video') {
                            const clipTime = time - clip.startTime;
                            const sourceTime = (clip.startOffset || 0) + clipTime;

                            // Fast Path: Get Frame from Decoder
                            processingPromises.push(async () => {
                                const frame = await decoder.getFrame(sourceTime);
                                if (frame) {
                                    activeDecodedFrames.set(clip.id, frame);
                                }
                            });
                        } else {
                            // Slow Path: Legacy Fallback
                            const mediaEl = mediaSourceManager.getMedia(clip.source, track.type === 'image' ? 'image' : 'video');
                            if (mediaEl && track.type === 'video') {
                                const clipTime = time - clip.startTime;
                                const sourceTime = (clip.startOffset || 0) + clipTime;
                                processingPromises.push(async () => await seekVideo(mediaEl, sourceTime));
                            }
                        }
                    }
                });

                // Wait for all seeks/decodes
                await Promise.all(processingPromises.map(p => p())); // execute wrapper funcs


                // SCALING FIX:
                // Transform absolute pixel coordinates from editing canvas to export canvas
                const editingDimensions = timelineState.canvasDimensions || { width: 800, height: 600 };
                const scaleX = width / editingDimensions.width;
                const scaleY = height / editingDimensions.height;

                const scaledTracks = timelineState.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(clip => {
                        // Only scale absolute transforms (media), not percentage based (text)
                        if (['video', 'image', 'sticker'].includes(track.type) || ['video', 'image', 'sticker'].includes(clip.type)) {
                            if (clip.transform) {
                                return {
                                    ...clip,
                                    transform: {
                                        ...clip.transform,
                                        x: (clip.transform.x || 0) * scaleX,
                                        y: (clip.transform.y || 0) * scaleY,
                                        // Scale is percentage, so it remains same relative to base dimensions
                                        // But wait, drawMediaToCanvas uses baseWidth * scaleFactor.
                                        // baseWidth is calculated from canvas dimensions.
                                        // So scale % should be fine.
                                    }
                                };
                            }
                        }
                        return clip;
                    })
                }));

                const frameState = getFrameState(time, scaledTracks, {
                    ...timelineState,
                    selectedClipId: null, // Force no selection during export
                    canvasDimensions: { width, height },
                    effectIntensity: timelineState.effectIntensity,
                    activeEffectId: timelineState.activeEffectId,
                    activeFilterId: timelineState.activeFilterId,
                    externalMediaMap: activeDecodedFrames // PASS DECODED FRAMES
                });

                renderFrame(ctx, null, frameState, {
                    forceHighQuality: true,
                    applyFiltersToContext: true
                });

                // CLEANUP: Close VideoFrames immediately after render to free VRAM
                activeDecodedFrames.forEach((frame) => {
                    frame.close();
                });
                activeDecodedFrames.clear();

                const frame = new VideoFrame(exportCanvas, {
                    timestamp: i * (1000000 / fps),
                    duration: 1000000 / fps
                });

                videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
                frame.close();

                if (i % 15 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            await videoEncoder.flush();

            // 6. Render and Encode Audio
            setExportStatus('Rendering audio...');
            const sampleRate = 48000;
            const offlineCtx = new OfflineAudioContext(2, Math.max(1, Math.ceil(duration * sampleRate)), sampleRate);

            const audioLoadPromises = [];
            timelineState.tracks.forEach(track => {
                if (track.type === 'audio' || track.type === 'video') {
                    track.clips.forEach(clip => {
                        if (track.type === 'video' && (clip.muted || clip.audioDetached)) return;

                        audioLoadPromises.push((async () => {
                            const buffer = await getAudioBuffer(clip.source);
                            if (!buffer) return;

                            const source = offlineCtx.createBufferSource();
                            source.buffer = buffer;

                            const gainNode = offlineCtx.createGain();
                            gainNode.gain.value = (clip.volume !== undefined ? clip.volume : 100) / 100;

                            source.connect(gainNode);
                            gainNode.connect(offlineCtx.destination);

                            source.start(clip.startTime, clip.startOffset || 0, clip.duration);
                        })());
                    });
                }
            });

            await Promise.all(audioLoadPromises);
            const renderedBuffer = await offlineCtx.startRendering();

            setExportStatus('Encoding audio...');
            const channelData = [
                renderedBuffer.getChannelData(0),
                renderedBuffer.numberOfChannels > 1 ? renderedBuffer.getChannelData(1) : renderedBuffer.getChannelData(0)
            ];

            const audioFrameDuration = 1024;
            const numAudioFrames = Math.ceil(renderedBuffer.length / audioFrameDuration);

            for (let i = 0; i < numAudioFrames; i++) {
                const start = i * audioFrameDuration;
                const end = Math.min(start + audioFrameDuration, renderedBuffer.length);
                const frameLength = end - start;

                const frameData = new Float32Array(frameLength * 2);
                for (let j = 0; j < frameLength; j++) {
                    frameData[j * 2] = channelData[0][start + j];
                    frameData[j * 2 + 1] = channelData[1][start + j];
                }

                const audioFrame = new AudioData({
                    format: 'f32', // Interleaved
                    sampleRate,
                    numberOfFrames: frameLength,
                    numberOfChannels: 2,
                    timestamp: (start / sampleRate) * 1000000,
                    data: frameData
                });

                audioEncoder.encode(audioFrame);
                audioFrame.close();
            }

            await audioEncoder.flush();

            // 7. Finalize
            setExportStatus('Creating file...');
            muxer.finalize();

            const { buffer } = muxer.target;
            const blob = new Blob([buffer], { type: 'video/mp4' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = config.filename;
            a.click();
            URL.revokeObjectURL(url);

            setIsExporting(false);
            setExportProgress(100);
            setExportStatus('Completed');
        } catch (err) {
            console.error("Export failed:", err);
            setExportError(err.message);
            setIsExporting(false);
        }
    }, [timelineState, isExporting]);

    const cancelExport = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsExporting(false);
        setExportStatus('Cancelled');
    }, []);

    return {
        exportVideo,
        cancelExport,
        isExporting,
        exportProgress,
        exportStatus,
        exportError
    };
};
