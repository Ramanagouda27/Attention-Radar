import { useEffect, useRef, useState } from 'react';
import YouTubeInput from './YouTubeInput';
import { formatTime, detectSeekType } from '../utils/youtube';

let ytApiReady    = false;
const ytCallbacks = [];

function loadYouTubeApi() {
  return new Promise(resolve => {
    if (ytApiReady) { resolve(); return; }
    ytCallbacks.push(resolve);
    if (!window._ytApiLoading) {
      window._ytApiLoading = true;
      window.onYouTubeIframeAPIReady = () => {
        ytApiReady = true;
        ytCallbacks.forEach(cb => cb());
        ytCallbacks.length = 0;
      };
      const tag = document.createElement('script');
      tag.src   = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

export default function VideoPlayer({ track, onDurationChange }) {
  const [source, setSource]           = useState('html5');
  const [ytVideoId, setYtVideoId]     = useState(null);
  const [ytLoading, setYtLoading]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);

  const videoRef    = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytWrapRef   = useRef(null);      // outer div React controls
  const ytMountRef  = useRef(null);      // inner div YouTube controls — kept outside React
  const lastTimeRef = useRef(0);
  const pollRef     = useRef(null);

  // ── HTML5 event binding ──────────────────────────────────────
  useEffect(() => {
    if (source !== 'html5') return;
    const v = videoRef.current;
    if (!v) return;

    const onPlay    = () => track('play',  { currentTime: v.currentTime });
    const onPause   = () => track('pause', { currentTime: v.currentTime });
    const onTimeUpd = () => { setCurrentTime(v.currentTime); lastTimeRef.current = v.currentTime; };
    const onMeta    = () => { setDuration(v.duration); onDurationChange?.(v.duration); };
    let seekStart   = null;
    const onSeeking = () => { seekStart = lastTimeRef.current; };
    const onSeeked  = () => {
      const diff = v.currentTime - (seekStart || 0);
      if (diff < -1) track('seek_backward', { currentTime: v.currentTime, seekFrom: seekStart, seekTo: v.currentTime });
      else if (diff > 1) track('seek_forward', { currentTime: v.currentTime, seekFrom: seekStart, seekTo: v.currentTime });
      seekStart = null;
    };

    v.addEventListener('play',           onPlay);
    v.addEventListener('pause',          onPause);
    v.addEventListener('timeupdate',     onTimeUpd);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('seeking',        onSeeking);
    v.addEventListener('seeked',         onSeeked);

    return () => {
      v.removeEventListener('play',           onPlay);
      v.removeEventListener('pause',          onPause);
      v.removeEventListener('timeupdate',     onTimeUpd);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('seeking',        onSeeking);
      v.removeEventListener('seeked',         onSeeked);
    };
  }, [source, track, onDurationChange]);

  // ── YouTube player mount ─────────────────────────────────────
  useEffect(() => {
    if (source !== 'youtube' || !ytVideoId) return;

    let cancelled = false;
    let player    = null;
    let prevState = -1;
    let isSeeking = false;

    setYtLoading(true);
    setCurrentTime(0);
    setDuration(0);

    // Create a fresh mount div OUTSIDE React's tree
    // and append it directly to the wrapper div
    const mountDiv = document.createElement('div');
    mountDiv.id    = 'yt-player-mount-' + Date.now();
    ytMountRef.current = mountDiv;

    if (ytWrapRef.current) {
      // Clear any old content first
      ytWrapRef.current.innerHTML = '';
      ytWrapRef.current.appendChild(mountDiv);
    }

    loadYouTubeApi().then(() => {
      if (cancelled || !mountDiv.isConnected) return;

      player = new window.YT.Player(mountDiv, {
        videoId: ytVideoId,
        width:   '100%',
        height:  '100%',
        playerVars: {
          autoplay:       0,
          controls:       1,
          rel:            0,
          modestbranding: 1,
          enablejsapi:    1,
          origin:         window.location.origin,
        },
        events: {
          onReady(e) {
            if (cancelled) return;
            setYtLoading(false);
            const dur = e.target.getDuration();
            setDuration(dur);
            onDurationChange?.(dur);
            ytPlayerRef.current = player;

            // Start polling for time updates + seek detection
            let lastWall = Date.now();
            let lastPos  = 0;

            clearInterval(pollRef.current);
            pollRef.current = setInterval(() => {
              if (!player || typeof player.getCurrentTime !== 'function') return;
              const now        = player.getCurrentTime();
              const state      = player.getPlayerState();
              setCurrentTime(now);
              lastTimeRef.current = now;

              const wallElapsed = (Date.now() - lastWall) / 1000;
              const posDelta    = now - lastPos;

              if (lastPos > 0 && (state === 1 || state === 2)) {
                const expected = state === 1 ? wallElapsed : 0;
                if (Math.abs(posDelta - expected) > 2.5) {
                  isSeeking = true;
                  const type = detectSeekType(lastPos, now);
                  if (type) track(type, { currentTime: now, seekFrom: lastPos, seekTo: now });
                  setTimeout(() => { isSeeking = false; }, 300);
                }
              }
              lastPos  = now;
              lastWall = Date.now();
            }, 500);
          },

          onStateChange(e) {
            if (cancelled) return;
            const state = e.data;
            if (state === 1 && prevState !== 1) {
              track('play', { currentTime: player.getCurrentTime() });
            }
            if (state === 2) {
              setTimeout(() => {
                if (player && player.getPlayerState() === 2 && !isSeeking) {
                  track('pause', { currentTime: player.getCurrentTime() });
                }
              }, 150);
            }
            if (state === 0) {
              track('exit', { currentTime: player.getDuration() });
              clearInterval(pollRef.current);
            }
            prevState = state;
          },

          onError(e) {
            console.warn('YouTube player error code:', e.data);
            setYtLoading(false);
          }
        },
      });

      ytPlayerRef.current = player;
    });

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);

      // Destroy player safely without touching React's DOM
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }

      // Clear the wrapper ourselves (safe — React doesn't manage inner content)
      if (ytWrapRef.current) {
        ytWrapRef.current.innerHTML = '';
      }
    };
  }, [ytVideoId, source]);   // intentionally exclude track/onDurationChange to avoid re-mounting

  // ── Source switch ────────────────────────────────────────────
  const switchSource = (s) => {
    clearInterval(pollRef.current);
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch (_) {}
      ytPlayerRef.current = null;
    }
    if (ytWrapRef.current) ytWrapRef.current.innerHTML = '';
    setYtVideoId(null);
    setSource(s);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleYtLoad = (id) => {
    // Reset first, then set new ID to trigger a clean useEffect run
    setYtVideoId(null);
    setTimeout(() => setYtVideoId(id), 50);
  };

  return (
    <div className="player-section">

      {/* Source toggle */}
      <div className="source-toggle-row">
        <div className="source-toggle">
          <button
            className={`source-btn${source === 'html5'   ? ' active' : ''}`}
            onClick={() => switchSource('html5')}
          >HTML5</button>
          <button
            className={`source-btn${source === 'youtube' ? ' active' : ''}`}
            onClick={() => switchSource('youtube')}
          >YouTube</button>
        </div>
        <span className={`player-badge ${source === 'youtube' ? 'badge-youtube' : 'badge-html5'}`}>
          {source === 'youtube' ? 'YouTube' : 'HTML5'}
        </span>
      </div>

      {/* YouTube URL input */}
      {source === 'youtube' && (
        <YouTubeInput onLoad={handleYtLoad} isLoading={ytLoading} />
      )}

      {/* Player container */}
      <div className="video-container">

        {/* HTML5 player */}
        <video
          ref={videoRef}
          controls
          preload="metadata"
          style={{ display: source === 'html5' ? 'block' : 'none', width: '100%', height: '100%' }}
        >
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
        </video>

        {/* YouTube container — React only controls visibility, NOT inner content */}
        <div
          ref={ytWrapRef}
          style={{
            display:  source === 'youtube' ? 'block' : 'none',
            width:    '100%',
            height:   '100%',
            position: 'relative',
          }}
        >
          {/* Placeholder shown before a video is loaded */}
          {source === 'youtube' && !ytVideoId && !ytLoading && (
            <div className="yt-placeholder">Paste a YouTube URL above and click Load</div>
          )}
          {ytLoading && (
            <div className="yt-loading">Loading player…</div>
          )}
        </div>

      </div>

      {/* Time display bar */}
      <div className="time-bar">
        <span className="time-current">{formatTime(currentTime)}</span>
        <span className="time-sep">/</span>
        <span className="time-duration">{formatTime(duration)}</span>
      </div>

    </div>
  );
}