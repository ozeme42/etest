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

export function getEmbeddablePdfUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '' || url.includes('[STORED_IN_INDEXEDDB]')) {
    return null;
  }
  
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }

  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('JVBERi0')) {
    url = `data:application/pdf;base64,${url.trim()}`;
  }

  if (url.startsWith('data:application/pdf') || url.startsWith('data:')) {
    if (blobUrlCache.has(url)) {
      return blobUrlCache.get(url);
    }
    const blob = dataURLtoBlob(url);
    if (blob) {
      const createdUrl = URL.createObjectURL(blob);
      blobUrlCache.set(url, createdUrl);
      return createdUrl;
    }
  }

  return url;
}
