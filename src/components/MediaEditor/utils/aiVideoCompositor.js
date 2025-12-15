/**
 * AI Video Compositor Service
 * Main orchestrator for automatic video composition
 * Analyzes audio and video to create intelligent compositions
 */

import Groq from "groq-sdk";
import { detectBeats, calculateTempo, getEnergyProfile, detectAudioSegments, generateWaveform } from './waveformUtils';

// Cache for analysis results
const analysisCache = new Map();

/**
 * Analyzes audio track for composition
 * @param {string} audioUrl - URL of audio file
 * @param {string} apiKey - Groq API key
 * @returns {Promise<Object>} Audio analysis result
 */
/**
 * Analyzes audio track for composition
 * Matches Architecture Diagram: Audio Analyzer -> Beat, Tempo, Mood, Energy
 * @param {string} audioUrl - URL of audio file
 * @param {string} apiKey - Groq API key
 * @returns {Promise<Object>} Audio analysis result
 */
export const analyzeAudioForComposition = async (audioUrl, apiKey) => {
    // Check cache
    const cacheKey = `audio-${audioUrl}`;
    if (analysisCache.has(cacheKey)) {
        return analysisCache.get(cacheKey);
    }

    try {
        // 1. Detect beats using Web Audio API (Core Requirement)
        let beats = await detectBeats(audioUrl);
        if (!beats || beats.length === 0) {
            // Fallback: Generate artificial beats if detection fails
            console.warn('Beat detection failed, using fallback 120 BPM');
            beats = generateArtificialBeats(180, 120); // Default 3 mins at 120 BPM
        }

        // 2. Calculate tempo (BPM)
        const tempo = calculateTempo(beats) || 120;

        // 3. Get energy profile (Core Requirement)
        let energyProfile = await getEnergyProfile(audioUrl, 100);
        if (!energyProfile || energyProfile.length === 0) {
            energyProfile = new Array(100).fill(0.5); // Flat energy fallback
        }

        // 4. Detect segments (Core Requirement)
        let segments = await detectAudioSegments(audioUrl);

        // 5. Use AI to enhance analysis with mood and genre (AI Layer)
        const aiAnalysis = await analyzeAudioWithAI(audioUrl, energyProfile, tempo, apiKey);

        // Ensure we have at least one segment (Robustness)
        if (!segments || segments.length === 0) {
            segments = [{
                start: 0,
                end: aiAnalysis.duration || 180,
                mood: aiAnalysis.mood || 'neutral',
                energy: 0.5
            }];
        }

        const result = {
            beats,
            tempo,
            energy: energyProfile,
            segments: segments.map((seg, idx) => ({
                ...seg,
                mood: aiAnalysis.segments?.[idx]?.mood || seg.mood || 'neutral',
                description: aiAnalysis.segments?.[idx]?.description || ''
            })),
            mood: aiAnalysis.mood || 'neutral',
            genre: aiAnalysis.genre || 'pop',
            duration: aiAnalysis.duration || 180
        };

        // Cache result
        analysisCache.set(cacheKey, result);

        return result;
    } catch (error) {
        console.error('Audio analysis failed:', error);
        // Return safe fallback object to prevent crash
        return {
            beats: generateArtificialBeats(180, 120),
            tempo: 120,
            energy: new Array(100).fill(0.5),
            segments: [{ start: 0, end: 180, mood: 'neutral', energy: 0.5 }],
            mood: 'neutral',
            genre: 'pop',
            duration: 180
        };
    }
};

/**
 * Generates artificial beats for fallback
 */
const generateArtificialBeats = (duration, bpm) => {
    const interval = 60 / bpm;
    const beats = [];
    for (let t = 0; t < duration; t += interval) {
        beats.push(t);
    }
    return beats;
};

/**
 * Analyzes audio using Groq AI for mood and structure
 */
const analyzeAudioWithAI = async (audioUrl, energyProfile, tempo, apiKey) => {
    if (!apiKey) {
        // Fallback to basic analysis without AI
        return {
            mood: 'neutral',
            genre: 'unknown',
            segments: [],
            duration: 0
        };
    }

    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

    // Create a description of the audio characteristics
    const avgEnergy = energyProfile.reduce((a, b) => a + b, 0) / energyProfile.length;
    const maxEnergy = Math.max(...energyProfile);
    const minEnergy = Math.min(...energyProfile);
    const energyVariance = maxEnergy - minEnergy;

    const waveformDescription = `
        Tempo: ${tempo} BPM
        Average Energy: ${avgEnergy.toFixed(2)}
        Energy Range: ${minEnergy.toFixed(2)} to ${maxEnergy.toFixed(2)}
        Energy Variance: ${energyVariance.toFixed(2)}
        Energy Pattern: ${energyProfile.slice(0, 20).map(e => e.toFixed(2)).join(', ')}...
    `;

    const prompt = `
        Analyze this audio track based on its characteristics:
        
        ${waveformDescription}
        
        Provide a JSON response with:
        {
            "mood": "energetic" | "calm" | "dramatic" | "upbeat" | "melancholic",
            "genre": "electronic" | "rock" | "pop" | "classical" | "hip-hop" | "ambient" | "cinematic",
            "duration": 180,
            "segments": [
                {
                    "mood": "intro" | "buildup" | "drop" | "breakdown" | "outro",
                    "description": "Brief description of this section"
                }
            ]
        }
        
        Base your analysis on:
        - High tempo (>140 BPM) + high energy variance = energetic/electronic
        - Low tempo (<90 BPM) + low energy = calm/ambient
        - High energy variance = dramatic/cinematic
        - Medium tempo (90-130 BPM) + consistent energy = pop/upbeat
    `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No content generated");

        return JSON.parse(content);
    } catch (error) {
        console.warn('AI audio analysis failed, using fallback:', error);
        // Fallback based on simple heuristics
        return {
            mood: avgEnergy > 0.7 ? 'energetic' : avgEnergy < 0.3 ? 'calm' : 'upbeat',
            genre: tempo > 140 ? 'electronic' : tempo < 90 ? 'ambient' : 'pop',
            segments: [],
            duration: 0
        };
    }
};

/**
 * Clears the analysis cache (useful for testing or memory management)
 */
export const clearAnalysisCache = () => {
    analysisCache.clear();
};

/**
 * Gets cached analysis if available
 */
export const getCachedAnalysis = (audioUrl) => {
    return analysisCache.get(`audio-${audioUrl} `);
};
