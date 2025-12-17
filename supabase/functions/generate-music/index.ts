// Supabase Edge Function for Music Generation
// Proxies requests to Hugging Face MusicGen API to avoid CORS issues

const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/musicgen-small";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Parse request body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('Failed to parse request body:', e);
            return new Response(
                JSON.stringify({ error: 'Invalid JSON in request body' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        const { prompt, duration = 15 } = body;

        if (!prompt || typeof prompt !== 'string') {
            console.error('Invalid prompt:', prompt);
            return new Response(
                JSON.stringify({ error: 'Invalid prompt provided' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

        console.log('Hugging Face Response Status:', response.status);

        if (!response.ok) {
            // Model might be loading
            if (response.status === 503) {
                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    console.error('Failed to parse 503 response:', e);
                    data = { estimated_time: 20 };
                }

                console.log('Model loading, estimated time:', data.estimated_time);

                return new Response(
                    JSON.stringify({
                        loading: true,
                        estimated_time: data.estimated_time || 20,
                        message: 'Model is warming up...'
                    }),
                    {
                        status: 503,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            // Try to get error details
            let errorText;
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = 'Unable to read error response';
            }

            console.error(`Hugging Face Error (${response.status}):`, errorText);
            throw new Error(`Hugging Face API error: ${response.statusText}`);
        }

        // Get audio blob
        const audioBlob = await response.blob();
        console.log('Audio blob size:', audioBlob.size, 'bytes');

        // Return audio with proper headers
        return new Response(audioBlob, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'audio/wav',
                'Cache-Control': 'public, max-age=3600',
            },
        });

    } catch (error) {
        console.error('Music generation error:', error);
        console.error('Error stack:', error.stack);

        return new Response(
            JSON.stringify({
                error: error.message || 'Failed to generate music',
                details: error.toString(),
                stack: error.stack
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
