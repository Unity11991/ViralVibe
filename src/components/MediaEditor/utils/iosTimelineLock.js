/**
 * iOS Timeline Position Lock
 * Prevents timeline from jumping on iOS Safari
 */

let lastScrollY = 0;
let ticking = false;

export const lockTimelinePositionIOS = () => {
    // Only run on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (!isIOS) return;

    const lockPosition = () => {
        const timeline = document.querySelector('.md\\:hidden.fixed.bottom-\\[72px\\]');
        const toolbar = document.querySelector('.capcut-mobile-toolbar');

        if (timeline && toolbar) {
            // Force position using transform instead of fixed positioning
            timeline.style.position = 'absolute';
            timeline.style.bottom = '72px';
            timeline.style.left = '0';
            timeline.style.right = '0';
            timeline.style.transform = 'translateZ(0)';
            timeline.style.webkitTransform = 'translateZ(0)';

            toolbar.style.position = 'absolute';
            toolbar.style.bottom = '0';
            toolbar.style.left = '0';
            toolbar.style.right = '0';
            toolbar.style.transform = 'translateZ(0)';
            toolbar.style.webkitTransform = 'translateZ(0)';

            // Update position on scroll
            const updatePosition = () => {
                const scrollY = window.scrollY || window.pageYOffset;
                const viewportHeight = window.innerHeight;

                // Calculate absolute position from bottom
                const timelineBottom = scrollY + viewportHeight - 72;
                const toolbarBottom = scrollY + viewportHeight;

                timeline.style.top = `${timelineBottom - 252}px`; // 252px = controls(52) + timeline(200)
                toolbar.style.top = `${toolbarBottom - 72}px`;

                ticking = false;
            };

            // Throttle scroll updates
            const requestTick = () => {
                if (!ticking) {
                    window.requestAnimationFrame(updatePosition);
                    ticking = true;
                }
            };

            // Listen to scroll
            window.addEventListener('scroll', requestTick, { passive: true });
            window.addEventListener('resize', requestTick, { passive: true });

            // Initial position
            updatePosition();
        }
    };

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', lockPosition);
    } else {
        lockPosition();
    }

    // Also run after a short delay to catch dynamic content
    setTimeout(lockPosition, 500);
    setTimeout(lockPosition, 1000);
};

// Auto-initialize
if (typeof window !== 'undefined') {
    lockTimelinePositionIOS();
}
