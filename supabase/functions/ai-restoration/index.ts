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
        console.log("AI Restoration: Request received (Direct REST API)");

        const body = await req.json();
        const { hfToken, imageBase64 } = body;

        if (!hfToken) throw new Error("Missing Hugging Face Token. Please add it in Settings.");
        if (!imageBase64) throw new Error("Missing Image Data");

        // Convert base64 to Uint8Array
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        const binaryData = base64.decode(base64Data);

        console.log(`AI Restoration: Processing image (${binaryData.length} bytes)`);

        // Using the NEW Inference Providers via direct REST API
        // Format: model_id:provider_id
        const modelWithProvider = "fal/AuraSR-v2:fal-ai";
        const url = `https://api-inference.huggingface.co/models/${modelWithProvider}`;

        console.log(`AI Restoration: Calling ${url}...`);

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${hfToken}`,
                "Content-Type": "application/octet-stream",
                "x-use-cache": "false",
                "x-wait-for-model": "true"
            },
            method: "POST",
            body: binaryData,
        });

        console.log(`AI Restoration: Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`AI Restoration: API Error: ${errorText}`);

            let errorMessage = `AI Service Error (${response.status})`;
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) errorMessage = errorData.error;
            } catch (e) { }

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

    } catch (error) {
        console.error("AI Restoration: Proxy Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
