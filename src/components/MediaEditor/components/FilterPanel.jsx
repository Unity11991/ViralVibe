import React from 'react';
import { FILTER_PRESETS } from '../utils/filterUtils';

/**
 * Filter Panel Component
 */
export const FilterPanel = ({ activeFilterId, onFilterSelect }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-slide-up">
            {FILTER_PRESETS.map((filter) => (
                <button
                    key={filter.id}
                    onClick={() => onFilterSelect(filter.id)}
                    className={`
                        p-3 rounded-xl border transition-all flex flex-col items-center gap-2 text-center
                        ${activeFilterId === filter.id
                            ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg'
                            : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10 hover:text-white'
                        }
                    `}
                >
                    {/* Filter Preview */}
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/50 relative">
                        <div
                            className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500"
                            style={{
                                filter: `
                                    brightness(${100 + (filter.values.brightness || 0)}%)
                                    contrast(${100 + (filter.values.contrast || 0)}%)
                                    saturate(${100 + (filter.values.saturation || 0)}%)
                                    sepia(${(filter.values.sepia || 0)}%)
                                    grayscale(${(filter.values.grayscale || 0)}%)
                                `
                            }}
                        />
                    </div>
                    <span className="text-xs font-medium">{filter.name}</span>
                </button>
            ))}
        </div>
    );
};
