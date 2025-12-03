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
      ],
      "roast": "A spicy, one-sentence roast of the image. Be funny but not mean.",
      "scores": { "lighting": 8, "composition": 7, "creativity": 9 },
      "improvements": ["Tip 1", "Tip 2", "Tip 3"]
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

export const generatePremiumContent = async (type, data, settings) => {
    const { apiKey, model: modelName } = settings;
    const { input, image } = data;

    if (!apiKey) throw new Error("API Key required");

    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    const model = modelName || "llama-3.2-11b-vision-preview";

    let prompt = "";
    let systemRole = "You are a social media expert.";
    let jsonStructure = "";

    // Prepare image if available
    let userContent = [];

    switch (type) {
        case 'brand-voice':
            systemRole = "You are an expert copywriter specializing in mimicking brand voices.";
            prompt = `
                Analyze these caption examples to understand the brand voice (tone, sentence structure, emoji usage):
                "${input}"
                
                Now, generate a NEW caption for the attached image using this exact voice.
            `;
            jsonStructure = `
                {
                    "analysis": "Brief analysis of the voice style (e.g., 'Witty and direct')",
                    "generatedCaption": "The new caption"
                }
            `;
            break;

        case 'carousel':
            systemRole = "You are a content strategist.";
            prompt = `
                Create a 5-slide educational carousel strategy based on the visual content of this image.
                The goal is to provide value and save-worthy content.
            `;
            jsonStructure = `
                {
                    "slides": [
                        { "title": "Slide 1 Title", "content": "Slide 1 Content" },
                        { "title": "Slide 2 Title", "content": "Slide 2 Content" },
                        { "title": "Slide 3 Title", "content": "Slide 3 Content" },
                        { "title": "Slide 4 Title", "content": "Slide 4 Content" },
                        { "title": "Slide 5 Title", "content": "Slide 5 Content" }
                    ]
                }
            `;
            break;

        case 'competitor':
            systemRole = "You are a viral content analyst.";
            prompt = `
                Analyze this viral post content and explain WHY it went viral. Then provide a strategy to replicate it.
                Viral Post: "${input}"
            `;
            jsonStructure = `
                {
                    "insight": "Psychological reason for virality",
                    "strategy": "Actionable tip to replicate"
                }
            `;
            break;

        case 'ab-test':
            systemRole = "You are a growth hacker.";
            prompt = `
                Generate two distinct caption variants for this image to A/B test.
                Variant A: Safe, professional, value-driven.
                Variant B: Bold, controversial, or emotional.
                Predict which metric each will drive (Likes, Saves, Shares, Comments).
            `;
            jsonStructure = `
                {
                    "variantA": { "title": "Safe Route", "content": "Caption A", "prediction": "High Saves" },
                    "variantB": { "title": "Bold Route", "content": "Caption B", "prediction": "High Comments" }
                }
            `;
            break;

        case 'glow-up':
            systemRole = "You are a professional photographer and art director.";
            prompt = `
                Analyze this image and provide 3 specific technical tips to improve it (editing, cropping, or lighting) to make it look more premium.
                Give it a quality score out of 100.
            `;
            jsonStructure = `
                {
                    "score": 85,
                    "tips": ["Tip 1", "Tip 2", "Tip 3"]
                }
            `;
            break;

        case 'repurpose':
            systemRole = "You are a multi-platform content strategist.";
            prompt = `
                Rewrite the following content for LinkedIn (professional, value-driven), Twitter (concise, punchy thread starter), and Instagram (engaging, emoji-rich).
                Content: "${input}"
            `;
            jsonStructure = `
                {
                    "linkedin": "LinkedIn version...",
                    "twitter": "Twitter version...",
                    "instagram": "Instagram version..."
                }
            `;
            break;

        case 'hashtag':
            systemRole = "You are an SEO and hashtag specialist.";
            prompt = `
                Generate 3 clusters of hashtags for the niche/topic: "${input}".
                1. Broad/Reach (High volume)
                2. Niche/Specific (Targeted)
                3. Community (Engagement focused)
                Return 5-7 hashtags per cluster.
            `;
            jsonStructure = `
                {
                    "broad": ["#tag1", "#tag2"],
                    "niche": ["#tag3", "#tag4"],
                    "community": ["#tag5", "#tag6"]
                }
            `;
            break;

        case 'bio':
            systemRole = "You are a personal branding expert.";
            prompt = `
                Analyze this bio/description and rewrite it to be high-converting, clear, and authoritative.
                Current Bio: "${input}"
            `;
            jsonStructure = `
                {
                    "analysis": "Critique of current bio...",
                    "optimizedBio": "New optimized bio..."
                }
            `;
            break;

        default:
            throw new Error("Unknown feature type");
    }

    // Construct Message
    userContent.push({ type: "text", text: `${prompt}\n\nReturn ONLY raw JSON matching this structure:\n${jsonStructure}` });

    if (image && type !== 'competitor') {
        const base64DataUrl = await fileToBase64(image);
        userContent.push({ type: "image_url", image_url: { url: base64DataUrl } });
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemRole },
                { role: "user", content: userContent }
            ],
            model: model,
            temperature: 0.7,
            max_tokens: 1024,
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No content generated");

        return JSON.parse(content);
    } catch (error) {
        console.error("Premium Generation Error:", error);
        throw new Error("Failed to generate premium content. Please try again.");
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
