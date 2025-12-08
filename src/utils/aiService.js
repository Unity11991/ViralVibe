import Groq from "groq-sdk";

export const analyzeImage = async (fileOrBase64, settings) => {
    const { apiKey, platform, tone, model: modelName } = settings;

    if (!apiKey) {
        throw new Error("Please enter a valid Groq API Key.");
    }

    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    const model = modelName || "llama-3.2-11b-vision-preview";

    // Handle File object or Base64 string
    let base64DataUrl;
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        base64DataUrl = fileOrBase64;
    } else {
        base64DataUrl = await fileToBase64(fileOrBase64);
    }

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

export const aggregateVideoInsights = (results) => {
    if (!results || results.length === 0) return null;

    // 1. Average Viral Potential
    const totalPotential = results.reduce((sum, r) => sum + (r.viralPotential || 0), 0);
    const avgPotential = Math.round(totalPotential / results.length);

    // 2. Combine Captions (Take top 2 from each)
    const allCaptions = results.flatMap(r => r.captions ? r.captions.slice(0, 2) : []);
    const uniqueCaptions = [...new Set(allCaptions)].slice(0, 5);

    // 3. Combine Hashtags (Take top 5 from each, unique)
    const allHashtags = results.flatMap(r => r.hashtags || []);
    const uniqueHashtags = [...new Set(allHashtags)].slice(0, 30);

    // 4. Best Time (Take the first one or most common)
    const bestTime = results[0]?.bestTime || "Best time depends on your audience.";

    // 5. Music (Combine unique songs)
    const allMusic = results.flatMap(r => r.musicRecommendations || []);
    const uniqueMusic = [];
    const seenSongs = new Set();
    for (const m of allMusic) {
        if (!seenSongs.has(m.song)) {
            seenSongs.add(m.song);
            uniqueMusic.push(m);
        }
    }
    const finalMusic = uniqueMusic.slice(0, 5);

    // 6. Roast (Combine or pick random)
    const roasts = results.map(r => r.roast).filter(Boolean);
    const combinedRoast = roasts.join(" Also: ");

    // 7. Scores (Average)
    const avgScores = {
        lighting: 0,
        composition: 0,
        creativity: 0
    };
    results.forEach(r => {
        if (r.scores) {
            avgScores.lighting += r.scores.lighting || 0;
            avgScores.composition += r.scores.composition || 0;
            avgScores.creativity += r.scores.creativity || 0;
        }
    });
    avgScores.lighting = Math.round(avgScores.lighting / results.length);
    avgScores.composition = Math.round(avgScores.composition / results.length);
    avgScores.creativity = Math.round(avgScores.creativity / results.length);

    // 8. Improvements (Combine unique)
    const allImprovements = results.flatMap(r => r.improvements || []);
    const uniqueImprovements = [...new Set(allImprovements)].slice(0, 5);

    return {
        viralPotential: avgPotential,
        captions: uniqueCaptions,
        hashtags: uniqueHashtags,
        bestTime: bestTime,
        musicRecommendations: finalMusic,
        roast: combinedRoast,
        scores: avgScores,
        improvements: uniqueImprovements,
        isVideoAnalysis: true // Flag to indicate this is a video result
    };
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

        case 'hooks':
            systemRole = "You are a viral scriptwriter.";
            prompt = `
                Generate 5 scroll-stopping hooks for a short-form video about: "${input}".
                The hooks should be catchy, controversial, or curiosity-inducing.
            `;
            jsonStructure = `
                {
                    "hooks": ["Hook 1", "Hook 2", "Hook 3", "Hook 4", "Hook 5"]
                }
            `;
            break;

        case 'calendar':
            systemRole = "You are a social media manager.";
            prompt = `
                Create a 7-day content plan for this niche/audience: "${input}".
                Include a mix of educational, entertaining, and promotional content.
            `;
            jsonStructure = `
                {
                    "plan": [
                        { "day": 1, "type": "Educational", "idea": "Brief content idea" },
                        { "day": 2, "type": "Entertainment", "idea": "Brief content idea" },
                        { "day": 3, "type": "Promotion", "idea": "Brief content idea" },
                        { "day": 4, "type": "Engagement", "idea": "Brief content idea" },
                        { "day": 5, "type": "Educational", "idea": "Brief content idea" },
                        { "day": 6, "type": "Personal", "idea": "Brief content idea" },
                        { "day": 7, "type": "Trend", "idea": "Brief content idea" }
                    ]
                }
            `;
            break;

        case 'email':
            systemRole = "You are an email marketing specialist.";
            prompt = `
                Turn this social media post into an engaging email newsletter.
                Post Content: "${input}"
                Subject line should be high-open rate. Body should be conversational.
            `;
            jsonStructure = `
                {
                    "subject": "Email Subject Line",
                    "body": "Full email body text..."
                }
            `;
            break;

        case 'response':
            systemRole = "You are a community manager.";
            prompt = `
                Generate 3 replies to this comment.
                1. Professional & Grateful
                2. Witty & Fun
                3. Question to drive engagement
                Comment: "${input}"
            `;
            jsonStructure = `
                {
                    "replies": [
                        { "tone": "Professional", "text": "Reply text..." },
                        { "tone": "Witty", "text": "Reply text..." },
                        { "tone": "Engaging", "text": "Reply text..." }
                    ]
                }
            `;
            break;

        case 'thumbnail':
            systemRole = "You are a YouTube growth expert.";
            prompt = `
                Generate 4 punchy, high-CTR text overlays (3-5 words max) for a thumbnail about: "${input}".
                They should be short, bold, and intriguing.
            `;
            jsonStructure = `
                {
                    "overlays": ["Text 1", "Text 2", "Text 3", "Text 4"]
                }
            `;
            break;

        // VIP Features
        case 'trend-alerts':
            systemRole = "You are a viral trend analyst.";
            prompt = `
                Identify 3 currently rising trends relevant to the niche: "${input}".
                For each, explain the trend and give a content idea.
            `;
            jsonStructure = `
                {
                    "trends": [
                        { "name": "Trend Name", "description": "What is it?", "idea": "Content idea" },
                        { "name": "Trend Name", "description": "What is it?", "idea": "Content idea" },
                        { "name": "Trend Name", "description": "What is it?", "idea": "Content idea" }
                    ]
                }
            `;
            break;

        case 'smart-scheduler':
            systemRole = "You are a social media data scientist.";
            prompt = `
                Analyze the audience behavior for a "${input}" account.
                Provide the 3 best times to post this week for maximum engagement.
                ALSO generate 5 engaging captions, 15-20 optimized hashtags, and 3 trending audio recommendations for this niche.
            `;
            jsonStructure = `
                {
                    "slots": [
                        { "day": "Monday", "time": "10:00 AM", "reason": "High commute engagement" },
                        { "day": "Wednesday", "time": "6:00 PM", "reason": "Post-work scrolling" },
                        { "day": "Friday", "time": "12:00 PM", "reason": "Lunch break peak" }
                    ],
                    "captions": ["Caption 1", "Caption 2", "Caption 3", "Caption 4", "Caption 5"],
                    "hashtags": ["#tag1", "#tag2", "#tag3", ...],
                    "musicRecommendations": [
                        { "song": "Song Name", "artist": "Artist Name" },
                        { "song": "Song Name", "artist": "Artist Name" },
                        { "song": "Song Name", "artist": "Artist Name" }
                    ]
                }
            `;
            break;

        case 'script-generator':
            systemRole = "You are a professional screenwriter for short-form video.";
            prompt = `
                Write a 30-60 second Reel/TikTok script about: "${input}".
                Include Hook, Body (3 points), and Call to Action.
                Include visual cues in brackets.
            `;
            jsonStructure = `
                {
                    "title": "Script Title",
                    "hook": "Visual/Audio Hook",
                    "body": "Main script content with cues",
                    "cta": "Call to action"
                }
            `;
            break;

        case 'analytics':
            systemRole = "You are a social media analytics expert.";
            prompt = `
                Simulate a detailed performance report for a profile in the "${input}" niche.
                Provide growth metrics, engagement rates, and 3 actionable insights for improvement.
            `;
            jsonStructure = `
                {
                    "metrics": {
                        "growth": "+15%",
                        "engagement": "4.8%",
                        "reach": "12.5k"
                    },
                    "insights": [
                        "Insight 1",
                        "Insight 2",
                        "Insight 3"
                    ]
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
