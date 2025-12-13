import React, { useEffect, useState, useRef } from 'react';

export const VideoThumbnails = ({ source, duration, width, height, visibleWidth, startOffset = 0 }) => {
    const [thumbnails, setThumbnails] = useState([]);
    const generatedRef = useRef(false);

    // Config
    const thumbWidth = 60; // Desired width of each thumbnail
    const thumbCount = Math.ceil(width / thumbWidth);

    useEffect(() => {
        // Debounce or check constraints
        if (!source || !duration || width <= 0) return;

        // Avoid excessive re-generation if width changes slightly, or implement a smarter caching key
        // For MVP, we regenerate if thumbCount changes significantly or source changes

        const generate = async () => {
            setThumbnails([]); // Clear while generating? Or keep old?
            // Actually, best to generate one by one

            const video = document.createElement('video');
            video.src = source;
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.preload = 'auto'; // Load metadata mostly

            // Wait for metadata
            await new Promise((resolve, reject) => {
                video.onloadedmetadata = resolve;
                video.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            // Maintain aspect ratio
            const aspect = video.videoWidth / video.videoHeight;
            const drawHeight = height || 40;
            const drawWidth = drawHeight * aspect;

            canvas.width = drawWidth;
            canvas.height = drawHeight;
            const ctx = canvas.getContext('2d');

            const thumbs = [];

            // Generate frames
            // Calculate time interval
            const timeStep = duration / thumbCount;

            for (let i = 0; i < thumbCount; i++) {
                const time = startOffset + (i * timeStep);

                // Seek
                video.currentTime = time;
                await new Promise(r => {
                    const onSeek = () => {
                        video.removeEventListener('seeked', onSeek);
                        r();
                    };
                    video.addEventListener('seeked', onSeek);
                });

                // Draw
                ctx.drawImage(video, 0, 0, drawWidth, drawHeight);
                thumbs.push(canvas.toDataURL('image/jpeg', 0.5)); // Low quality for perf
            }

            setThumbnails(thumbs);

            // Cleanup? Browser GC should handle video element
            video.src = '';
            video.load();
        };

        generate();

    }, [source, duration, thumbCount]); // Re-run if scale changes drastically (thumbCount)

    return (
        <div className="absolute inset-0 flex overflow-hidden opacity-50 pointer-events-none">
            {thumbnails.map((src, i) => (
                <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-full object-cover shrink-0"
                    style={{ width: `${thumbWidth}px` }}
                    draggable={false}
                />
            ))}
            {thumbnails.length === 0 && (
                <div className="w-full h-full bg-white/5 animate-pulse" />
            )}
        </div>
    );
};
