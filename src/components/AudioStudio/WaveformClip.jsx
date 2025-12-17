import React, { useEffect, useRef, useMemo, useState } from 'react';
import { detectClipping, detectSilence, detectBeats } from './audioAnalysis';

const WaveformClip = ({
    buffer,
    width,
    height,
    color = '#60a5fa',
    isSelected,
    onMouseDown,
    volumeFn, // Function(time) -> volume (0-1)
    onVolumeChange, // Function(time, volume)
    fadeSeconds = { in: 0, out: 0 },
    onFadeChange, // Function({in, out}) 
    showAnalysis = true
}) => {
    const canvasRef = useRef(null);
    const [hoverTime, setHoverTime] = useState(null);
    const [draggingFeature, setDraggingFeature] = useState(null); // 'fade-in', 'fade-out', 'volume-point'

    // Memoize waveform analysis
    const { waveformData, clippingRegions, silenceRegions, beats } = useMemo(() => {
        if (!buffer) return { waveformData: [], clippingRegions: [], silenceRegions: [], beats: [] };

        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const result = [];

        // Downsample for rendering
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            const startIdx = i * step;
            const endIdx = Math.min((i + 1) * step, data.length);

            for (let j = startIdx; j < endIdx; j++) {
                const datum = data[j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            // If flat line (silence/end of file), default to 0
            if (min > max) { min = 0; max = 0; }
            result.push({ min, max });
        }

        // Run Analysis specific helpers
        const clips = detectClipping(buffer);
        const silence = detectSilence(buffer);
        const beatPoints = detectBeats(buffer);

        return { waveformData: result, clippingRegions: clips, silenceRegions: silence, beats: beatPoints };
    }, [buffer, width]);

    // Refs for latest props to avoid stale closures in event listeners
    const propsRef = useRef({ buffer, fadeSeconds, onFadeChange, width });
    useEffect(() => {
        propsRef.current = { buffer, fadeSeconds, onFadeChange, width };
    }, [buffer, fadeSeconds, onFadeChange, width]);

    // Handle Interaction (Fades & Volume)
    const handleMouseDown = (e) => {
        if (!isSelected) {
            onMouseDown && onMouseDown(e);
            return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check Fade Handles
        const { buffer, fadeSeconds, width } = propsRef.current;
        const fadeInX = (fadeSeconds.in / buffer.duration) * width;
        const fadeOutX = width - ((fadeSeconds.out / buffer.duration) * width);
        const handleHitRadius = 10; // Increased from 6 for better usability

        if (Math.abs(x - fadeInX) < handleHitRadius && y < 20) {
            setDraggingFeature('fade-in');
            e.stopPropagation();
            return;
        }
        if (Math.abs(x - fadeOutX) < handleHitRadius && y < 20) {
            setDraggingFeature('fade-out');
            e.stopPropagation();
            return;
        }

        // Pass through if not interacting with features
        onMouseDown && onMouseDown(e);
    };

    // Global Mouse Move Listener (managed via ref to be stable)
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!draggingFeature) return;

            const { buffer, fadeSeconds, onFadeChange, width } = propsRef.current;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = Math.max(0, Math.min((x / width) * buffer.duration, buffer.duration));

            // Update local hover time for visual feedback
            setHoverTime(time);

            if (draggingFeature === 'fade-in') {
                // Constrain: cannot cross fade-out
                const newFadeIn = Math.max(0, Math.min(time, buffer.duration - fadeSeconds.out));
                onFadeChange && onFadeChange({ ...fadeSeconds, in: newFadeIn });
            } else if (draggingFeature === 'fade-out') {
                // Constrain: cannot cross fade-in
                const newFadeOut = Math.max(0, Math.min(buffer.duration - time, buffer.duration - fadeSeconds.in));
                onFadeChange && onFadeChange({ ...fadeSeconds, out: newFadeOut });
            }
        };

        const handleMouseUp = () => {
            setDraggingFeature(null);
        };

        if (draggingFeature) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingFeature]); // Only re-bind when dragging starts/stops


    // Drawing Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // -- 1. Background (Rounded) --
        const radius = 6;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, radius);
        ctx.save();
        ctx.clip(); // Clip everything to rounded rect

        // Base Gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        if (isSelected) {
            bgGradient.addColorStop(0, 'rgba(96, 165, 250, 0.25)');
            bgGradient.addColorStop(1, 'rgba(96, 165, 250, 0.1)');
        } else {
            bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
            bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
        }
        ctx.fillStyle = bgGradient;
        ctx.fill();

        // -- 2. Analysis Visualization (Underlay) --
        if (showAnalysis) {
            // Silence (Darker Background)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            silenceRegions.forEach(region => {
                const startX = (region.start / buffer.duration) * width;
                const endX = (region.end / buffer.duration) * width;
                ctx.fillRect(startX, 0, endX - startX, height);
            });

            // Beats (Vertical Markers)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            beats.forEach(time => {
                const x = (time / buffer.duration) * width;
                ctx.fillRect(x, 0, 2, height); // Thin beat marker
            });
        }

        // -- 3. Waveform --
        ctx.lineWidth = 1;
        const amp = height / 2;

        // Prepare Path
        ctx.beginPath();
        for (let i = 0; i < width; i++) {
            const { min, max } = waveformData[i] || { min: 0, max: 0 };

            // Apply Fade Visual to Waveform Height
            let fadeGain = 1;
            const time = (i / width) * buffer.duration;
            if (time < fadeSeconds.in) {
                fadeGain = time / fadeSeconds.in; // Linear fade in 0 to 1
            } else if (time > (buffer.duration - fadeSeconds.out)) {
                fadeGain = (buffer.duration - time) / fadeSeconds.out; // Linear fade out 1 to 0
            }

            // Scale by Fade Gain
            const y1 = amp + (min * 0.8 * amp * fadeGain);
            const y2 = amp + (max * 0.8 * amp * fadeGain);

            ctx.moveTo(i, y1);
            ctx.lineTo(i, y2);
        }
        ctx.strokeStyle = isSelected ? '#93c5fd' : 'rgba(255, 255, 255, 0.6)';
        ctx.stroke();

        // -- 4. Clipping (Overlay on Waveform) --
        if (showAnalysis && clippingRegions.length > 0) {
            ctx.beginPath();
            const clippingPath = new Path2D();

            // Check sampled data again or use regions to highlight
            // Simpler approach: Draw Red overlay on clipping regions
            // More precise: redraw the "clipped" parts of waveform in red
            ctx.strokeStyle = '#ef4444'; // Red

            // Re-iterate strictly for clipping segments
            // This is computationally expensive, so let's simplify:
            // Just highlight the regions at the top/bottom caps
            clippingRegions.forEach(region => {
                const startX = (region.start / buffer.duration) * width;
                const endX = (region.end / buffer.duration) * width;
                // Draw indicators at top/bottom
                ctx.moveTo(startX, 0); ctx.lineTo(endX, 0);
                ctx.moveTo(startX, height); ctx.lineTo(endX, height);
            });
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // -- 5. Fade Handles (Interactive UI) --
        if (isSelected) {
            const fadeInX = (fadeSeconds.in / buffer.duration) * width;
            const fadeOutX = width - ((fadeSeconds.out / buffer.duration) * width);
            const handleY = 6; // slightly down from top

            // Fade In Handle
            ctx.beginPath();
            ctx.arc(fadeInX, handleY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Fade Out Handle
            ctx.beginPath();
            ctx.arc(fadeOutX, handleY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            // Draw Fade Lines
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.setLineDash([2, 2]);
            ctx.moveTo(0, 0);
            ctx.lineTo(fadeInX, handleY); // Visual cue
            ctx.moveTo(width, 0);
            ctx.lineTo(fadeOutX, handleY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // -- 6. Selection Border --
        if (isSelected) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#60a5fa'; // Blue-400
            ctx.strokeRect(0, 0, width, height); // Simple rect border for now to avoid clip issues
        }

        ctx.restore(); // Restore clip
    }, [waveformData, clippingRegions, silenceRegions, beats, width, height, color, isSelected, fadeSeconds, showAnalysis]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            className={`cursor-move ${isSelected ? 'z-10' : ''}`}
            title="Drag top corners to fade"
        />
    );
};

export default WaveformClip;

