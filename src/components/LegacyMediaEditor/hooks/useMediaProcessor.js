import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for processing and loading media files
 */
export const useMediaProcessor = () => {
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
    const [mediaDimensions, setMediaDimensions] = useState({ width: 0, height: 0 });
    const [videoDuration, setVideoDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const mediaElementRef = useRef(null);

    /**
     * Load media file (image or video)
     */
    const loadMedia = useCallback(async (file) => {
        if (!file) return;

        setIsLoading(true);
        setError(null);

        try {
            // Validate file type
            const type = file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('video/') ? 'video' : null;

            if (!type) {
                throw new Error('Invalid file type. Please select an image or video.');
            }

            // Create object URL
            const url = URL.createObjectURL(file);

            if (type === 'image') {
                // Load image
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        setMediaDimensions({ width: img.width, height: img.height });
                        resolve();
                    };
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = url;
                });
                mediaElementRef.current = img;
            } else {
                // Load video
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';

                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = () => {
                        setMediaDimensions({
                            width: video.videoWidth,
                            height: video.videoHeight
                        });
                        setVideoDuration(video.duration);
                        resolve();
                    };
                    video.onerror = () => reject(new Error('Failed to load video'));
                    video.src = url;
                });
                mediaElementRef.current = video;
            }

            setMediaFile(file);
            setMediaUrl(url);
            setMediaType(type);
            setIsLoading(false);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            console.error('Media loading error:', err);
        }
    }, []);

    /**
     * Clear loaded media
     */
    const clearMedia = useCallback(() => {
        if (mediaUrl) {
            URL.revokeObjectURL(mediaUrl);
        }
        setMediaFile(null);
        setMediaUrl(null);
        setMediaType(null);
        setMediaDimensions({ width: 0, height: 0 });
        setVideoDuration(0);
        mediaElementRef.current = null;
    }, [mediaUrl]);

    /**
     * Get aspect ratio
     */
    const getAspectRatio = useCallback(() => {
        if (mediaDimensions.width === 0 || mediaDimensions.height === 0) return 1;
        return mediaDimensions.width / mediaDimensions.height;
    }, [mediaDimensions]);

    return {
        // State
        mediaFile,
        mediaUrl,
        mediaType,
        mediaDimensions,
        videoDuration,
        isLoading,
        error,
        mediaElementRef,

        // Actions
        loadMedia,
        clearMedia,
        getAspectRatio,

        // Computed
        isVideo: mediaType === 'video',
        isImage: mediaType === 'image'
    };
};
