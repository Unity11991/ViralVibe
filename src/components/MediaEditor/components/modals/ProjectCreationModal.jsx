/**
 * ProjectCreationModal
 * Professional project creation screen with aspect ratio selection
 */

import React, { useState } from 'react';
import { X, Upload, Play, Image, Film } from 'lucide-react';
import { ASPECT_RATIOS } from '../../utils/aspectRatios';
import './ProjectCreationModal.css';

export const ProjectCreationModal = ({ onCreateProject, onClose }) => {
    const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
    const [importMedia, setImportMedia] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setImportMedia(true);
        }
    };

    const handleCreate = () => {
        onCreateProject(selectedRatio, selectedFile);
    };

    return (
        <div className="project-creation-overlay">
            <div className="project-creation-modal">
                {/* Header */}
                <div className="modal-header">
                    <div className="header-content">
                        <div className="icon-wrapper">
                            <Film size={28} className="header-icon" />
                        </div>
                        <div>
                            <h2>Create New Project</h2>
                            <p className="subtitle">Select your canvas aspect ratio to get started</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <X size={20} />
                    </button>
                </div>

                {/* Aspect Ratio Grid */}
                <div className="modal-body">
                    <div className="section-label">Canvas Aspect Ratio</div>
                    <div className="aspect-ratio-grid">
                        {ASPECT_RATIOS.map((ratio) => (
                            <div
                                key={ratio.id}
                                className={`ratio-card ${selectedRatio.id === ratio.id ? 'selected' : ''}`}
                                onClick={() => setSelectedRatio(ratio)}
                                style={{
                                    '--ratio-color': ratio.color
                                }}
                            >
                                <div className="ratio-icon-container">
                                    <div
                                        className="ratio-visual"
                                        style={{
                                            aspectRatio: `${ratio.dimensions.width} / ${ratio.dimensions.height}`
                                        }}
                                    >
                                        <span className="ratio-symbol">{ratio.icon}</span>
                                    </div>
                                </div>
                                <div className="ratio-info">
                                    <div className="ratio-name">{ratio.name}</div>
                                    <div className="ratio-text">{ratio.ratio}</div>
                                    <div className="ratio-dimensions">
                                        {ratio.dimensions.width} × {ratio.dimensions.height}
                                    </div>
                                    <div className="ratio-platforms">
                                        {ratio.platforms.join(', ')}
                                    </div>
                                </div>
                                {selectedRatio.id === ratio.id && (
                                    <div className="selected-badge">
                                        <div className="check-icon">✓</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Import Media Option */}
                    <div className="import-section">
                        <div className="section-label">Starting Point (Optional)</div>
                        <div className="import-options">
                            <label className="import-option">
                                <input
                                    type="radio"
                                    name="start"
                                    checked={!importMedia}
                                    onChange={() => {
                                        setImportMedia(false);
                                        setSelectedFile(null);
                                    }}
                                />
                                <div className="option-content">
                                    <Play size={20} />
                                    <span>Start with empty canvas</span>
                                </div>
                            </label>
                            <label className="import-option">
                                <input
                                    type="radio"
                                    name="start"
                                    checked={importMedia}
                                    onChange={() => setImportMedia(true)}
                                />
                                <div className="option-content">
                                    <Upload size={20} />
                                    <span>Import media file</span>
                                </div>
                            </label>
                        </div>

                        {importMedia && (
                            <div className="file-upload-area">
                                <input
                                    type="file"
                                    id="media-file"
                                    accept="image/*,video/*"
                                    onChange={handleFileSelect}
                                    className="file-input"
                                />
                                <label htmlFor="media-file" className="file-upload-label">
                                    {selectedFile ? (
                                        <>
                                            <Image size={20} />
                                            <span>{selectedFile.name}</span>
                                            <span className="file-size">
                                                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={20} />
                                            <span>Click to select file</span>
                                            <span className="file-hint">Video or Image</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <div className="selected-info">
                        <div className="info-label">Selected:</div>
                        <div className="info-value">
                            {selectedRatio.name} ({selectedRatio.ratio}) • {selectedRatio.dimensions.width}×{selectedRatio.dimensions.height}
                        </div>
                    </div>
                    <button onClick={handleCreate} className="create-btn">
                        <Film size={18} />
                        Create Project
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectCreationModal;
