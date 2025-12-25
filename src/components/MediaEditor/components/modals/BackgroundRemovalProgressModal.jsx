import React from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Background Removal Progress Modal
 * Shows processing progress when removing background from video
 */
export const BackgroundRemovalProgressModal = ({
    isOpen,
    progress = 0,
    currentFrame = 0,
    totalFrames = 0,
    onCancel
}) => {
    if (!isOpen) return null;

    const percentage = Math.round(progress);
    const estimatedTimeRemaining = totalFrames > 0 && currentFrame > 0
        ? Math.round(((totalFrames - currentFrame) / currentFrame) * (Date.now() / 1000))
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1f] rounded-2xl border border-white/10 shadow-2xl p-8 max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Loader2 size={24} className="text-blue-400 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Removing Background</h3>
                            <p className="text-sm text-white/50">Processing video frames...</p>
                        </div>
                    </div>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-white/50" />
                        </button>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-4">
                    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${percentage}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-white font-bold">{percentage}%</span>
                        {totalFrames > 0 && (
                            <span className="text-white/50">
                                Frame {currentFrame} / {totalFrames}
                            </span>
                        )}
                    </div>

                    {/* Estimated Time */}
                    {estimatedTimeRemaining && (
                        <p className="text-xs text-white/40 text-center">
                            Estimated time remaining: {Math.floor(estimatedTimeRemaining / 60)}m {estimatedTimeRemaining % 60}s
                        </p>
                    )}
                </div>

                {/* Tips */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300/80 leading-relaxed">
                        <span className="font-bold">💡 Tip:</span> This may take a few minutes depending on video length and quality.
                        The processed video will have a transparent background that you can replace with any color or image.
                    </p>
                </div>

                {/* Cancel Button */}
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="mt-4 w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-sm rounded-lg transition-all"
                    >
                        Cancel Processing
                    </button>
                )}
            </div>
        </div>
    );
};

export default BackgroundRemovalProgressModal;
