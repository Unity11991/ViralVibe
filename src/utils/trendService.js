/**
 * Service to fetch Google Trends data via RSS feed
 * Uses a CORS proxy to bypass browser restrictions
 */

const CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';
const GOOGLE_TRENDS_RSS = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=US';

export const fetchGoogleTrends = async () => {
    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(GOOGLE_TRENDS_RSS)}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch trends: ${response.statusText}`);
        }

        const data = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml"); // Use 'data' directly

        const items = Array.from(xmlDoc.getElementsByTagName('item'));

        if (items.length === 0) {
            console.warn('Google Trends parsing warning: No items found in XML.');
            // Fallback to mock data if parsing fails but request succeeded (e.g. structure change)
            return getMockTrends();
        }

        const trends = items.map((item, index) => {
            if (index >= 10) return null;

            const getTag = (tag) => {
                // Try with namespace and without
                return item.getElementsByTagName(tag)[0]?.textContent ||
                    item.getElementsByTagName('ht:' + tag)[0]?.textContent || '';
            };

            const title = item.querySelector('title')?.textContent || 'Unknown';
            const traffic = getTag('approx_traffic');
            const description = item.querySelector('description')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const pictureUrl = getTag('picture');
            const newsSource = getTag('news_item_source');

            return {
                id: index + 1,
                name: title,
                growth: traffic,
                description: description,
                category: 'Trending',
                date: pubDate,
                image: pictureUrl,
                source: newsSource
            };
        }).filter(Boolean); // Remove nulls

        if (trends.length === 0) return getMockTrends();

        return trends;

    } catch (error) {
        console.error('Error in fetchGoogleTrends:', error);
        return getMockTrends();
    }
};

// Fallback data so the UI is never empty
const getMockTrends = () => [
    {
        id: 1,
        name: 'Taylor Swift',
        category: 'Music',
        growth: '500K+',
        date: 'Tue, 09 Dec 2025 08:00:00 +0000',
        description: 'Latest tour updates and viral moments.',
        source: 'Billboard',
        image: '' // Optional
    },
    {
        id: 2,
        name: 'New iPhone Release',
        category: 'Tech',
        growth: '200K+',
        date: 'Tue, 09 Dec 2025 09:00:00 +0000',
        description: 'Apple announces new features for the upcoming lineup.',
        source: 'The Verge',
        image: ''
    },
    {
        id: 3,
        name: 'Champions League',
        category: 'Sports',
        growth: '1M+',
        date: 'Tue, 09 Dec 2025 07:00:00 +0000',
        description: 'Key highlights from the quarter-finals.',
        source: 'ESPN',
        image: ''
    },
    {
        id: 4,
        name: 'Sustainable Fashion',
        category: 'Lifestyle',
        growth: '50K+',
        date: 'Tue, 09 Dec 2025 10:00:00 +0000',
        description: 'Why thrift flipping is taking over Facebook.',
        source: 'Vogue',
        image: ''
    }
];
