// Supabase Edge Function for Music Generation
// Proxies requests to Hugging Face MusicGen API to avoid CORS issues

const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/musicgen-small";

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    try {
        const { prompt, duration = 15 } = await req.json();

        if (!prompt || typeof prompt !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Invalid prompt provided' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                }
            );
        }

        // Validate duration
        const validDuration = Math.min(Math.max(duration, 5), 30);

        console.log(`Generating music: "${prompt}" (${validDuration}s)`);

        // Call Hugging Face API
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: Math.floor(validDuration * 50),
                    temperature: 0.9,
                    top_k: 250,
                    top_p: 0.95,
                }
            }),
        });

        if (!response.ok) {
            // Model might be loading
            if (response.status === 503) {
                const data = await response.json();
                return new Response(
                    JSON.stringify({
                        loading: true,
                        estimated_time: data.estimated_time || 20,
                        message: 'Model is warming up...'
                    }),
                    {
                        status: 503,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    }
                );
            }

            throw new Error(`Hugging Face API error: ${response.statusText}`);
        }

        // Get audio blob
        const audioBlob = await response.blob();

        // Return audio with proper headers
        return new Response(audioBlob, {
            headers: {
                'Content-Type': 'audio/wav',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
            },
        });

    } catch (error) {
        console.error('Music generation error:', error);
        return new Response(
            JSON.stringify({
                error: error.message || 'Failed to generate music',
                details: error.toString()
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            }
        );
    }
});
