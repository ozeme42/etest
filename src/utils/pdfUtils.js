// Helper utility for rendering PDF DataURLs safely in browser iframes without cross-origin DataURL blocking
export function dataURLtoBlob(dataurl) {
  if (!dataurl || typeof dataurl !== 'string') return null;
  if (!dataurl.startsWith('data:')) return null;
  try {
    const parts = dataurl.split(',');
    if (parts.length < 2) return null;
    const header = parts[0];
    const rawData = parts.slice(1).join(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const isBase64 = header.includes(';base64');
    
    if (isBase64) {
      const cleanData = rawData.replace(/\s/g, '').replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
      const padded = cleanData.padEnd(cleanData.length + (4 - (cleanData.length % 4)) % 4, '=');
      const bstr = atob(padded);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } else {
      const decoded = decodeURIComponent(rawData);
      return new Blob([decoded], { type: mime });
    }
  } catch (e) {
    return null;
  }
}

const blobUrlCache = new Map();

export function extractGoogleDriveId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const m1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1 && m1[1]) return m1[1];
  const m2 = trimmed.match(/[?&]id(?:%3D|=)([a-zA-Z0-9_-]+)/i);
  if (m2 && m2[1]) return m2[1];
  const m3 = trimmed.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m3 && m3[1]) return m3[1];
  return null;
}

export function getEmbeddablePdfUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '' || url.includes('[STORED_IN_INDEXEDDB]')) {
    return null;
  }
  
  let cleanUrl = url.trim();

  // 1. Google Drive URLs (any format)
  const driveId = extractGoogleDriveId(cleanUrl);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  // 2. Dropbox URLs: change dl=0 to raw=1 for direct viewing
  if (cleanUrl.includes('dropbox.com')) {
    return cleanUrl.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
  }

  // 3. Direct HTTP(S) or Blob URLs
  if (cleanUrl.startsWith('blob:') || cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }

  // 4. Data URLs
  if (cleanUrl.startsWith('JVBERi0')) {
    cleanUrl = `data:application/pdf;base64,${cleanUrl}`;
  }

  if (cleanUrl.startsWith('data:application/pdf') || cleanUrl.startsWith('data:')) {
    if (blobUrlCache.has(cleanUrl)) {
      return blobUrlCache.get(cleanUrl);
    }
    const blob = dataURLtoBlob(cleanUrl);
    if (blob) {
      const createdUrl = URL.createObjectURL(blob);
      blobUrlCache.set(cleanUrl, createdUrl);
      return createdUrl;
    }
  }

  return cleanUrl;
}
