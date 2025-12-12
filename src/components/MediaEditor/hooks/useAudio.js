import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing multiple audio tracks
 */
export const useAudio = (videoRef) => {
    const [audioTracks, setAudioTracks] = useState([]);
    const [videoVolume, setVideoVolume] = useState(1);

    // Audio Context and Nodes
    const audioContextRef = useRef(null);
    const gainNodesRef = useRef({}); // Map track ID to gain node
    const sourceNodesRef = useRef({}); // Map track ID to source node
    const audioBuffersRef = useRef({}); // Map track ID to audio buffer

    // Initialize AudioContext
    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Sync with video playback
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            playAllTracks(video.currentTime);
        };

        const handlePause = () => {
            stopAllTracks();
        };

        const handleSeek = () => {
            stopAllTracks();
            // Only restart if video is playing (though usually seek pauses video)
            if (!video.paused) {
                playAllTracks(video.currentTime);
            }
        };

        const handleVolumeChange = () => {
            // Handle video volume change if we were controlling it via WebAudio, 
            // but for now we just let video element handle its own volume unless we intercept it for export.
            // However, we track it in state for UI.
            setVideoVolume(video.volume);
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeking', handleSeek);
        video.addEventListener('seeked', handleSeek);
        video.addEventListener('volumechange', handleVolumeChange);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeking', handleSeek);
            video.removeEventListener('seeked', handleSeek);
            video.removeEventListener('volumechange', handleVolumeChange);
        };
    }, [videoRef, audioTracks]);

    const playAllTracks = (startTime) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

        audioTracks.forEach(track => {
            const buffer = audioBuffersRef.current[track.id];
            if (!buffer) return;

            // Stop existing source if any
            if (sourceNodesRef.current[track.id]) {
                try {
                    sourceNodesRef.current[track.id].stop();
                } catch (e) { }
            }

            // Create new source
            const source = ctx.createBufferSource();
            source.buffer = buffer;

            // Create or get gain node
            if (!gainNodesRef.current[track.id]) {
                const gainNode = ctx.createGain();
                gainNode.connect(ctx.destination);
                gainNodesRef.current[track.id] = gainNode;
            }
            const gainNode = gainNodesRef.current[track.id];
            gainNode.gain.value = track.volume;

            source.connect(gainNode);

            // Calculate offset and duration
            // Logic: 
            // Track has a start time on timeline (track.startTime)
            // Video is at startTime (currentTime)
            // We need to play the part of audio that corresponds to this time.

            // Case 1: Video time is before track start
            // Schedule to start in future

            // Case 2: Video time is inside track duration
            // Start immediately with offset

            // Case 3: Video time is after track end
            // Do nothing

            const trackStart = track.startTime || 0;
            const trackDuration = buffer.duration;
            const trackEnd = trackStart + trackDuration;

            if (startTime < trackStart) {
                // Schedule start
                const delay = trackStart - startTime;
                source.start(ctx.currentTime + delay);
            } else if (startTime >= trackStart && startTime < trackEnd) {
                // Start immediately with offset
                const offset = startTime - trackStart;
                source.start(ctx.currentTime, offset);
            }
            // If startTime >= trackEnd, don't play

            sourceNodesRef.current[track.id] = source;
        });
    };

    const stopAllTracks = () => {
        Object.values(sourceNodesRef.current).forEach(source => {
            try {
                source.stop();
            } catch (e) { }
        });
        sourceNodesRef.current = {};
    };

    const addAudioTrack = useCallback(async (file) => {
        if (!audioContextRef.current) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

            const newTrack = {
                id: `audio-${Date.now()}`,
                name: file.name,
                startTime: 0, // Start at beginning by default
                duration: audioBuffer.duration,
                volume: 0.5,
                file: file
            };

            audioBuffersRef.current[newTrack.id] = audioBuffer;
            setAudioTracks(prev => [...prev, newTrack]);

            return newTrack;
        } catch (error) {
            console.error('Error adding audio track:', error);
            throw error;
        }
    }, []);

    const removeAudioTrack = useCallback((id) => {
        setAudioTracks(prev => prev.filter(t => t.id !== id));

        // Cleanup nodes
        if (sourceNodesRef.current[id]) {
            try { sourceNodesRef.current[id].stop(); } catch (e) { }
            delete sourceNodesRef.current[id];
        }
        if (gainNodesRef.current[id]) {
            gainNodesRef.current[id].disconnect();
            delete gainNodesRef.current[id];
        }
        delete audioBuffersRef.current[id];
    }, []);

    const updateAudioTrack = useCallback((id, updates) => {
        setAudioTracks(prev => prev.map(t => {
            if (t.id === id) {
                const updated = { ...t, ...updates };

                // Update live volume if changed
                if (updates.volume !== undefined && gainNodesRef.current[id]) {
                    gainNodesRef.current[id].gain.value = updates.volume;
                }

                return updated;
            }
            return t;
        }));
    }, []);

    const updateVideoVolume = useCallback((volume) => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            setVideoVolume(volume);
        }
    }, [videoRef]);

    return {
        audioTracks,
        videoVolume,
        addAudioTrack,
        removeAudioTrack,
        updateAudioTrack,
        updateVideoVolume,
        audioContext: audioContextRef.current,
        audioBuffers: audioBuffersRef.current
    };
};
