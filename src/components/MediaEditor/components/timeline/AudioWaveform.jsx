import React, { useEffect, useRef, useState } from 'react';
import { generateWaveform } from '../../utils/waveformUtils';

export const AudioWaveform = ({
    source,
    width,
    height = 40,
    startOffset = 0,
    duration,
    sourceDuration, // Total duration of the audio source
    color = '#4fd1c5'
}) => {
    const canvasRef = useRef(null);
    const [peaks, setPeaks] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const loadWaveform = async () => {
            if (!source) return;
            // Fetch high-res peaks for the whole file
            const totalSamples = 2000;
            const data = await generateWaveform(source, totalSamples);
            if (isMounted) setPeaks(data);
        };
        loadWaveform();
        return () => { isMounted = false; };
    }, [source]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !peaks) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = color;

        // Draw Logic
        const totalDuration = sourceDuration || (startOffset + duration); // Fallback
        const totalSamples = peaks.length;

        // Calculate sample range for the current visible clip
        const startRatio = startOffset / totalDuration;
        const visibleRatio = duration / totalDuration;

        const startIndex = Math.floor(startRatio * totalSamples);
        const count = Math.floor(visibleRatio * totalSamples);

        // Safety clamps
        const safeStartIndex = Math.max(0, Math.min(startIndex, totalSamples - 1));
        const safeEndIndex = Math.min(safeStartIndex + count, totalSamples);

        // If we don't have enough samples effectively (very short zoom), we default to linear interp or simple blocks
        const visiblePeaks = peaks.slice(safeStartIndex, safeEndIndex);

        if (visiblePeaks.length === 0) return;

        // Render Bars
        const barWidth = 2;
        const gap = 1;
        const pixelPerBar = barWidth + gap;
        const totalBars = Math.floor(width / pixelPerBar);

        for (let i = 0; i < totalBars; i++) {
            // Map bar index to peak index in the VISIBLE slice
            const peakIndex = Math.floor((i / totalBars) * visiblePeaks.length);
            const peak = visiblePeaks[peakIndex] || 0;

            // Draw dual-sided balanced waveform or bottom-aligned? 
            // Reference image shows bottom/center aligned looking curves.
            // Let's do center-ish or bottom up. 
            // Standard is centered.

            const barHeight = Math.max(2, peak * height); // Scale peak to height

            // Center alignment
            const y = (height - barHeight) / 2;

            // Or Bottom alignment (like volume meter) - Screenshot looks messy/organic.
            // Let's do standard symmetric waveform.

            ctx.fillRect(i * pixelPerBar, y, barWidth, barHeight);

            // Rounded caps?
            // ctx.beginPath();
            // ctx.roundRect(i * pixelPerBar, y, barWidth, barHeight, 2);
            // ctx.fill();
        }

    }, [peaks, width, height, startOffset, duration, sourceDuration, color]);

    return <canvas ref={canvasRef} style={{ width, height }} />;
};
