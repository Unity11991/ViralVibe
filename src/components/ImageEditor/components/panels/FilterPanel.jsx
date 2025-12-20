import React from 'react';

export const FilterPanel = ({ activeFilter, onSelect }) => {
    const filters = [
        { id: 'normal', name: 'Normal', style: {} },
        { id: 'clarendon', name: 'Vivid', style: { contrast: 120, saturate: 125 } },
        { id: 'gingham', name: 'Soft', style: { brightness: 110, contrast: 90 } },
        { id: 'moon', name: 'B&W', style: { saturate: 0, contrast: 110 } },
        { id: 'lark', name: 'Bright', style: { brightness: 115, saturate: 110 } },
        { id: 'reyes', name: 'Warm', style: { sepia: 50, contrast: 90 } },
    ];

    return (
        <div className="p-6 overflow-x-auto no-scrollbar animate-slide-up">
            <div className="flex gap-4">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => onSelect(filter.style)}
                        className={`flex flex-col gap-2 shrink-0 group`}
                    >
                        <div className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${JSON.stringify(activeFilter) === JSON.stringify(filter.style)
                                ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20'
                                : 'border-transparent group-hover:border-white/20'
                            }`}>
                            <div
                                className="w-full h-full bg-cover bg-center"
                                style={{
                                    backgroundColor: '#333',
                                    // In a real app, we'd show a thumbnail of the actual image here
                                    // For now, a gradient placeholder
                                    backgroundImage: 'linear-gradient(45deg, #4f46e5, #ec4899)'
                                }}
                            />
                        </div>
                        <span className={`text-xs font-medium text-center transition-colors ${JSON.stringify(activeFilter) === JSON.stringify(filter.style) ? 'text-blue-400' : 'text-white/60'
                            }`}>
                            {filter.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
