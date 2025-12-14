
const API_KEY = 'LIVDSRZULELA'; // Standard public demo key
const BASE_URL = 'https://g.tenor.com/v1';

/**
 * Fetch Trending GIFs
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export const getTrendingGifs = async (limit = 20) => {
    try {
        const response = await fetch(`${BASE_URL}/trending?key=${API_KEY}&limit=${limit}&media_filter=minimal`);
        const data = await response.json();
        return data.results.map(formatTenorResult);
    } catch (error) {
        console.error('Tenor Trending Error:', error);
        return [];
    }
};

/**
 * Search GIFs
 * @param {string} query 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export const searchGifs = async (query, limit = 20) => {
    try {
        const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&key=${API_KEY}&limit=${limit}&media_filter=minimal`);
        const data = await response.json();
        return data.results.map(formatTenorResult);
    } catch (error) {
        console.error('Tenor Search Error:', error);
        return [];
    }
};

/**
 * Helper to format result into our app's usable structure
 */
const formatTenorResult = (result) => {
    // Prefer mp4 for better performance, falling back to gif
    const media = result.media[0];
    return {
        id: result.id,
        title: result.content_description || 'GIF',
        thumbnail: media.tinygif.url, // For UI preview
        url: media.mp4.url,           // For Canvas (Video)
        type: 'gif',                  // Flag for our editor
        width: media.mp4.dims[0],
        height: media.mp4.dims[1],
        duration: media.mp4.duration || 3 // Fallback duration
    };
};
