export interface FilenameOptions {
  originalName: string;
  ext: string;
  domain: string;
  timestamp: string;
  index: number;
  pageTitle?: string;
  width?: number;
  height?: number;
}

export function sanitizePathSegment(segment: string): string {
  if (!segment) return 'image';
  // Remove control chars, illegal OS chars: < > : " / \ | ? *
  let sanitized = segment
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading and trailing periods
  sanitized = sanitized.replace(/^\.+|\.+$/g, '');

  if (!sanitized) return 'image';
  // Limit segment length to 120 chars to prevent OS path limit overflow
  return sanitized.slice(0, 120);
}

export function cleanPageSlug(pageTitle?: string): string {
  if (!pageTitle) return '';
  // Split on common title separators like ' - ', ' | ', ' — ', ' • ' to get main title
  const parts = pageTitle.split(/\s+[-|—•:]\s+/);
  const mainTitle = parts[0] || pageTitle;
  const slug = mainTitle
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    .replace(/[<>:"/\\|?*#%]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();

  return slug.slice(0, 45) || '';
}

export function getBatchFolderName(options: {
  domain: string;
  pageTitle?: string;
  timestamp: string;
}): { folderPath: string; zipFilename: string } {
  const { domain, pageTitle, timestamp } = options;
  const safeDomain = sanitizePathSegment(domain);
  const pageSlug = cleanPageSlug(pageTitle);
  const dateStr = timestamp.split('_')[0] || timestamp;
  const timeStr = timestamp.split('_')[1] || '';

  const subName = pageSlug ? `${pageSlug}_${dateStr}` : `${dateStr}_${timeStr}`;

  const folderPath = `ImageGrab/${safeDomain}/${subName}/`;
  const zipFilename = pageSlug
    ? `ImageGrab_${safeDomain}_${pageSlug}_${dateStr}.zip`
    : `ImageGrab_${safeDomain}_${timestamp}.zip`;

  return { folderPath, zipFilename };
}

export function sanitizeFullFilename(filename: string): string {
  const parts = filename.split('/');
  const sanitizedParts = parts.map((part, index) => {
    // For the last part (the file itself), keep extension intact
    if (index === parts.length - 1) {
      const dotIndex = part.lastIndexOf('.');
      if (dotIndex > 0) {
        const base = sanitizePathSegment(part.slice(0, dotIndex));
        const ext = part.slice(dotIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
        return `${base}.${ext}`;
      }
      return sanitizePathSegment(part);
    }
    return sanitizePathSegment(part);
  });

  return sanitizedParts.filter(Boolean).join('/');
}

export function formatFilename(
  template: string,
  options: FilenameOptions
): string {
  const {
    originalName,
    ext,
    domain,
    timestamp,
    index,
    pageTitle = '',
    width = 0,
    height = 0,
  } = options;

  const dateStr = timestamp.split('_')[0] || timestamp;
  const timeStr = timestamp.split('_')[1] || '';
  const paddedIndex = String(index).padStart(2, '0');

  const safeOriginalName = sanitizePathSegment(originalName);
  const safeDomain = sanitizePathSegment(domain);
  const safePageTitle = sanitizePathSegment(cleanPageSlug(pageTitle) || domain);

  let formatted = template
    .replace(/\$\{original_name\}/gi, safeOriginalName)
    .replace(/\$\{ext\}/gi, ext)
    .replace(/\$\{domain\}/gi, safeDomain)
    .replace(/\$\{timestamp\}/gi, timestamp)
    .replace(/\$\{date\}/gi, dateStr)
    .replace(/\$\{time\}/gi, timeStr)
    .replace(/\$\{page_title\}/gi, safePageTitle)
    .replace(/\$\{width\}/gi, String(width || ''))
    .replace(/\$\{height\}/gi, String(height || ''))
    .replace(/\$\{index\}/gi, String(index))
    .replace(/\$\{index_00\}/gi, paddedIndex);

  // If user template forgot the extension, append it
  if (!formatted.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
    formatted = `${formatted}.${ext}`;
  }

  return sanitizeFullFilename(formatted);
}

export function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}

export function extractDomain(url: string): string {
  if (!url) return 'unknown';
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return 'local';
  }
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '') || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getFileExtension(url: string): string {
  if (!url) return 'jpg';

  // Handle data URIs
  if (url.startsWith('data:image/')) {
    const mimeMatch = url.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
    if (mimeMatch?.[1]) {
      let mime = mimeMatch[1].toLowerCase();
      if (mime === 'svg+xml') return 'svg';
      if (mime === 'jpeg') return 'jpg';
      if (mime === 'x-icon') return 'ico';
      return mime;
    }
    return 'jpg';
  }

  try {
    const urlObj = new URL(url);

    // 1. Check query parameters like ?format=webp, ?fm=png, ?ext=jpg, ?type=webp
    const queryParams = ['format', 'fm', 'ext', 'type', 'mime'];
    for (const param of queryParams) {
      const val = urlObj.searchParams.get(param)?.toLowerCase();
      if (val) {
        const cleaned = val.replace(/[^a-z0-9]/g, '');
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(cleaned)) {
          return cleaned === 'jpeg' ? 'jpg' : cleaned;
        }
      }
    }

    // 2. Check pathname
    const pathname = urlObj.pathname;
    const lastSegment = pathname.split('/').pop() || '';
    const parts = lastSegment.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
      if (ext && validExtensions.includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
    return 'jpg';
  } catch {
    return 'jpg';
  }
}

export function getOriginalName(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return 'image';
  }
  try {
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);
    const filename = pathname.split('/').filter(Boolean).pop() || 'image';
    const dotIndex = filename.lastIndexOf('.');
    const baseName = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
    return sanitizePathSegment(baseName) || 'image';
  } catch {
    return 'image';
  }
}
