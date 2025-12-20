import React, { useState } from 'react';
import { Type, Plus } from 'lucide-react';

export const TextPanel = ({ onAddText }) => {
    const [text, setText] = useState('');

    const handleAdd = () => {
        if (text.trim()) {
            onAddText(text);
            setText('');
        }
    };

    return (
        <div className="p-6 space-y-6 animate-slide-up">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                    onClick={handleAdd}
                    disabled={!text.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {['Impact', 'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana'].map(font => (
                    <button
                        key={font}
                        onClick={() => onAddText('Sample Text', { fontFamily: font })}
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-center transition-colors"
                    >
                        <span className="text-lg text-white" style={{ fontFamily: font }}>Aa</span>
                        <p className="text-xs text-white/40 mt-1">{font}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
