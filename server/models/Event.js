const store = {};

const inMemoryDB = {
  insert(event) {
    if (!store[event.sessionId]) store[event.sessionId] = [];
    store[event.sessionId].push(event);
    return event;
  },

  findByVideoId(videoId) {
    const results = [];
    for (const events of Object.values(store)) {
      for (const ev of events) {
        if (ev.videoId === videoId) results.push(ev);
      }
    }
    return results;
  },

  sessionSummary() {
    return Object.entries(store).map(([id, events]) => ({
      sessionId:  id,
      eventCount: events.length,
      lastEvent:  events[events.length - 1],
    }));
  },

  clear() {
    Object.keys(store).forEach(k => delete store[k]);
  },
};

module.exports = inMemoryDB;