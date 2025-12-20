import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as base64 from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("AI Restoration: Request received");

        const body = await req.json();
        const { hfToken, imageBase64 } = body;

        if (!hfToken) throw new Error("Missing Hugging Face Token");
        if (!imageBase64) throw new Error("Missing Image Data");

        // Convert base64 to Uint8Array
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        const binaryData = base64.decode(base64Data);

        console.log(`AI Restoration: Processing image (${binaryData.length} bytes)`);

        // Hugging Face API Call with 60s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(
                "https://api-inference.huggingface.co/models/tencentarc/GFPGAN",
                {
                    headers: {
                        Authorization: `Bearer ${hfToken}`,
                        "Content-Type": "application/octet-stream",
                    },
                    method: "POST",
                    body: binaryData,
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);
            console.log(`AI Restoration: HF API Status ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`AI Restoration: HF API Error: ${errorText}`);

                let errorMessage = `AI Service Error (${response.status})`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error) {
                        errorMessage = errorData.error;
                        if (errorData.estimated_time) {
                            errorMessage += `. Estimated wait: ${Math.round(errorData.estimated_time)}s. Please try again in a moment.`;
                        }
                    }
                } catch (e) {
                    // Not JSON
                }
                throw new Error(errorMessage);
            }

            const buffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            const base64Response = base64.encode(uint8Array);

            console.log("AI Restoration: Success");

            return new Response(
                JSON.stringify({ image: `data:image/png;base64,${base64Response}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } catch (err) {
            if (err.name === 'AbortError') {
                throw new Error("The AI service is taking too long to respond. The model might be loading. Please try again in a minute.");
            }
            throw err;
        }

    } catch (error) {
        console.error("AI Restoration: Proxy Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
