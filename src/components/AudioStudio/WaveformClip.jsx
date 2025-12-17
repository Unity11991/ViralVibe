import React, { useEffect, useRef, useMemo } from 'react';

const WaveformClip = ({ buffer, width, height, color = '#60a5fa', isSelected, onMouseDown }) => {
    const canvasRef = useRef(null);

    // Memoize waveform data
    const waveformData = useMemo(() => {
        if (!buffer) return [];

        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const result = [];

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            result.push({ min, max });
        }
        return result;
    }, [buffer, width]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // Draw rounded background with gradient
        const radius = 6;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(width - radius, 0);
        ctx.quadraticCurveTo(width, 0, width, radius);
        ctx.lineTo(width, height - radius);
        ctx.quadraticCurveTo(width, height, width - radius, height);
        ctx.lineTo(radius, height);
        ctx.quadraticCurveTo(0, height, 0, height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();

        // Clip for background
        ctx.save();
        ctx.clip();

        // Gradient Background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        if (isSelected) {
            bgGradient.addColorStop(0, 'rgba(96, 165, 250, 0.3)');
            bgGradient.addColorStop(1, 'rgba(96, 165, 250, 0.1)');
        } else {
            bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        }
        ctx.fillStyle = bgGradient;
        ctx.fill();

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = isSelected ? '#93c5fd' : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;

        const amp = height / 2;

        for (let i = 0; i < width; i++) {
            const { min, max } = waveformData[i] || { min: 0, max: 0 };
            // Scale amplitude slightly down to fit nicely
            const y1 = (1 + min * 0.8) * amp;
            const y2 = (1 + max * 0.8) * amp;

            ctx.moveTo(i, y1);
            ctx.lineTo(i, y2);
        }

        ctx.stroke();
        ctx.restore();

        // Draw border if selected
        if (isSelected) {
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(width - radius, 0);
            ctx.quadraticCurveTo(width, 0, width, radius);
            ctx.lineTo(width, height - radius);
            ctx.quadraticCurveTo(width, height, width - radius, height);
            ctx.lineTo(radius, height);
            ctx.quadraticCurveTo(0, height, 0, height - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();

            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

    }, [waveformData, width, height, color, isSelected]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={onMouseDown}
            className="cursor-move"
        />
    );
};

export default WaveformClip;
