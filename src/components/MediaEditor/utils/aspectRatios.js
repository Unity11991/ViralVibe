/**
 * Aspect Ratio Presets
 * Standard aspect ratios for video projects
 */

export const ASPECT_RATIOS = [
    {
        id: 'landscape',
        name: 'Landscape',
        ratio: '16:9',
        dimensions: { width: 1920, height: 1080 },
        icon: '▭',
        platforms: ['YouTube', 'Vimeo', 'Facebook'],
        description: 'Standard widescreen format',
        isDefault: true,
        color: '#6366f1' // Indigo
    },
    {
        id: 'vertical',
        name: 'Vertical',
        ratio: '9:16',
        dimensions: { width: 1080, height: 1920 },
        icon: '▯',
        platforms: ['TikTok', 'Reels', 'Stories'],
        description: 'Mobile vertical video',
        color: '#ec4899' // Pink
    },
    {
        id: 'square',
        name: 'Square',
        ratio: '1:1',
        dimensions: { width: 1080, height: 1080 },
        icon: '▢',
        platforms: ['Instagram', 'Twitter'],
        description: 'Perfect square format',
        color: '#8b5cf6' // Purple
    },
    {
        id: 'instagram-portrait',
        name: 'Portrait',
        ratio: '4:5',
        dimensions: { width: 1080, height: 1350 },
        icon: '▭',
        platforms: ['Instagram Feed'],
        description: 'Instagram portrait',
        color: '#f97316' // Orange
    },
    {
        id: 'traditional',
        name: 'Traditional',
        ratio: '4:3',
        dimensions: { width: 1440, height: 1080 },
        icon: '▭',
        platforms: ['Classic TV', 'Presentations'],
        description: 'Classic television',
        color: '#10b981' // Green
    },
    {
        id: 'cinematic',
        name: 'Cinematic',
        ratio: '21:9',
        dimensions: { width: 2560, height: 1080 },
        icon: '▬',
        platforms: ['Films', 'Widescreen'],
        description: 'Ultra-wide cinematic',
        color: '#06b6d4' // Cyan
    }
];

/**
 * Get aspect ratio by ID
 */
export const getAspectRatioById = (id) => {
    return ASPECT_RATIOS.find(ratio => ratio.id === id);
};

/**
 * Get default aspect ratio
 */
export const getDefaultAspectRatio = () => {
    return ASPECT_RATIOS.find(ratio => ratio.isDefault) || ASPECT_RATIOS[0];
};

/**
 * Calculate aspect ratio from dimensions
 */
export const calculateAspectRatio = (width, height) => {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
};

/**
 * Fit media to canvas dimensions
 * Returns transform to center and scale media
 */
export const fitMediaToCanvas = (mediaDimensions, canvasDimensions, fit = 'contain') => {
    const mediaAspect = mediaDimensions.width / mediaDimensions.height;
    const canvasAspect = canvasDimensions.width / canvasDimensions.height;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (fit === 'contain') {
        // Fit media inside canvas (letterbox/pillarbox)
        if (mediaAspect > canvasAspect) {
            // Media is wider - fit to width
            scale = canvasDimensions.width / mediaDimensions.width;
        } else {
            // Media is taller - fit to height
            scale = canvasDimensions.height / mediaDimensions.height;
        }
    } else if (fit === 'cover') {
        // Fill canvas completely (crop if needed)
        if (mediaAspect > canvasAspect) {
            // Media is wider - fit to height
            scale = canvasDimensions.height / mediaDimensions.height;
        } else {
            // Media is taller - fit to width
            scale = canvasDimensions.width / mediaDimensions.width;
        }
    } else if (fit === 'fill') {
        // Stretch to fill (may distort)
        return {
            scale: 100,
            offsetX: 0,
            offsetY: 0,
            scaleX: canvasDimensions.width / mediaDimensions.width,
            scaleY: canvasDimensions.height / mediaDimensions.height
        };
    }

    // Calculate centering offset
    const scaledWidth = mediaDimensions.width * scale;
    const scaledHeight = mediaDimensions.height * scale;
    offsetX = (canvasDimensions.width - scaledWidth) / 2;
    offsetY = (canvasDimensions.height - scaledHeight) / 2;

    return {
        scale: scale * 100,
        offsetX,
        offsetY
    };
};
