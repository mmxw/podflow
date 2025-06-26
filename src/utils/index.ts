/**
 * Format time in seconds to MM:SS or HH:MM:SS format
 */
export const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';

    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');

    if (hh) {
        return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
};

/**
 * Get globally provided variables with fallback
 */
export const getGlobalVar = (name: string, defaultValue: any): any => {
    if (typeof window !== 'undefined' && (window as any)[name]) {
        return (window as any)[name];
    }
    return defaultValue;
};

/**
 * Strip HTML tags from text
 */
export const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>?/gm, '');
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};
