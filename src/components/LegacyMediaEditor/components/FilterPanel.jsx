import React, { useState } from 'react';
import { FILTER_PRESETS } from '../utils/filterUtils';

/**
 * Filter Panel Component
 */
export const FilterPanel = ({ activeFilterId, onFilterSelect, suggestedFilter, mediaUrl }) => {
    const [activeCategory, setActiveCategory] = useState('All');

    // Extract unique categories
    const categories = ['All', ...new Set(FILTER_PRESETS.map(f => f.category).filter(Boolean))];

    // Filter presets
    let filteredPresets = activeCategory === 'All'
        ? FILTER_PRESETS
        : FILTER_PRESETS.filter(f => f.category === activeCategory);

    // Prioritize suggested filter
    if (suggestedFilter) {
        filteredPresets = [...filteredPresets].sort((a, b) => {
            if (a.id === suggestedFilter) return -1;
            if (b.id === suggestedFilter) return 1;
            return 0;
        });
    }

    return (
        <div className="space-y-4 animate-slide-up">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {categories.map(category => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === category
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredPresets.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => onFilterSelect(filter.id)}
                        className={`
                        p-3 rounded-xl border transition-all flex flex-col items-center gap-2 text-center relative group
                        ${activeFilterId === filter.id
                                ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg'
                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10 hover:text-white'
                            }
                    `}
                    >
                        {/* Filter Preview */}
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/50 relative">
                            {mediaUrl ? (
                                <>
                                    <img
                                        src={mediaUrl}
                                        alt={filter.name}
                                        className="w-full h-full object-cover"
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
                                    {/* Overlay for Instagram Filters */}
                                    {filter.id === 'clarendon' && <div className="absolute inset-0 bg-[#7fbbe3] mix-blend-overlay opacity-20" />}
                                    {filter.id === 'clarendon' && <div className="absolute inset-0 bg-[#f3e2c3] mix-blend-soft-light opacity-20" />}

                                    {filter.id === 'juno' && <div className="absolute inset-0 bg-[#ffffc8] mix-blend-soft-light opacity-30" />}
                                    {filter.id === 'juno' && <div className="absolute inset-0 bg-[#000032] mix-blend-multiply opacity-10" />}

                                    {filter.id === 'lark' && <div className="absolute inset-0 bg-[#3264c8] mix-blend-color opacity-10" />}

                                    {filter.id === 'lofi' && <div className="absolute inset-0 bg-[#000000] mix-blend-overlay opacity-20" />}
                                    {filter.id === 'lofi' && <div className="absolute inset-0 bg-[#ff0000] mix-blend-soft-light opacity-10" />}

                                    {filter.id === 'gingham' && <div className="absolute inset-0 bg-[#e6e6d2] mix-blend-soft-light opacity-30" />}

                                    {filter.id === 'valencia' && <div className="absolute inset-0 bg-[#3a0339] mix-blend-exclusion opacity-10" />}
                                    {filter.id === 'valencia' && <div className="absolute inset-0 bg-[#e6c13d] mix-blend-soft-light opacity-20" />}

                                    {filter.id === 'aden' && <div className="absolute inset-0 bg-[#420a0e] mix-blend-screen opacity-20" />}

                                    {filter.id === 'sutro' && <div className="absolute inset-0 bg-[#28003c] mix-blend-multiply opacity-30" />}
                                </>
                            ) : (
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
                            )}
                        </div>
                        <span className="text-xs font-medium">{filter.name}</span>
                        {suggestedFilter === filter.id && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse z-10">
                                AI PICK
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
