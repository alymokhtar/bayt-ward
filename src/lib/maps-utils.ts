/**
 * Google Maps URL Helper Utilities
 * Analyzes and processes various types of Google Maps URLs/embeds
 */

export type GoogleMapsType = 'embed' | 'card' | 'invalid';

export interface GoogleMapsProcessed {
  type: GoogleMapsType;
  embedUrl?: string;
  shareUrl?: string;
  isValid: boolean;
  error?: string;
}

/**
 * Extract src URL from a full iframe HTML code
 * @example
 * extractSrcFromIframe('<iframe src="https://www.google.com/maps/embed?pb=..." ...</iframe>')
 * // Returns: 'https://www.google.com/maps/embed?pb=...'
 */
function extractSrcFromIframe(html: string): string | null {
  try {
    const srcMatch = html.match(/src=["']([^"']+)["']/);
    return srcMatch ? srcMatch[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a valid Google Maps embed URL
 * (contains /maps/embed or output=embed)
 */
function isEmbedUrl(url: string): boolean {
  try {
    return url.includes('/maps/embed') || url.includes('output=embed');
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a valid HTTP(S) URL starting with google.com/maps or goo.gl
 */
function isValidShareUrl(url: string): boolean {
  try {
    if (!url.startsWith('http')) return false;
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Allow: google.com/maps, goo.gl, maps.app.goo.gl
    return (
      hostname.includes('google.com') || 
      hostname.includes('goo.gl') ||
      hostname.includes('maps.app')
    );
  } catch {
    return false;
  }
}

/**
 * Process a Google Maps URL/embed code and determine how to display it
 * 
 * @param input - Raw input from settings (could be iframe HTML, embed URL, or share link)
 * @returns Object with type ('embed', 'card', or 'invalid') and appropriate URLs
 */
export function processGoogleMapsUrl(input: string | null | undefined): GoogleMapsProcessed {
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return {
      type: 'invalid',
      isValid: false,
      error: 'لم يتم تقديم رابط',
    };
  }

  const trimmed = input.trim();

  // Check if it's a full iframe HTML code
  if (trimmed.toLowerCase().includes('<iframe')) {
    const srcUrl = extractSrcFromIframe(trimmed);
    if (srcUrl && isEmbedUrl(srcUrl)) {
      return {
        type: 'embed',
        embedUrl: srcUrl,
        isValid: true,
      };
    }
    return {
      type: 'invalid',
      isValid: false,
      error: 'لم يتمكن من استخراج رابط embed صالح من كود iframe',
    };
  }

  // Check if it's already an embed URL
  if (isEmbedUrl(trimmed)) {
    return {
      type: 'embed',
      embedUrl: trimmed,
      isValid: true,
    };
  }

  // Check if it's a share URL (to be opened in new tab)
  if (isValidShareUrl(trimmed)) {
    return {
      type: 'card',
      shareUrl: trimmed,
      isValid: true,
    };
  }

  // Check for common invalid patterns
  if (
    trimmed === 'https://www.google.com' ||
    trimmed === 'http://google.com' ||
    trimmed.match(/^https?:\/\/(www\.)?google\.com\/?$/)
  ) {
    return {
      type: 'invalid',
      isValid: false,
      error: 'الرابط المدخل غير مكتمل',
    };
  }

  // If it starts with http but doesn't match any pattern
  if (trimmed.startsWith('http')) {
    return {
      type: 'invalid',
      isValid: false,
      error: 'الرابط المدخل ليس رابط Google Maps صالح',
    };
  }

  // Default: assume it's an invalid or partial input
  return {
    type: 'invalid',
    isValid: false,
    error: 'صيغة الرابط غير صحيحة. يرجى استخدام رابط مشاركة أو كود تضمين من Google Maps',
  };
}

/**
 * Safe URL validator - checks if URL is safe to use in iframe or anchor tag
 */
export function isSafeGoogleMapsUrl(url: string | undefined): boolean {
  if (!url) return false;
  const processed = processGoogleMapsUrl(url);
  return processed.isValid;
}

/**
 * Get the appropriate display URL for embedding
 * (for use directly in iframe src attribute)
 */
export function getEmbedUrl(input: string | null | undefined): string | null {
  const processed = processGoogleMapsUrl(input);
  return processed.type === 'embed' ? processed.embedUrl ?? null : null;
}

/**
 * Get the share URL (for opening in new tab)
 */
export function getShareUrl(input: string | null | undefined): string | null {
  const processed = processGoogleMapsUrl(input);
  return processed.type === 'card' ? processed.shareUrl ?? null : null;
}
