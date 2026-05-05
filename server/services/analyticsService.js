const WINDOW_SIZE = 30;

function process(events, videoDuration) {
  const numBuckets = Math.ceil(videoDuration / WINDOW_SIZE);

  const buckets = Array.from({ length: numBuckets }, (_, i) => ({
    bucketIndex: i,
    startTime:   i * WINDOW_SIZE,
    endTime:     Math.min((i + 1) * WINDOW_SIZE, videoDuration),
    pauses: 0, replays: 0, seekForward: 0, exits: 0,
    rawScore: 0, confusionScore: 0, label: 'low',
  }));

  for (const ev of events) {
    const idx = Math.min(Math.floor(ev.currentTime / WINDOW_SIZE), numBuckets - 1);
    if (idx < 0) continue;
    if (ev.eventType === 'pause')         buckets[idx].pauses++;
    if (ev.eventType === 'seek_backward') buckets[idx].replays++;
    if (ev.eventType === 'seek_forward')  buckets[idx].seekForward++;
    if (ev.eventType === 'exit')          buckets[idx].exits++;
  }

  for (const b of buckets) {
    b.rawScore = Math.max(
      0,
      b.pauses * 3 + b.replays * 5 + b.exits * 8 - b.seekForward * 1
    );
  }

  const maxScore = Math.max(...buckets.map(b => b.rawScore), 1);
  for (const b of buckets) {
    b.confusionScore = Math.round((b.rawScore / maxScore) * 100);
    if      (b.confusionScore >= 70) b.label = 'high';
    else if (b.confusionScore >= 35) b.label = 'moderate';
    else                              b.label = 'low';
  }

  const confusionTimeline = buckets.map(b => ({
    time: b.startTime, timeLabel: formatTime(b.startTime),
    score: b.confusionScore, pauses: b.pauses,
    replays: b.replays, label: b.label,
  }));

  const replayHotspots = buckets
    .filter(b => b.replays > 0)
    .sort((a, b) => b.replays - a.replays)
    .slice(0, 3)
    .map(b => ({
      startTime: b.startTime, endTime: b.endTime,
      timeLabel: `${formatTime(b.startTime)}–${formatTime(b.endTime)}`,
      replayCount: b.replays,
    }));

  const exitEvents = events
    .filter(ev => ev.eventType === 'exit')
    .sort((a, b) => a.currentTime - b.currentTime);

  const dropOffPoint = exitEvents.length > 0
    ? {
        currentTime: exitEvents[exitEvents.length - 1].currentTime,
        timeLabel:   formatTime(exitEvents[exitEvents.length - 1].currentTime),
        count:       exitEvents.length,
      }
    : null;

  const topBucket = buckets.reduce(
    (max, b) => (b.confusionScore > max.confusionScore ? b : max), buckets[0]
  );
  const topConfusingSegment = topBucket.confusionScore > 0
    ? {
        startTime: topBucket.startTime, endTime: topBucket.endTime,
        timeLabel: `${formatTime(topBucket.startTime)}–${formatTime(topBucket.endTime)}`,
        score: topBucket.confusionScore,
        pauses: topBucket.pauses, replays: topBucket.replays,
      }
    : null;

  const summary = {
    pauses:  events.filter(e => e.eventType === 'pause').length,
    replays: events.filter(e => e.eventType === 'seek_backward').length,
    exits:   events.filter(e => e.eventType === 'exit').length,
    plays:   events.filter(e => e.eventType === 'play').length,
  };

  return {
    totalEvents: events.length,
    totalSessions: new Set(events.map(e => e.sessionId)).size,
    videoDuration, confusionTimeline, replayHotspots,
    dropOffPoint, topConfusingSegment, summary,
  };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

module.exports = { process };