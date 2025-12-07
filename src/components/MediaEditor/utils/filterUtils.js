/**
 * Filter Utilities and Presets
 */

export const FILTER_PRESETS = [
    {
        id: 'normal',
        name: 'Normal',
        values: {}
    },
    {
        id: 'vivid',
        name: 'Vivid',
        values: {
            saturation: 40,
            vibrance: 30,
            contrast: 15
        }
    },
    {
        id: 'dramatic',
        name: 'Dramatic',
        values: {
            contrast: 50,
            highlights: -20,
            shadows: 30,
            saturation: 20
        }
    },
    {
        id: 'warm',
        name: 'Warm',
        values: {
            temp: 30,
            tint: 10,
            saturation: 15
        }
    },
    {
        id: 'cool',
        name: 'Cool',
        values: {
            temp: -30,
            tint: -10,
            saturation: 10
        }
    },
    {
        id: 'bw',
        name: 'B&W',
        values: {
            grayscale: 100,
            contrast: 20
        }
    },
    {
        id: 'vintage',
        name: 'Vintage',
        values: {
            sepia: 40,
            fade: 30,
            vignette: 40,
            grain: 25
        }
    },
    {
        id: 'faded',
        name: 'Faded',
        values: {
            fade: 50,
            contrast: -20,
            highlights: 20
        }
    },
    {
        id: 'cinematic',
        name: 'Cinematic',
        values: {
            contrast: 30,
            saturation: -10,
            fade: 15,
            vignette: 35
        }
    },
    {
        id: 'bright',
        name: 'Bright',
        values: {
            exposure: 25,
            brightness: 15,
            highlights: 20,
            saturation: 10
        }
    },
    {
        id: 'moody',
        name: 'Moody',
        values: {
            exposure: -15,
            shadows: 40,
            contrast: 25,
            saturation: -10,
            vignette: 30
        }
    },
    {
        id: 'ethereal',
        name: 'Ethereal',
        values: {
            fade: 40,
            highlights: 30,
            saturation: -20,
            brightness: 10
        }
    }
];

/**
 * Get initial adjustment values
 */
export const getInitialAdjustments = () => ({
    // Light
    exposure: 0,
    contrast: 0,
    brightness: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,

    // Color
    saturation: 0,
    vibrance: 0,
    temp: 0,
    tint: 0,

    // HSL
    hue: 0,
    hslSaturation: 0,
    hslLightness: 0,

    // Style
    sharpen: 0,
    blur: 0,
    fade: 0,
    vignette: 0,
    grain: 0,

    // Effects
    clarity: 0,
    sepia: 0,
    grayscale: 0
});

/**
 * Apply filter preset to adjustments
 */
export const applyFilterPreset = (presetId) => {
    const preset = FILTER_PRESETS.find(p => p.id === presetId);
    if (!preset) return getInitialAdjustments();

    return {
        ...getInitialAdjustments(),
        ...preset.values
    };
};

/**
 * Merge adjustment values
 */
export const mergeAdjustments = (current, updates) => ({
    ...current,
    ...updates
});
