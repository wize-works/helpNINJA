/**
 * Simple keyword extraction utility
 */

/**
 * Extract keywords from a text message by:
 * 1. Including the entire message as a single keyword
 * 2. Including each word as individual keywords
 * 
 * This ensures we can match both phrase-based rules like "reset password" 
 * and individual word rules like "password".
 */
export function extractKeywords(text: string): string[] {
    const keywords: string[] = [];

    // Include the entire lowercase message as a keyword
    keywords.push(text.toLowerCase());

    // Convert to lowercase and split by spaces
    const words = text.toLowerCase().split(/\s+/);

    // Remove punctuation and empty strings, then add as individual keywords
    words
        .map(word => word.replace(/[.,?!;:'"()\[\]{}]/g, ''))
        .filter(word => word.length > 0)
        .forEach(word => keywords.push(word));

    return keywords;
}
