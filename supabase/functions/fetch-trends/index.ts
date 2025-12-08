import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Fetch Google Trends Daily RSS for US (can be parameterized later)
        const response = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US');
        const xmlText = await response.text();

        // Simple regex parsing to avoid heavy XML libraries
        // We want <title> inside <item>
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xmlText)) !== null) {
            const itemContent = match[1];
            const titleMatch = /<title>(.*?)<\/title>/.exec(itemContent);
            const trafficMatch = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/.exec(itemContent);

            if (titleMatch) {
                items.push({
                    title: titleMatch[1],
                    traffic: trafficMatch ? trafficMatch[1] : 'N/A'
                });
            }

            if (items.length >= 10) break; // Limit to top 10
        }

        return new Response(
            JSON.stringify({ trends: items }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
