/**
 * CompositionLoadingModal
 * Displays progress while applying auto-composite to timeline
 */

import React from 'react';
import './CompositionLoadingModal.css';

export const CompositionLoadingModal = ({
    isOpen,
    progress = 0,
    status = 'Processing...',
    currentStep = 0,
    totalSteps = 0
}) => {
    if (!isOpen) return null;

    return (
        <div className="composition-loading-overlay">
            <div className="composition-loading-modal">
                <div className="loading-header">
                    <div className="loading-icon">
                        <div className="spinner-large"></div>
                    </div>
                    <h2>Applying Composition</h2>
                    <p className="loading-subtitle">Please wait while we prepare your timeline...</p>
                </div>

                <div className="loading-body">
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="progress-shine"></div>
                            </div>
                        </div>
                        <div className="progress-info">
                            <span className="progress-percent">{Math.round(progress)}%</span>
                            <span className="progress-steps">{currentStep} / {totalSteps} steps</span>
                        </div>
                    </div>

                    <div className="status-message">
                        <div className="status-icon">⚡</div>
                        <p>{status}</p>
                    </div>

                    <div className="loading-tips">
                        <p className="tip-text">
                            <strong>Tip:</strong> We're generating thumbnails and processing effects for smooth playback
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompositionLoadingModal;
