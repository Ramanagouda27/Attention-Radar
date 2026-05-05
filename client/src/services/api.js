const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function trackEvent(payload) {
  try {
    const res = await fetch(`${BASE_URL}/api/track`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ timestamp: Date.now(), ...payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Attention Radar] trackEvent failed:', err.message);
    return null;
  }
}

export async function fetchAnalytics(videoId, videoDuration) {
  const params = new URLSearchParams({ videoId, videoDuration: String(videoDuration) });
  const res    = await fetch(`${BASE_URL}/api/analytics?${params}`);
  if (!res.ok) throw new Error(`Analytics fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function resetAllData() {
  const res = await fetch(`${BASE_URL}/api/reset`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Reset failed: HTTP ${res.status}`);
  return res.json();
}

export function beaconExit(payload) {
  if (!navigator.sendBeacon) return false;
  const blob = new Blob(
    [JSON.stringify({ timestamp: Date.now(), eventType: 'exit', ...payload })],
    { type: 'application/json' }
  );
  return navigator.sendBeacon(`${BASE_URL}/api/track`, blob);
}