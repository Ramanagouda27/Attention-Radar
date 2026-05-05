export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const longMatch = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/
  );
  if (longMatch) return longMatch[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

export function isValidYouTubeUrl(url) {
  return extractYouTubeId(url) !== null;
}

export function detectSeekType(prevTime, newTime, threshold = 2) {
  const delta = newTime - prevTime;
  if (delta < -threshold) return 'seek_backward';
  if (delta >  threshold) return 'seek_forward';
  return null;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}