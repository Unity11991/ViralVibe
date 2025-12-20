import { useState, useRef, useCallback } from 'react';
import * as Mp4Muxer from 'mp4-muxer';
import { renderFrame } from '../utils/canvasUtils';
import { getFrameState } from '../utils/renderLogic';

/**
 * Hook for High Quality Video Export using WebCodecs and mp4-muxer
 */
export const useExport = (timelineState, mediaResources, canvasRef) => {
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
                willReadFrequently: false
            });

            // 5. Video Render Loop
            setExportStatus('Rendering video frames...');
            for (let i = 0; i < totalFrames; i++) {
                if (abortControllerRef.current.signal.aborted) {
                    throw new Error('Export cancelled');
                }

                if (encoderError) {
                    throw new Error(`Encoding failed: ${encoderError.message}`);
                }

                const time = i / fps;
                setExportProgress(Math.round((i / totalFrames) * 80)); // 80% for video

                const seekPromises = [];
                const seekVideo = async (videoEl, targetTime) => {
                    videoEl.currentTime = targetTime;
                    if (Math.abs(videoEl.currentTime - targetTime) > 0.001) {
                        await new Promise(resolve => {
                            const onSeeked = () => {
                                videoEl.removeEventListener('seeked', onSeeked);
                                resolve();
                            };
                            videoEl.addEventListener('seeked', onSeeked, { once: true });
                        });
                    }
                    if (videoEl.requestVideoFrameCallback) {
                        await new Promise(resolve => {
                            videoEl.requestVideoFrameCallback(() => resolve());
                        });
                    } else {
                        await new Promise(r => setTimeout(r, 20));
                    }
                };

                timelineState.tracks.forEach(track => {
                    if (track.type === 'video') {
                        const clip = track.clips.find(c => time >= c.startTime && time < (c.startTime + c.duration));
                        if (clip) {
                            const videoEl = mediaResources.videoElements[clip.id];
                            if (videoEl) {
                                const clipTime = time - clip.startTime;
                                const sourceTime = (clip.startOffset || 0) + clipTime;
                                seekPromises.push(seekVideo(videoEl, sourceTime));
                            }
                        }
                    }
                });

                if (mediaResources.mediaElement) {
                    const mainTrack = timelineState.tracks.find(t => t.id === 'track-main');
                    const mainClip = mainTrack?.clips.find(c => time >= c.startTime && time < (c.startTime + c.duration));
                    if (mainClip) {
                        const clipTime = time - mainClip.startTime;
                        const sourceTime = (mainClip.startOffset || 0) + clipTime;
                        seekPromises.push(seekVideo(mediaResources.mediaElement, sourceTime));
                    }
                }

                if (seekPromises.length > 0) {
                    await Promise.all(seekPromises);
                }

                const frameState = getFrameState(time, timelineState.tracks, mediaResources, {
                    ...timelineState,
                    canvasDimensions: { width, height },
                    effectIntensity: timelineState.effectIntensity,
                    activeEffectId: timelineState.activeEffectId,
                    activeFilterId: timelineState.activeFilterId
                });

                renderFrame(ctx, mediaResources.mediaElement, frameState, {
                    forceHighQuality: true,
                    applyFiltersToContext: true
                });

                const frame = new VideoFrame(exportCanvas, {
                    timestamp: i * (1000000 / fps),
                    duration: 1000000 / fps
                });

                videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
                frame.close();

                if (i % 5 === 0) {
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
    }, [timelineState, mediaResources, isExporting]);

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
