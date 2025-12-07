/**
 * Filter Utilities and Presets
 */

export const FILTER_PRESETS = [
    // Cinematic
    {
        id: 'cinematic-1',
        name: 'Teal & Orange',
        category: 'Cinematic',
        values: {
            contrast: 20,
            saturation: 15,
            hue: -10,
            shadows: -10,
            highlights: 10,
            temp: -10,
            tint: 10
        }
    },
    {
        id: 'cinematic-2',
        name: 'Noir',
        category: 'Cinematic',
        values: {
            grayscale: 100,
            contrast: 40,
            brightness: -10,
            vignette: 50,
            grain: 30
        }
    },
    {
        id: 'cinematic-3',
        name: 'Blockbuster',
        category: 'Cinematic',
        values: {
            contrast: 30,
            saturation: 25,
            vibrance: 20,
            shadows: -15,
            clarity: 20
        }
    },
    {
        id: 'cinematic-4',
        name: 'Dramatic',
        category: 'Cinematic',
        values: {
            contrast: 50,
            highlights: -20,
            shadows: 30,
            saturation: -10,
            vignette: 40
        }
    },
    {
        id: 'cinematic-5',
        name: 'Moody',
        category: 'Cinematic',
        values: {
            exposure: -15,
            shadows: 40,
            contrast: 25,
            saturation: -20,
            temp: -10,
            vignette: 30
        }
    },

    // Film Stock
    {
        id: 'film-1',
        name: 'Kodak Gold',
        category: 'Film Stock',
        values: {
            temp: 20,
            tint: 10,
            saturation: 10,
            contrast: 10,
            highlights: -10,
            grain: 15
        }
    },
    {
        id: 'film-2',
        name: 'Fuji Velvia',
        category: 'Film Stock',
        values: {
            saturation: 40,
            contrast: 20,
            vibrance: 20,
            tint: 15
        }
    },
    {
        id: 'film-3',
        name: 'Portra 400',
        category: 'Film Stock',
        values: {
            saturation: 10,
            contrast: 5,
            temp: 5,
            highlights: -15,
            grain: 10
        }
    },
    {
        id: 'film-4',
        name: 'CineStyle',
        category: 'Film Stock',
        values: {
            contrast: -30,
            saturation: -10,
            highlights: -20,
            shadows: 20
        }
    },
    {
        id: 'film-5',
        name: 'Technicolor',
        category: 'Film Stock',
        values: {
            saturation: 50,
            contrast: 30,
            hue: -5,
            vibrance: 30
        }
    },

    // Mood
    {
        id: 'mood-1',
        name: 'Melancholy',
        category: 'Mood',
        values: {
            saturation: -30,
            contrast: -10,
            temp: -20,
            tint: 10,
            fade: 20
        }
    },
    {
        id: 'mood-2',
        name: 'Euphoria',
        category: 'Mood',
        values: {
            saturation: 30,
            brightness: 10,
            temp: 10,
            tint: -5,
            vibrance: 20
        }
    },
    {
        id: 'mood-3',
        name: 'Tension',
        category: 'Mood',
        values: {
            contrast: 40,
            saturation: -20,
            temp: -10,
            vignette: 40
        }
    },
    {
        id: 'mood-4',
        name: 'Dream',
        category: 'Mood',
        values: {
            contrast: -20,
            saturation: -10,
            brightness: 10,
            blur: 2,
            fade: 30
        }
    },
    {
        id: 'mood-5',
        name: 'Ethereal',
        category: 'Mood',
        values: {
            fade: 40,
            highlights: 30,
            saturation: -20,
            brightness: 10
        }
    },

    // Genre
    {
        id: 'genre-1',
        name: 'Horror',
        category: 'Genre',
        values: {
            temp: -20,
            tint: 30,
            saturation: -40,
            contrast: 30,
            vignette: 60,
            grain: 40
        }
    },
    {
        id: 'genre-2',
        name: 'Sci-Fi',
        category: 'Genre',
        values: {
            temp: -30,
            tint: -10,
            saturation: -10,
            contrast: 20,
            sharpen: 20
        }
    },
    {
        id: 'genre-3',
        name: 'Western',
        category: 'Genre',
        values: {
            temp: 40,
            tint: 10,
            saturation: 10,
            contrast: 20,
            sepia: 20,
            grain: 20
        }
    },
    {
        id: 'genre-4',
        name: 'Romance',
        category: 'Genre',
        values: {
            temp: 10,
            tint: 10,
            saturation: 10,
            contrast: -10,
            fade: 10,
            vignette: 20
        }
    },
    {
        id: 'genre-5',
        name: 'Action',
        category: 'Genre',
        values: {
            contrast: 40,
            saturation: 20,
            clarity: 30,
            sharpen: 20
        }
    },
    {
        id: 'genre-6',
        name: 'Cyberpunk',
        category: 'Genre',
        values: {
            hue: 20,
            saturation: 40,
            contrast: 30,
            temp: -20,
            tint: 40
        }
    },
    {
        id: 'genre-7',
        name: 'Matrix',
        category: 'Genre',
        values: {
            tint: 50,
            temp: -10,
            saturation: -20,
            contrast: 30
        }
    },
    {
        id: 'genre-8',
        name: 'Wes Anderson',
        category: 'Genre',
        values: {
            saturation: 20,
            contrast: 10,
            temp: 10,
            tint: 5,
            fade: 10
        }
    },
    {
        id: 'genre-9',
        name: 'Mad Max',
        category: 'Genre',
        values: {
            temp: 50,
            saturation: 30,
            contrast: 40,
            sharpen: 20,
            grain: 30
        }
    },
    {
        id: 'genre-10',
        name: 'Blade Runner',
        category: 'Genre',
        values: {
            temp: -30,
            tint: -20,
            saturation: 20,
            contrast: 40,
            shadows: 20
        }
    },

    // Vintage
    {
        id: 'vintage-1',
        name: '1920s',
        category: 'Vintage',
        values: {
            grayscale: 100,
            contrast: 40,
            grain: 50,
            vignette: 40,
            brightness: -10
        }
    },
    {
        id: 'vintage-2',
        name: '1950s',
        category: 'Vintage',
        values: {
            saturation: 40,
            contrast: 20,
            temp: 10,
            vibrance: 30
        }
    },
    {
        id: 'vintage-3',
        name: '1970s',
        category: 'Vintage',
        values: {
            temp: 30,
            tint: 20,
            saturation: -10,
            fade: 20,
            contrast: -10
        }
    },
    {
        id: 'vintage-4',
        name: '1980s',
        category: 'Vintage',
        values: {
            saturation: 50,
            contrast: 30,
            hue: 10,
            sharpen: 20
        }
    },
    {
        id: 'vintage-5',
        name: '1990s',
        category: 'Vintage',
        values: {
            saturation: -20,
            contrast: 20,
            grain: 30,
            fade: 10
        }
    },

    // Nature
    {
        id: 'nature-1',
        name: 'Golden Hour',
        category: 'Nature',
        values: {
            temp: 40,
            tint: 10,
            saturation: 20,
            contrast: 10,
            highlights: -10
        }
    },
    {
        id: 'nature-2',
        name: 'Blue Hour',
        category: 'Nature',
        values: {
            temp: -40,
            tint: -10,
            saturation: 10,
            contrast: 20,
            shadows: 10
        }
    },
    {
        id: 'nature-3',
        name: 'Forest',
        category: 'Nature',
        values: {
            tint: 30,
            saturation: 10,
            contrast: 10,
            shadows: -10
        }
    },
    {
        id: 'nature-4',
        name: 'Ocean',
        category: 'Nature',
        values: {
            temp: -20,
            tint: -10,
            saturation: 30,
            contrast: 10,
            brightness: 10
        }
    },
    {
        id: 'nature-5',
        name: 'Desert',
        category: 'Nature',
        values: {
            temp: 50,
            tint: 10,
            saturation: 10,
            contrast: 30,
            sharpen: 10
        }
    },

    // Urban
    {
        id: 'urban-1',
        name: 'Urban',
        category: 'Urban',
        values: {
            saturation: -40,
            contrast: 30,
            clarity: 30,
            sharpen: 20,
            grain: 20
        }
    },
    {
        id: 'urban-2',
        name: 'Night City',
        category: 'Urban',
        values: {
            contrast: 50,
            saturation: 30,
            highlights: 20,
            shadows: -10
        }
    },
    {
        id: 'urban-3',
        name: 'Street',
        category: 'Urban',
        values: {
            contrast: 20,
            saturation: -10,
            clarity: 20
        }
    },

    // Lifestyle
    {
        id: 'life-1',
        name: 'Indoor',
        category: 'Lifestyle',
        values: {
            temp: 20,
            tint: 5,
            brightness: 10,
            contrast: 5
        }
    },
    {
        id: 'life-2',
        name: 'Studio',
        category: 'Lifestyle',
        values: {
            contrast: 10,
            saturation: 5,
            brightness: 5,
            clarity: 10
        }
    },
    {
        id: 'life-3',
        name: 'Fashion',
        category: 'Lifestyle',
        values: {
            contrast: 30,
            saturation: 10,
            sharpen: 10,
            highlights: 10
        }
    },
    {
        id: 'life-4',
        name: 'Food',
        category: 'Lifestyle',
        values: {
            saturation: 30,
            contrast: 20,
            temp: 5,
            sharpen: 10
        }
    },
    {
        id: 'life-5',
        name: 'Travel',
        category: 'Lifestyle',
        values: {
            saturation: 25,
            contrast: 15,
            brightness: 10,
            vibrance: 20
        }
    },

    // Artistic
    {
        id: 'art-1',
        name: 'Minimal',
        category: 'Artistic',
        values: {
            saturation: -50,
            contrast: 10,
            brightness: 10
        }
    },
    {
        id: 'art-2',
        name: 'Matte',
        category: 'Artistic',
        values: {
            contrast: -20,
            fade: 40,
            saturation: -10
        }
    },
    {
        id: 'art-3',
        name: 'HDR',
        category: 'Artistic',
        values: {
            contrast: 50,
            saturation: 30,
            clarity: 50,
            sharpen: 30,
            highlights: -30,
            shadows: 30
        }
    },
    {
        id: 'art-4',
        name: 'Lomo',
        category: 'Artistic',
        values: {
            contrast: 40,
            saturation: 30,
            vignette: 60,
            crossProcess: 20
        }
    },
    {
        id: 'art-5',
        name: 'Cross Process',
        category: 'Artistic',
        values: {
            contrast: 30,
            saturation: 20,
            tint: 30,
            temp: -20
        }
    },
    {
        id: 'art-6',
        name: 'Bleach Bypass',
        category: 'Artistic',
        values: {
            saturation: -60,
            contrast: 50,
            exposure: 10
        }
    },
    {
        id: 'art-7',
        name: 'Sepia',
        category: 'Artistic',
        values: {
            sepia: 100,
            contrast: 10
        }
    },
    {
        id: 'art-8',
        name: 'Cyanotype',
        category: 'Artistic',
        values: {
            grayscale: 100,
            tint: -100, // Blue
            contrast: 20
        }
    },
    {
        id: 'art-9',
        name: 'Infrared',
        category: 'Artistic',
        values: {
            hue: 180,
            saturation: -50,
            contrast: 50,
            brightness: 20
        }
    },
    {
        id: 'art-10',
        name: 'Night Vision',
        category: 'Artistic',
        values: {
            grayscale: 100,
            tint: 100, // Green
            brightness: 20,
            grain: 50,
            vignette: 40
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
