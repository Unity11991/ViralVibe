import { useState, useCallback, useRef } from 'react';
import { renderFrame } from '../utils/canvasUtils';
import {
    canvasToBlob,
    downloadBlob,
    setupMediaRecorder,
    generateExportFilename,
    calculateProgress
} from '../utils/exportUtils';

/**
 * Custom hook for exporting media
 */
export const useExport = (mediaElementRef, mediaType) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportSettings, setExportSettings] = useState({
        resolution: 'HD',
        fps: 30,
        format: 'image/png'
    });

    const mediaRecorderRef = useRef(null);
    const isExportingRef = useRef(false);

    /**
     * Export image
     */
    const exportImage = useCallback(async (canvasRef, state) => {
        try {
            setIsExporting(true);
            setExportProgress(10);

            // Create temporary canvas for export
            const exportCanvas = document.createElement('canvas');
            const ctx = exportCanvas.getContext('2d');

            // Set export dimensions (high quality)
            // Set export dimensions based on crop
            const media = mediaElementRef.current;
            const originalWidth = media.width || media.videoWidth;
            const originalHeight = media.height || media.videoHeight;

            let exportWidth = originalWidth;
            let exportHeight = originalHeight;

            if (state.transform?.crop) {
                const { width, height } = state.transform.crop;
                exportWidth = (width / 100) * originalWidth;
                exportHeight = (height / 100) * originalHeight;
            }

            exportCanvas.width = exportWidth;
            exportCanvas.height = exportHeight;

            setExportProgress(30);

            // Render final frame
            renderFrame(ctx, media, state);

            setExportProgress(70);

            // Convert to blob
            const blob = await canvasToBlob(exportCanvas, exportSettings.format, 0.95);

            setExportProgress(90);

            // Download
            const filename = generateExportFilename('image', exportSettings.format.split('/')[1]);
            downloadBlob(blob, filename);

            setExportProgress(100);
            setIsExporting(false);
            setShowExportModal(false);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
            setIsExporting(false);
        }
    }, [mediaElementRef, exportSettings]);

    /**
     * Export video
     */
    const exportVideo = useCallback(async (canvasRef, state, trimRange) => {
        try {
            setIsExporting(true);
            isExportingRef.current = true;
            setExportProgress(0);

            // Create export canvas
            const exportCanvas = document.createElement('canvas');
            const ctx = exportCanvas.getContext('2d');
            const video = mediaElementRef.current;

            // Set dimensions
            // Calculate dimensions based on crop and resolution
            const originalWidth = video.videoWidth;
            const originalHeight = video.videoHeight;

            let cropWidth = originalWidth;
            let cropHeight = originalHeight;

            if (state.transform?.crop) {
                const { width, height } = state.transform.crop;
                cropWidth = (width / 100) * originalWidth;
                cropHeight = (height / 100) * originalHeight;
            }

            const aspectRatio = cropWidth / cropHeight;

            // Determine base size based on resolution setting
            let baseSize = 1080; // HD
            if (exportSettings.resolution === '2K') baseSize = 1440;
            if (exportSettings.resolution === '4K') baseSize = 2160;

            let exportWidth, exportHeight;

            if (aspectRatio >= 1) {
                // Landscape or Square
                exportHeight = baseSize;
                exportWidth = baseSize * aspectRatio;
            } else {
                // Portrait
                exportWidth = baseSize;
                exportHeight = baseSize / aspectRatio;
            }

            exportCanvas.width = Math.round(exportWidth);
            exportCanvas.height = Math.round(exportHeight);

            // Setup MediaRecorder
            const mediaRecorder = setupMediaRecorder(
                exportCanvas,
                exportSettings.fps,
                exportSettings.resolution
            );
            mediaRecorderRef.current = mediaRecorder;

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (!isExportingRef.current) return;

                const blob = new Blob(chunks, { type: 'video/webm' });
                const filename = generateExportFilename('video');
                downloadBlob(blob, filename);

                setIsExporting(false);
                isExportingRef.current = false;
                setShowExportModal(false);
            };

            mediaRecorder.start();

            // Playback and record
            video.currentTime = trimRange.start;
            video.play();

            const processFrame = () => {
                if (video.currentTime >= trimRange.end || video.paused || !isExportingRef.current) {
                    mediaRecorder.stop();
                    video.pause();
                    return;
                }

                // Render frame
                renderFrame(ctx, video, state);

                // Update progress
                const progress = calculateProgress(
                    video.currentTime - trimRange.start,
                    trimRange.end - trimRange.start
                );
                setExportProgress(Math.min(95, progress));

                requestAnimationFrame(processFrame);
            };

            processFrame();

        } catch (error) {
            console.error('Video export failed:', error);
            alert('Video export failed. Please try again.');
            setIsExporting(false);
            isExportingRef.current = false;
        }
    }, [mediaElementRef, exportSettings]);

    /**
     * Cancel export
     */
    const cancelExport = useCallback(() => {
        isExportingRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (mediaElementRef.current && mediaElementRef.current.pause) {
            mediaElementRef.current.pause();
        }
        setIsExporting(false);
        setExportProgress(0);
    }, [mediaElementRef]);

    /**
     * Main export handler
     */
    const handleExport = useCallback(async (canvasRef, state, trimRange = null) => {
        if (mediaType === 'image') {
            await exportImage(canvasRef, state);
        } else {
            await exportVideo(canvasRef, state, trimRange || { start: 0, end: mediaElementRef.current.duration });
        }
    }, [mediaType, exportImage, exportVideo, mediaElementRef]);

    return {
        // State
        isExporting,
        exportProgress,
        showExportModal,
        exportSettings,

        // Actions
        setShowExportModal,
        setExportSettings,
        handleExport,
        cancelExport
    };
};
