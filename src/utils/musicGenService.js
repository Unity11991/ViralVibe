/**
 * MusicGen Service - Supabase Edge Function Integration
 * Free AI music generation from text using Meta's MusicGen model
 * Uses Supabase Edge Function to avoid CORS issues
 */

import { supabase } from '../lib/supabase';

/**
 * Generate music from text prompt using Supabase Edge Function
 * @param {string} prompt - Text description of the music to generate
 * @param {number} duration - Duration in seconds (default: 15, max: 30)
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<Blob>} - Audio blob (WAV format)
 */
export const generateMusic = async (prompt, duration = 15, onProgress = null) => {
    if (!prompt || prompt.trim().length === 0) {
        throw new Error("Music description is required");
    }

    // Validate duration
    const validDuration = Math.min(Math.max(duration, 5), 30);

    try {
        if (onProgress) {
            onProgress({
                status: 'starting',
                message: 'Connecting to music generation service...',
                progress: 10
            });
        }

        // Get Supabase URL and anon key
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = supabase.supabaseUrl;
        const supabaseKey = supabase.supabaseKey;

        // Use direct fetch to get binary response properly
        const functionUrl = `${supabaseUrl}/functions/v1/generate-music`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
                prompt: prompt,
                duration: validDuration
            })
        });

        if (!response.ok) {
            // Check if model is loading
            if (response.status === 503) {
                const data = await response.json();
                if (data.loading) {
                    const estimatedTime = data.estimated_time || 20;

                    if (onProgress) {
                        onProgress({
                            status: 'loading',
                            message: `Model is warming up... (~${Math.ceil(estimatedTime)}s)`,
                            progress: 20
                        });
                    }

                    // Wait and retry
                    await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
                    return generateMusic(prompt, duration, onProgress); // Retry
                }
            }

            // Try to get error message
            let errorMsg = 'Failed to generate music';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) {
                // Response wasn't JSON
            }

            throw new Error(errorMsg);
        }

        if (onProgress) {
            onProgress({
                status: 'processing',
                message: 'Processing audio...',
                progress: 80
            });
        }

        // Get the audio blob
        const audioBlob = await response.blob();

        if (!audioBlob || audioBlob.size === 0) {
            throw new Error('No audio data received');
        }

        if (onProgress) {
            onProgress({ status: 'complete', message: 'Music generated!', progress: 100 });
        }

        return audioBlob;

    } catch (error) {
        console.error("MusicGen Error:", error);
        throw new Error(`Music generation failed: ${error.message}`);
    }
};

/**
 * Convert audio blob to AudioBuffer for Web Audio API
 * @param {Blob} blob - Audio blob
 * @param {AudioContext} audioContext - Web Audio API context
 * @returns {Promise<AudioBuffer>}
 */
export const blobToAudioBuffer = async (blob, audioContext) => {
    const arrayBuffer = await blob.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
};

/**
 * Download audio blob as file
 * @param {Blob} blob - Audio blob
 * @param {string} filename - Filename for download
 */
export const downloadAudio = (blob, filename = "generated-music.wav") => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Get suggested music prompts for inspiration
 * @returns {Array<Object>} - Array of prompt suggestions
 */
export const getMusicPrompts = () => {
    return [
        { label: "Upbeat Dance", prompt: "upbeat electronic dance music with energetic beats" },
        { label: "Calm Piano", prompt: "calm and peaceful piano melody, relaxing ambient" },
        { label: "Epic Cinematic", prompt: "epic cinematic orchestral music with dramatic strings" },
        { label: "Lo-fi Chill", prompt: "lo-fi hip hop chill beats, relaxed and mellow" },
        { label: "Rock Energy", prompt: "energetic rock music with electric guitar and drums" },
        { label: "Jazz Smooth", prompt: "smooth jazz with saxophone and piano" },
        { label: "Reggae Vibes", prompt: "reggae music with relaxed tropical vibes" },
        { label: "Classical", prompt: "classical orchestral music with violin and cello" },
    ];
};
