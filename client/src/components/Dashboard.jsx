import { useState, useEffect, useCallback } from 'react';
import { fetchAnalytics }    from '../services/api';
import { formatTime }         from '../utils/youtube';
import { ConfusionChart, BreakdownChart, AttentionHeatmap } from './Charts';

export default function Dashboard({ videoId, duration, localCounts, localEvents }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result  = await fetchAnalytics(videoId, duration || 600);
      result.summary = localCounts;
      setData(result);
    } catch (err) {
      setData(processLocally(localEvents, localCounts, duration || 600));
      setError('Backend unavailable — showing local data');
    } finally {
      setLoading(false);
    }
  }, [videoId, duration, localCounts, localEvents]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="dash-loading">Calculating analytics…</div>;

  const seg  = data?.topConfusingSegment;
  const hot  = data?.replayHotspots?.[0];
  const drop = data?.dropOffPoint;

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h2>Attention Analytics</h2>
          <p>Real-time confusion detection from interaction patterns</p>
        </div>
        <button className="btn primary" onClick={load} disabled={loading}>
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="dash-warn">{error}</div>}

      <div className="insight-grid">
        <InsightCard accent="red" icon="🔴" title="Most Confusing">
          <strong>{seg ? seg.timeLabel : '—'}</strong>
          <span>{seg ? `Score: ${seg.score}  •  ${seg.pauses} pauses, ${seg.replays} replays` : 'No data yet'}</span>
        </InsightCard>
        <InsightCard accent="amber" icon="↩" title="Top Replay Spot">
          <strong>{hot ? hot.timeLabel : '—'}</strong>
          <span>{hot ? `Replayed ${hot.replayCount}× in this segment` : 'No replays yet'}</span>
        </InsightCard>
        <InsightCard accent="blue" icon="🚪" title="Drop-off Point">
          <strong>{drop ? drop.timeLabel : '—'}</strong>
          <span>{drop ? `${drop.count} exit event(s) detected` : 'No drop-offs yet'}</span>
        </InsightCard>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Confusion Intensity Over Time</span>
          <div className="legend">
            <span className="legend-item"><span className="dot" style={{ background: '#ff4f6a' }} /> High</span>
            <span className="legend-item"><span className="dot" style={{ background: '#ffb74f' }} /> Moderate</span>
            <span className="legend-item"><span className="dot" style={{ background: '#4f8eff' }} /> Low</span>
          </div>
        </div>
        <ConfusionChart timeline={data?.confusionTimeline} />
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Attention Heatmap</span>
          <div className="legend">
            <span className="legend-item"><span className="dot" style={{ background: 'rgba(79,142,255,0.4)' }} /> Low</span>
            <span className="legend-item"><span className="dot" style={{ background: '#ffb74f' }} /> Moderate</span>
            <span className="legend-item"><span className="dot" style={{ background: '#ff4f6a' }} /> High</span>
          </div>
        </div>
        <AttentionHeatmap timeline={data?.confusionTimeline} />
      </div>

      <div className="chart-card">
        <BreakdownChart summary={localCounts} totalEvents={data?.totalEvents ?? 0} />
      </div>

      <div className="section">
        <div className="section-title">Replay Hotspots</div>
        {data?.replayHotspots?.length ? (
          <div className="replay-list">
            {data.replayHotspots.map((h, i) => (
              <div key={i} className="replay-item">
                <div className="replay-left">
                  <span className="replay-rank">{i + 1}</span>
                  <div>
                    <div className="replay-time">{h.timeLabel}</div>
                    <div className="replay-desc">Students repeatedly rewound this segment</div>
                  </div>
                </div>
                <span className="replay-count">{h.replayCount}× replayed</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">No replay data yet. Seek backward in the player to generate data.</p>
        )}
      </div>
    </div>
  );
}

function InsightCard({ accent, icon, title, children }) {
  return (
    <div className={`insight-card accent-${accent}`}>
      <div className="insight-icon">{icon}</div>
      <div className="insight-title">{title}</div>
      <div className="insight-body">{children}</div>
    </div>
  );
}

function processLocally(events, counts, duration) {
  const WINDOW = 30;
  const numBuckets = Math.ceil(duration / WINDOW);
  const buckets = Array.from({ length: numBuckets }, (_, i) => ({
    i, start: i * WINDOW, end: Math.min((i + 1) * WINDOW, duration),
    pauses: 0, replays: 0, exits: 0,
  }));

  for (const ev of events) {
    const idx = Math.min(Math.floor((ev.currentTime || 0) / WINDOW), numBuckets - 1);
    if (idx < 0) continue;
    if (ev.eventType === 'pause')         buckets[idx].pauses++;
    if (ev.eventType === 'seek_backward') buckets[idx].replays++;
    if (ev.eventType === 'exit')          buckets[idx].exits++;
  }

  let maxRaw = 1;
  for (const b of buckets) {
    b.raw = b.pauses * 3 + b.replays * 5 + b.exits * 8;
    maxRaw = Math.max(maxRaw, b.raw);
  }
  for (const b of buckets) {
    b.score = Math.round((b.raw / maxRaw) * 100);
    b.label = b.score >= 70 ? 'high' : b.score >= 35 ? 'moderate' : 'low';
  }

  const topBucket = buckets.reduce((m, b) => b.score > m.score ? b : m, buckets[0]);
  const exits     = events.filter(e => e.eventType === 'exit').sort((a, b) => b.currentTime - a.currentTime);

  return {
    totalEvents: events.length,
    summary:     counts,
    confusionTimeline: buckets.map(b => ({
      time: b.start, timeLabel: formatTime(b.start),
      score: b.score, pauses: b.pauses, replays: b.replays, label: b.label,
    })),
    topConfusingSegment: topBucket.score > 0 ? {
      timeLabel: `${formatTime(topBucket.start)}–${formatTime(topBucket.end)}`,
      score: topBucket.score, pauses: topBucket.pauses, replays: topBucket.replays,
    } : null,
    replayHotspots: buckets.filter(b => b.replays > 0).sort((a, b) => b.replays - a.replays).slice(0, 3).map(b => ({
      timeLabel: `${formatTime(b.start)}–${formatTime(b.end)}`, replayCount: b.replays,
    })),
    dropOffPoint: exits.length > 0 ? { timeLabel: formatTime(exits[0].currentTime), count: exits.length } : null,
  };
}