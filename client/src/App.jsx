import { useState, useEffect, useRef } from 'react';
import { useTracker }   from './hooks/useTracker';
import VideoPlayer      from './components/VideoPlayer';
import Dashboard        from './components/Dashboard';
import { beaconExit }   from './services/api';
import { formatTime }   from './utils/youtube';

const SESSION_ID = 'session_' + Math.random().toString(36).substr(2, 8);

export default function App() {
  const [tab, setTab]           = useState('player');
  const [videoId, setVideoId]   = useState('lecture-demo-01');
  const [duration, setDuration] = useState(0);
  const [liveActive, setLive]   = useState(false);
  const liveTimer               = useRef(null);

  const { track, localEvents, counts, resetCounts } = useTracker(SESSION_ID, videoId);

  const trackWithPulse = (...args) => {
    track(...args);
    setLive(true);
    clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(() => setLive(false), 3000);
  };

  useEffect(() => {
    const handler = () => beaconExit({ sessionId: SESSION_ID, videoId });
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [videoId]);

  const handleReset = async () => {
    resetCounts();
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reset`, { method: 'DELETE' });
    } catch (_) {}
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">📡</div>
          <span>Attention Radar</span>
        </div>
        <div className="header-actions">
          <div className="tabs">
            <button className={`tab${tab === 'player'    ? ' active' : ''}`} onClick={() => setTab('player')}>Player</button>
            <button className={`tab${tab === 'dashboard' ? ' active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
          </div>
          <div className={`live-badge${liveActive ? ' active' : ''}`}>
            <div className="live-dot" /> LIVE
          </div>
          <button className="btn danger" onClick={handleReset}>Reset</button>
        </div>
      </header>

      <main className="main">
        <div className={`panel player-panel${tab === 'player' ? '' : ' hidden'}`}>
          <VideoPlayer track={trackWithPulse} onDurationChange={setDuration} />

          <div className="section">
            <div className="section-title">Interaction Stats</div>
            <div className="stats-row">
              <StatCard value={counts.pause}         label="Pauses"  cls="val-pause"  />
              <StatCard value={counts.seek_backward} label="Replays" cls="val-replay" />
              <StatCard value={counts.exit}          label="Exits"   cls="val-exit"   />
              <StatCard value={counts.play}          label="Plays"   cls="val-play"   />
            </div>
          </div>

          <div className="section">
            <div className="section-title">Simulate Events <span className="section-note">for demo</span></div>
            <div className="sim-grid">
              <SimBtn onClick={() => trackWithPulse('pause',         { currentTime: 0 })} icon="⏸" label="Simulate Pause"   sub="at current position" />
              <SimBtn onClick={() => trackWithPulse('seek_backward', { currentTime: 0, seekFrom: 15, seekTo: 0 })} icon="↩" label="Simulate Replay" sub="backward 15s seek" />
              <SimBtn onClick={() => {
                trackWithPulse('pause', { currentTime: 0 });
                setTimeout(() => trackWithPulse('pause', { currentTime: 0 }), 200);
                setTimeout(() => trackWithPulse('seek_backward', { currentTime: 0, seekFrom: 10, seekTo: 0 }), 400);
              }} icon="🔥" label="Confusion Burst" sub="3 pauses + replay" />
              <SimBtn onClick={() => trackWithPulse('exit', { currentTime: 0 })} icon="🚪" label="Simulate Exit" sub="drop-off at current" />
            </div>
          </div>

          <div className="section">
            <div className="section-title">Event Log</div>
            <div className="event-log">
              {localEvents.length === 0
                ? <div className="log-empty">No events yet — play the video to start tracking</div>
                : localEvents.map((ev, i) => (
                  <div key={i} className="event-item">
                    <span className={`event-badge badge-${ev.eventType}`}>{ev.eventType.replace('_', ' ').toUpperCase()}</span>
                    <span className="event-pos">@ {formatTime(ev.currentTime || 0)}</span>
                    {ev.seekFrom !== undefined && <span className="event-detail">← from {formatTime(ev.seekFrom)}</span>}
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {tab === 'dashboard' && (
          <div className="panel dashboard-panel">
            <Dashboard
              videoId={videoId}
              duration={duration}
              localCounts={counts}
              localEvents={localEvents}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ value, label, cls }) {
  return (
    <div className="stat-card">
      <div className={`stat-value ${cls}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function SimBtn({ onClick, icon, label, sub }) {
  return (
    <button className="sim-btn" onClick={onClick}>
      {icon} {label}
      <span>{sub}</span>
    </button>
  );
}