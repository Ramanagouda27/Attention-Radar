import { useState, useCallback, useRef } from 'react';
import { trackEvent } from '../services/api';

export function useTracker(sessionId, videoId) {
  const [localEvents, setLocalEvents] = useState([]);
  const [counts, setCounts]           = useState({ pause: 0, seek_backward: 0, exit: 0, play: 0 });
  const videoIdRef                    = useRef(videoId);
  videoIdRef.current                  = videoId;

  const track = useCallback(async (eventType, extra = {}) => {
    const event = {
      sessionId,
      videoId:   videoIdRef.current,
      eventType,
      timestamp: Date.now(),
      ...extra,
    };
    setLocalEvents(prev => [event, ...prev].slice(0, 100));
    setCounts(prev => ({ ...prev, [eventType]: (prev[eventType] ?? 0) + 1 }));
    await trackEvent(event);
  }, [sessionId]);

  const resetCounts = useCallback(() => {
    setLocalEvents([]);
    setCounts({ pause: 0, seek_backward: 0, exit: 0, play: 0 });
  }, []);

  return { track, localEvents, counts, resetCounts };
}