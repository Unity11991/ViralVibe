const fetch = require('node-fetch');

async function debugTrends() {
    try {
        const response = await fetch('https://trends.google.com/trending/rss?geo=US', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            }
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("First 1000 chars:\n", text.substring(0, 1000));

        // Test Regex
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        let count = 0;
        while ((match = itemRegex.exec(text)) !== null) {
            count++;
            const itemContent = match[1];
            const titleMatch = /<title>(.*?)<\/title>/.exec(itemContent);
            const trafficMatch = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/.exec(itemContent);

            console.log(`Item ${count}:`);
            console.log(`  Title: ${titleMatch ? titleMatch[1] : 'N/A'}`);
            console.log(`  Traffic: ${trafficMatch ? trafficMatch[1] : 'N/A'}`);

            if (count >= 3) break;
        }
        console.log(`Total items found: ${count}`);

    } catch (error) {
        console.error("Error:", error);
    }
}

debugTrends();
