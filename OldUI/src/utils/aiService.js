import Groq from "groq-sdk";

export const analyzeImage = async (file, settings) => {
    const { apiKey, platform, tone, model: modelName } = settings;

    if (!apiKey) {
        throw new Error("Please enter a valid Groq API Key.");
    }

    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    const model = modelName || "llama-3.2-11b-vision-preview";

    // Convert file to base64 data URL
    const base64DataUrl = await fileToBase64(file);

    const prompt = `
    You are a social media expert. Analyze this image and generate content for ${platform} with a ${tone} tone.
    
    Caption Length Preference: ${settings.length || 'Medium'}
    Special Requirements: ${settings.customInstructions || 'None'}

    Return a JSON object with the following structure (do not use markdown code blocks, just raw JSON):
    {
      "viralPotential": 85, // A score from 0-100 indicating viral potential
      "captions": ["Primary caption option", "Alternative option 1", "Alternative option 2", "Alternative option 3", "Alternative option 4"],
      "hashtags": ["#tag1", "#tag2", ... (15-30 tags as separate strings)],
      "bestTime": "A specific time suggestion (e.g., 'Today at 6:00 PM') based on general best practices for ${platform}.",
      "musicRecommendations": [
        { "song": "Song Name", "artist": "Artist Name", "reason": "Brief reason why it fits" },
        { "song": "Song Name", "artist": "Artist Name", "reason": "Brief reason why it fits" },
        { "song": "Song Name", "artist": "Artist Name", "reason": "Brief reason why it fits" }
      ]
    }
  `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: base64DataUrl } },
                    ],
                },
            ],
            model: model,
            temperature: 0.7,
            max_tokens: 1024,
            response_format: { type: "json_object" },
        });

        const content = chatCompletion.choices[0]?.message?.content;

        if (!content) {
            throw new Error("No content generated.");
        }

        return JSON.parse(content);
    } catch (error) {
        console.error("Groq API Error:", error);
        throw new Error(`Failed to analyze image. Error: ${error.message}`);
    }
};

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
