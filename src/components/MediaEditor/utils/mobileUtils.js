/**
 * Mobile Utilities for MediaEditor
 * Provides mobile detection, touch event handling, and responsive helpers
 */

/**
 * Check if current device is mobile based on window width
 * @returns {boolean}
 */
export const isMobileDevice = () => {
    return window.innerWidth < 768;
};

/**
 * Check if current device is tablet
 * @returns {boolean}
 */
export const isTabletDevice = () => {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
};

/**
 * Check if current device is desktop
 * @returns {boolean}
 */
export const isDesktopDevice = () => {
    return window.innerWidth >= 1024;
};

/**
 * Get responsive breakpoint
 * @returns {'mobile' | 'tablet' | 'desktop'}
 */
export const getBreakpoint = () => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
};

/**
 * Hook to detect mobile view with window resize listener
 */
export const useMobileDetection = (callback) => {
    const checkMobile = () => {
        const breakpoint = getBreakpoint();
        callback(breakpoint);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
};

/**
 * Calculate distance between two touch points (for pinch gestures)
 * @param {Touch} touch1 
 * @param {Touch} touch2 
 * @returns {number}
 */
export const getTouchDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Get center point between two touches
 * @param {Touch} touch1 
 * @param {Touch} touch2 
 * @returns {{x: number, y: number}}
 */
export const getTouchCenter = (touch1, touch2) => {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
};

/**
 * Detect swipe direction from touch events
 * @param {number} startX 
 * @param {number} startY 
 * @param {number} endX 
 * @param {number} endY 
 * @param {number} threshold - Minimum distance to be considered a swipe
 * @returns {'left' | 'right' | 'up' | 'down' | null}
 */
export const getSwipeDirection = (startX, startY, endX, endY, threshold = 50) => {
    const dx = endX - startX;
    const dy = endY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Not enough movement
    if (absDx < threshold && absDy < threshold) return null;

    // Horizontal swipe
    if (absDx > absDy) {
        return dx > 0 ? 'right' : 'left';
    }

    // Vertical swipe
    return dy > 0 ? 'down' : 'up';
};

/**
 * Prevent default touch behavior (like pull-to-refresh)
 * @param {HTMLElement} element 
 */
export const preventTouchDefaults = (element) => {
    element.addEventListener('touchstart', (e) => {
        // Allow scrolling in scrollable containers
        if (e.target.closest('.scrollable')) return;

        // Prevent pull-to-refresh and other default behaviors
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    element.addEventListener('touchmove', (e) => {
        if (e.target.closest('.scrollable')) return;

        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
};

/**
 * Get optimal touch target size based on device
 * @returns {number} Size in pixels
 */
export const getTouchTargetSize = () => {
    return isMobileDevice() ? 48 : 40;
};

/**
 * Debounce function for resize events
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
export const debounce = (func, wait = 150) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Check if device supports touch
 * @returns {boolean}
 */
export const isTouchDevice = () => {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
};

/**
 * Get safe area insets for mobile devices (notch, home indicator)
 * @returns {{top: number, right: number, bottom: number, left: number}}
 */
export const getSafeAreaInsets = () => {
    const style = getComputedStyle(document.documentElement);
    return {
        top: parseInt(style.getPropertyValue('--sat') || '0'),
        right: parseInt(style.getPropertyValue('--sar') || '0'),
        bottom: parseInt(style.getPropertyValue('--sab') || '0'),
        left: parseInt(style.getPropertyValue('--sal') || '0')
    };
};

/**
 * Vibrate device (for haptic feedback)
 * @param {number | number[]} pattern - Duration or pattern array
 */
export const vibrate = (pattern = 10) => {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

/**
 * Lock screen orientation (for video editing)
 * @param {'landscape' | 'portrait' | 'any'} orientation 
 */
export const lockOrientation = async (orientation = 'any') => {
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock(orientation);
        }
    } catch (error) {
        console.warn('Orientation lock not supported:', error);
    }
};

/**
 * Unlock screen orientation
 */
export const unlockOrientation = () => {
    try {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    } catch (error) {
        console.warn('Orientation unlock not supported:', error);
    }
};
