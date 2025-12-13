import React from 'react';
import MediaEditor from './components/MediaEditor';

export const MobileApp = () => {
    // Mocking props or state if needed, or just rendering the editor
    // The MediaEditor likely needs props like 'onClose', 'mediaFile', etc.
    // For now, we'll try to render it self-contained if possible, 
    // or wrap it to provide necessary context/mock text.

    // NOTE: The original MediaEditor might expect 'mediaFile'. 
    // If the user lands here directly, they haven't uploaded anything.
    // We might need a simple upload step wrapper HERE if MediaEditor doesn't handle it.

    return (
        <div className="w-full h-full bg-black text-white">
            <MediaEditor
                mediaFile={null} // Or prompt for upload inside?
                onClose={() => { }}
                isPro={true}
            />
        </div>
    );
};
