import React, { useRef, useEffect } from 'react';

const AudioVisualizer = ({ analyser, isPlaying }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const tempCanvasRef = useRef(null);

    // Color Map for Spectrogram (Black -> Blue -> Cyan -> Green -> Yellow -> Red -> White)
    const getColor = (value) => {
        const percent = value / 255;
        // Simple Heatmap
        const h = (1 - percent) * 240; // Blue to Red
        return `hsl(${h}, 100%, 50%)`;
    };

    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Create temp canvas for scrolling effect
        if (!tempCanvasRef.current) {
            tempCanvasRef.current = document.createElement('canvas');
        }
        const tempCanvas = tempCanvasRef.current;
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!isPlaying) {
                cancelAnimationFrame(animationRef.current);
                return;
            }

            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            // 1. Draw current state to temp canvas
            tempCtx.drawImage(canvas, 0, 0);

            // 2. Shift everything left by 1 pixel
            ctx.fillStyle = '#0f0f12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw back shifted
            ctx.drawImage(tempCanvas, -2, 0); // Shift speed

            // 3. Draw new column at the right edge
            // We only need to draw a 2px wide strip
            const colWidth = 2;
            const x = canvas.width - colWidth;

            // Draw frequency bins vertically
            // We likely want to log-scale the frequencies or just linear for now
            // Linear is easier: 0 is bottom (low freq), height is top (high freq)
            // But usually 0Hz is bottom.

            // Optimization: Create ImageData for the column instead of many fillRects?
            // fillRect is fine for a single column of ~1024 bins if we batch or just rely on GPU.
            // Actually, iterating 1024 times per frame for fillRect might be heavy.
            // Let's use a gradient or pixel manipulation if possible.
            // For simplicity and "colors", let's iterate but maybe skip steps or use larger pixels.

            const height = canvas.height;
            const binHeight = height / bufferLength;

            // We can't easily do a gradient because each bin has distinct value.
            // Let's try direct pixel manipulation for the column.
            const columnImage = ctx.createImageData(colWidth, height);
            const data = columnImage.data;

            for (let i = 0; i < bufferLength; i++) {
                const value = dataArray[i]; // 0-255
                if (value < 5) continue; // Noise floor

                // Map value to color
                // Let's use a simple RGB mapping for speed instead of HSL string parsing
                // Heatmap: Cold (Blue) -> Hot (Red)
                let r = 0, g = 0, b = 0;

                if (value < 128) {
                    // Blue to Green
                    b = 255 - (value * 2);
                    g = value * 2;
                } else {
                    // Green to Red
                    g = 255 - ((value - 128) * 2);
                    r = (value - 128) * 2;
                }

                // Y position: i=0 is Low Freq (Bottom). Canvas Y=0 is Top.
                // So we want i=0 at y=height-1.
                // Map i to y.
                // Linear mapping:
                const y = Math.floor(height - 1 - (i / bufferLength) * height);

                // Fill the row in the column
                if (y >= 0 && y < height) {
                    for (let w = 0; w < colWidth; w++) {
                        const index = (y * colWidth + w) * 4;
                        data[index] = r;
                        data[index + 1] = g;
                        data[index + 2] = b;
                        data[index + 3] = 255;
                    }
                }
            }

            ctx.putImageData(columnImage, x, 0);
        };

        if (isPlaying) {
            draw();
        } else {
            // Keep existing view or clear?
            // Usually spectrograms stop scrolling.
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
                // Preserve content on resize? Hard. Just reset for now.
                canvasRef.current.width = parent.clientWidth;
                canvasRef.current.height = parent.clientHeight;

                if (tempCanvasRef.current) {
                    tempCanvasRef.current.width = parent.clientWidth;
                    tempCanvasRef.current.height = parent.clientHeight;
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="relative w-full h-full bg-[#0f0f12] rounded-xl overflow-hidden">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
            />
            {/* Frequency Labels Overlay */}
            <div className="absolute top-0 right-0 h-full flex flex-col justify-between text-[10px] text-white/50 p-1 pointer-events-none">
                <span>20kHz</span>
                <span>10kHz</span>
                <span>5kHz</span>
                <span>1kHz</span>
                <span>0Hz</span>
            </div>
        </div>
    );
};

export default AudioVisualizer;
