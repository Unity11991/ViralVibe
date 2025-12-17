import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Mic, Upload, Download, Wand2, Volume2, Settings2, ArrowLeft, Sparkles } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import { generateAudioScript } from '../../utils/aiService';
import { generateMusic, blobToAudioBuffer, downloadAudio, getMusicPrompts } from '../../utils/musicGenService';

const AudioStudio = ({ onClose, isPro }) => {
    // Audio Context State
    const [audioContext, setAudioContext] = useState(null);
    const [sourceNode, setSourceNode] = useState(null);
    const [gainNode, setGainNode] = useState(null);
    const [analyserNode, setAnalyserNode] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Effects State
    const [voiceClarity, setVoiceClarity] = useState(false);
    const [clarityNodes, setClarityNodes] = useState(null);

    // AI Script State
    const [scriptTopic, setScriptTopic] = useState('');
    const [generatedScript, setGeneratedScript] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // AI Music Generation State
    const [musicPrompt, setMusicPrompt] = useState('');
    const [musicDuration, setMusicDuration] = useState(15);
    const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
    const [musicProgress, setMusicProgress] = useState({ status: '', message: '', progress: 0 });
    const [generatedMusicBlob, setGeneratedMusicBlob] = useState(null);

    const startTimeRef = useRef(0);
    const pauseTimeRef = useRef(0);
    const animationFrameRef = useRef(null);

    // Initialize Audio Context on mount
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

    // File Upload Handler
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);

        setAudioBuffer(buffer);
        setDuration(buffer.duration);
        setCurrentTime(0);
        pauseTimeRef.current = 0;
    };

    // Play/Pause Logic
    const togglePlayback = () => {
        if (!audioBuffer || !audioContext) return;

        if (isPlaying) {
            // Pause
            sourceNode?.stop();
            pauseTimeRef.current = audioContext.currentTime - startTimeRef.current;
            setIsPlaying(false);
        } else {
            // Play
            if (audioContext.state === 'suspended') audioContext.resume();

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;

            // Reconnect graph: Source -> (Effects) -> Gain -> Analyser -> Dest
            let connection = source;

            if (voiceClarity) {
                // Create Filters if not exist
                const highPass = audioContext.createBiquadFilter();
                highPass.type = 'highpass';
                highPass.frequency.value = 85;

                const peaking = audioContext.createBiquadFilter();
                peaking.type = 'peaking';
                peaking.frequency.value = 3000;
                peaking.gain.value = 5;

                source.connect(highPass);
                highPass.connect(peaking);
                connection = peaking;

                setClarityNodes({ highPass, peaking });
            }

            connection.connect(gainNode);

            // Handle loop/resume offset
            const offset = pauseTimeRef.current % audioBuffer.duration;
            source.start(0, offset);
            startTimeRef.current = audioContext.currentTime - offset;

            source.onended = () => {
                // Only reset if we naturally finished, not manually stopped
                // Note: onended fires on stop() too, so we need careful check or just UI reset
                // For simplicity, we'll relay on react state mostly
            };

            setSourceNode(source);
            setIsPlaying(true);

            // Timer Loop
            const updateTime = () => {
                const now = audioContext.currentTime;
                const played = now - startTimeRef.current;
                if (played >= audioBuffer.duration) {
                    setIsPlaying(false);
                    pauseTimeRef.current = 0;
                    return;
                }
                setCurrentTime(played);
                animationFrameRef.current = requestAnimationFrame(updateTime);
            };
            updateTime();
        }
    };

    const stopPlayback = () => {
        if (sourceNode) {
            try { sourceNode.stop(); } catch (e) { }
        }
        setIsPlaying(false);
        setCurrentTime(0);
        pauseTimeRef.current = 0;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    // Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const arrayBuffer = await blob.arrayBuffer();
                const buffer = await audioContext.decodeAudioData(arrayBuffer);
                setAudioBuffer(buffer);
                setDuration(buffer.duration);
                setCurrentTime(0);
                pauseTimeRef.current = 0;

                // Cleanup stream
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Recording error:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
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

    // AI Music Generation Handler
    const handleGenerateMusic = async () => {
        if (!musicPrompt.trim()) return;

        setIsGeneratingMusic(true);
        setMusicProgress({ status: 'starting', message: 'Initializing music generation...', progress: 10 });

        try {
            const onProgress = (progressData) => {
                setMusicProgress(progressData);
            };

            setMusicProgress({ status: 'generating', message: 'Generating music...', progress: 30 });
            const musicBlob = await generateMusic(musicPrompt, musicDuration, onProgress);

            setGeneratedMusicBlob(musicBlob);
            setMusicProgress({ status: 'processing', message: 'Loading audio...', progress: 80 });

            // Convert to AudioBuffer and load into player
            const buffer = await blobToAudioBuffer(musicBlob, audioContext);
            setAudioBuffer(buffer);
            setDuration(buffer.duration);
            setCurrentTime(0);
            pauseTimeRef.current = 0;

            setMusicProgress({ status: 'complete', message: 'Music ready!', progress: 100 });

            // Reset progress after 2 seconds
            setTimeout(() => {
                setMusicProgress({ status: '', message: '', progress: 0 });
            }, 2000);
        } catch (error) {
            console.error("Music generation error:", error);
            setMusicProgress({ status: 'error', message: error.message || 'Failed to generate music', progress: 0 });
            alert("Failed to generate music: " + error.message);
        } finally {
            setIsGeneratingMusic(false);
        }
    };

    // Handle download of generated music
    const handleDownloadMusic = () => {
        if (generatedMusicBlob) {
            const filename = `music-${musicPrompt.slice(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.wav`;
            downloadAudio(generatedMusicBlob, filename);
        } else if (audioBuffer) {
            alert('Download feature available for AI-generated music only.');
        }
    };

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

    return (
        <div className="fixed inset-0 z-50 bg-[#0f0f12] text-white flex flex-col md:flex-row overflow-hidden animate-fade-in">
            {/* Sidebar Controls (Bottom/Second on Mobile, Left/First on Desktop) */}
            <div className="order-2 md:order-1 w-full md:w-80 bg-white/5 border-t md:border-t-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col gap-6 md:gap-8 h-1/2 md:h-full overflow-y-auto custom-scrollbar shadow-2xl md:shadow-none z-10">

                <div className="flex items-center gap-3 mb-2">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Volume2 className="text-green-400" /> Audio Studio
                    </h2>
                </div>

                {/* Import / Record */}
                <div className="space-y-4">
                    <h3 className="text-xs md:text-sm font-semibold text-white/50 uppercase tracking-wider">Input</h3>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col items-center justify-center p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-all border border-dashed border-white/20 hover:border-green-500/50">
                            <Upload size={20} className="mb-2 text-green-400" />
                            <span className="text-xs font-medium">Upload File</span>
                            <input type="file" onChange={handleFileUpload} accept="audio/*" className="hidden" />
                        </label>

                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all border ${isRecording
                                ? 'bg-red-500/20 border-red-500 animate-pulse'
                                : 'bg-white/5 hover:bg-white/10 border-white/20'
                                }`}
                        >
                            <Mic size={20} className={`mb-2 ${isRecording ? 'text-red-500' : 'text-red-400'}`} />
                            <span className="text-xs font-medium">{isRecording ? 'Stop Rec' : 'Record Mic'}</span>
                        </button>
                    </div>
                </div>

                {/* Effects */}
                <div className="space-y-4">
                    <h3 className="text-xs md:text-sm font-semibold text-white/50 uppercase tracking-wider">Effects</h3>

                    <div className="space-y-3">
                        {/* Voice Clarity Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Settings2 size={18} className="text-blue-400" />
                                <span className="text-sm font-medium">Voice Clarity</span>
                            </div>
                            <button
                                onClick={() => setVoiceClarity(!voiceClarity)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${voiceClarity ? 'bg-blue-500' : 'bg-white/20'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${voiceClarity ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>

                        {/* Volume Slider */}
                        <div className="p-3 bg-white/5 rounded-xl space-y-2">
                            <div className="flex justify-between text-xs text-white/70">
                                <span>Master Volume</span>
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="1.5" step="0.05"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* AI Music Generation */}
                <div className="space-y-4">
                    <h3 className="text-xs md:text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} className="text-pink-400" /> AI Music Gen
                    </h3>

                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Describe your music (e.g., 'upbeat electronic dance music')"
                            value={musicPrompt}
                            onChange={(e) => setMusicPrompt(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm focus:border-pink-500/50 outline-none transition-colors"
                        />

                        {/* Quick Prompts */}
                        <div className="flex flex-wrap gap-2">
                            {getMusicPrompts().slice(0, 4).map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setMusicPrompt(item.prompt)}
                                    className="text-xs px-2 py-1 bg-white/5 hover:bg-pink-500/20 rounded-lg transition-colors border border-white/10 hover:border-pink-500/50"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Duration Slider */}
                        <div className="p-3 bg-white/5 rounded-xl space-y-2">
                            <div className="flex justify-between text-xs text-white/70">
                                <span>Duration</span>
                                <span>{musicDuration}s</span>
                            </div>
                            <input
                                type="range" min="5" max="30" step="5"
                                value={musicDuration}
                                onChange={(e) => setMusicDuration(parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500"
                            />
                        </div>

                        <button
                            onClick={handleGenerateMusic}
                            disabled={isGeneratingMusic || !musicPrompt}
                            className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isGeneratingMusic ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Sparkles size={16} />
                            )}
                            {isGeneratingMusic ? 'Generating...' : 'Generate Music'}
                        </button>

                        {/* Progress Indicator */}
                        {musicProgress.message && (
                            <div className={`p-3 rounded-xl border ${musicProgress.status === 'error'
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-pink-500/10 border-pink-500/30'
                                }`}>
                                <p className="text-xs text-white/80 mb-2">{musicProgress.message}</p>
                                {musicProgress.progress > 0 && musicProgress.status !== 'error' && (
                                    <div className="w-full bg-black/30 rounded-full h-1.5">
                                        <div
                                            className="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${musicProgress.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Script Generator */}
                <div className="space-y-4 flex-1 pb-20 md:pb-0">
                    <h3 className="text-xs md:text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                        <Wand2 size={14} className="text-purple-400" /> AI Script Gen
                    </h3>

                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Topic (e.g., 'Intro for Tech Podcast')"
                            value={scriptTopic}
                            onChange={(e) => setScriptTopic(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm focus:border-purple-500/50 outline-none transition-colors"
                        />
                        <button
                            onClick={handleGenerateScript}
                            disabled={isGenerating || !scriptTopic}
                            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Wand2 size={16} />}
                            Generate Script
                        </button>

                        {generatedScript && (
                            <div className="p-3 bg-black/30 rounded-xl border border-white/5 max-h-40 overflow-y-auto">
                                <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">{generatedScript}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Stage (Top/First on Mobile, Right/Second on Desktop) */}
            <div className="order-1 md:order-2 flex-1 flex flex-col p-4 md:p-6 gap-4 md:gap-6 relative h-1/2 md:h-full">
                {/* Visualizer Area */}
                <div className="flex-1 bg-black/40 rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl min-h-[200px]">
                    {audioBuffer ? (
                        <AudioVisualizer analyser={analyserNode} isPlaying={isPlaying} />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-4">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/5 flex items-center justify-center">
                                <Music className="w-8 h-8 md:w-10 md:h-10 opacity-50" />
                            </div>
                            <p className="text-sm md:text-base">Upload or record to start</p>
                        </div>
                    )}

                    {/* Time Overlay */}
                    <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full font-mono text-xs md:text-sm border border-white/10">
                        <span className="text-white">{formatTime(currentTime)}</span>
                        <span className="text-white/40 mx-2">/</span>
                        <span className="text-white/60">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Transport Controls */}
                <div className="h-20 md:h-24 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center gap-6 p-4">
                    <button
                        onClick={() => {
                            if (sourceNode) {
                                sourceNode.stop();
                                pauseTimeRef.current = 0;
                                setSourceNode(null);
                                setIsPlaying(false);
                                setCurrentTime(0);
                                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                            }
                        }}
                        className="p-3 md:p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50"
                        disabled={!audioBuffer}
                    >
                        <Square size={18} md:size={20} fill="currentColor" />
                    </button>

                    <button
                        onClick={togglePlayback}
                        className="p-4 md:p-6 rounded-full bg-green-500 hover:bg-green-400 text-black transition-all shadow-lg hover:shadow-green-500/20 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        disabled={!audioBuffer}
                    >
                        {isPlaying ? <Pause size={24} md:size={32} fill="currentColor" /> : <Play size={24} md:size={32} fill="currentColor" className="ml-1" />}
                    </button>

                    <button
                        onClick={handleDownloadMusic}
                        className="p-3 md:p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50"
                        disabled={!audioBuffer}
                    >
                        <Download size={18} md:size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Simple Icon component for the placeholder
const Music = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
);

export default AudioStudio;
