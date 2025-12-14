import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export const VideoThumbnails = React.memo(({ source, duration, width, height, visibleWidth, startOffset = 0 }) => {
    const [thumbnails, setThumbnails] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const isMounted = useRef(true);

    // Config
    const thumbWidth = 60; // Desired width of each thumbnail
    const thumbCount = Math.ceil(width / thumbWidth);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        let isActive = true;

        // Debounce or check constraints
        if (!source || !duration || width <= 0) return;

        const generate = async () => {
            if (!isActive) return;
            setIsGenerating(true);
            setThumbnails([]);

            const video = document.createElement('video');
            video.src = source;
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.preload = 'auto'; // Load metadata mostly

            // Wait for metadata
            try {
                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = resolve;
                    video.onerror = reject;
                });
            } catch (e) {
                console.warn("Thumbnail generation failed", e);
                if (isActive) setIsGenerating(false);
                return;
            }

            if (!isActive) return;

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
                if (!isActive) break;

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

                if (!isActive) break;

                // Draw
                ctx.drawImage(video, 0, 0, drawWidth, drawHeight);
                try {
                    thumbs.push(canvas.toDataURL('image/jpeg', 0.5)); // Low quality for perf
                } catch (e) {
                    console.warn("Canvas tainted, cannot generate thumb", e);
                    break; // Stop generating if tainted
                }

                // Progressive update every 5 frames
                if (i % 5 === 0 && isActive) {
                    setThumbnails([...thumbs]);
                }
            }

            if (isActive) {
                setThumbnails(thumbs);
                setIsGenerating(false);
            }

            // Cleanup
            video.removeAttribute('src');
            video.load();
        };

        generate();

        return () => {
            isActive = false;
        };
    }, [source, duration, thumbCount, startOffset, height]); // Re-run if scale changes drastically (thumbCount)

    return (
        <div className="absolute inset-0 flex overflow-hidden opacity-50 pointer-events-none bg-black/20">
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
            {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10">
                    <Loader2 className="animate-spin text-white/50" size={16} />
                </div>
            )}
        </div>
    );
});
