/**
 * Composition Engine
 * Core logic for intelligent clip arrangement and effect application
 * Matches Architecture Diagram: Composition Engine -> Clip Matching, Transitions, Grading, Effects
 */

/**
 * Style presets for different composition styles
 */
export const COMPOSITION_STYLES = {
    cinematic: {
        name: 'Cinematic',
        minClipDuration: 3,
        maxClipDuration: 8,
        transitionType: 'crossfade',
        transitionDuration: 1.0,
        beatSync: false,
        colorGradeStrength: 0.8,
        effectIntensity: 0.4
    },
    energetic: {
        name: 'Energetic',
        minClipDuration: 0.5,
        maxClipDuration: 2,
        transitionType: 'cut',
        transitionDuration: 0,
        beatSync: true,
        colorGradeStrength: 1.0,
        effectIntensity: 0.9
    },
    musicVideo: {
        name: 'Music Video',
        minClipDuration: 1,
        maxClipDuration: 4,
        transitionType: 'mixed',
        transitionDuration: 0.3,
        beatSync: true,
        colorGradeStrength: 0.9,
        effectIntensity: 0.8
    },
    smooth: {
        name: 'Smooth',
        minClipDuration: 4,
        maxClipDuration: 10,
        transitionType: 'crossfade',
        transitionDuration: 1.5,
        beatSync: false,
        colorGradeStrength: 0.6,
        effectIntensity: 0.3
    },
    artistic: {
        name: 'Artistic',
        minClipDuration: 2,
        maxClipDuration: 6,
        transitionType: 'mixed',
        transitionDuration: 0.5,
        beatSync: false,
        colorGradeStrength: 1.0,
        effectIntensity: 0.7
    }
};

/**
 * Generates a complete composition plan
 * @param {Object} audioAnalysis - Audio analysis from aiVideoCompositor
 * @param {Array} videoAnalyses - Array of video analyses from aiSceneAnalyzer
 * @param {string} style - Style preset name
 * @param {Object} options - Additional options
 * @returns {Object} Composition plan with clips, transitions, and effects
 */
export const generateComposition = (audioAnalysis, videoAnalyses, style = 'musicVideo', options = {}) => {
    const stylePreset = COMPOSITION_STYLES[style] || COMPOSITION_STYLES.musicVideo;
    const { beats, tempo, energy, segments, duration } = audioAnalysis;

    // --- Step 1: Clip Matching Algorithm ---
    // Matches clips to audio segments based on mood and energy
    const clipAssignments = matchClipsToSegments(videoAnalyses, segments, audioAnalysis, stylePreset);

    // --- Step 2: Arrange Clips (Timeline Output) ---
    // Calculates exact timing, duration, and order
    const clipPlacements = arrangeClipsOnTimeline(clipAssignments, beats, duration, stylePreset);

    // --- Step 3: Transition Selector ---
    // Selects transitions based on context (beat, energy, mood change)
    const transitions = selectTransitions(clipPlacements, stylePreset, energy, beats);

    // --- Step 4: Color Grading Engine ---
    // Applies mood-based color grading
    const clipsWithGrading = applyColorGrading(clipPlacements, stylePreset);

    // --- Step 5: Effect Applicator ---
    // Adds beat-synced effects
    const clipsWithEffects = applyEffects(clipsWithGrading, audioAnalysis, stylePreset, beats);

    return {
        clips: clipsWithEffects,
        transitions,
        duration,
        style,
        metadata: {
            audioMood: audioAnalysis.mood,
            tempo,
            totalClips: clipsWithEffects.length,
            beatSynced: stylePreset.beatSync
        }
    };
};

/**
 * Step 1: Intelligent Clip Matching
 * Scores videos against audio segments to find the best fit
 */
const matchClipsToSegments = (videoAnalyses, audioSegments, audioAnalysis, stylePreset) => {
    // Safety check
    if (!videoAnalyses || videoAnalyses.length === 0) return [];

    // Ensure we have segments
    const safeSegments = (audioSegments && audioSegments.length > 0)
        ? audioSegments
        : [{ start: 0, end: audioAnalysis.duration || 180, mood: 'neutral', energy: 0.5 }];

    const assignments = [];
    const usedVideoIds = new Set();

    safeSegments.forEach(segment => {
        // Score all videos for this segment
        const scoredVideos = videoAnalyses.map(video => ({
            video,
            score: calculateMatchScore(video, segment, audioAnalysis.mood)
        })).sort((a, b) => b.score - a.score);

        // Pick best available video, or reuse if necessary
        let selectedVideo = scoredVideos.find(v => !usedVideoIds.has(v.video.id))?.video;

        if (!selectedVideo) {
            // If all used, pick the absolute best match again (reuse)
            selectedVideo = scoredVideos[0].video;
        }

        usedVideoIds.add(selectedVideo.id);

        assignments.push({
            segment,
            video: selectedVideo
        });
    });

    return assignments;
};

/**
 * Calculates a match score (0-100) between a video and an audio segment
 */
const calculateMatchScore = (video, segment, globalMood) => {
    let score = 0;

    // 1. Mood Match (50 points)
    if (video.mood === segment.mood) score += 50;
    else if (video.mood === globalMood) score += 30;
    else if (areMoodsCompatible(video.mood, segment.mood)) score += 20;

    // 2. Energy Match (30 points)
    // High energy audio should match high action video
    const energyDiff = Math.abs((segment.energy || 0.5) - (video.actionLevel || 0.5));
    score += 30 * (1 - energyDiff);

    // 3. Variety Bonus (20 points)
    // Prefer clips we haven't seen recently (handled by usage tracking in parent)

    return score;
};

const areMoodsCompatible = (mood1, mood2) => {
    const groups = [
        ['happy', 'energetic', 'upbeat', 'action'],
        ['sad', 'calm', 'melancholic', 'neutral'],
        ['dramatic', 'tense', 'action']
    ];
    return groups.some(group => group.includes(mood1) && group.includes(mood2));
};

/**
 * Step 2: Arrange Clips on Timeline
 */
const arrangeClipsOnTimeline = (assignments, beats, totalDuration, stylePreset) => {
    const placements = [];
    let currentTime = 0;
    let assignmentIndex = 0;

    // Safety loop limit
    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (currentTime < totalDuration && iterations < MAX_ITERATIONS) {
        iterations++;

        // Cycle through assignments if we run out
        const assignment = assignments[assignmentIndex % assignments.length];
        const video = assignment.video;

        // Determine ideal duration
        let clipDuration = calculateClipDuration(currentTime, beats, stylePreset, video.duration);

        // Ensure we don't exceed total duration
        if (currentTime + clipDuration > totalDuration) {
            clipDuration = totalDuration - currentTime;
        }

        // Random start offset in video
        const maxOffset = Math.max(0, (video.duration || 5) - clipDuration);
        const startOffset = Math.random() * maxOffset;

        placements.push({
            trackId: 'track-main',
            source: video.id,
            startTime: currentTime,
            duration: clipDuration,
            startOffset,
            videoAnalysis: video
        });

        currentTime += clipDuration;
        assignmentIndex++;
    }

    return placements;
};

/**
 * Calculates clip duration based on beats and style
 */
const calculateClipDuration = (currentTime, beats, stylePreset, videoDuration) => {
    let duration = stylePreset.minClipDuration;
    const maxDur = Math.min(stylePreset.maxClipDuration, videoDuration || 10);

    if (stylePreset.beatSync && beats && beats.length > 0) {
        // Find next valid beat
        const nextBeat = beats.find(b => b > currentTime + stylePreset.minClipDuration);
        if (nextBeat) {
            const beatDuration = nextBeat - currentTime;
            if (beatDuration <= maxDur) {
                duration = beatDuration;
            } else {
                // If next beat is too far, find a beat that fits
                // or just use max duration
                duration = maxDur;
            }
        } else {
            duration = Math.min(maxDur, 3); // Default if no beats left
        }
    } else {
        // Random duration within range for non-synced styles
        duration = stylePreset.minClipDuration + Math.random() * (maxDur - stylePreset.minClipDuration);
    }

    return Math.max(0.5, duration); // Absolute minimum safety
};

/**
 * Step 3: Transition Selector
 */
const selectTransitions = (clips, stylePreset, energyProfile, beats) => {
    const transitions = [];

    for (let i = 0; i < clips.length - 1; i++) {
        const clip = clips[i];
        const transitionTime = clip.startTime + clip.duration;

        let type = stylePreset.transitionType;
        let duration = stylePreset.transitionDuration;

        if (type === 'mixed') {
            // Context-aware selection
            const energy = getEnergyAtTime(transitionTime, energyProfile);
            const isOnBeat = isNearBeat(transitionTime, beats);

            if (energy > 0.7 && isOnBeat) {
                type = 'cut'; // High energy + beat = Cut
                duration = 0;
            } else if (energy < 0.4) {
                type = 'crossfade'; // Low energy = Crossfade
                duration = 1.0;
            } else {
                type = 'zoom'; // Medium energy = Dynamic
                duration = 0.4;
            }
        }

        transitions.push({
            fromClipIndex: i,
            toClipIndex: i + 1,
            type,
            duration,
            timestamp: transitionTime
        });
    }

    return transitions;
};

const isNearBeat = (time, beats) => {
    if (!beats) return false;
    return beats.some(b => Math.abs(b - time) < 0.15);
};

const getEnergyAtTime = (time, energyProfile) => {
    if (!energyProfile || energyProfile.length === 0) return 0.5;
    const idx = Math.floor((time / 180) * energyProfile.length); // Approx mapping
    return energyProfile[Math.min(idx, energyProfile.length - 1)] || 0.5;
};

/**
 * Step 4: Color Grading Engine
 */
const applyColorGrading = (clips, stylePreset) => {
    return clips.map(clip => {
        const mood = clip.videoAnalysis.mood || 'neutral';
        const filter = getFilterForMood(mood);

        return {
            ...clip,
            filter,
            adjustments: getAdjustmentsForFilter(filter, stylePreset.colorGradeStrength)
        };
    });
};

const getFilterForMood = (mood) => {
    const map = {
        energetic: 'cinematic-3',
        happy: 'film-1',
        dramatic: 'cinematic-2',
        calm: 'nature-1',
        sad: 'mood-1',
        tense: 'genre-1',
        neutral: 'normal'
    };
    return map[mood] || 'normal';
};

const getAdjustmentsForFilter = (filter, strength) => {
    // Simplified adjustment logic
    return {
        saturation: 1 + (strength * 0.2),
        contrast: 1 + (strength * 0.1)
    };
};

/**
 * Step 5: Effect Applicator
 */
const applyEffects = (clips, audioAnalysis, stylePreset, beats) => {
    return clips.map(clip => {
        const effects = [];
        const clipMid = clip.startTime + clip.duration / 2;
        const energy = getEnergyAtTime(clipMid, audioAnalysis.energy);

        // Beat-synced effects
        if (stylePreset.beatSync && energy > 0.7) {
            const clipBeats = beats.filter(b => b >= clip.startTime && b < clip.startTime + clip.duration);
            if (clipBeats.length > 0) {
                effects.push({
                    type: 'pulse',
                    intensity: stylePreset.effectIntensity,
                    beatTimestamps: clipBeats
                });
            }
        }

        return {
            ...clip,
            effects
        };
    });
};
