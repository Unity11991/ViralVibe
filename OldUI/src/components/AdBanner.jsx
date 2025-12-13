import React, { useEffect } from 'react';
import { loadAdSenseScript } from '../utils/adService';

const AdBanner = ({ slotId, format = 'auto', className = '' }) => {
    const adInitialized = React.useRef(false);

    useEffect(() => {
        if (adInitialized.current) return;
        adInitialized.current = true;

        loadAdSenseScript();
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, []);

    return (
        <div className={`w-full overflow-hidden bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-4 ${className}`}>
            <div className="w-full text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Advertisement</p>
                <ins className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client="ca-pub-9178133918559920"
                    data-ad-slot={slotId}
                    data-ad-format={format}
                    data-full-width-responsive="true"></ins>
            </div>
        </div>
    );
};

export default AdBanner;
