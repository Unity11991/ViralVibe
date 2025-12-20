

import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { thumbnailGenerator } from '../../utils/ThumbnailGenerator';

export const VideoThumbnails = React.memo(({ source, duration, width, height, visibleWidth, startOffset = 0 }) => {
    const [thumbnails, setThumbnails] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const isMounted = useRef(true);
    const containerRef = useRef(null);

    // 1. Calculate Grid Parameters
    // We want thumbnails to be roughly 60px wide
    const targetThumbWidth = 60;
    const scale = width / duration; // pixels per second

    // Determine optimal time step (interval between thumbnails)
    // We want timeStep * scale ≈ targetThumbWidth
    // So timeStep ≈ targetThumbWidth / scale
    let rawTimeStep = targetThumbWidth / scale;

    // Snap to nice intervals: 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60
    const intervals = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
    const timeStep = intervals.reduce((prev, curr) =>
        Math.abs(curr - rawTimeStep) < Math.abs(prev - rawTimeStep) ? curr : prev
    );

    // Calculate Grid Alignment
    const gridStartTime = Math.floor(startOffset / timeStep) * timeStep;
    const gridEndTime = startOffset + duration;

    // Generate list of required timestamps
    const requiredTimestamps = [];
    for (let t = gridStartTime; t < gridEndTime; t += timeStep) {
        requiredTimestamps.push(parseFloat(t.toFixed(2))); // Avoid float precision issues
    }

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

        const loadThumbnails = async () => {
            setIsGenerating(true);

            // Initial load from cache if available (optimistic update)
            const initialThumbs = await Promise.all(requiredTimestamps.map(async (t) => {
                // We can check cache synchronously if we exposed it, but requestThumbnail handles it
                // For now, let's just fire requests.
                // To avoid flickering, we can wait for all? Or stream them?
                // Streaming is better for perceived performance.
                return { time: t, src: null };
            }));

            if (isMounted.current) {
                setThumbnails(initialThumbs);
            }

            // Fetch one by one
            for (const time of requiredTimestamps) {
                if (!isMounted.current) break;

                try {
                    const src = await thumbnailGenerator.requestThumbnail(source, time);

                    if (isMounted.current) {
                        setThumbnails(prev => {
                            const newThumbs = [...prev];
                            const index = newThumbs.findIndex(item => item.time === time);
                            if (index !== -1) {
                                newThumbs[index] = { time, src };
                            } else {
                                newThumbs.push({ time, src });
                            }
                            return newThumbs;
                        });
                    }
                } catch (e) {
                    console.warn(`Failed to load thumbnail at ${time}`, e);
                }
            }

            if (isMounted.current) setIsGenerating(false);
        };

        loadThumbnails();

    }, [source, JSON.stringify(requiredTimestamps), isVisible]);

    // Calculate render parameters
    const firstThumbOffset = (gridStartTime - startOffset) * scale;
    const thumbRealWidth = timeStep * scale;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden opacity-50 pointer-events-none bg-black/20"
        >
            <div
                className="flex h-full"
                style={{
                    transform: `translateX(${firstThumbOffset}px)`,
                    width: `${requiredTimestamps.length * thumbRealWidth}px` // Ensure container is wide enough
                }}
            >
                {thumbnails.map((item) => (
                    <div
                        key={item.time}
                        className="h-full shrink-0 border-r border-white/10 bg-black/40 relative"
                        style={{ width: `${thumbRealWidth}px` }}
                    >
                        {item.src ? (
                            <img
                                src={item.src}
                                alt=""
                                className="w-full h-full object-cover"
                                draggable={false}
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                {/* Placeholder */}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {isGenerating && thumbnails.filter(t => !t.src).length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10">
                    <Loader2 className="animate-spin text-white/50" size={12} />
                </div>
            )}
        </div>
    );
});
