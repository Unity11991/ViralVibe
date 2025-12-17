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

const AudioStudio = ({ onClose, isPro }) => {
    // Audio Context State
    const [audioContext, setAudioContext] = useState(null);
    const [sourceNode, setSourceNode] = useState(null);
    const [activeSources, setActiveSources] = useState([]);
    const [gainNode, setGainNode] = useState(null);
    const [analyserNode, setAnalyserNode] = useState(null);

    // Multi-track State
    // Multi-track State
    const [tracks, setTracks] = useState([
        { id: crypto.randomUUID(), name: 'Voiceover', clips: [], volume: 1, muted: false, isArmed: true, takes: [] },
        { id: crypto.randomUUID(), name: 'Music', clips: [], volume: 0.8, muted: false, isArmed: false, takes: [] },
        { id: crypto.randomUUID(), name: 'SFX', clips: [], volume: 1, muted: false, isArmed: false, takes: [] },
    ]);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
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
            name,
            buffer,
            duration: buffer.duration,
            startTime: startTime,
        };

        updateTracksWithHistory(prev => {
            return prev.map((track, index) => {
                // If trackId is provided, add to that track. 
                // If not, add to first track (legacy behavior / upload)
                if (trackId ? track.id === trackId : index === 0) {
                    return {
                        ...track,
                        clips: [...track.clips, newClip]
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

                    const trackGain = audioContext.createGain();
                    trackGain.gain.value = track.volume;

                    source.connect(trackGain);
                    trackGain.connect(gainNode);

                    let startWhen = 0;
                    let offset = 0;
                    let durationToPlay = clip.duration;

                    if (clipStartAbsolute > currentTime) {
                        startWhen = startTime + (clipStartAbsolute - currentTime);
                        offset = 0;
                    } else {
                        startWhen = startTime;
                        offset = currentTime - clipStartAbsolute;
                        durationToPlay = clip.duration - offset;
                    }

                    source.start(startWhen, offset, durationToPlay);
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
                            currentTime={currentTime}
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
                <div className="w-64 bg-[#121214] border-l border-white/5 p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    {/* Effects */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                            <Settings2 size={14} className="text-blue-400" /> Effects
                        </h3>

                        {/* Volume */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-white/70">Volume</label>
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
                    <div className="space-y-3 flex-1">
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

                        {generatedScript && (
                            <div className="p-3 bg-black/30 rounded-lg border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                                <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">{generatedScript}</p>
                            </div>
                        )}
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
        </div>
    );
};

export default AudioStudio;
