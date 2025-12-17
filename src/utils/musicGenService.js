/**
 * Music Generation Service
 * Integrates with Hugging Face's MusicGen model via Supabase Edge Function
 */

import { supabase } from '../lib/supabase';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

/**
 * Generate music from a text prompt using Hugging Face's MusicGen model
 * @param {string} prompt - Text description of the music to generate
 * @param {Object} options - Generation options
 * @param {number} options.duration - Duration in seconds (5, 10, 15, or 30)
 * @param {number} options.temperature - Creativity level (0.8 - 1.2, default 1.0)
 * @returns {Promise<Blob>} - Audio blob (WAV format)
 */
export const generateMusic = async (prompt, options = {}) => {
    if (!prompt || prompt.trim().length === 0) {
        throw new Error('Please provide a music description.');
    }

    const { duration = 10, temperature = 1.0 } = options;

    // Validate duration
    if (![5, 10, 15, 30].includes(duration)) {
        throw new Error('Duration must be 5, 10, 15, or 30 seconds.');
    }

    const payload = {
        prompt: prompt.trim(),
        duration: duration,
        temperature: temperature,
    };

    // Retry logic with exponential backoff
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Call Supabase Edge Function instead of direct API
            const { data, error } = await supabase.functions.invoke('generate-music', {
                body: payload,
            });

            if (error) {
                // Check for specific error types
                if (error.message && error.message.includes('MODEL_LOADING')) {
                    throw new Error('MODEL_LOADING:20');
                }
                if (error.message && error.message.includes('RATE_LIMIT')) {
                    throw new Error('RATE_LIMIT:Rate limit exceeded. Please wait a moment and try again.');
                }
                throw new Error(error.message || 'Failed to generate music');
            }

            // The data should be the audio blob
            if (!data) {
                throw new Error('No audio data received from server.');
            }

            // Convert the response to a Blob if it isn't already
            let audioBlob;
            if (data instanceof Blob) {
                audioBlob = data;
            } else {
                // If data is ArrayBuffer or similar, convert it
                audioBlob = new Blob([data], { type: 'audio/wav' });
            }

            // Verify we got actual audio data
            if (audioBlob.size === 0) {
                throw new Error('Received empty audio file from server.');
            }

            return audioBlob;

        } catch (error) {
            lastError = error;

            // Don't retry on validation errors
            if (error.message.includes('Please provide a music description')) {
                throw error;
            }

            // Handle model loading - wait and retry
            if (error.message.startsWith('MODEL_LOADING:')) {
                const waitTime = parseInt(error.message.split(':')[1]) * 1000;
                console.log(`Model is loading, waiting ${waitTime / 1000}s before retry ${attempt}/${MAX_RETRIES}...`);

                if (attempt < MAX_RETRIES) {
                    await sleep(waitTime);
                    continue;
                } else {
                    throw new Error('Model is still loading. Please try again in a minute.');
                }
            }

            // Handle rate limiting - wait and retry
            if (error.message.startsWith('RATE_LIMIT:')) {
                if (attempt < MAX_RETRIES) {
                    const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
                    console.log(`Rate limited, waiting ${retryDelay / 1000}s before retry ${attempt}/${MAX_RETRIES}...`);
                    await sleep(retryDelay);
                    continue;
                } else {
                    throw new Error('Rate limit exceeded. Please try again in a few minutes.');
                }
            }

            // For other errors, retry with exponential backoff
            if (attempt < MAX_RETRIES) {
                const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
                console.log(`Attempt ${attempt} failed, retrying in ${retryDelay / 1000}s...`);
                await sleep(retryDelay);
            }
        }
    }

    // All retries exhausted
    throw new Error(lastError?.message || 'Failed to generate music after multiple attempts. Please try again later.');
};

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get suggested prompts for inspiration
 * @returns {Array<string>} - Array of example prompts
 */
export const getSuggestedPrompts = () => {
    return [
        'upbeat electronic dance music with synth',
        'calm acoustic guitar melody',
        'epic orchestral soundtrack',
        'lo-fi hip hop beats',
        'energetic rock with drums and guitar',
        'ambient space music with pads',
        'jazz piano improvisation',
        'tropical house with steel drums',
        'cinematic trailer music',
        'chill wave synth background'
    ];
};

/**
 * Validate and sanitize user prompt
 * @param {string} prompt - User input prompt
 * @returns {string} - Sanitized prompt
 */
export const sanitizePrompt = (prompt) => {
    if (!prompt) return '';

    // Remove excessive whitespace
    let sanitized = prompt.trim().replace(/\s+/g, ' ');

    // Limit length to prevent API issues
    const MAX_LENGTH = 200;
    if (sanitized.length > MAX_LENGTH) {
        sanitized = sanitized.substring(0, MAX_LENGTH);
    }

    return sanitized;
};
