import React, { useEffect, useRef, useMemo, useState } from 'react';
import { detectClipping, detectSilence, detectBeats } from './audioAnalysis';
import { renderSpectrogram } from './utils/SpectrogramRenderer';

const WaveformClip = ({
    buffer,
    width,
    height,
    color = '#60a5fa',
    isSelected,
    onMouseDown,
    volumeFn,
    onVolumeChange,
    fadeSeconds = { in: 0, out: 0 },
    onFadeChange,
    showAnalysis = true,
    // New Editing Props
    startTime,
    duration,
    offset,
    speed = 1.0,
    onUpdateClip,
    clipId,
    trackId,

    showSpectrogram = false
}) => {
    const canvasRef = useRef(null);
    const [hoverTime, setHoverTime] = useState(null);
    const [spectrogramImg, setSpectrogramImg] = useState(null);
    const [draggingFeature, setDraggingFeature] = useState(null); // 'fade-in', 'fade-out', 'volume-point', 'resize-start', 'resize-end'
    const dragStartRef = useRef({ x: 0, initialStartTime: 0, initialDuration: 0, initialOffset: 0 });

    // Generate Spectrogram if needed
    useEffect(() => {
        if (showSpectrogram && buffer) {
            // Check if we need to regenerate
            // Simple cache: If img width matches, don't regen? 
            // Or just allow regen on resize for quality.
            let active = true;
            renderSpectrogram(buffer, width, height).then(url => {
                if (!active) return;
                const img = new Image();
                img.onload = () => {
                    if (active) setSpectrogramImg(img);
                };
                img.src = url;
            });
            return () => { active = false; };
        }
    }, [buffer, width, height, showSpectrogram]);

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
    const propsRef = useRef({ buffer, fadeSeconds, onFadeChange, width, startTime, duration, offset, onUpdateClip, trackId, clipId, speed });
    useEffect(() => {
        propsRef.current = { buffer, fadeSeconds, onFadeChange, width, startTime, duration, offset, onUpdateClip, trackId, clipId, speed };
    }, [buffer, fadeSeconds, onFadeChange, width, startTime, duration, offset, onUpdateClip, trackId, clipId, speed]);

    // Handle Interaction (Fades & Volume)
    const handleMouseDown = (e) => {
        if (!isSelected) {
            onMouseDown && onMouseDown(e);
            return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Get latest props from ref to ensure no stale closures (though handleMouseDown is recreated, this is safe practice)
        const { buffer, fadeSeconds, width } = propsRef.current;

        // Check Resize Handles (Left/Right Edges) - Priority over drag
        const handleWidth = 10;
        if (x < handleWidth) {
            setDraggingFeature('resize-start');
            dragStartRef.current = { x: e.clientX, initialStartTime: startTime, initialDuration: duration, initialOffset: offset || 0 };
            e.stopPropagation();
            return;
        }
        if (x > width - handleWidth) {
            setDraggingFeature('resize-end');
            dragStartRef.current = { x: e.clientX, initialStartTime: startTime, initialDuration: duration, initialOffset: offset || 0 };
            e.stopPropagation();
            return;
        }

        // Check Fade Handles
        // Check Fade Handles
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
            // Resize Logic
            else if (draggingFeature === 'resize-start') {
                const deltaPixels = e.clientX - dragStartRef.current.x;
                const PIXELS_PER_SECOND = width / duration; // Approximate scale derived from current view? No, unreliable.
                // We should rely on props or fixed scale. AudioTimeline uses 40px/s. 
                // However, we don't have access to PPS here easily without coupling. 
                // Strategy: Use duration/width ratio. 
                // seconds_per_pixel = duration / width.
                // deltaSeconds = deltaPixels * (duration / width) -> this is circular if duration changes.
                // Standard approach: The 'width' prop passed in is (duration * PPS). 
                // So PPS = width / duration.
                const pps = width / duration;
                const deltaSeconds = deltaPixels / pps;

                // New Start = Old Start + Delta
                // New Duration = Old Duration - Delta
                // New Offset = Old Offset + (Delta * Speed)

                const { initialStartTime, initialDuration, initialOffset } = dragStartRef.current;

                let newStartTime = initialStartTime + deltaSeconds;
                let newDuration = initialDuration - deltaSeconds;
                let newOffset = initialOffset + (deltaSeconds * speed);

                // Constraints: 
                // 1. Duration > 0.1s
                // 2. Offset >= 0
                // 3. Offset + (Duration*Speed) <= BufferDuration

                if (newDuration < 0.1) {
                    newDuration = 0.1;
                    newStartTime = initialStartTime + (initialDuration - 0.1);
                    newOffset = initialOffset + ((initialDuration - 0.1) * speed);
                }
                if (newOffset < 0) {
                    newOffset = 0;
                    // Recalculate start/duration based on hitting 0 offset
                    const correctedDelta = -initialOffset / speed; // Time to reach 0 offset
                    newStartTime = initialStartTime + correctedDelta;
                    newDuration = initialDuration - correctedDelta;
                }
                // Check buffer end constraint ?? (buffer.duration)

                onUpdateClip && onUpdateClip(trackId, clipId, { startTime: newStartTime, duration: newDuration, offset: newOffset });

            } else if (draggingFeature === 'resize-end') {
                const deltaPixels = e.clientX - dragStartRef.current.x;
                const pps = width / duration;
                const deltaSeconds = deltaPixels / pps;

                const { initialDuration, initialOffset } = dragStartRef.current;
                let newDuration = initialDuration + deltaSeconds;

                // Constraints
                if (newDuration < 0.1) newDuration = 0.1;
                // Buffer limit: Offset + (Duration * Speed) <= BufferDuration
                const endBufferPos = initialOffset + (newDuration * speed);
                if (endBufferPos > buffer.duration) {
                    newDuration = (buffer.duration - initialOffset) / speed;
                }

                onUpdateClip && onUpdateClip(trackId, clipId, { duration: newDuration });
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



        if (showSpectrogram && spectrogramImg) {
            ctx.drawImage(spectrogramImg, 0, 0, width, height);
            if (isSelected) {
                ctx.fillStyle = 'rgba(96, 165, 250, 0.2)';
                ctx.fillRect(0, 0, width, height);
            }
        } else {
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

                ctx.strokeStyle = '#ef4444'; // Red

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

            // Resize Handles
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(0, 0, 4, height); // Left Handle
            ctx.fillRect(width - 4, 0, 4, height); // Right Handle

            // Cursor hint
            if (draggingFeature === 'resize-start' || draggingFeature === 'resize-end') {
                canvas.style.cursor = 'col-resize';
            } else if (draggingFeature && draggingFeature.startsWith('fade')) {
                canvas.style.cursor = 'ew-resize';
            } else {
                canvas.style.cursor = 'move';
            }
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

