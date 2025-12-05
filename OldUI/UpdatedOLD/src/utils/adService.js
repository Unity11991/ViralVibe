export const loadAdSenseScript = () => {
    if (document.getElementById('adsense-script')) {
        return; // Script already loaded
    }

    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.async = true;
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9178133918559920";
    script.crossOrigin = "anonymous";

    document.head.appendChild(script);
};
