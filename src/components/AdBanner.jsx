import React, { useEffect, useState } from 'react';
import { loadAdSenseScript } from '../utils/adService';

const AdBanner = ({ slotId, format = 'auto', className = '' }) => {
    const adInitialized = React.useRef(false);
    const [showAd, setShowAd] = useState(false);
    const insRef = React.useRef(null);

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

    useEffect(() => {
        if (!insRef.current) return;

        // Check if already filled (in case we missed the mutation)
        if (insRef.current.getAttribute('data-ad-status') === 'filled') {
            setShowAd(true);
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-ad-status') {
                    if (insRef.current.getAttribute('data-ad-status') === 'filled') {
                        setShowAd(true);
                    }
                }
            }
        });

        observer.observe(insRef.current, { attributes: true, attributeFilter: ['data-ad-status'] });
        return () => observer.disconnect();
    }, []);

    return (
        <div className={`w-full overflow-hidden transition-all duration-500 ${showAd ? 'bg-white/5 rounded-xl border border-white/10 p-4 opacity-100' : 'opacity-0 h-0'} ${className}`}>
            <div className="w-full text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Advertisement</p>
                <ins className="adsbygoogle"
                    ref={insRef}
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
