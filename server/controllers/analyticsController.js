const { v4: uuidv4 }  = require('uuid');
const Event            = require('../models/Event');
const analyticsService = require('../services/analyticsService');

const trackEvent = (req, res) => {
  const { sessionId, videoId, eventType, timestamp, currentTime, seekFrom, seekTo, source } = req.body;

  if (!sessionId || !eventType || currentTime === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: sessionId, eventType, currentTime',
    });
  }

  const event = {
    id:        uuidv4(),
    sessionId,
    videoId:   videoId   || 'default',
    eventType,
    currentTime,
    seekFrom:  seekFrom  || null,
    seekTo:    seekTo    || null,
    source:    source    || 'html5',
    timestamp: timestamp || Date.now(),
  };

  Event.insert(event);
  return res.status(201).json({ success: true, eventId: event.id });
};

const getAnalytics = (req, res) => {
  const { videoId = 'default', videoDuration } = req.query;
  const events = Event.findByVideoId(videoId);

  if (events.length === 0) {
    return res.json({
      totalEvents: 0, totalSessions: 0,
      confusionTimeline: [], replayHotspots: [],
      dropOffPoint: null, topConfusingSegment: null,
      summary: { pauses: 0, replays: 0, exits: 0, plays: 0 },
    });
  }

  const duration = parseFloat(videoDuration) || 600;
  const result   = analyticsService.process(events, duration);
  return res.json(result);
};

const getSessions = (req, res) => res.json(Event.sessionSummary());

const resetData = (req, res) => {
  Event.clear();
  return res.json({ success: true, message: 'All event data cleared' });
};

module.exports = { trackEvent, getAnalytics, getSessions, resetData };