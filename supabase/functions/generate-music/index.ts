const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { prompt, duration = 10, temperature = 1.0 } = await req.json()

        // Validate inputs
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Please provide a valid music description.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (![5, 10, 15, 30].includes(duration)) {
            return new Response(
                JSON.stringify({ error: 'Duration must be 5, 10, 15, or 30 seconds.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get Hugging Face API key from environment
        const apiKey = Deno.env.get('HUGGINGFACE_API_KEY')
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'Hugging Face API key not configured on server.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[MusicGen] Generating ${duration}s music for prompt: "${prompt.substring(0, 50)}..."`)

        // Call Hugging Face API
        const response = await fetch(
            'https://api-inference.huggingface.co/models/facebook/musicgen-small',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt.trim(),
                    parameters: {
                        max_new_tokens: Math.floor(duration * 50),
                        temperature: temperature,
                    }
                }),
            }
        )

        // Handle model loading state
        if (response.status === 503) {
            const errorData = await response.json()
            if (errorData.error && errorData.error.includes('loading')) {
                const estimatedTime = errorData.estimated_time || 20
                return new Response(
                    JSON.stringify({
                        error: 'MODEL_LOADING',
                        message: 'The AI model is loading. Please try again in a minute.',
                        estimated_time: estimatedTime
                    }),
                    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // Handle rate limiting
        if (response.status === 429) {
            return new Response(
                JSON.stringify({
                    error: 'RATE_LIMIT',
                    message: 'Rate limit exceeded. Please wait a moment and try again.'
                }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
            return new Response(
                JSON.stringify({ error: 'Invalid Hugging Face API key configuration.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Handle other errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return new Response(
                JSON.stringify({ error: errorData.error || `API request failed with status ${response.status}` }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get audio blob from response
        const audioBlob = await response.blob()

        // Verify we got actual audio data
        if (audioBlob.size === 0) {
            return new Response(
                JSON.stringify({ error: 'Received empty audio file from API.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[MusicGen] Successfully generated ${audioBlob.size} bytes of audio`)

        // Return the audio blob
        return new Response(audioBlob, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'audio/wav',
                'Content-Length': audioBlob.size.toString(),
            }
        })

    } catch (error) {
        console.error('[MusicGen] Error:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Failed to generate music' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
