/**
 * Service to fetch Viral Trends from Multiple Sources
 * Uses public JSON feeds via AllOrigins/CodeTabs proxies, with fallback to RSS.
 */

const ALLORIGINS_API = 'https://api.allorigins.win/get?url=';
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';
const PROXY_CODETABS = 'https://api.codetabs.com/v1/proxy?quest=';
const PROXY_CORSPROXY = 'https://corsproxy.io/?';

// Endpoints
const REDDIT_JSON = 'https://www.reddit.com/r/all/top.json?t=day&limit=25';
const GOOGLE_TRENDS_RSS = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=US';
const PRODUCT_HUNT_RSS = 'https://www.producthunt.com/feed';
const HACKER_NEWS_API = 'https://hn.algolia.com/api/v1/search?tags=front_page';

// Apple Music is handled separately in fetchMusicTrends, but listed here for reference
const APPLE_MUSIC_RSS = 'https://rss.applemarketingtools.com/api/v2/us/music/most-played/25/songs.json';

// --- Main Dispatcher ---

export const fetchTrends = async (source) => {
    switch (source) {
        case 'reddit':
            return fetchRedditTrends();
        case 'google':
            return fetchGoogleTrendsActual();
        case 'producthunt':
            return fetchProductHuntTrends();
        case 'hackernews':
            return fetchHackerNewsTrends();
        case 'tiktok':
            return getMockTikTokTrends();
        case 'twitter':
            return getMockTwitterTrends();
        default:
            return fetchRedditTrends();
    }
};

// --- Fetchers ---

// 1. Reddit (Robust Multi-Strategy)
export const fetchRedditTrends = async () => {
    // Strategy 1: JSON via CodeTabs Proxy (often more reliable than AllOrigins/CorsProxy)
    try {
        const response = await fetch(`${PROXY_CODETABS}${encodeURIComponent(REDDIT_JSON)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.children) {
                return parseRedditJson(data);
            }
        }
    } catch (e) {
        console.warn("Reddit Strategy 1 (JSON) failed:", e);
    }

    // Strategy 2: RSS via RSS2JSON (Fallback)
    try {
        const rssUrl = 'https://www.reddit.com/r/all/top.rss?t=day';
        const response = await fetch(`${RSS2JSON_API}${encodeURIComponent(rssUrl)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok' && data.items) {
                return data.items.map((item, index) => {
                    // Extract image from content HTML
                    const imgMatch = item.content.match(/src="(https:\/\/[^"]+)"/);
                    let image = imgMatch ? imgMatch[1] : (item.thumbnail || '');

                    if (!image || image.includes('external-preview') || !image.startsWith('http')) {
                        image = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80';
                    }

                    return {
                        id: index + 1,
                        name: item.title,
                        growth: 'Trending',
                        description: 'Viral on Reddit today.',
                        category: 'r/all',
                        date: item.pubDate,
                        image: image,
                        source: 'Reddit',
                        url: item.link
                    };
                }).slice(0, 15);
            }
        }
    } catch (e) {
        console.warn("Reddit Strategy 2 (RSS) failed:", e);
    }

    // Strategy 3: Mock Data
    console.warn("All Reddit fetches failed. Using Mock.");
    return getMockReddit();
};

const parseRedditJson = (data) => {
    return data.data.children
        .map(child => child.data)
        .filter(post => {
            // strict filter for valid images
            const hasValidThumbnail = post.thumbnail && post.thumbnail.startsWith('http');
            const hasValidUrl = post.url && post.url.match(/\.(jpeg|jpg|gif|png)$/);
            return !post.over_18 && !post.is_video && (hasValidThumbnail || hasValidUrl);
        })
        .map((post, index) => {
            let imageUrl = post.thumbnail;
            if (post.url && post.url.match(/\.(jpeg|jpg|gif|png)$/)) {
                imageUrl = post.url;
            }
            if (!imageUrl || imageUrl.length < 10 || !imageUrl.startsWith('http')) {
                imageUrl = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80';
            }
            return {
                id: index + 1,
                name: post.title,
                growth: `${formatNumber(post.score)} Upvotes`,
                description: `Top post in r/${post.subreddit}. Comments: ${formatNumber(post.num_comments)}`,
                category: `r/${post.subreddit}`,
                date: new Date(post.created_utc * 1000).toISOString(),
                image: imageUrl,
                source: 'Reddit',
                url: `https://reddit.com${post.permalink}`
            };
        })
        .slice(0, 15);
};

// 2. Google Trends (Robust XML Fetch)
export const fetchGoogleTrendsActual = async () => {
    try {
        // rss2json often fails with 422 for Google RSS.
        // We fetch the raw XML via CodeTabs proxy and parse it manually.
        const response = await fetch(`${PROXY_CODETABS}${encodeURIComponent(GOOGLE_TRENDS_RSS)}`);

        if (response.ok) {
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const items = Array.from(xmlDoc.querySelectorAll("item"));

            return items.map((item, index) => {
                const title = item.querySelector("title")?.textContent || "Trending";
                const description = item.querySelector("description")?.textContent || "";
                const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
                const link = item.querySelector("link")?.textContent || "";
                const picture = item.querySelector("picture")?.textContent || "";

                // Google Trends RSS often has traffic in <ht:approx_traffic> but standard parser might miss namespaces
                // We'll rely on description or defaults.

                return {
                    id: index + 1,
                    name: title,
                    growth: 'High Volume', // Placeholder as specific volume is in namespace
                    description: `Trending on Google. ${description.replace(/<[^>]*>/g, '')}`, // Strip HTML
                    category: 'Search',
                    date: pubDate,
                    image: picture || `https://source.unsplash.com/random/800x600/?${encodeURIComponent(title)}`,
                    source: 'Google Trends',
                    url: link
                };
            }).slice(0, 15);
        }
    } catch (e) {
        console.warn("Google Trends fetch failed:", e);
    }
    return getMockGoogle();
};

// 3. Product Hunt (RSS)
export const fetchProductHuntTrends = async () => {
    try {
        const response = await fetch(`${RSS2JSON_API}${encodeURIComponent(PRODUCT_HUNT_RSS)}`);
        const data = await response.json();

        if (data.status === 'ok' && data.items) {
            return data.items.map((item, index) => ({
                id: index + 1,
                name: item.title,
                growth: 'Top Product',
                description: item.description || 'New launch on Product Hunt.',
                category: 'Tech',
                date: item.pubDate,
                image: item.thumbnail || '',
                source: 'Product Hunt',
                url: item.link
            }));
        }
    } catch (e) {
        console.warn("Product Hunt fetch failed:", e);
    }
    return getMockProductHunt();
};

// 4. Hacker News (VS API)
export const fetchHackerNewsTrends = async () => {
    try {
        const response = await fetch(HACKER_NEWS_API);
        const data = await response.json();

        if (data.hits) {
            return data.hits.map((item, index) => ({
                id: index + 1,
                name: item.title,
                growth: `${item.points} Points`,
                description: `${item.num_comments} comments. Posted by ${item.author}.`,
                category: 'Tech/Startup',
                date: item.created_at,
                image: '', // HN doesn't have images usually
                source: 'Hacker News',
                url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`
            }));
        }
    } catch (e) {
        console.warn("HN fetch failed:", e);
    }
    return getMockHackerNews();
};

// Backwards compatibility alias
export const fetchGoogleTrends = fetchRedditTrends;

// --- Music Services (Unchanged) ---
export const fetchMusicTrends = async () => {
    try {
        const response = await fetch(`${PROXY_CODETABS}${encodeURIComponent(APPLE_MUSIC_RSS)}`);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();

        if (data.feed && data.feed.results) {
            return data.feed.results.map((item, index) => ({
                id: index + 1,
                trackId: item.id,
                name: item.name,
                growth: item.artistName,
                description: `${item.name} by ${item.artistName}`,
                category: 'Music',
                date: new Date().toISOString(),
                image: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '600x600') : '',
                source: 'Apple Music',
                url: item.url
            }));
        }
    } catch (e) {
        console.warn("Music fetch failed:", e);
    }
    return getMockMusic();
};

export const fetchTrackPreview = async (trackId) => {
    if (!trackId) return null;
    try {
        const lookupUrl = `https://itunes.apple.com/lookup?id=${trackId}&entity=song`;
        const response = await fetch(`${PROXY_CODETABS}${encodeURIComponent(lookupUrl)}`);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.resultCount > 0 && data.results[0].previewUrl) {
            return data.results[0].previewUrl;
        }
    } catch (e) {
        console.warn("Preview fetch failed:", e);
    }
    return null;
};

// --- Helpers ---

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

const extractRelated = (html) => {
    // Basic extraction of text from RSS description HTML
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
};

// --- Mocks ---

const getMockReddit = () => [
    { id: 1, name: 'The "Everything is Cake" Trend Return', category: 'r/funny', growth: '150k Upvotes', date: new Date().toISOString(), description: 'Hyper-realistic cakes are confusing everyone again.', source: 'Reddit', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80' },
    { id: 2, name: 'New AI Video Generator', category: 'r/technology', growth: '85k Upvotes', date: new Date().toISOString(), description: 'Sora competitors are dropping fast.', source: 'Reddit', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&q=80' }
];

const getMockGoogle = () => [
    { id: 1, name: 'Solar Eclipse', category: 'Science', growth: '5M+ Searches', date: new Date().toISOString(), description: 'Massive interest in the upcoming solar eclipse path.', source: 'Google Trends', image: 'https://images.unsplash.com/photo-1532598187460-98fe8826d1e2?w=500&q=80' },
    { id: 2, name: 'Taylor Swift', category: 'Entertainment', growth: '2M+ Searches', date: new Date().toISOString(), description: 'New tour dates announced globally.', source: 'Google Trends', image: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=500&q=80' }
];

const getMockProductHunt = () => [
    { id: 1, name: 'Superhuman AI', category: 'Productivity', growth: '1.2k Upvotes', date: new Date().toISOString(), description: 'The fastest email experience ever made, now with AI.', source: 'Product Hunt', image: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=500&q=80' },
    { id: 2, name: 'Notion Calendar', category: 'Tools', growth: '900 Upvotes', date: new Date().toISOString(), description: 'Beautifully designed calendar that integrates with your docs.', source: 'Product Hunt', image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&q=80' }
];

const getMockHackerNews = () => [
    { id: 1, name: 'Show HN: I built a browser in 100 lines', category: 'Programming', growth: '400 Points', date: new Date().toISOString(), description: 'A minimal browser implementation in Python.', source: 'Hacker News', image: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=500&q=80' },
    { id: 2, name: 'The end of low interest rates', category: 'Finance', growth: '320 Points', date: new Date().toISOString(), description: 'Analysis of the current economic climate.', source: 'Hacker News', image: '' }
];

const getMockTikTokTrends = () => [
    { id: 1, name: 'Tube Girl Effect', category: 'Challenge', growth: '25M Views', date: new Date().toISOString(), description: 'Confidence on public transport is the new wave.', source: 'TikTok', image: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=500&q=80' },
    { id: 2, name: '#BookTok Recommendations', category: 'Lifestyle', growth: '10M Views', date: new Date().toISOString(), description: 'Colleen Hoover is trending again.', source: 'TikTok', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500&q=80' },
    { id: 3, name: 'Roman Empire', category: 'Meme', growth: '50M Views', date: new Date().toISOString(), description: 'How often do men think about it?', source: 'TikTok', image: 'https://images.unsplash.com/photo-1565551977797-28d098e721a3?w=500&q=80' }
];

const getMockTwitterTrends = () => [
    { id: 1, name: '#Oscars2024', category: 'Entertainment', growth: '1.5M Tweets', date: new Date().toISOString(), description: 'Live reactions to the Academy Awards.', source: 'X / Twitter', image: 'https://images.unsplash.com/photo-1565799563280-71f298a271d2?w=500&q=80' },
    { id: 2, name: 'OpenAI', category: 'Tech', growth: '500k Tweets', date: new Date().toISOString(), description: 'Latest announcements shaking up the tech world.', source: 'X / Twitter', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500&q=80' }
];

const getMockMusic = () => [
    { id: 1, trackId: '123', name: 'Mock Song', growth: 'Mock Artist', description: 'Mock Song by Mock Artist', category: 'Music', date: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', source: 'Apple Music' }
];
