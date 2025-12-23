import React, { useState } from 'react';
import { Layout } from 'lucide-react';
import { TemplateFillModal } from '../modals/TemplateFillModal';

export const TemplatesPanel = ({ onApplyTemplate }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const TEMPLATES = [
        {
            id: 'vacation-strips',
            name: 'Strips / Split Screen',
            description: 'Vertical strips for a dynamic recap (Customizable count)',
            slots: 7,
            isConfigurable: true,
            minSlots: 2,
            maxSlots: 12,
            icon: Layout,
            generate: (slots, duration = 10) => {
                const tracks = [];
                const count = slots.length;

                // Validate count to avoid division by zero
                if (count === 0) return [];

                // Assume 1080 width base for calculation
                const baseWidth = 1080;
                const stripW = baseWidth / count;
                const startX = -baseWidth / 2 + stripW / 2;

                slots.forEach((slot, index) => {
                    const trackId = `track-strip-${index}-${Date.now()}`;
                    const posX = startX + (index * stripW);

                    tracks.push({
                        id: trackId,
                        type: 'video',
                        height: 80,
                        clips: [{
                            id: `clip-strip-${index}-${Date.now()}`,
                            type: 'video',
                            name: `Strip ${index + 1}`,
                            startTime: 0,
                            duration: duration,
                            source: slot.url,
                            sourceDuration: 100,
                            transform: {
                                x: posX, // Move the video to the strip position
                                y: 0,
                                scale: 100,
                                rotation: 0
                            },
                            mask: {
                                type: 'rectangle',
                                scaleX: (100 / count) + 0.1, // Dynamic width %, +0.1 for slight overlap
                                scaleY: 100,
                                x: 0,
                                y: 0,
                                blur: 0
                            }
                        }]
                    });
                });

                return tracks;
            }
        }
    ];

    const handleTemplateClick = (template) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const handleApply = (slots) => {
        if (selectedTemplate && onApplyTemplate) {
            // Generate tracks
            const tracks = selectedTemplate.generate(slots); // Default 10s duration?
            // We might want to determine duration based on shortest video?
            // For now, let's use 5s or 10s default.

            onApplyTemplate(tracks);
            setIsModalOpen(false);
            setSelectedTemplate(null);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/5">
                <h3 className="font-bold text-lg">Templates</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                    {TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => handleTemplateClick(template)}
                            className="flex flex-col gap-2 group text-left"
                        >
                            <div className="aspect-[9/16] bg-white/5 rounded-xl border border-white/10 group-hover:border-blue-500 group-hover:bg-white/10 transition-all flex items-center justify-center">
                                <template.icon size={32} className="text-white/20 group-hover:text-white transition-colors" />
                            </div>
                            <div>
                                <h4 className="font-medium text-white text-sm">{template.name}</h4>
                                <p className="text-white/40 text-xs line-clamp-2">{template.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <TemplateFillModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                template={selectedTemplate}
                onApply={handleApply}
            />
        </div>
    );
};
