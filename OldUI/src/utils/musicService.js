/**
 * Search for a track on iTunes to get a preview URL
 * @param {string} song - Song name
 * @param {string} artist - Artist name
 * @returns {Promise<string|null>} - Preview URL or null
 */
export const searchTrack = async (song, artist) => {
    try {
        const query = encodeURIComponent(`${song} ${artist}`);
        const response = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&limit=1`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            return data.results[0].previewUrl;
        }
        return null;
    } catch (error) {
        console.error("Error fetching music preview:", error);
        return null;
    }
};
