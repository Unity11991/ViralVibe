/**
 * AutoCompositePanel
 * UI for AI-powered automatic video compositing
 */

import React, { useState } from 'react';
import { Wand2, Music, Video, Sparkles, Play, RotateCcw, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAutoComposite } from '../../hooks/useAutoComposite';
import './AutoCompositePanel.css';

export const AutoCompositePanel = ({
    onApplyComposition,
    mediaLibrary = [],
    apiKey,
    onClose
}) => {
    const {
        isAnalyzing,
        analysisProgress,
        analysisStatus,
        compositionPlan,
        selectedStyle,
        options,
        error,
        createAutoComposition,
        resetComposition,
        regenerateWithStyle,
        setSelectedStyle,
        updateOptions,
        availableStyles,
        stylePresets
    } = useAutoComposite(apiKey);

    // Local state
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [selectedVideos, setSelectedVideos] = useState([]);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    // Filter media library
    const audioTracks = mediaLibrary.filter(item => item.type === 'audio');
    const videoClips = mediaLibrary.filter(item => item.type === 'video' || item.type === 'image');

    /**
     * Handles video selection toggle
     */
    const toggleVideoSelection = (video) => {
        setSelectedVideos(prev => {
            const isSelected = prev.some(v => v.id === video.id);
            if (isSelected) {
                return prev.filter(v => v.id !== video.id);
            } else {
                return [...prev, video];
            }
        });
    };

    /**
     * Handles composition generation
     */
    const handleGenerate = async () => {
        if (!selectedAudio) {
            alert('Please select an audio track');
            return;
        }

        if (selectedVideos.length === 0) {
            alert('Please select at least one video clip');
            return;
        }

        const plan = await createAutoComposition(
            selectedAudio.url,
            selectedVideos.map(v => v.url),
            selectedStyle
        );

        if (plan) {
            setPreviewMode(true);
        }
    };

    /**
     * Applies composition to timeline
     */
    const handleApply = () => {
        if (compositionPlan && onApplyComposition) {
            onApplyComposition(compositionPlan, selectedAudio, selectedVideos);
            onClose?.();
        }
    };

    /**
     * Regenerates with different style
     */
    const handleStyleChange = (style) => {
        setSelectedStyle(style);
        if (compositionPlan) {
            regenerateWithStyle(style);
        }
    };

    return (
        <div className="auto-composite-panel">
            {/* Header */}
            <div className="panel-header">
                <div className="header-title">
                    <Wand2 size={20} />
                    <h2>AI Auto Composite</h2>
                </div>
                {compositionPlan && (
                    <button className="btn-reset" onClick={resetComposition}>
                        <RotateCcw size={16} />
                        Start Over
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="panel-content">
                {!previewMode ? (
                    <>
                        {/* Mode Indicator */}
                        <section className="api-section">
                            <div className="mode-indicator">
                                {apiKey ? (
                                    <div className="mode-badge ai-mode">
                                        <Sparkles size={14} />
                                        <span>AI-Enhanced Mode</span>
                                    </div>
                                ) : (
                                    <div className="mode-badge basic-mode">
                                        <span>⚡</span>
                                        <span>Basic Mode</span>
                                    </div>
                                )}
                            </div>

                            {!apiKey && (
                                <div className="api-info">
                                    <p className="info-text">
                                        <strong>Basic Mode:</strong> Beat detection, tempo sync, and energy-based pacing work perfectly!
                                    </p>
                                    <p className="info-text small">
                                        Want AI-powered mood matching? Add your Groq API key in localStorage: <code>groqApiKey</code>
                                    </p>
                                </div>
                            )}

                            {apiKey && (
                                <div className="api-info success">
                                    <p className="info-text">
                                        ✅ AI features enabled! Intelligent mood matching and scene analysis active.
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* Audio Selection */}
                        <section className="selection-section">
                            <div className="section-header">
                                <Music size={18} />
                                <h3>Select Audio Track</h3>
                            </div>
                            <div className="audio-list">
                                {audioTracks.length === 0 ? (
                                    <p className="empty-message">No audio tracks available. Upload audio first.</p>
                                ) : (
                                    audioTracks.map(audio => (
                                        <div
                                            key={audio.id}
                                            className={`audio-item ${selectedAudio?.id === audio.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedAudio(audio)}
                                        >
                                            <Music size={16} />
                                            <span>{audio.name || 'Audio Track'}</span>
                                            {selectedAudio?.id === audio.id && <Sparkles size={14} />}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Video Selection */}
                        <section className="selection-section">
                            <div className="section-header">
                                <Video size={18} />
                                <h3>Select Video Clips ({selectedVideos.length} selected)</h3>
                            </div>
                            <div className="video-grid">
                                {videoClips.length === 0 ? (
                                    <p className="empty-message">No video clips available. Upload videos first.</p>
                                ) : (
                                    videoClips.map(video => (
                                        <div
                                            key={video.id}
                                            className={`video-item ${selectedVideos.some(v => v.id === video.id) ? 'selected' : ''}`}
                                            onClick={() => toggleVideoSelection(video)}
                                        >
                                            <div className="video-thumbnail">
                                                {video.thumbnail ? (
                                                    <img src={video.thumbnail} alt={video.name} />
                                                ) : (
                                                    <div className="placeholder">
                                                        <Video size={24} />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="video-name">{video.name || 'Video'}</span>
                                            {selectedVideos.some(v => v.id === video.id) && (
                                                <div className="selected-badge">✓</div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Style Selection */}
                        <section className="style-section">
                            <div className="section-header">
                                <Sparkles size={18} />
                                <h3>Composition Style</h3>
                            </div>
                            <div className="style-grid">
                                {availableStyles.map(style => {
                                    const preset = stylePresets[style];
                                    return (
                                        <div
                                            key={style}
                                            className={`style-card ${selectedStyle === style ? 'selected' : ''}`}
                                            onClick={() => handleStyleChange(style)}
                                        >
                                            <div className="style-icon">{getStyleIcon(style)}</div>
                                            <h4>{preset.name}</h4>
                                            <p className="style-desc">{getStyleDescription(style)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Advanced Options */}
                        <section className="advanced-section">
                            <button
                                className="advanced-toggle"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                            >
                                <Settings size={16} />
                                <span>Advanced Options</span>
                                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {showAdvanced && (
                                <div className="advanced-options">
                                    <div className="option-group">
                                        <label>Transition Intensity</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={options.transitionIntensity * 100}
                                            onChange={(e) => updateOptions({ transitionIntensity: e.target.value / 100 })}
                                        />
                                        <span>{Math.round(options.transitionIntensity * 100)}%</span>
                                    </div>

                                    <div className="option-group">
                                        <label>Color Grading Strength</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={options.colorGradeStrength * 100}
                                            onChange={(e) => updateOptions({ colorGradeStrength: e.target.value / 100 })}
                                        />
                                        <span>{Math.round(options.colorGradeStrength * 100)}%</span>
                                    </div>

                                    <div className="option-group">
                                        <label>Beat Sync Sensitivity</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={options.beatSyncSensitivity * 100}
                                            onChange={(e) => updateOptions({ beatSyncSensitivity: e.target.value / 100 })}
                                        />
                                        <span>{Math.round(options.beatSyncSensitivity * 100)}%</span>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Error Display */}
                        {error && (
                            <div className="error-message">
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <div className="action-buttons">
                            <button
                                className="btn-generate"
                                onClick={handleGenerate}
                                disabled={isAnalyzing || !selectedAudio || selectedVideos.length === 0}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <div className="spinner" />
                                        <span>{analysisStatus || 'Generating...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={18} />
                                        <span>Generate Composition</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Progress Bar */}
                        {isAnalyzing && (
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${analysisProgress}%` }}
                                    />
                                </div>
                                <p className="progress-text">{analysisProgress}% - {analysisStatus}</p>
                            </div>
                        )}
                    </>
                ) : (
                    /* Preview Mode */
                    <div className="preview-mode">
                        <div className="preview-header">
                            <h3>Composition Preview</h3>
                            <p>Your AI-generated composition is ready!</p>
                        </div>

                        <div className="composition-stats">
                            <div className="stat">
                                <span className="stat-label">Total Clips</span>
                                <span className="stat-value">{compositionPlan?.clips.length || 0}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Duration</span>
                                <span className="stat-value">{compositionPlan?.duration.toFixed(1)}s</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Style</span>
                                <span className="stat-value">{stylePresets[selectedStyle]?.name}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Tempo</span>
                                <span className="stat-value">{compositionPlan?.metadata.tempo} BPM</span>
                            </div>
                        </div>

                        <div className="preview-actions">
                            <button className="btn-secondary" onClick={() => setPreviewMode(false)}>
                                <RotateCcw size={16} />
                                Modify Settings
                            </button>
                            <button className="btn-primary" onClick={handleApply}>
                                <Play size={16} />
                                Apply to Timeline
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper functions
const getStyleIcon = (style) => {
    const icons = {
        cinematic: '🎬',
        energetic: '⚡',
        musicVideo: '🎵',
        smooth: '🌅',
        artistic: '🎨'
    };
    return icons[style] || '✨';
};

const getStyleDescription = (style) => {
    const descriptions = {
        cinematic: 'Smooth, dramatic transitions',
        energetic: 'Fast cuts, beat-synced',
        musicVideo: 'Beat-matched, dynamic',
        smooth: 'Calm, flowing pacing',
        artistic: 'Creative, experimental'
    };
    return descriptions[style] || '';
};
