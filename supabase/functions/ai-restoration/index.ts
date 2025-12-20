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
        console.log("AI Restoration request received");

        const body = await req.json();
        const { hfToken, imageBase64 } = body;

        if (!hfToken) throw new Error("Missing Hugging Face Token");
        if (!imageBase64) throw new Error("Missing Image Data");

        // Convert base64 to Uint8Array efficiently
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        const binaryData = base64.decode(base64Data);

        console.log(`Processing image. Size: ${binaryData.length} bytes`);

        // Set a timeout for the Hugging Face API call (50 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000);

        try {
            console.log("Calling Hugging Face API (GFPGAN)...");
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
            console.log(`HF API response status: ${response.status}`);

            if (!response.ok) {
                let errorMessage = `Hugging Face API returned ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                    if (Array.isArray(errorMessage)) errorMessage = errorMessage.join(", ");
                } catch (e) {
                    // Fallback to status text
                }
                throw new Error(errorMessage);
            }

            const buffer = await response.arrayBuffer();
            console.log(`Received response from HF. Size: ${buffer.byteLength} bytes`);

            const uint8Array = new Uint8Array(buffer);
            const base64Response = base64.encode(uint8Array);

            return new Response(
                JSON.stringify({ image: `data:image/png;base64,${base64Response}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )

        } catch (err) {
            if (err.name === 'AbortError') {
                throw new Error("Hugging Face API timed out. The model might be loading or the image is too large.");
            }
            throw err;
        }

    } catch (error) {
        console.error("AI Restoration Proxy Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
