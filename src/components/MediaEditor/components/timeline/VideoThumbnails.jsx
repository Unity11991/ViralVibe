import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// Global thumbnail cache to prevent regenerating the same thumbnails
const thumbnailCache = new Map();
// Expose cache globally for management
if (typeof window !== 'undefined') {
    window.__thumbnailCache = thumbnailCache;
}
// Global Queue System
const queue = [];
let activeGenerations = 0;
const MAX_CONCURRENT_GENERATIONS = 1; // Strict limit to 1 for HD stability

const processQueue = async () => {
    if (activeGenerations >= MAX_CONCURRENT_GENERATIONS || queue.length === 0) return;

    activeGenerations++;
    const task = queue.shift();

    try {
        await task.run();
    } catch (e) {
        console.warn("Thumbnail task failed:", e);
    } finally {
        activeGenerations--;
        processQueue(); // Process next
    }
};

export const VideoThumbnails = React.memo(({ source, duration, width, height, visibleWidth, startOffset = 0 }) => {
    const [thumbnails, setThumbnails] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const isMounted = useRef(true);
    const containerRef = useRef(null);

    // Config - Optimized values
    const thumbWidth = 60;
    const maxThumbs = 50; // Increased from 8 to cover longer clips
    const thumbCount = Math.min(Math.ceil(width / thumbWidth), maxThumbs);

    // Intersection Observer
    useEffect(() => {
        isMounted.current = true;
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { root: null, rootMargin: '200px', threshold: 0.01 }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => {
            isMounted.current = false;
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!isVisible || !source || !duration || width <= 0) return;

        // Check cache
        const cacheKey = `${source}-${thumbCount}-${startOffset}`;
        if (thumbnailCache.has(cacheKey)) {
            setThumbnails(thumbnailCache.get(cacheKey));
            return;
        }

        // Define Task
        const task = {
            run: async () => {
                if (!isMounted.current) return;
                setIsGenerating(true);
                setThumbnails([]);

                try {
                    const video = document.createElement('video');
                    video.src = source;
                    if (!source.startsWith('blob:')) video.crossOrigin = 'anonymous';
                    video.muted = true;
                    video.preload = 'metadata';

                    // Load Metadata
                    await Promise.race([
                        new Promise((resolve, reject) => {
                            video.onloadedmetadata = resolve;
                            video.onerror = reject;
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                    ]);

                    if (!isMounted.current) {
                        video.remove();
                        return;
                    }

                    // Calculate Dimensions (Max 160px width for HD optimization)
                    const MAX_DIMENSION = 160;
                    const videoAspect = video.videoWidth / video.videoHeight;
                    let drawHeight = Math.min(height || 40, 30);
                    let drawWidth = drawHeight * videoAspect;

                    if (drawWidth > MAX_DIMENSION) {
                        drawWidth = MAX_DIMENSION;
                        drawHeight = drawWidth / videoAspect;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(drawWidth);
                    canvas.height = Math.floor(drawHeight);
                    const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false });

                    const thumbs = [];
                    const timeStep = duration / thumbCount;

                    for (let i = 0; i < thumbCount; i++) {
                        if (!isMounted.current) break;

                        const time = Math.max(0, Math.min(startOffset + (i * timeStep), duration - 0.1));
                        video.currentTime = time;

                        await Promise.race([
                            new Promise(resolve => {
                                const onSeek = () => {
                                    // Wait for frame paint
                                    requestAnimationFrame(() => {
                                        setTimeout(resolve, 50);
                                    });
                                };
                                video.addEventListener('seeked', onSeek, { once: true });
                            }),
                            new Promise(resolve => setTimeout(resolve, 2000)) // Increased timeout
                        ]);

                        if (!isMounted.current) break;

                        try {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            thumbs.push(canvas.toDataURL('image/jpeg', 0.3));
                        } catch (e) {
                            thumbs.push('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>');
                        }

                        if (i % 2 === 0 && isMounted.current) {
                            setThumbnails([...thumbs]);
                        }
                    }

                    if (isMounted.current && thumbs.length > 0) {
                        setThumbnails(thumbs);
                        thumbnailCache.set(cacheKey, thumbs);
                        if (thumbnailCache.size > 50) thumbnailCache.delete(thumbnailCache.keys().next().value);
                    }

                    video.removeAttribute('src');
                    video.load();
                    video.remove();

                } catch (e) {
                    console.warn("Thumbnail generation failed:", e);
                } finally {
                    if (isMounted.current) setIsGenerating(false);
                }
            }
        };

        // Enqueue
        queue.push(task);
        processQueue();

        return () => {
            // Remove from queue if unmounted (optional optimization)
            const idx = queue.indexOf(task);
            if (idx > -1) queue.splice(idx, 1);
        };
    }, [source, duration, thumbCount, startOffset, height, isVisible]);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 flex overflow-hidden opacity-50 pointer-events-none bg-black/20"
        >
            {thumbnails.map((src, i) => (
                <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-full object-cover shrink-0"
                    style={{ width: `${thumbWidth}px` }}
                    draggable={false}
                    loading="lazy"
                />
            ))}
            {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10">
                    <Loader2 className="animate-spin text-white/50" size={12} />
                </div>
            )}
        </div>
    );
});
