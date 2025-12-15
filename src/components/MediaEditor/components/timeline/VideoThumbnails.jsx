import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// Global thumbnail cache to prevent regenerating the same thumbnails
const thumbnailCache = new Map();
// Expose cache globally for management
if (typeof window !== 'undefined') {
    window.__thumbnailCache = thumbnailCache;
}
// Limit concurrent thumbnail generation
let activeGenerations = 0;
const MAX_CONCURRENT_GENERATIONS = 2;

export const VideoThumbnails = React.memo(({ source, duration, width, height, visibleWidth, startOffset = 0 }) => {
    const [thumbnails, setThumbnails] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const isMounted = useRef(true);
    const containerRef = useRef(null);

    // Config - Optimized values
    const thumbWidth = 60;
    const maxThumbs = 8; // Limit max thumbnails per clip
    const thumbCount = Math.min(Math.ceil(width / thumbWidth), maxThumbs);

    // Intersection Observer for lazy loading
    useEffect(() => {
        isMounted.current = true;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            {
                root: null,
                rootMargin: '200px', // Start loading 200px before visible
                threshold: 0.01
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            isMounted.current = false;
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        let isActive = true;

        // Only generate if visible, has source, and within constraints
        if (!isVisible || !source || !duration || width <= 0) {
            return;
        }

        // Check cache first
        const cacheKey = `${source}-${thumbCount}-${startOffset}`;
        if (thumbnailCache.has(cacheKey)) {
            setThumbnails(thumbnailCache.get(cacheKey));
            return;
        }

        const generate = async () => {
            // Wait if too many concurrent generations
            while (activeGenerations >= MAX_CONCURRENT_GENERATIONS) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (!isActive) return;
            }

            activeGenerations++;

            if (!isActive) {
                activeGenerations--;
                return;
            }

            setIsGenerating(true);
            setThumbnails([]);

            try {
                const video = document.createElement('video');
                video.src = source;
                // Only set crossOrigin for external URLs
                if (!source.startsWith('blob:')) {
                    video.crossOrigin = 'anonymous';
                }
                video.muted = true;
                video.preload = 'metadata'; // Only load metadata, not entire video

                // Wait for metadata with timeout
                await Promise.race([
                    new Promise((resolve, reject) => {
                        video.onloadedmetadata = resolve;
                        video.onerror = reject;
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 5000)
                    )
                ]);

                if (!isActive) {
                    video.remove();
                    activeGenerations--;
                    return;
                }

                const canvas = document.createElement('canvas');
                // Smaller canvas for better performance
                const aspect = video.videoWidth / video.videoHeight;
                const drawHeight = Math.min(height || 40, 30); // Max 30px height
                const drawWidth = drawHeight * aspect;

                canvas.width = drawWidth;
                canvas.height = drawHeight;
                const ctx = canvas.getContext('2d', {
                    willReadFrequently: false,
                    alpha: false
                });

                const thumbs = [];
                const timeStep = duration / thumbCount;

                // Generate thumbnails using requestIdleCallback for non-blocking
                for (let i = 0; i < thumbCount; i++) {
                    if (!isActive) break;

                    const time = Math.max(0, Math.min(startOffset + (i * timeStep), duration - 0.1));

                    // Seek with timeout
                    video.currentTime = time;
                    await Promise.race([
                        new Promise(resolve => {
                            const onSeek = () => {
                                video.removeEventListener('seeked', onSeek);
                                resolve();
                            };
                            video.addEventListener('seeked', onSeek);
                        }),
                        new Promise(resolve => setTimeout(resolve, 500))
                    ]);

                    if (!isActive) break;

                    // Draw with error handling
                    try {
                        ctx.drawImage(video, 0, 0, drawWidth, drawHeight);
                        // Lower quality JPEG for smaller file size
                        thumbs.push(canvas.toDataURL('image/jpeg', 0.3));
                    } catch (e) {
                        console.warn("Canvas error, skipping thumbnail", e);
                        // Use placeholder for failed thumbnails
                        thumbs.push('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>');
                    }

                    // Progressive update less frequently
                    if (i % 3 === 0 && isActive) {
                        setThumbnails([...thumbs]);
                    }

                    // Yield to browser between frames
                    await new Promise(resolve => {
                        if (typeof requestIdleCallback !== 'undefined') {
                            requestIdleCallback(resolve, { timeout: 100 });
                        } else {
                            setTimeout(resolve, 0);
                        }
                    });
                }

                if (isActive && thumbs.length > 0) {
                    setThumbnails(thumbs);
                    // Cache the result
                    thumbnailCache.set(cacheKey, thumbs);
                    // Limit cache size
                    if (thumbnailCache.size > 50) {
                        const firstKey = thumbnailCache.keys().next().value;
                        thumbnailCache.delete(firstKey);
                    }
                }

                // Cleanup
                video.removeAttribute('src');
                video.load();
                video.remove();

            } catch (e) {
                console.warn("Thumbnail generation failed:", e);
            } finally {
                if (isActive) {
                    setIsGenerating(false);
                }
                activeGenerations--;
            }
        };

        // Debounce generation slightly
        const timeoutId = setTimeout(generate, 50);

        return () => {
            isActive = false;
            clearTimeout(timeoutId);
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
