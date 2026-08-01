// Helper utility for rendering PDF DataURLs safely in browser iframes without cross-origin DataURL blocking
export function dataURLtoBlob(dataurl) {
  if (!dataurl || typeof dataurl !== 'string') return null;
  if (!dataurl.startsWith('data:')) return null;
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.warn('[PDF] Blob conversion failed:', e);
    return null;
  }
}

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

  if (url.startsWith('data:application/pdf') || url.startsWith('data:')) {
    const blob = dataURLtoBlob(url);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  }

  return url;
}
