import React, { useEffect, useRef } from 'react';

const LoudnessMeter = ({ analyser }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            analyser.getByteTimeDomainData(dataArray);

            // Calculate RMS (Root Mean Square) for loudness approximation
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const x = (dataArray[i] - 128) / 128;
                sum += x * x;
            }
            const rms = Math.sqrt(sum / bufferLength);

            // Convert to dB-ish scale (0 to 1) for visualization
            // RMS is typically 0 to 1.
            // Let's boost it a bit for visual clarity
            const level = Math.min(1, rms * 4);

            // Draw Meter
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Background
            ctx.fillStyle = '#18181b';
            ctx.fillRect(0, 0, width, height);

            // Gradient Bars (Green -> Yellow -> Red)
            const gradient = ctx.createLinearGradient(0, height, 0, 0);
            gradient.addColorStop(0, '#22c55e'); // Green
            gradient.addColorStop(0.6, '#eab308'); // Yellow
            gradient.addColorStop(0.9, '#ef4444'); // Red

            // Draw Left/Right (Simulated mono for now as analyser is usually post-mix)
            // If we wanted true stereo, we'd need a SplitterNode and two Analysers.
            // For MVP, we show the same level for L/R or just one bar.
            // Let's show two bars for "Stereo" look.

            const barWidth = (width - 4) / 2;
            const barHeight = level * height;

            ctx.fillStyle = gradient;

            // Left
            ctx.fillRect(1, height - barHeight, barWidth, barHeight);

            // Right (slightly different jitter for realism?)
            ctx.fillRect(2 + barWidth, height - barHeight, barWidth, barHeight);

            // Grid lines
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            for (let i = 0; i < 10; i++) {
                ctx.fillRect(0, i * (height / 10), width, 1);
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [analyser]);

    return (
        <div className="flex flex-col items-center gap-1">
            <canvas
                ref={canvasRef}
                width={20}
                height={100}
                className="rounded bg-black border border-white/10"
            />
            <span className="text-[9px] text-white/50 font-mono">L R</span>
        </div>
    );
};

export default LoudnessMeter;
