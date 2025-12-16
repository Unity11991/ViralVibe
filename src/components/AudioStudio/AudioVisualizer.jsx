import React, { useRef, useEffect } from 'react';

const AudioVisualizer = ({ analyser, isPlaying }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = '#0f0f12'; // Maintain background
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];

                // Create gradient
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, '#3b82f6'); // Blue
                gradient.addColorStop(1, '#8b5cf6'); // Purple

                ctx.fillStyle = gradient;

                // Scale height to fit canvas better
                const scaledHeight = (barHeight / 255) * canvas.height;

                ctx.fillRect(x, canvas.height - scaledHeight, barWidth, scaledHeight);

                x += barWidth + 1;
            }
        };

        if (isPlaying) {
            draw();
        } else {
            // Clear canvas or draw idle state
            ctx.fillStyle = '#0f0f12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw a flat line
            ctx.strokeStyle = '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
            cancelAnimationFrame(animationRef.current);
        }

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isPlaying]);

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement;
                canvasRef.current.width = parent.clientWidth;
                canvasRef.current.height = parent.clientHeight;
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full rounded-xl bg-[#0f0f12]"
        />
    );
};

export default AudioVisualizer;
