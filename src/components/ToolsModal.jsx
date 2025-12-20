import React from 'react';
import { X, Video, Sparkles, Image as ImageIcon, Music, Swords } from 'lucide-react';

const ToolsModal = ({ isOpen, onClose, onSelectTool }) => {
    if (!isOpen) return null;

    const tools = [
        {
            id: 'video-editor',
            title: 'Video Editor',
            description: 'Edit, trim, and enhance your videos with professional tools.',
            icon: Video,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            id: 'vibe-battle',
            title: 'Vibe Battle',
            description: 'Compare two images to see which wins the viral algorithm.',
            icon: Swords,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20'
        },
        // Placeholders for future tools
        {
            id: 'image-enhancer',
            title: 'Image Enhancer',
            description: 'Upscale and improve image quality using AI.',
            icon: ImageIcon,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20'
        },
        {
            id: 'audio-studio',
            title: 'Audio Studio',
            description: 'Clean up audio and generate voiceovers.',
            icon: Music,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20'
        },
        {
            id: 'image-editor',
            title: 'Image Editor',
            description: 'Professional image editing with layers, filters, and more.',
            icon: ImageIcon,
            color: 'text-pink-400',
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/20'
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-4xl bg-[#0f0f12] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-yellow-400" size={24} />
                            Creator Tools
                        </h2>
                        <p className="text-white/50 mt-1">Powerful tools to supercharge your content creation.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Grid */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tools.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => !tool.comingSoon && onSelectTool(tool.id)}
                                disabled={tool.comingSoon}
                                className={`
                                    relative group p-6 rounded-2xl border text-left transition-all duration-300
                                    ${tool.bg} ${tool.border}
                                    ${tool.comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-lg hover:border-white/20'}
                                `}
                            >
                                <div className={`w-12 h-12 rounded-xl ${tool.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <tool.icon size={24} className={tool.color} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{tool.title}</h3>
                                <p className="text-sm text-white/60 mb-4 leading-relaxed">{tool.description}</p>

                                {tool.comingSoon ? (
                                    <span className="inline-block px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-wider border border-white/5">
                                        Coming Soon
                                    </span>
                                ) : (
                                    <span className={`text-sm font-medium ${tool.color} flex items-center gap-1 group-hover:gap-2 transition-all`}>
                                        Open Tool <span>→</span>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToolsModal;
