import React, { useState, useRef, useEffect } from 'react';

import { Play, Pause, Square, Mic, Upload, Download, Wand2, Volume2, Settings2, ArrowLeft, MessageSquare, Plus, Repeat, Scissors, Layers } from 'lucide-react';
import AudioTimeline from './AudioTimeline';
import TakesManager from './TakesManager';
import { generateAudioScript } from '../../utils/aiService';

const VOICE_OPTIONS = [
    { name: 'Joanna (US Female)', value: 'Joanna' },
    { name: 'Matthew (US Male)', value: 'Matthew' },
    { name: 'Ivy (US Child)', value: 'Ivy' },
    { name: 'Amy (UK Female)', value: 'Amy' },
    { name: 'Brian (UK Male)', value: 'Brian' },
    { name: 'OpenAI Alloy', value: 'alloy', provider: 'openai' },
    { name: 'OpenAI Echo', value: 'echo', provider: 'openai' },
    { name: 'OpenAI Shimmer', value: 'shimmer', provider: 'openai' },
    { name: 'Aditi (Hindi/English)', value: 'Aditi', provider: 'aws-polly', language: 'hi-IN' },
];

// Helper to generate Reverb Impulse
const generateImpulse = (ctx, duration, decay) => {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = i;
        // Simple exponential decay white noise
        const val = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        left[i] = val;
        right[i] = val;
    }
    return impulse;
};

const AudioStudio = ({ onClose, isPro }) => {
    // Audio Context State
    const [audioContext, setAudioContext] = useState(null);
    const [sourceNode, setSourceNode] = useState(null);
    const [activeSources, setActiveSources] = useState([]);
    const [gainNode, setGainNode] = useState(null);
    const [analyserNode, setAnalyserNode] = useState(null);

    // Multi-track State
    const defaultEffects = {
        eq: { low: 0, mid: 0, high: 0 },
        compressor: { threshold: -24, ratio: 12, active: false },
        deesser: { active: false, threshold: -20, frequency: 6000 },
        cleaning: { active: false, lowCut: 80, highCut: 16000, gate: -60 },
        reverb: { active: false, mix: 0, decay: 2.0 },
        delay: { active: false, time: 0.3, feedback: 0.4, mix: 0 }
    };
    const [tracks, setTracks] = useState([
        { id: crypto.randomUUID(), name: 'Voiceover', clips: [], volume: 1, muted: false, isArmed: true, takes: [], effects: { ...defaultEffects }, automation: { volume: [] } },
        { id: crypto.randomUUID(), name: 'Music', clips: [], volume: 0.8, muted: false, isArmed: false, takes: [], effects: { ...defaultEffects }, automation: { volume: [] } },
        { id: crypto.randomUUID(), name: 'SFX', clips: [], volume: 1, muted: false, isArmed: false, takes: [], effects: { ...defaultEffects }, automation: { volume: [] } },
    ]);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(60); // Default 60s
    const [selectedClip, setSelectedClip] = useState(null); // { trackId, clipId }
    const [selectedTrackId, setSelectedTrackId] = useState(null); // ID of track specific for mixing
    const [volume, setVolume] = useState(1);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingMode, setRecordingMode] = useState('standard'); // 'standard', 'punch', 'loop'
    const [punchRange, setPunchRange] = useState({ in: 0, out: 0, active: false });
    const [loopRange, setLoopRange] = useState({ start: 0, end: 10, active: false });
    const activeRecordersRef = useRef(new Map()); // trackId -> MediaRecorder
    const activeStreamsRef = useRef(new Map()); // trackId -> Stream
    const chunksRef = useRef(new Map()); // trackId -> chunks[]

    // Effects State
    const [voiceClarity, setVoiceClarity] = useState(false);
    const [clarityNodes, setClarityNodes] = useState(null);

    // AI Script State
    const [scriptTopic, setScriptTopic] = useState('');
    const [generatedScript, setGeneratedScript] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // TTS State
    const [ttsText, setTtsText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].value);
    const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);

    // UI State
    const [showTakesForTrack, setShowTakesForTrack] = useState(null);
    const [showSpectrogram, setShowSpectrogram] = useState(false); // Toggle Spectral View

    const startTimeRef = useRef(0);
    const pauseTimeRef = useRef(0);
    const animationFrameRef = useRef(null);

    // Initialize Audio Context
    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        const analyser = ctx.createAnalyser();

        analyser.fftSize = 2048;
        gain.connect(analyser);
        analyser.connect(ctx.destination);

        setAudioContext(ctx);
        setGainNode(gain);
        setAnalyserNode(analyser);

        return () => {
            ctx.close();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    // Helper to add clip
    const addClipToTrack = (buffer, name = 'Clip', trackId = null, startTime = currentTime) => {
        const newClip = {
            id: crypto.randomUUID(),
            name: name,
            buffer: buffer,
            duration: buffer.duration,
            startTime: startTime,
            offset: 0,
            bufferDuration: buffer.duration,
            speed: 1.0,
            pitch: 0,
            fadeIn: 0,
            fadeOut: 0
        };

        const defaultEffects = {
            eq: { low: 0, mid: 0, high: 0 },
            compressor: { threshold: -24, ratio: 12, active: false },
            deesser: { active: false, threshold: -20, frequency: 6000 },
            cleaning: { active: false, lowCut: 80, highCut: 16000, gate: -60 },
            reverb: { active: false, mix: 0.3, decay: 2.0 },
            delay: { active: false, time: 0.3, feedback: 0.4, mix: 0.3 }
        };

        updateTracksWithHistory(prev => {
            return prev.map((track, index) => {
                // If trackId is provided, add to that track.
                // If not, add to first track (legacy behavior / upload)
                if (trackId ? track.id === trackId : index === 0) {
                    // Ensure effects object exists
                    const effects = track.effects || defaultEffects;
                    return {
                        ...track,
                        clips: [...track.clips, newClip],
                        effects: effects,
                        automation: track.automation || { volume: [] }
                    };
                }
                return track;
            });
        });

        const end = startTime + buffer.duration;
        if (end > duration) setDuration(end);
    };

    // File Upload Handler
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        addClipToTrack(buffer, file.name);
    };

    // Play/Pause Logic
    const togglePlayback = () => {
        if (!audioContext) return;

        if (isPlaying) {
            activeSources.forEach(s => {
                try { s.stop(); } catch (e) { }
            });
            setActiveSources([]);

            pauseTimeRef.current = audioContext.currentTime - startTimeRef.current;
            setIsPlaying(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        } else {
            if (audioContext.state === 'suspended') audioContext.resume();

            const newSources = [];
            const startTime = audioContext.currentTime;
            startTimeRef.current = startTime - currentTime;

            tracks.forEach(track => {
                if (track.muted) return;

                track.clips.forEach(clip => {
                    const clipStartAbsolute = clip.startTime;
                    const clipEndAbsolute = clip.startTime + clip.duration;

                    if (clipEndAbsolute < currentTime) return;

                    const source = audioContext.createBufferSource();
                    source.buffer = clip.buffer;
                    // Apply Speed & Pitch
                    source.playbackRate.value = clip.speed || 1.0;
                    source.detune.value = clip.pitch || 0;

                    const trackGain = audioContext.createGain();
                    // Initial volume
                    trackGain.gain.setValueAtTime(track.volume, startTime);

                    // Apply Fades
                    const clipSpeed = clip.speed || 1.0;
                    // Timeline times
                    const clipStart = clip.startTime;
                    const clipEnd = clip.startTime + clip.duration;

                    // Fade In
                    if (clip.fadeIn > 0) {
                        const fadeEnd = clipStart + clip.fadeIn;
                        if (fadeEnd > currentTime) {
                            // If we start playing in middle of fade
                            trackGain.gain.setValueAtTime(0, Math.max(startTime, clipStart)); // Logic simplified, precise needs offset
                            trackGain.gain.linearRampToValueAtTime(track.volume, Math.max(startTime, fadeEnd));
                        }
                    }

                    // Fade Out
                    if (clip.fadeOut > 0) {
                        const fadeStart = clipEnd - clip.fadeOut;
                        if (fadeStart > currentTime) {
                            trackGain.gain.setValueAtTime(track.volume, Math.max(startTime, fadeStart));
                            trackGain.gain.linearRampToValueAtTime(0, clipEnd); // Assuming linear playback maps to timeline time
                        }
                    }

                    // -- Automation --
                    if (track.automation && track.automation.volume && track.automation.volume.length > 0) {
                        const points = track.automation.volume.sort((a, b) => a.time - b.time);

                        // Find starting value
                        // If Playback starts at T=currentTime.
                        // Value at T should be interpolated.
                        // Simple approach: Set value to last point before T, or 1 if none.
                        const pastPoints = points.filter(p => p.time <= currentTime);
                        const futurePoints = points.filter(p => p.time > currentTime);

                        let startVal = track.volume;
                        if (pastPoints.length > 0) {
                            startVal = pastPoints[pastPoints.length - 1].value;
                            // TODO: Linear interpolation between past[last] and future[0] for exact startVal
                            // For MVP, steps or ramp from last known point
                        }

                        // Override the initial volume set above?
                        // If automation is present, it controls gain.
                        // We use cancelScheduledValues to clear fades? Fades are clip level. Automation is Track level.
                        // Gain Node hierarchy: Source -> ClipFades(on separate node?) -> Effects -> TrackGain (Volume/Auto) -> Master
                        // Currently: source -> trackGain (clips fades AND track volume on SAME node). This is bad.
                        // Use separate gain for Clip Fades and Track Volume.
                        // BUT refactoring that is risky now.
                        // Clip fades used `linearRamp` on `trackGain`. 
                        // If I apply automation to `trackGain` too, they conflict.
                        // Solution for THIS session: Apply Automation to `gainNode`? No, that's Master.
                        // Apply Automation to a NEW node `autoGain`.
                        // Chain: `lastNode (Delay/Reverb output) -> autoGain -> trackGain -> gainNode`.
                    } else {
                        // Standard volume handling (already done at L208: track.volume)
                    }

                    // -- FX Chain Construction --
                    const effects = track.effects || {
                        eq: { low: 0, mid: 0, high: 0 },
                        compressor: { threshold: -24, ratio: 12, active: false },
                        deesser: { active: false, threshold: -20, frequency: 6000 },
                        cleaning: { active: false, lowCut: 80, highCut: 16000, gate: -60 },
                        reverb: { active: false, mix: 0, decay: 2.0 },
                        delay: { active: false, time: 0.3, feedback: 0.4, mix: 0 }
                    };

                    // 1. EQ
                    const eqLow = audioContext.createBiquadFilter();
                    eqLow.type = 'lowshelf';
                    eqLow.frequency.value = 320;
                    eqLow.gain.value = effects.eq.low;

                    const eqMid = audioContext.createBiquadFilter();
                    eqMid.type = 'peaking';
                    eqMid.frequency.value = 1000;
                    eqMid.Q.value = 0.7;
                    eqMid.gain.value = effects.eq.mid;

                    const eqHigh = audioContext.createBiquadFilter();
                    eqHigh.type = 'highshelf';
                    eqHigh.frequency.value = 3200;
                    eqHigh.gain.value = effects.eq.high;

                    // 2. Compressor
                    const compressor = audioContext.createDynamicsCompressor();
                    if (effects.compressor.active) {
                        compressor.threshold.value = effects.compressor.threshold;
                        compressor.ratio.value = effects.compressor.ratio;
                    }

                    // Chain EQ -> Comp
                    source.connect(eqLow);
                    eqLow.connect(eqMid);
                    eqMid.connect(eqHigh);
                    eqHigh.connect(compressor);

                    let lastNode = compressor;

                    // 2a. Cleaning (Noise Reduction Filters)
                    if (effects.cleaning && effects.cleaning.active) {
                        const lowCut = audioContext.createBiquadFilter();
                        lowCut.type = 'highpass';
                        lowCut.frequency.value = effects.cleaning.lowCut || 80;

                        const highCut = audioContext.createBiquadFilter();
                        highCut.type = 'lowpass';
                        highCut.frequency.value = effects.cleaning.highCut || 16000;

                        lastNode.connect(lowCut);
                        lowCut.connect(highCut);
                        lastNode = highCut;
                    }

                    // 2b. De-Esser
                    if (effects.deesser && effects.deesser.active) {
                        const dsFreq = effects.deesser.frequency || 6000;

                        const lp = audioContext.createBiquadFilter();
                        lp.type = 'lowpass';
                        lp.frequency.value = dsFreq;

                        const hp = audioContext.createBiquadFilter();
                        hp.type = 'highpass';
                        hp.frequency.value = dsFreq;

                        const dsComp = audioContext.createDynamicsCompressor();
                        dsComp.threshold.value = effects.deesser.threshold || -20;
                        dsComp.ratio.value = 20;
                        dsComp.attack.value = 0;

                        const dsOut = audioContext.createGain();

                        lastNode.connect(lp);
                        lp.connect(dsOut);

                        lastNode.connect(hp);
                        hp.connect(dsComp);
                        dsComp.connect(dsOut);

                        lastNode = dsOut;
                    }

                    // 3. Reverb (Parallel Mix)
                    if (effects.reverb.active && effects.reverb.mix > 0) {
                        const reverbInput = audioContext.createGain();
                        const reverbNode = audioContext.createConvolver();
                        try {
                            reverbNode.buffer = generateImpulse(audioContext, effects.reverb.decay, 2); // 2s decay default?
                        } catch (e) { console.warn("Reverb gen failed", e); }

                        const reverbDry = audioContext.createGain();
                        const reverbWet = audioContext.createGain();
                        const reverbOutput = audioContext.createGain();

                        reverbDry.gain.value = 1 - effects.reverb.mix;
                        reverbWet.gain.value = effects.reverb.mix;

                        lastNode.connect(reverbInput);
                        reverbInput.connect(reverbDry);
                        reverbInput.connect(reverbNode);
                        reverbNode.connect(reverbWet);

                        reverbDry.connect(reverbOutput);
                        reverbWet.connect(reverbOutput);

                        lastNode = reverbOutput;
                    }

                    // 4. Delay (Parallel Mix)
                    if (effects.delay.active && effects.delay.mix > 0) {
                        const delayInput = audioContext.createGain();
                        const delayNode = audioContext.createDelay(1.0);
                        delayNode.delayTime.value = effects.delay.time;

                        const feedback = audioContext.createGain();
                        feedback.gain.value = effects.delay.feedback;

                        delayNode.connect(feedback);
                        feedback.connect(delayNode);

                        const delayDry = audioContext.createGain();
                        const delayWet = audioContext.createGain();
                        const delayOutput = audioContext.createGain();

                        delayDry.gain.value = 1 - effects.delay.mix;
                        delayWet.gain.value = effects.delay.mix;

                        lastNode.connect(delayInput);
                        delayInput.connect(delayDry);
                        delayInput.connect(delayNode);
                        delayNode.connect(delayWet);

                        delayDry.connect(delayOutput);
                        delayWet.connect(delayOutput);

                        lastNode = delayOutput;
                    }


                    const autoGain = audioContext.createGain();
                    autoGain.gain.value = 1; // Default unity

                    if (track.automation && track.automation.volume && track.automation.volume.length > 0) {
                        const points = track.automation.volume.sort((a, b) => a.time - b.time);
                        const pastPoints = points.filter(p => p.time <= currentTime);
                        const futurePoints = points.filter(p => p.time > currentTime);

                        // Interpolate start value logic here or just jump to last known
                        let currentVal = track.volume;
                        if (pastPoints.length > 0) {
                            currentVal = pastPoints[pastPoints.length - 1].value;
                        }

                        // Set initial
                        autoGain.gain.setValueAtTime(currentVal, startTime);

                        // Schedule future ramps
                        futurePoints.forEach(p => {
                            // p.time is timeline time (seconds).
                            // We need context relative time: startTime + (p.time - currentTime)
                            // wait, startTimeRef...
                            // startTime is AC.currentTime approx.
                            // if p.time > currentTime, delta is p.time - currentTime.
                            const schedTime = startTime + (p.time - currentTime);
                            autoGain.gain.linearRampToValueAtTime(p.value, schedTime);
                        });
                    }

                    lastNode.connect(autoGain);
                    autoGain.connect(trackGain);
                    trackGain.connect(gainNode);

                    let startWhen = 0;
                    let offset = 0;
                    let durationToPlay = clip.duration; // Timeline duration to play

                    // Calculate Buffer Offset
                    // clip.startTime is where it sits on timeline
                    // clip.offset is where we start efficiently in buffer
                    // clip.speed affects how fast we traverse buffer

                    const bufferOffset = clip.offset || 0;

                    if (clipStartAbsolute > currentTime) {
                        // Play from start of clip
                        startWhen = startTime + (clipStartAbsolute - currentTime);
                        // Buffer offset is just the clip's defined offset
                        offset = bufferOffset;
                        durationToPlay = clip.duration; // Play full visual duration
                    } else {
                        // Resume from middle
                        startWhen = startTime; // Play immediately
                        const timeIntoClip = currentTime - clipStartAbsolute;
                        // Calculate where in buffer we are:
                        // bufferPos = initialOffset + (timeIntoClip * speed)
                        offset = bufferOffset + (timeIntoClip * clipSpeed);
                        durationToPlay = clip.duration - timeIntoClip;
                    }

                    // Duration for start() is in "buffer time"? 
                    // No, WebAudio start(when, offset, duration) -> duration is output duration (wall clock) ?
                    // MDN: duration: "The duration of the sound to be played, specified in seconds." (If not specified, plays to end).
                    // Actually, if playbackRate != 1, duration parameter is scaled? 
                    // MDN says: implementation dependent or confusing. 
                    // Safer to use stop() for precise end.

                    if (durationToPlay > 0) {
                        source.start(startWhen, offset, durationToPlay); // Note: offset is in buffer coordinates. durationToPlay ??? 
                        // Wait. If speed is 2x. 
                        // We want to play 5s of timeline. 
                        // We need to consume 10s of buffer. 
                        // start(when, offset, duration) 
                        // Specification: "duration" is effectively "buffer duration" to consume? 
                        // No, usually it plays for X seconds of real time. 
                        // Let's rely on explicit stop() for precision or calculate carefully.

                        // Correct approach for simple cases:
                        // source.start(startWhen, offset); 
                        // source.stop(startWhen + durationToPlay);
                        // However, 'offset' must be in BUFFER SECONDS.

                        source.stop(startWhen + durationToPlay);
                    }
                    newSources.push(source);
                });
            });

            setActiveSources(newSources);
            setIsPlaying(true);

            const updateTime = () => {
                const now = audioContext.currentTime;
                let played = now - startTimeRef.current;

                // Loop Logic
                if (recordingMode === 'loop' && loopRange.active && played >= loopRange.end) {
                    // Loop back
                    const loopDuration = loopRange.end - loopRange.start;
                    // Reset context time reference to simulate jump
                    // This is complex with WebAudio, simpler to just stop/start or use offset
                    // For now, simpler implementation: Stop, seek to start, play again instantly

                    if (isRecording) {
                        // If recording, we need to finish current take and start new one
                        // This requires async handling which is hard in AF loop. 
                        // TODO: Implement seamless loop recording
                        console.log("Loop point reached during recording - creating take...");
                        // For MVP: Just wrap visually, actual audio might be continuous
                    }

                    // Simple Seek for playback
                    const newStartTime = audioContext.currentTime - loopRange.start;
                    startTimeRef.current = newStartTime;
                    played = loopRange.start;

                    // Re-trigger sources for loop if needed (complex)
                    // For this task, we'll assume linear playback just updates UI time
                }

                if (played >= duration && duration > 0 && !isRecording) {
                    setIsPlaying(false);
                    setActiveSources([]);
                    setCurrentTime(duration);
                    return;
                }

                setCurrentTime(played);
                animationFrameRef.current = requestAnimationFrame(updateTime);
            };
            updateTime();
        }
    };

    const stopPlayback = () => {
        activeSources.forEach(s => {
            try { s.stop(); } catch (e) { }
        });
        setActiveSources([]);
        setIsPlaying(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    // Track Arming
    const toggleTrackArm = (trackId) => {
        updateTracksWithHistory(prev => prev.map(t =>
            t.id === trackId ? { ...t, isArmed: !t.isArmed } : t
        ));
    };

    // Recording Logic
    const toggleRecording = async () => {
        if (!isRecording) {
            // Start Recording
            const armedTracks = tracks.filter(t => t.isArmed);
            if (armedTracks.length === 0) {
                alert("Please arm at least one track to record.");
                return;
            }

            try {
                // If in punch mode, we might want to start playback from before the punch point
                // For now, let's just start from current time for simplicity, or handle pre-roll later.

                // Start playback if not already playing
                if (!isPlaying) {
                    togglePlayback();
                }

                // Initialize recorders for all armed tracks
                // Note: Currently sharing one mic stream for all tracks as browser doesn't easily split inputs
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                const recordingStartTime = audioContext.currentTime - startTimeRef.current; // Capture precise timeline time

                armedTracks.forEach(track => {
                    const mediaRecorder = new MediaRecorder(stream);
                    const trackChunks = [];

                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) trackChunks.push(e.data);
                    };

                    mediaRecorder.onstop = async () => {
                        const blob = new Blob(trackChunks, { type: 'audio/webm' });
                        const arrayBuffer = await blob.arrayBuffer();
                        const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

                        // Calculate where the clip should go
                        // In standard mode: starts where recording started
                        // In punch mode: might need trimming if we recorded longer
                        // In loop mode: we handle "takes"
                        if (recordingMode === 'loop') {
                            const newTake = {
                                id: crypto.randomUUID(),
                                timestamp: Date.now(),
                                arrayBuffer: arrayBuffer, // Store raw buffer or decoded? ArrayBuffer allows on-demand decode
                                startTime: loopRange.start, // It belongs to the loop start
                                duration: buffer.duration
                            };

                            setTracks(prev => prev.map(t => { // Use setTracks directly for intermediate stream, or updateTracksWithHistory if we want to undo the whole take creation? 
                                // Ideally loop takes should be undoable
                                if (t.id === track.id) {
                                    return { ...t, takes: [...t.takes, newTake] };
                                }
                                return t;
                            }));

                            // Automatically show takes manager for this track
                            setShowTakesForTrack(track.id);
                        } else {
                            // Standard or Punch Mode
                            // TODO: If Punch, trim buffer to punch in/out if necessary
                            // For now, just placing it
                            // For now, just placing it
                            // FIX: Use captured recordingStartTime
                            addClipToTrack(buffer, `Rec ${new Date().toLocaleTimeString()}`, track.id, recordingStartTime);
                        }

                        // Cleanup stream only if it's the last one? 
                        // Actually we used one stream for all, so we should stop it once all are done.
                        // But since we create new MediaRecorder per track on SAME stream, we need to be careful.
                        // For this iteration let's just use the stream reference directly.
                    };

                    activeRecordersRef.current.set(track.id, mediaRecorder);
                    chunksRef.current.set(track.id, trackChunks);
                    mediaRecorder.start();
                });

                activeStreamsRef.current.set('main', stream); // Store main stream to stop later
                setIsRecording(true);

            } catch (error) {
                console.error("Microphone access error:", error);
                alert("Could not access microphone.");
            }
        } else {
            // Stop Recording
            activeRecordersRef.current.forEach(recorder => {
                if (recorder.state !== 'inactive') recorder.stop();
            });
            activeRecordersRef.current.clear();

            const stream = activeStreamsRef.current.get('main');
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                activeStreamsRef.current.clear();
            }

            setIsRecording(false);
            if (isPlaying) stopPlayback();
        }
    };

    // Takes Management
    const handleSelectTake = (trackId, take) => {
        // Create a clip from the take
        audioContext.decodeAudioData(take.arrayBuffer.slice(0)).then(buffer => {
            addClipToTrack(buffer, `Take ${take.id.substring(0, 4)}`, trackId, take.startTime);
        });
        setShowTakesForTrack(null);
    };

    const handleDeleteTake = (trackId, takeId) => {
        updateTracksWithHistory(prev => prev.map(t =>
            t.id === trackId
                ? { ...t, takes: t.takes.filter(take => take.id !== takeId) }
                : t
        ));
    };

    const handlePlayTake = async (take) => {
        const buffer = await audioContext.decodeAudioData(take.arrayBuffer.slice(0));
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        source.start();
    };

    // Advanced Editing Operations
    const handleUpdateClip = (trackId, clipId, updates) => {
        updateTracksWithHistory(prev => prev.map(track => {
            if (track.id !== trackId) return track;
            return {
                ...track,
                clips: track.clips.map(clip => {
                    if (clip.id !== clipId) return clip;

                    // Logic to handle Speed/Pitch changes effecting Duration
                    let newDuration = updates.duration !== undefined ? updates.duration : clip.duration;

                    // Check if speed or pitch is changing
                    const isSpeedChange = updates.speed !== undefined && updates.speed !== clip.speed;
                    const isPitchChange = updates.pitch !== undefined && updates.pitch !== clip.pitch;

                    if (isSpeedChange || isPitchChange) {
                        const oldSpeed = clip.speed || 1.0;
                        const oldPitch = clip.pitch || 0;
                        const newSpeed = updates.speed !== undefined ? updates.speed : oldSpeed;
                        const newPitch = updates.pitch !== undefined ? updates.pitch : oldPitch;

                        const oldRate = oldSpeed * Math.pow(2, oldPitch / 1200);
                        const newRate = newSpeed * Math.pow(2, newPitch / 1200);

                        // Maintain Audio Content Duration by scaling visual duration
                        if (newRate !== 0 && oldRate !== 0) {
                            const ratio = oldRate / newRate;
                            newDuration = clip.duration * ratio;
                        }
                    }

                    return { ...clip, ...updates, duration: newDuration };
                })
            };
        }));
    };

    const handleUpdateTrackEffect = (trackId, effectType, params) => {
        updateTracksWithHistory(prev => prev.map(track => {
            if (track.id !== trackId) return track;
            return {
                ...track,
                effects: {
                    ...track.effects,
                    [effectType]: { ...track.effects[effectType], ...params }
                }
            };
        }));
    };

    const handleUpdateAutomation = (trackId, type, points) => {
        updateTracksWithHistory(prev => prev.map(track => {
            if (track.id !== trackId) return track;
            return {
                ...track,
                automation: {
                    ...track.automation,
                    [type]: points
                }
            };
        }));
    };

    const splitClip = () => {
        // Find clip under playhead on selected track? 
        // For now, let's assume valid current time and selection logic or explicit call.
        // Actually, best to iterate all tracks and split any clip under the playhead? 
        // Or specific tool? Let's implement function first.

        const splitTime = currentTime;

        updateTracksWithHistory(prev => prev.map(track => {
            // Find a clip that contains splitTime
            // Must respect speed? If visual duration covers splitTime, we can split.
            const clipToSplit = track.clips.find(c => c.startTime < splitTime && c.startTime + c.duration > splitTime);

            if (!clipToSplit) return track;

            // Calculate split points
            const timeIntoClip = splitTime - clipToSplit.startTime;
            const bufferOffsetToSplit = (clipToSplit.offset || 0) + (timeIntoClip * (clipToSplit.speed || 1.0));

            const firstClip = {
                ...clipToSplit,
                duration: timeIntoClip // Visual duration. Buffer duration is irrelevant for playback except for limits, but we trust visual duration.
                // offset stays same
            };

            const secondClip = {
                ...clipToSplit,
                id: crypto.randomUUID(),
                startTime: splitTime,
                offset: bufferOffsetToSplit,
                duration: clipToSplit.duration - timeIntoClip
            };

            return {
                ...track,
                clips: track.clips.flatMap(c => c.id === clipToSplit.id ? [firstClip, secondClip] : c)
            };
        }));
    };

    // AI Script Generation
    const handleGenerateScript = async () => {
        if (!scriptTopic.trim()) return;
        setIsGenerating(true);
        try {
            const script = await generateAudioScript(scriptTopic, isPro);
            setGeneratedScript(script);
        } catch (error) {
            console.error(error);
            alert("Failed to generate script.");
        } finally {
            setIsGenerating(false);
        }
    };

    // TTS Logic
    const handleTTS = async () => {
        if (!ttsText.trim()) return;
        setIsGeneratingTTS(true);
        try {
            const voiceOption = VOICE_OPTIONS.find(v => v.value === selectedVoice);
            const options = { voice: selectedVoice };
            if (voiceOption?.provider) {
                options.provider = voiceOption.provider;
            }
            if (voiceOption?.language) {
                options.language = voiceOption.language;
            }

            const audio = await puter.ai.txt2speech(ttsText, options);
            const response = await fetch(audio.src || audio);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await audioContext.decodeAudioData(arrayBuffer);
            addClipToTrack(buffer, "TTS: " + ttsText.substring(0, 10) + "...");
        } catch (error) {
            console.error("TTS Error:", error);
            alert("Failed to generate speech. Make sure Puter.js is loaded.");
        } finally {
            setIsGeneratingTTS(false);
        }
    };

    // Auto-fill TTS text
    useEffect(() => {
        if (generatedScript) {
            setTtsText(generatedScript);
        }
    }, [generatedScript]);

    // Volume Control
    useEffect(() => {
        if (gainNode) {
            gainNode.gain.value = volume;
        }
    }, [volume, gainNode]);

    // Format time helper
    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Undo/Redo State
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Initial History
    useEffect(() => {
        if (history.length === 0 && tracks.length > 0) {
            setHistory([tracks]);
            setHistoryIndex(0);
        }
    }, []);

    // Helper to update tracks with history
    const updateTracksWithHistory = (newTracksOrFunc) => {
        setTracks(prevTracks => {
            const newTracks = typeof newTracksOrFunc === 'function' ? newTracksOrFunc(prevTracks) : newTracksOrFunc;

            // Add to history
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newTracks);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);

            return newTracks;
        });
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setTracks(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setTracks(history[historyIndex + 1]);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                togglePlayback();
            } else if (e.key.toLowerCase() === 'r') {
                e.preventDefault();
                toggleRecording();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, isRecording, tracks, recordingMode, loopRange, punchRange, history, historyIndex]);

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
            {/* Header Bar */}
            <div className="h-14 bg-[#18181b] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <Volume2 className="text-green-400" size={24} />
                    <h1 className="text-lg font-bold">Audio Studio</h1>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Inputs */}
                <div className="w-64 bg-[#121214] border-r border-white/5 p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Inputs</h3>

                        {/* Upload */}
                        <label className="block">
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <div className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-medium text-sm hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2">
                                <Upload size={16} /> Upload Audio
                            </div>
                        </label>

                        {/* Record */}
                        <button
                            onClick={toggleRecording}
                            className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${isRecording
                                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                                : 'bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90'
                                }`}
                        >
                            {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={16} />}
                            {isRecording ? 'Stop Recording' : 'Record Audio'}
                        </button>
                    </div>

                    {/* TTS Section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare size={14} className="text-orange-400" /> Text to Speech
                        </h3>

                        <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm focus:border-orange-500/50 outline-none transition-colors"
                        >
                            {VOICE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value} className="bg-[#1a1a1d]">
                                    {option.name}
                                </option>
                            ))}
                        </select>

                        <textarea
                            placeholder="Enter text to convert to speech..."
                            value={ttsText}
                            onChange={(e) => setTtsText(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm focus:border-orange-500/50 outline-none transition-colors h-20 resize-none"
                        />

                        <button
                            onClick={handleTTS}
                            disabled={isGeneratingTTS || !ttsText}
                            className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isGeneratingTTS ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Volume2 size={16} />
                            )}
                            Generate Speech
                        </button>
                    </div>
                </div>

                {/* Center - Timeline (Main Focus) */}
                <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
                    <div className="flex-1 p-4">
                        <AudioTimeline
                            tracks={tracks}
                            setTracks={updateTracksWithHistory}
                            onUpdateClip={handleUpdateClip}
                            onSplitClip={splitClip}
                            onUpdateAutomation={handleUpdateAutomation}
                            showSpectrogram={showSpectrogram}
                            onToggleSpectrogram={() => setShowSpectrogram(!showSpectrogram)}
                            currentTime={currentTime}
                            onSelectClip={(trackId, clipId) => { setSelectedClip(clipId ? { trackId, clipId } : null); setSelectedTrackId(null); }}
                            onSelectTrack={(trackId) => { setSelectedTrackId(trackId); setSelectedClip(null); }}
                            duration={duration}
                            onSeek={(time) => {
                                setCurrentTime(time);
                                pauseTimeRef.current = time;
                                if (isPlaying) {
                                    stopPlayback();
                                }
                            }}
                            isPlaying={isPlaying}
                            onToggleArm={toggleTrackArm}
                            punchRange={punchRange}
                            loopRange={loopRange}
                            onToggleTakes={(trackId) => setShowTakesForTrack(trackId)}
                        />

                        {/* Takes Manager Popup */}
                        <TakesManager
                            tracks={tracks}
                            selectedTrackId={showTakesForTrack}
                            onSelectTake={handleSelectTake}
                            onDeleteTake={handleDeleteTake}
                            onPlayTake={handlePlayTake}
                        />

                    </div>
                </div>

                {/* Right Panel - Effects & Settings */}
                <div className="w-80 bg-[#18181b] border-l border-white/5 flex flex-col">
                    <div className="p-4 border-b border-white/5">
                        <h2 className="font-bold text-white">Properties</h2>
                    </div>
                    <div className="p-4 flex-1 overflow-auto space-y-6">
                        {selectedTrackId ? (() => {
                            const track = tracks.find(t => t.id === selectedTrackId);
                            if (!track) return <div className="text-white/30 text-sm">Track not found.</div>;
                            const fx = track.effects;
                            return (
                                <div className="space-y-6">
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <h3 className="text-xs font-semibold text-white/50 uppercase mb-3 text-blue-400">EQ (Equalizer)</h3>
                                        <div className="flex gap-2">
                                            {['low', 'mid', 'high'].map(band => (
                                                <div key={band} className="flex-1 flex flex-col items-center gap-1">
                                                    <input
                                                        type="range" min="-12" max="12" step="1"
                                                        value={fx.eq[band]}
                                                        onChange={(e) => handleUpdateTrackEffect(track.id, 'eq', { [band]: parseInt(e.target.value) })}
                                                        className="h-24 w-4 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                                                        style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '8px' }}
                                                    />
                                                    <span className="text-[10px] text-white/50 uppercase">{band}</span>
                                                    <span className="text-[10px] text-white/70 font-mono">{fx.eq[band]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cleaning / Gate */}
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div className="flex justify-between mb-2">
                                            <h3 className="text-xs font-semibold text-white/50 uppercase text-cyan-400">Cleaning (Denoise)</h3>
                                            <input type="checkbox" checked={fx.cleaning?.active} onChange={(e) => handleUpdateTrackEffect(track.id, 'cleaning', { active: e.target.checked })} />
                                        </div>
                                        {fx.cleaning?.active && (
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between text-[10px] text-white/70"><span>Low Cut</span><span>{fx.cleaning.lowCut} Hz</span></div>
                                                <input type="range" min="20" max="500" step="10" value={fx.cleaning.lowCut || 80} onChange={(e) => handleUpdateTrackEffect(track.id, 'cleaning', { lowCut: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full cursor-pointer" />

                                                <div className="flex justify-between text-[10px] text-white/70"><span>High Cut</span><span>{fx.cleaning.highCut} Hz</span></div>
                                                <input type="range" min="5000" max="20000" step="100" value={fx.cleaning.highCut || 16000} onChange={(e) => handleUpdateTrackEffect(track.id, 'cleaning', { highCut: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full cursor-pointer" />
                                            </div>
                                        )}
                                    </div>

                                    {/* De-Esser */}
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div className="flex justify-between mb-2">
                                            <h3 className="text-xs font-semibold text-white/50 uppercase text-pink-400">De-Esser</h3>
                                            <input type="checkbox" checked={fx.deesser?.active} onChange={(e) => handleUpdateTrackEffect(track.id, 'deesser', { active: e.target.checked })} />
                                        </div>
                                        {fx.deesser?.active && (
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between text-[10px] text-white/70"><span>Thresh</span><span>{fx.deesser.threshold} dB</span></div>
                                                <input type="range" min="-60" max="0" value={fx.deesser.threshold || -20} onChange={(e) => handleUpdateTrackEffect(track.id, 'deesser', { threshold: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full cursor-pointer" />

                                                <div className="flex justify-between text-[10px] text-white/70"><span>Freq</span><span>{fx.deesser.frequency} Hz</span></div>
                                                <input type="range" min="3000" max="10000" step="100" value={fx.deesser.frequency || 6000} onChange={(e) => handleUpdateTrackEffect(track.id, 'deesser', { frequency: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full cursor-pointer" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div className="flex justify-between mb-2">
                                            <h3 className="text-xs font-semibold text-white/50 uppercase text-green-400">Compressor</h3>
                                            <input type="checkbox" checked={fx.compressor.active} onChange={(e) => handleUpdateTrackEffect(track.id, 'compressor', { active: e.target.checked })} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] text-white/70"><span>Thresh</span><span>{fx.compressor.threshold}dB</span></div>
                                            <input type="range" min="-60" max="0" value={fx.compressor.threshold} onChange={(e) => handleUpdateTrackEffect(track.id, 'compressor', { threshold: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full" />
                                            <div className="flex justify-between text-[10px] text-white/70"><span>Ratio</span><span>{fx.compressor.ratio}:1</span></div>
                                            <input type="range" min="1" max="20" step="0.5" value={fx.compressor.ratio} onChange={(e) => handleUpdateTrackEffect(track.id, 'compressor', { ratio: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full" />
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div className="flex justify-between mb-2">
                                            <h3 className="text-xs font-semibold text-white/50 uppercase text-purple-400">Reverb</h3>
                                            <input type="checkbox" checked={fx.reverb.active} onChange={(e) => handleUpdateTrackEffect(track.id, 'reverb', { active: e.target.checked })} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] text-white/70"><span>Mix</span><span>{Math.round(fx.reverb.mix * 100)}%</span></div>
                                            <input type="range" min="0" max="1" step="0.05" value={fx.reverb.mix} onChange={(e) => handleUpdateTrackEffect(track.id, 'reverb', { mix: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div className="flex justify-between mb-2">
                                            <h3 className="text-xs font-semibold text-white/50 uppercase text-yellow-400">Delay</h3>
                                            <input type="checkbox" checked={fx.delay.active} onChange={(e) => handleUpdateTrackEffect(track.id, 'delay', { active: e.target.checked })} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] text-white/70"><span>Time</span><span>{fx.delay.time}s</span></div>
                                            <input type="range" min="0" max="1" step="0.05" value={fx.delay.time} onChange={(e) => handleUpdateTrackEffect(track.id, 'delay', { time: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full" />
                                            <div className="flex justify-between text-[10px] text-white/70"><span>Mix</span><span>{Math.round(fx.delay.mix * 100)}%</span></div>
                                            <input type="range" min="0" max="1" step="0.05" value={fx.delay.mix} onChange={(e) => handleUpdateTrackEffect(track.id, 'delay', { mix: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : selectedClip ? (() => {
                            const track = tracks.find(t => t.id === selectedClip.trackId);
                            const clip = track?.clips.find(c => c.id === selectedClip.clipId);
                            if (!clip) return <div className="text-white/30 text-sm">Selection invalid.</div>;

                            return (
                                <div className="space-y-4">
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <h3 className="text-xs font-semibold text-white/50 uppercase mb-3">Clip: {clip.name}</h3>

                                        {/* Speed */}
                                        <div className="space-y-1 mb-4">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-white/70">Speed</span>
                                                <span className="text-white font-mono">{clip.speed?.toFixed(2)}x</span>
                                            </div>
                                            <input
                                                type="range" min="0.5" max="2.0" step="0.1"
                                                value={clip.speed || 1}
                                                onChange={(e) => handleUpdateClip(selectedClip.trackId, selectedClip.clipId, { speed: parseFloat(e.target.value) })}
                                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                                            />
                                        </div>

                                        {/* Pitch */}
                                        <div className="space-y-1 mb-4">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-white/70">Pitch (Cents)</span>
                                                <span className="text-white font-mono">{clip.pitch || 0}</span>
                                            </div>
                                            <input
                                                type="range" min="-1200" max="1200" step="100"
                                                value={clip.pitch || 0}
                                                onChange={(e) => handleUpdateClip(selectedClip.trackId, selectedClip.clipId, { pitch: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
                                            />
                                        </div>

                                        {/* Fades */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/50 uppercase">Fade In (s)</label>
                                                <input
                                                    type="number" step="0.1" min="0"
                                                    value={clip.fadeIn || 0}
                                                    onChange={(e) => handleUpdateClip(selectedClip.trackId, selectedClip.clipId, { fadeIn: parseFloat(e.target.value) })}
                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/50 uppercase">Fade Out (s)</label>
                                                <input
                                                    type="number" step="0.1" min="0"
                                                    value={clip.fadeOut || 0}
                                                    onChange={(e) => handleUpdateClip(selectedClip.trackId, selectedClip.clipId, { fadeOut: parseFloat(e.target.value) })}
                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="text-white/30 text-sm italic py-4 text-center">
                                Select a clip to edit properties
                            </div>
                        )}

                        {/* Effects */}
                        <div className="space-y-4 pt-6 border-t border-white/5">
                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                                <Settings2 size={14} className="text-blue-400" /> Effects
                            </h3>

                            {/* Volume */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm text-white/70">Master Volume</label>
                                    <span className="text-xs text-white/50 font-mono">{Math.round(volume * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.1"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                                />
                            </div>

                            {/* Voice Clarity */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-white/70">Voice Clarity</label>
                                <button
                                    onClick={() => setVoiceClarity(!voiceClarity)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${voiceClarity
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white/10 text-white/50'
                                        }`}
                                >
                                    {voiceClarity ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>

                        {/* AI Script Generator */}
                        <div className="space-y-3 pt-6 border-t border-white/5">
                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                                <Wand2 size={14} className="text-purple-400" /> AI Script
                            </h3>

                            <input
                                type="text"
                                placeholder="Topic (e.g., 'Tech Podcast Intro')"
                                value={scriptTopic}
                                onChange={(e) => setScriptTopic(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm focus:border-purple-500/50 outline-none transition-colors"
                            />

                            <button
                                onClick={handleGenerateScript}
                                disabled={isGenerating || !scriptTopic}
                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Wand2 size={16} />
                                )}
                                Generate Script
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Bottom Transport Bar */}
            <div className="h-20 bg-[#18181b] border-t border-white/10 flex items-center justify-center gap-6 px-6 shrink-0">
                {/* Stop */}
                <button
                    onClick={() => {
                        stopPlayback();
                        setCurrentTime(0);
                        pauseTimeRef.current = 0;
                    }}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50"
                    disabled={!tracks.some(t => t.clips.length > 0)}
                >
                    <Square size={18} fill="currentColor" />
                </button>

                {/* Play/Pause */}
                <button
                    onClick={togglePlayback}
                    className="p-5 rounded-full bg-green-500 hover:bg-green-400 text-black transition-all shadow-lg hover:shadow-green-500/20 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    disabled={!tracks.some(t => t.clips.length > 0)}
                >
                    {isPlaying ? (
                        <Pause size={28} fill="currentColor" />
                    ) : (
                        <Play size={28} fill="currentColor" className="ml-1" />
                    )}
                </button>

                {/* Time Display */}
                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full font-mono text-sm border border-white/10">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    <span className="text-white/40 mx-2">/</span>
                    <span className="text-white/60">{formatTime(duration)}</span>
                </div>

                {/* Mode Controls */}
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setRecordingMode('standard')}
                        className={`p-2 rounded transition-colors ${recordingMode === 'standard' ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white'}`}
                        title="Standard Mode"
                    ><Mic size={16} /></button>
                    <button
                        onClick={() => {
                            setRecordingMode('loop');
                            setLoopRange(prev => ({ ...prev, active: !prev.active }));
                        }}
                        className={`p-2 rounded transition-colors ${recordingMode === 'loop' ? 'bg-yellow-600 text-white' : 'text-white/50 hover:text-white'}`}
                        title="Loop Recording"
                    ><Repeat size={16} /></button>
                    <button
                        onClick={() => {
                            setRecordingMode('punch');
                            setPunchRange(prev => ({ ...prev, active: !prev.active }));
                        }}
                        className={`p-2 rounded transition-colors ${recordingMode === 'punch' ? 'bg-red-600 text-white' : 'text-white/50 hover:text-white'}`}
                        title="Punch-In/Out"
                    ><Scissors size={16} /></button>
                </div>

                <div className="h-8 w-px bg-white/10 mx-2"></div>


                {/* Export */}
                <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all">
                    <Download size={18} />
                </button>
            </div>
        </div >
    );
};

export default AudioStudio;
