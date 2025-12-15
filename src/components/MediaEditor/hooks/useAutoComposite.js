/**
 * useAutoComposite Hook
 * Manages state and operations for AI-powered video compositing
 */

import { useState, useCallback, useRef } from 'react';
import { analyzeAudioForComposition } from '../utils/aiVideoCompositor';
import { analyzeVideoContent } from '../utils/aiSceneAnalyzer';
import { generateComposition, COMPOSITION_STYLES } from '../utils/compositionEngine';

export const useAutoComposite = (apiKey) => {
    // State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [analysisStatus, setAnalysisStatus] = useState('');
    const [audioAnalysis, setAudioAnalysis] = useState(null);
    const [videoAnalyses, setVideoAnalyses] = useState([]);
    const [compositionPlan, setCompositionPlan] = useState(null);
    const [selectedStyle, setSelectedStyle] = useState('musicVideo');
    const [error, setError] = useState(null);

    // Options
    const [options, setOptions] = useState({
        transitionIntensity: 0.5,
        colorGradeStrength: 0.8,
        beatSyncSensitivity: 0.5,
        minClipDuration: null, // null = use style default
        maxClipDuration: null
    });

    // Refs
    const abortControllerRef = useRef(null);

    /**
     * Analyzes audio track
     */
    const analyzeAudio = useCallback(async (audioUrl) => {
        try {
            setIsAnalyzing(true);
            setAnalysisProgress(10);
            setAnalysisStatus('Analyzing audio...');
            setError(null);

            // Pass apiKey (can be null/undefined for Basic Mode)
            const analysis = await analyzeAudioForComposition(audioUrl, apiKey);

            setAudioAnalysis(analysis);
            setAnalysisProgress(30);
            setAnalysisStatus('Audio analysis complete');

            return analysis;
        } catch (err) {
            console.error('Audio analysis failed:', err);
            setError('Failed to analyze audio: ' + err.message);
            setIsAnalyzing(false);
            return null;
        }
    }, [apiKey]);

    /**
     * Analyzes multiple video clips
     */
    const analyzeVideos = useCallback(async (videoUrls, sampleCount = 5) => {
        try {
            setAnalysisProgress(30);
            setAnalysisStatus(`Analyzing ${videoUrls.length} video clips...`);

            const analyses = [];

            // Analyze videos in parallel (limit to 3 concurrent to avoid overwhelming API)
            // Analyze videos sequentially to avoid rate limits
            for (let i = 0; i < videoUrls.length; i++) {
                const url = videoUrls[i];
                // Pass apiKey (can be null/undefined for Basic Mode)
                const result = await analyzeVideoContent(url, sampleCount, apiKey);
                analyses.push(result);

                // Update progress
                const progress = 30 + ((i + 1) / videoUrls.length) * 30;
                setAnalysisProgress(progress);
                setAnalysisStatus(`Analyzed ${i + 1}/${videoUrls.length} videos...`);

                // Rate Limit Protection: Wait 2 seconds between videos
                if (i < videoUrls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            setVideoAnalyses(analyses);
            setAnalysisProgress(60);
            setAnalysisStatus('Video analysis complete');

            return analyses;
        } catch (err) {
            console.error('Video analysis failed:', err);
            setError('Failed to analyze videos: ' + err.message);
            setIsAnalyzing(false);
            return [];
        }
    }, [apiKey]);

    /**
     * Generates composition from analyses
     */
    const generateCompositionPlan = useCallback((style, customOptions = {}, audioData = null, videoData = null) => {
        const activeAudio = audioData || audioAnalysis;
        const activeVideos = videoData || videoAnalyses;

        if (!activeAudio) {
            setError('Audio analysis required');
            return null;
        }

        if (!activeVideos || activeVideos.length === 0) {
            setError('At least one video analysis required');
            return null;
        }

        try {
            setAnalysisProgress(60);
            setAnalysisStatus('Generating composition...');

            // Merge options
            const mergedOptions = {
                ...options,
                ...customOptions
            };

            const plan = generateComposition(
                activeAudio,
                activeVideos,
                style,
                mergedOptions
            );

            setCompositionPlan(plan);
            setSelectedStyle(style);
            setAnalysisProgress(100);
            setAnalysisStatus('Composition ready!');
            setIsAnalyzing(false);

            return plan;
        } catch (err) {
            console.error('Composition generation failed:', err);
            setError('Failed to generate composition: ' + err.message);
            setIsAnalyzing(false);
            return null;
        }
    }, [audioAnalysis, videoAnalyses, options]);

    /**
     * Complete workflow: analyze audio + videos + generate composition
     */
    const createAutoComposition = useCallback(async (
        audioUrl,
        videoUrls,
        style = 'musicVideo',
        customOptions = {}
    ) => {
        try {
            setIsAnalyzing(true);
            setAnalysisProgress(0);
            setError(null);

            // Step 1: Analyze audio
            const audioResult = await analyzeAudio(audioUrl);
            if (!audioResult) return null;

            // Step 2: Analyze videos
            const videoResults = await analyzeVideos(videoUrls);
            if (videoResults.length === 0) return null;

            // Step 3: Generate composition
            // Pass results directly to avoid state race condition
            const plan = generateCompositionPlan(style, customOptions, audioResult, videoResults);

            return plan;
        } catch (err) {
            console.error('Auto-composition failed:', err);
            setError('Auto-composition failed: ' + err.message);
            setIsAnalyzing(false);
            return null;
        }
    }, [analyzeAudio, analyzeVideos, generateCompositionPlan]);

    /**
     * Resets all state
     */
    const resetComposition = useCallback(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setAnalysisStatus('');
        setAudioAnalysis(null);
        setVideoAnalyses([]);
        setCompositionPlan(null);
        setError(null);
    }, []);

    /**
     * Cancels ongoing analysis
     */
    const cancelAnalysis = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsAnalyzing(false);
        setAnalysisStatus('Cancelled');
    }, []);

    /**
     * Updates options
     */
    const updateOptions = useCallback((newOptions) => {
        setOptions(prev => ({ ...prev, ...newOptions }));
    }, []);

    /**
     * Regenerates composition with different style
     */
    const regenerateWithStyle = useCallback((style) => {
        if (!audioAnalysis || !videoAnalyses.length) {
            setError('Analysis data required to regenerate');
            return null;
        }

        return generateCompositionPlan(style);
    }, [audioAnalysis, videoAnalyses, generateCompositionPlan]);

    return {
        // State
        isAnalyzing,
        analysisProgress,
        analysisStatus,
        audioAnalysis,
        videoAnalyses,
        compositionPlan,
        selectedStyle,
        options,
        error,

        // Actions
        analyzeAudio,
        analyzeVideos,
        generateCompositionPlan,
        createAutoComposition,
        resetComposition,
        cancelAnalysis,
        updateOptions,
        regenerateWithStyle,
        setSelectedStyle,

        // Utilities
        availableStyles: Object.keys(COMPOSITION_STYLES),
        stylePresets: COMPOSITION_STYLES
    };
};
