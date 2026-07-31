/**
 * Formats and normalizes image URLs so they load reliably across all sizes,
 * formats (JPG, PNG, WebP, AVIF, SVG, GIF, Data URIs), and origins.
 *
 * Automatically converts Google Drive share links, Wikipedia File pages,
 * Google Image search redirects, GitHub blob links, Dropbox links, and Imgur page links
 * into direct renderable image stream URLs.
 */
export function formatImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // Remove surrounding quotes or angle brackets if pasted accidentally
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // Handle data URIs and blob URIs directly
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Handle protocol-relative URLs (e.g. //upload.wikimedia.org/...)
  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  }

  // Handle missing protocol (e.g. images.unsplash.com/... or i.imgur.com/...)
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const urlObj = new URL(trimmed);

    // 1. Handle Google Image Search redirect URLs (e.g., google.com/imgres?imgurl=...)
    if (urlObj.hostname.includes('google.') && urlObj.pathname.includes('/imgres')) {
      const imgurl = urlObj.searchParams.get('imgurl');
      if (imgurl) {
        return formatImageUrl(decodeURIComponent(imgurl));
      }
    }

    // 2. Handle Google Drive links
    // e.g. https://drive.google.com/file/d/1ABC123/view?usp=sharing
    // or https://drive.google.com/open?id=1ABC123
    if (urlObj.hostname.includes('drive.google.com')) {
      let fileId = urlObj.searchParams.get('id');
      if (!fileId) {
        const match = urlObj.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          fileId = match[1];
        }
      }
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }

    // 3. Handle Wikipedia / Wikimedia Commons File: pages
    // e.g. https://commons.wikimedia.org/wiki/File:Solaris.jpg or https://en.wikipedia.org/wiki/File:Solaris.jpg
    if (urlObj.hostname.includes('wikipedia.org') || urlObj.hostname.includes('wikimedia.org')) {
      const match = urlObj.pathname.match(/\/wiki\/(File|Image):(.+)$/i);
      if (match) {
        const fileName = decodeURIComponent(match[2]);
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
      }
    }

    // 4. Handle GitHub web blob links
    // e.g. https://github.com/user/repo/blob/main/path/image.png
    if (urlObj.hostname === 'github.com' && urlObj.pathname.includes('/blob/')) {
      const rawPath = urlObj.pathname.replace('/blob/', '/');
      return `https://raw.githubusercontent.com${rawPath}`;
    }

    // 5. Handle Dropbox share links
    // e.g. https://www.dropbox.com/s/xyz/photo.jpg?dl=0
    if (urlObj.hostname.includes('dropbox.com')) {
      urlObj.searchParams.set('raw', '1');
      return urlObj.toString();
    }

    // 6. Handle Imgur page links
    // e.g. https://imgur.com/a/ABC1234 or https://imgur.com/ABC1234
    if (urlObj.hostname === 'imgur.com' || urlObj.hostname === 'm.imgur.com') {
      const match = urlObj.pathname.match(/\/(?:a|gallery)?\/([a-zA-Z0-9]+)/);
      if (match) {
        return `https://i.imgur.com/${match[1]}.jpg`;
      }
    }
  } catch (e) {
    // If URL parsing fails, return trimmed as best effort
  }

  return trimmed;
}

/**
 * Returns a high-speed CDN image proxy URL (wsrv.nl / weserv.nl) that bypasses CORS,
 * anti-hotlinking headers, referrer checks, and optimizes image formats.
 */
export function getProxyImageUrl(url: string): string {
  const formatted = formatImageUrl(url);
  if (!formatted || formatted.startsWith('data:') || formatted.startsWith('blob:')) {
    return formatted;
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(formatted)}`;
}

export const DEFAULT_FALLBACK_IMAGE = '';
