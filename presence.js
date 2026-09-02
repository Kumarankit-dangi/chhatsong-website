const liveStorageKey = 'chhatsong-live-count-site-total';
const liveSessionPrefix = 'chhatsong-live-session-';
const liveChannelName = 'chhatsong-live-channel-site-total';
const pageKey = document.body?.dataset?.pageKey || location.pathname.replace(/\//g, '').replace(/\.html$/, '') || 'home';
const sessionId = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
let firebaseSessionRef = null;
let firebaseSetPresence = null;
let displayedLiveCount = 0;
let pendingLiveCount = null;
let decreaseTimer = null;

function getLiveUserNodes() {
  return Array.from(document.querySelectorAll('#liveUsers'));
}

function renderCount(count) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  if (safeCount >= displayedLiveCount) {
    displayedLiveCount = safeCount;
    pendingLiveCount = null;
    if (decreaseTimer) clearTimeout(decreaseTimer);
  } else {
    pendingLiveCount = safeCount;
    if (decreaseTimer) clearTimeout(decreaseTimer);
    decreaseTimer = setTimeout(() => {
      if (pendingLiveCount === safeCount) displayedLiveCount = safeCount;
      pendingLiveCount = null;
      decreaseTimer = null;
      renderCount(displayedLiveCount);
    }, 12000);
  }
  const nodes = getLiveUserNodes();
  if (!nodes.length) return;
  const label = `${displayedLiveCount} live users`;
  nodes.forEach((node) => {
    node.textContent = label;
  });
}

function sessionKeyFor(id) {
  return `${liveSessionPrefix}${id}`;
}

function pruneSessionMap(map) {
  const now = Date.now();
  const nextMap = {};

  Object.entries(map || {}).forEach(([id, value]) => {
    if (!value || typeof value !== 'object') return;
    const lastSeen = Number(value.connectedAt || 0);
    if (!Number.isFinite(lastSeen) || now - lastSeen > 60000) return;
    nextMap[id] = { ...value, connectedAt: lastSeen, pageKey: value.pageKey || pageKey };
  });

  return nextMap;
}

function readSessionMap() {
  const nextMap = {};

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(liveSessionPrefix)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') continue;
        const sessionIdValue = parsed.sessionId || key.replace(liveSessionPrefix, '');
        nextMap[sessionIdValue] = parsed;
      } catch (error) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    return {};
  }

  return pruneSessionMap(nextMap);
}

function writeSessionMap(map) {
  try {
    const normalized = pruneSessionMap(map);

    Object.entries(normalized).forEach(([id, value]) => {
      const entry = { ...value, sessionId: id, connectedAt: Number(value.connectedAt || Date.now()) };
      localStorage.setItem(sessionKeyFor(id), JSON.stringify(entry));
    });

    localStorage.setItem(liveStorageKey, JSON.stringify(normalized));
    return Object.keys(normalized).length;
  } catch (error) {
    return 0;
  }
}

function broadcastCount(count) {
  const normalized = Math.max(0, Number(count) || 0);
  if ('BroadcastChannel' in window) {
    try {
      const ch = new BroadcastChannel(liveChannelName);
      ch.postMessage({ count: normalized });
      ch.close();
    } catch (error) {
      // ignore broadcast issues
    }
  }
}

function getFallbackCount() {
  return Object.keys(readSessionMap()).length;
}

function registerLocalSession() {
  const map = readSessionMap();
  map[sessionId] = { sessionId, pageKey, connectedAt: Date.now() };
  const total = writeSessionMap(map);
  renderCount(total);
  broadcastCount(total);
}

function unregisterLocalSession() {
  try {
    localStorage.removeItem(sessionKeyFor(sessionId));
  } catch (error) {
    // ignore storage cleanup issues
  }
  const total = getFallbackCount();
  try {
    localStorage.setItem(liveStorageKey, JSON.stringify(readSessionMap()));
  } catch (error) {
    // ignore storage cleanup issues
  }
  renderCount(total);
  broadcastCount(total);
}

function heartbeatSession() {
  const map = readSessionMap();
  map[sessionId] = { sessionId, pageKey, connectedAt: Date.now() };
  const total = writeSessionMap(map);
  renderCount(total);
  broadcastCount(total);
  if (firebaseSetPresence) {
    firebaseSetPresence({ online: true, pageKey, connectedAt: Date.now() }).catch(() => {});
  }
}

function attachCleanupHandlers() {
  const cleanup = () => {
    unregisterLocalSession();
  };

  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
}

function syncFromStorage() {
  renderCount(getFallbackCount());
}

if ('BroadcastChannel' in window) {
  const channel = new BroadcastChannel(liveChannelName);
  channel.onmessage = (event) => {
    const count = Number(event.data?.count ?? getFallbackCount());
    renderCount(count);
  };
}

window.addEventListener('storage', (event) => {
  if (!event.key) return;
  if (event.key === liveStorageKey || event.key.startsWith(liveSessionPrefix)) {
    syncFromStorage();
  }
});

registerLocalSession();
attachCleanupHandlers();
window.addEventListener('focus', heartbeatSession, { passive: true });
setInterval(heartbeatSession, 15000);

try {
  const firebaseModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const dbModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

  const firebaseConfig = {
    apiKey: 'AIzaSyDYZFCorRFRMy9TWEiTMp8AAc7IHTlB4ME',
    authDomain: 'chhath-song-b5e61.firebaseapp.com',
    databaseURL: 'https://chhath-song-b5e61-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'chhath-song-b5e61',
    appId: '1:420844144157:web:28ca6a38f2e2772038e8f4'
  };

  const app = firebaseModule.initializeApp(firebaseConfig);
  const database = dbModule.getDatabase(app);
  const presenceRef = dbModule.ref(database, 'presence/site-total');

  dbModule.onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() || {};
    const total = Math.max(Object.keys(data).length, getFallbackCount());
    renderCount(total);
  }, () => {
    syncFromStorage();
  });

  firebaseSessionRef = dbModule.ref(database, `presence/site-total/${sessionId}`);
  firebaseSetPresence = (value) => dbModule.set(firebaseSessionRef, value);
  const connectedRef = dbModule.ref(database, '.info/connected');

  dbModule.onValue(connectedRef, (connectedSnap) => {
    if (connectedSnap.val() !== true) return;

    dbModule.onDisconnect(firebaseSessionRef).remove().then(() => {
      return dbModule.set(firebaseSessionRef, { online: true, pageKey, connectedAt: Date.now() });
    }).catch(() => {
      firebaseSessionRef = null;
      syncFromStorage();
    });
  });
} catch (error) {
  syncFromStorage();
}
