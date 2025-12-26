import React from 'react';
import {
    Undo2,
    Redo2,
    Scissors,
    Trash2,
    Upload,
    Download,
    Settings,
    Play,
    Pause,
    SkipBack,
    SkipForward
} from 'lucide-react';

/**
 * MobileToolbar - Compact toolbar for mobile editing
 * Provides quick access to essential editing actions
 */
export const MobileToolbar = ({
    // Playback controls
    isPlaying,
    onPlayPause,
    onSkipBackward,
    onSkipForward,

    // Edit actions
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onSplit,
    onDelete,

    // Media actions
    onAddMedia,
    onExport,
    onSettings,

    // State
    selectedClipId,
    className = ''
}) => {
    const iconSize = 20;

    const ToolbarButton = ({ onClick, icon: Icon, disabled, active, label, variant = 'default' }) => {
        const baseClasses = "flex items-center justify-center rounded-xl transition-all touch-target-sm";
        const variantClasses = {
            default: `${active ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/70'} ${!disabled && 'active:bg-white/10'}`,
            primary: 'bg-blue-500 text-white active:bg-blue-600',
            danger: 'bg-red-500/10 text-red-400 active:bg-red-500/20'
        };

        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label={label}
                title={label}
            >
                <Icon size={iconSize} />
            </button>
        );
    };

    return (
        <div className={`mobile-toolbar ${className}`}>
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
                <ToolbarButton
                    onClick={onSkipBackward}
                    icon={SkipBack}
                    label="Skip Backward"
                />
                <ToolbarButton
                    onClick={onPlayPause}
                    icon={isPlaying ? Pause : Play}
                    label={isPlaying ? 'Pause' : 'Play'}
                    variant="primary"
                />
                <ToolbarButton
                    onClick={onSkipForward}
                    icon={SkipForward}
                    label="Skip Forward"
                />
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Edit Controls */}
            <div className="flex items-center gap-2">
                <ToolbarButton
                    onClick={onUndo}
                    icon={Undo2}
                    disabled={!canUndo}
                    label="Undo"
                />
                <ToolbarButton
                    onClick={onRedo}
                    icon={Redo2}
                    disabled={!canRedo}
                    label="Redo"
                />
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Clip Actions */}
            <div className="flex items-center gap-2">
                <ToolbarButton
                    onClick={onSplit}
                    icon={Scissors}
                    disabled={!selectedClipId}
                    label="Split Clip"
                />
                <ToolbarButton
                    onClick={onDelete}
                    icon={Trash2}
                    disabled={!selectedClipId}
                    label="Delete Clip"
                    variant="danger"
                />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Media Actions */}
            <div className="flex items-center gap-2">
                <ToolbarButton
                    onClick={onAddMedia}
                    icon={Upload}
                    label="Add Media"
                />
                <ToolbarButton
                    onClick={onExport}
                    icon={Download}
                    label="Export"
                    variant="primary"
                />
                <ToolbarButton
                    onClick={onSettings}
                    icon={Settings}
                    label="Settings"
                />
            </div>
        </div>
    );
};

export default MobileToolbar;
